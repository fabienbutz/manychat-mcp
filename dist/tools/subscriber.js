import { z } from "zod";
import { getClient, cleanData } from "../client.js";
import { formatSubscriber, formatSubscribers } from "../formatters.js";
import { resolveTagId, resolveCustomFieldId } from "../resolvers.js";
function buildNameVariants(input) {
    const trimmed = input.trim().replace(/\s+/g, " ");
    if (!trimmed)
        return [];
    const lower = trimmed.toLowerCase();
    const upper = trimmed.toUpperCase();
    const titleCase = lower.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
    const firstCap = lower.charAt(0).toUpperCase() + lower.slice(1);
    const ordered = [trimmed, titleCase, lower, upper, firstCap];
    return Array.from(new Set(ordered));
}
export function registerSubscriberTools(server) {
    // --- Get Info ---
    server.tool("subscriber_get", "Get detailed subscriber info from ManyChat by subscriber ID.", {
        subscriber_id: z.string().describe("ManyChat subscriber ID (required)"),
        detailed: z.boolean().optional().describe("Return full raw JSON (default false)"),
    }, async (params) => {
        const result = await getClient().get("/fb/subscriber/getInfo", { subscriber_id: params.subscriber_id });
        const text = params.detailed ? JSON.stringify(result.data, null, 2) : formatSubscriber(result.data);
        return { content: [{ type: "text", text }] };
    });
    // --- Get by user_ref ---
    server.tool("subscriber_get_by_user_ref", "Get subscriber info by Messenger user_ref (used for webview/checkbox plugins).", {
        user_ref: z.string().describe("Messenger user_ref identifier (required)"),
        detailed: z.boolean().optional().describe("Return full raw JSON (default false)"),
    }, async (params) => {
        const result = await getClient().get("/fb/subscriber/getInfoByUserRef", { user_ref: params.user_ref });
        const text = params.detailed ? JSON.stringify(result.data, null, 2) : formatSubscriber(result.data);
        return { content: [{ type: "text", text }] };
    });
    // --- Verify signed request (Messenger webview) ---
    server.tool("subscriber_verify_signed_request", "Verify a Messenger webview signed_request and bind it to a subscriber. See https://developers.facebook.com/docs/messenger-platform/webview/", {
        subscriber_id: z.string().describe("Subscriber ID (required)"),
        signed_request: z.string().describe("signed_request string from the Messenger webview (required)"),
    }, async (params) => {
        const result = await getClient().post("/fb/subscriber/verifyBySignedRequest", {
            subscriber_id: Number(params.subscriber_id),
            signed_request: params.signed_request,
        });
        return { content: [{ type: "text", text: `Verifizierung: ${result.status}` }] };
    });
    // --- Find ---
    server.tool("subscriber_find", [
        "Find subscribers in ManyChat. Max 100 results.",
        "",
        "Exactly ONE of the following lookup modes must be provided:",
        "  • name                          → fuzzy-ish search against ManyChat's stored display name (first + last)",
        "  • email                         → exact match on the subscriber's system email field",
        "  • phone                         → exact match on the subscriber's system phone field (E.164, e.g. +4917612345678)",
        "  • field_id + field_value        → exact match on a custom field (get field_id via custom_field_list)",
        "",
        "What this tool does NOT support:",
        "  • Messenger/Instagram/Telegram usernames or handles — ManyChat has no public lookup for these; use the Subscriber ID from the ManyChat UI URL instead.",
        "  • Partial/substring name search — see case-handling below for what is retried automatically.",
        "",
        "Name search is case-sensitive on ManyChat's side. This tool automatically retries common case variants",
        "(as-is, Title Case, lowercase, UPPERCASE, and each word capitalized) and returns the first variant that matches.",
        "The response notes which variant produced the hit so the caller knows the exact stored spelling.",
        "",
        "If nothing matches, the response lists every variant tried — do NOT guess another call, ask the user for",
        "Subscriber ID, email, or phone instead.",
    ].join("\n"), {
        name: z.string().optional().describe("Search by stored display name. Case variants are retried automatically."),
        email: z.string().optional().describe("Search by email (exact match, case-insensitive on ManyChat side)"),
        phone: z.string().optional().describe("Search by phone in E.164 format (exact match)"),
        field_id: z.number().optional().describe("Custom field ID (use together with field_value). Get IDs via custom_field_list."),
        field_value: z.string().optional().describe("Custom field value (exact match, used together with field_id)"),
        detailed: z.boolean().optional().describe("Return full raw JSON instead of formatted text (default false)"),
    }, async (params) => {
        const client = getClient();
        if (params.email || params.phone) {
            const queryParams = {};
            if (params.email)
                queryParams.email = params.email;
            if (params.phone)
                queryParams.phone = params.phone;
            const result = await client.get("/fb/subscriber/findBySystemField", queryParams);
            const data = result.data;
            const text = params.detailed ? JSON.stringify(data, null, 2) : formatSubscriber(data);
            return { content: [{ type: "text", text }] };
        }
        if (params.field_id && params.field_value) {
            const result = await client.get("/fb/subscriber/findByCustomField", {
                field_id: String(params.field_id), field_value: params.field_value,
            });
            const subs = result.data;
            const text = params.detailed ? JSON.stringify(subs, null, 2) : formatSubscribers(subs);
            return { content: [{ type: "text", text }] };
        }
        if (params.name) {
            const variants = buildNameVariants(params.name);
            const tried = [];
            for (const variant of variants) {
                tried.push(variant);
                const result = await client.get("/fb/subscriber/findByName", { name: variant });
                const subs = result.data ?? [];
                if (subs.length > 0) {
                    const body = params.detailed ? JSON.stringify(subs, null, 2) : formatSubscribers(subs);
                    const header = variant === params.name
                        ? `Match auf "${variant}" (exakt wie angefragt):`
                        : `Match auf Variante "${variant}" (angefragt: "${params.name}"). ManyChat-Namenssuche ist case-sensitive — nutze diese Schreibweise für Folge-Calls.`;
                    return { content: [{ type: "text", text: `${header}\n${body}` }] };
                }
            }
            return {
                content: [{
                        type: "text",
                        text: `Keine Subscriber gefunden. Getestete Varianten: ${tried.map((v) => `"${v}"`).join(", ")}.\nNächster Schritt: frage User nach Subscriber-ID, E-Mail oder Telefonnummer. Telegram-/Instagram-/Messenger-Handles können nicht gesucht werden.`,
                    }],
            };
        }
        throw new Error("Provide exactly one of: name, email, phone, or field_id+field_value.");
    });
    // --- Create ---
    server.tool("subscriber_create", "Create a new subscriber in ManyChat. At least one of phone, whatsapp_phone, or email is required.", {
        first_name: z.string().optional().describe("First name"),
        last_name: z.string().optional().describe("Last name"),
        phone: z.string().optional().describe("Phone number"),
        whatsapp_phone: z.string().optional().describe("WhatsApp phone number"),
        email: z.string().optional().describe("Email address"),
        gender: z.string().optional().describe("Gender"),
        has_opt_in_sms: z.boolean().optional().describe("SMS opt-in (required if phone is set)"),
        has_opt_in_email: z.boolean().optional().describe("Email opt-in (required if email is set)"),
        consent_phrase: z.string().optional().describe("Consent phrase (required for opt-in)"),
    }, async (params) => {
        const result = await getClient().post("/fb/subscriber/createSubscriber", cleanData({
            first_name: params.first_name, last_name: params.last_name,
            phone: params.phone, whatsapp_phone: params.whatsapp_phone, email: params.email,
            gender: params.gender, has_opt_in_sms: params.has_opt_in_sms,
            has_opt_in_email: params.has_opt_in_email, consent_phrase: params.consent_phrase,
        }));
        const text = formatSubscriber(result.data);
        return { content: [{ type: "text", text: `Subscriber erstellt:\n${text}` }] };
    });
    // --- Update ---
    server.tool("subscriber_update", "Update an existing subscriber in ManyChat.", {
        subscriber_id: z.string().describe("Subscriber ID (required)"),
        first_name: z.string().optional().describe("First name"),
        last_name: z.string().optional().describe("Last name"),
        phone: z.string().optional().describe("Phone number"),
        email: z.string().optional().describe("Email address"),
        gender: z.string().optional().describe("Gender"),
        has_opt_in_sms: z.boolean().optional().describe("SMS opt-in"),
        has_opt_in_email: z.boolean().optional().describe("Email opt-in"),
        consent_phrase: z.string().optional().describe("Consent phrase"),
    }, async (params) => {
        const result = await getClient().post("/fb/subscriber/updateSubscriber", cleanData({
            subscriber_id: params.subscriber_id,
            first_name: params.first_name, last_name: params.last_name,
            phone: params.phone, email: params.email, gender: params.gender,
            has_opt_in_sms: params.has_opt_in_sms, has_opt_in_email: params.has_opt_in_email,
            consent_phrase: params.consent_phrase,
        }));
        const text = formatSubscriber(result.data);
        return { content: [{ type: "text", text: `Subscriber aktualisiert:\n${text}` }] };
    });
    // --- Tags ---
    server.tool("subscriber_add_tag", [
        "Add a tag to a subscriber. Provide either tag_id (fastest) or tag_name.",
        "tag_name is resolved to an ID via tag_list and matched case-insensitively,",
        "so 'vip', 'VIP' and 'Vip' all hit the same tag. The exact canonical name is returned.",
        "On ambiguity or unknown name the tool lists all existing tags — do not retry blindly.",
    ].join(" "), {
        subscriber_id: z.string().describe("Subscriber ID (required)"),
        tag_id: z.number().optional().describe("Tag ID (preferred if known)"),
        tag_name: z.string().optional().describe("Tag name — case-insensitive, auto-resolved to ID"),
    }, async (params) => {
        const client = getClient();
        if (params.tag_id) {
            await client.post("/fb/subscriber/addTag", { subscriber_id: params.subscriber_id, tag_id: params.tag_id });
            return { content: [{ type: "text", text: `Tag hinzugefügt (ID ${params.tag_id}).` }] };
        }
        if (params.tag_name) {
            const res = await resolveTagId(params.tag_name);
            await client.post("/fb/subscriber/addTag", { subscriber_id: params.subscriber_id, tag_id: res.id });
            return { content: [{ type: "text", text: `Tag hinzugefügt. ${res.note}` }] };
        }
        throw new Error("Either tag_id or tag_name is required");
    });
    server.tool("subscriber_remove_tag", [
        "Remove a tag from a subscriber. Provide either tag_id (fastest) or tag_name.",
        "tag_name is resolved via tag_list (case-insensitive). See subscriber_add_tag for details.",
    ].join(" "), {
        subscriber_id: z.string().describe("Subscriber ID (required)"),
        tag_id: z.number().optional().describe("Tag ID (preferred if known)"),
        tag_name: z.string().optional().describe("Tag name — case-insensitive, auto-resolved to ID"),
    }, async (params) => {
        const client = getClient();
        if (params.tag_id) {
            await client.post("/fb/subscriber/removeTag", { subscriber_id: params.subscriber_id, tag_id: params.tag_id });
            return { content: [{ type: "text", text: `Tag entfernt (ID ${params.tag_id}).` }] };
        }
        if (params.tag_name) {
            const res = await resolveTagId(params.tag_name);
            await client.post("/fb/subscriber/removeTag", { subscriber_id: params.subscriber_id, tag_id: res.id });
            return { content: [{ type: "text", text: `Tag entfernt. ${res.note}` }] };
        }
        throw new Error("Either tag_id or tag_name is required");
    });
    // --- Custom Fields ---
    server.tool("subscriber_set_custom_field", [
        "Set custom field value(s) for a subscriber. Three call shapes:",
        "  • field_id + field_value              — set one field by ID (fastest)",
        "  • field_name + field_value            — set one field by name (resolved via custom_field_list, case-insensitive)",
        "  • fields: [{ field_id|field_name, field_value }]  — set up to 20 fields atomically",
        "Field names are resolved up-front: on ambiguity or unknown name the tool lists all existing custom fields.",
        "Do not retry with different casings — the resolver already handles that.",
    ].join("\n"), {
        subscriber_id: z.string().describe("Subscriber ID (required)"),
        field_id: z.number().optional().describe("Custom field ID (for single field)"),
        field_name: z.string().optional().describe("Custom field name — case-insensitive, auto-resolved"),
        field_value: z.string().optional().describe("Value to set (for single field)"),
        fields: z.array(z.object({
            field_id: z.number().optional().describe("Field ID"),
            field_name: z.string().optional().describe("Field name — case-insensitive, auto-resolved"),
            field_value: z.string().describe("Value"),
        })).optional().describe("Multiple fields to set at once (max 20)"),
    }, async (params) => {
        const client = getClient();
        const notes = [];
        if (params.fields?.length) {
            const resolved = [];
            for (const f of params.fields) {
                if (f.field_id) {
                    resolved.push({ field_id: f.field_id, field_value: f.field_value });
                }
                else if (f.field_name) {
                    const res = await resolveCustomFieldId(f.field_name);
                    notes.push(res.note);
                    resolved.push({ field_id: res.id, field_value: f.field_value });
                }
                else {
                    throw new Error("Each entry in 'fields' needs field_id or field_name.");
                }
            }
            await client.post("/fb/subscriber/setCustomFields", {
                subscriber_id: params.subscriber_id, fields: resolved,
            });
        }
        else if (params.field_id && params.field_value !== undefined) {
            await client.post("/fb/subscriber/setCustomField", {
                subscriber_id: params.subscriber_id, field_id: params.field_id, field_value: params.field_value,
            });
        }
        else if (params.field_name && params.field_value !== undefined) {
            const res = await resolveCustomFieldId(params.field_name);
            notes.push(res.note);
            await client.post("/fb/subscriber/setCustomField", {
                subscriber_id: params.subscriber_id, field_id: res.id, field_value: params.field_value,
            });
        }
        else {
            throw new Error("Provide field_id+field_value, field_name+field_value, or fields array");
        }
        const suffix = notes.length ? `\n${notes.join("\n")}` : "";
        return { content: [{ type: "text", text: `Custom Field(s) gesetzt.${suffix}` }] };
    });
}
//# sourceMappingURL=subscriber.js.map