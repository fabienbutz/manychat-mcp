import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, cleanData } from "../client.js";
import { formatSubscriber, formatSubscribers } from "../formatters.js";

export function registerSubscriberTools(server: McpServer) {
  // --- Get Info ---
  server.tool("subscriber_get", "Get detailed subscriber info from ManyChat by subscriber ID.", {
    subscriber_id: z.string().describe("ManyChat subscriber ID (required)"),
    detailed: z.boolean().optional().describe("Return full raw JSON (default false)"),
  }, async (params) => {
    const result = await getClient().get("/subscriber/getInfo", { subscriber_id: params.subscriber_id });
    const text = params.detailed ? JSON.stringify(result.data, null, 2) : formatSubscriber(result.data);
    return { content: [{ type: "text", text }] };
  });

  // --- Find ---
  server.tool("subscriber_find", "Find subscribers in ManyChat by name, email, phone, or custom field. Max 100 results.", {
    name: z.string().optional().describe("Search by name"),
    email: z.string().optional().describe("Search by email (exact match)"),
    phone: z.string().optional().describe("Search by phone (exact match)"),
    field_id: z.number().optional().describe("Custom field ID (use with field_value)"),
    field_value: z.string().optional().describe("Custom field value (use with field_id)"),
    detailed: z.boolean().optional().describe("Return full raw JSON (default false)"),
  }, async (params) => {
    const client = getClient();
    let result;

    if (params.email || params.phone) {
      const queryParams: Record<string, string> = {};
      if (params.email) queryParams.email = params.email;
      if (params.phone) queryParams.phone = params.phone;
      result = await client.get("/subscriber/findBySystemField", queryParams);
      // Returns single subscriber, wrap in array for consistent formatting
      const data = result.data;
      const text = params.detailed ? JSON.stringify(data, null, 2) : formatSubscriber(data);
      return { content: [{ type: "text", text }] };
    } else if (params.field_id && params.field_value) {
      result = await client.get("/subscriber/findByCustomField", {
        field_id: String(params.field_id), field_value: params.field_value,
      });
    } else if (params.name) {
      result = await client.get("/subscriber/findByName", { name: params.name });
    } else {
      throw new Error("Provide name, email, phone, or field_id+field_value");
    }

    const subscribers = (result.data as any) as any[];
    const text = params.detailed ? JSON.stringify(subscribers, null, 2) : formatSubscribers(subscribers);
    return { content: [{ type: "text", text }] };
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
    const result = await getClient().post("/subscriber/createSubscriber", cleanData({
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
    const result = await getClient().post("/subscriber/updateSubscriber", cleanData({
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
  server.tool("subscriber_add_tag", "Add a tag to a subscriber (by tag ID or name).", {
    subscriber_id: z.string().describe("Subscriber ID (required)"),
    tag_id: z.number().optional().describe("Tag ID"),
    tag_name: z.string().optional().describe("Tag name (alternative to tag_id)"),
  }, async (params) => {
    const client = getClient();
    if (params.tag_id) {
      await client.post("/subscriber/addTag", { subscriber_id: params.subscriber_id, tag_id: params.tag_id });
    } else if (params.tag_name) {
      await client.post("/subscriber/addTagByName", { subscriber_id: params.subscriber_id, tag_name: params.tag_name });
    } else {
      throw new Error("Either tag_id or tag_name is required");
    }
    return { content: [{ type: "text", text: "Tag hinzugefügt." }] };
  });

  server.tool("subscriber_remove_tag", "Remove a tag from a subscriber (by tag ID or name).", {
    subscriber_id: z.string().describe("Subscriber ID (required)"),
    tag_id: z.number().optional().describe("Tag ID"),
    tag_name: z.string().optional().describe("Tag name (alternative to tag_id)"),
  }, async (params) => {
    const client = getClient();
    if (params.tag_id) {
      await client.post("/subscriber/removeTag", { subscriber_id: params.subscriber_id, tag_id: params.tag_id });
    } else if (params.tag_name) {
      await client.post("/subscriber/removeTagByName", { subscriber_id: params.subscriber_id, tag_name: params.tag_name });
    } else {
      throw new Error("Either tag_id or tag_name is required");
    }
    return { content: [{ type: "text", text: "Tag entfernt." }] };
  });

  // --- Custom Fields ---
  server.tool("subscriber_set_custom_field", "Set custom field value(s) for a subscriber. Can set one by ID, one by name, or multiple at once.", {
    subscriber_id: z.string().describe("Subscriber ID (required)"),
    field_id: z.number().optional().describe("Custom field ID (for single field)"),
    field_name: z.string().optional().describe("Custom field name (alternative to field_id)"),
    field_value: z.string().optional().describe("Value to set (for single field)"),
    fields: z.array(z.object({
      field_id: z.number().optional().describe("Field ID"),
      field_name: z.string().optional().describe("Field name"),
      field_value: z.string().describe("Value"),
    })).optional().describe("Multiple fields to set at once (max 20)"),
  }, async (params) => {
    const client = getClient();
    if (params.fields?.length) {
      await client.post("/subscriber/setCustomFields", {
        subscriber_id: params.subscriber_id, fields: params.fields,
      });
    } else if (params.field_id && params.field_value !== undefined) {
      await client.post("/subscriber/setCustomField", {
        subscriber_id: params.subscriber_id, field_id: params.field_id, field_value: params.field_value,
      });
    } else if (params.field_name && params.field_value !== undefined) {
      await client.post("/subscriber/setCustomFieldByName", {
        subscriber_id: params.subscriber_id, field_name: params.field_name, field_value: params.field_value,
      });
    } else {
      throw new Error("Provide field_id+field_value, field_name+field_value, or fields array");
    }
    return { content: [{ type: "text", text: "Custom Field(s) gesetzt." }] };
  });
}
