import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, cleanData } from "../client.js";
import {
  formatPageInfo, formatTags, formatCustomFields,
  formatBotFields, formatFlows, formatGrowthTools, formatOtnTopics, formatWidgets,
} from "../formatters.js";
import { resolveTagId, resolveBotFieldId, invalidateResolverCache } from "../resolvers.js";

export function registerPageTools(server: McpServer) {
  // --- Page Info ---
  server.tool("page_get_info", "Get ManyChat page/bot information.", {}, async () => {
    const result = await getClient().get("/fb/page/getInfo");
    return { content: [{ type: "text", text: formatPageInfo(result.data) }] };
  });

  // --- Tags ---
  server.tool("tag_list", "List all tags in ManyChat.", {}, async () => {
    const result = await getClient().get("/fb/page/getTags");
    return { content: [{ type: "text", text: formatTags(result.data as unknown as any[]) }] };
  });

  server.tool("tag_create", "Create a new tag in ManyChat.", {
    name: z.string().describe("Tag name (required). Stored verbatim, including capitalisation."),
  }, async (params) => {
    const result = await getClient().post("/fb/page/createTag", { name: params.name });
    invalidateResolverCache("/fb/page/getTags");
    return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
  });

  server.tool(
    "tag_delete",
    [
      "Delete a tag from ManyChat. Provide tag_id (fastest) or tag_name.",
      "tag_name is resolved via tag_list (case-insensitive) — canonical name + ID are returned.",
      "Unknown or ambiguous names fail with the full tag list; do not retry blindly.",
    ].join(" "),
    {
      tag_id: z.number().optional().describe("Tag ID (preferred)"),
      tag_name: z.string().optional().describe("Tag name — case-insensitive, auto-resolved"),
    },
    async (params) => {
      const client = getClient();
      if (params.tag_id) {
        await client.post("/fb/page/removeTag", { tag_id: params.tag_id });
        invalidateResolverCache("/fb/page/getTags");
        return { content: [{ type: "text", text: `Tag gelöscht (ID ${params.tag_id}).` }] };
      }
      if (params.tag_name) {
        const res = await resolveTagId(params.tag_name);
        await client.post("/fb/page/removeTag", { tag_id: res.id });
        invalidateResolverCache("/fb/page/getTags");
        return { content: [{ type: "text", text: `Tag gelöscht. ${res.note}` }] };
      }
      throw new Error("Either tag_id or tag_name is required");
    },
  );

  // --- Custom Fields ---
  server.tool("custom_field_list", "List all custom fields in ManyChat.", {}, async () => {
    const result = await getClient().get("/fb/page/getCustomFields");
    return { content: [{ type: "text", text: formatCustomFields(result.data as unknown as any[]) }] };
  });

  server.tool("custom_field_create", "Create a new custom field in ManyChat.", {
    caption: z.string().describe("Field display name (required). Stored verbatim."),
    type: z.enum(["text", "number", "date", "datetime", "boolean"]).describe("Field type (required)"),
    description: z.string().optional().describe("Field description"),
  }, async (params) => {
    const result = await getClient().post("/fb/page/createCustomField", cleanData({
      caption: params.caption, type: params.type, description: params.description,
    }));
    invalidateResolverCache("/fb/page/getCustomFields");
    return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
  });

  // --- Bot Fields ---
  server.tool("bot_field_list", "List all bot fields in ManyChat.", {}, async () => {
    const result = await getClient().get("/fb/page/getBotFields");
    return { content: [{ type: "text", text: formatBotFields(result.data as unknown as any[]) }] };
  });

  server.tool("bot_field_create", "Create a new bot field in ManyChat.", {
    name: z.string().describe("Field name (required). Stored verbatim, including capitalisation."),
    type: z.enum(["text", "number", "date", "datetime", "boolean"]).describe("Field type (required)"),
    description: z.string().optional().describe("Field description"),
    value: z.string().optional().describe("Initial value"),
  }, async (params) => {
    const result = await getClient().post("/fb/page/createBotField", cleanData({
      name: params.name, type: params.type, description: params.description, value: params.value,
    }));
    invalidateResolverCache("/fb/page/getBotFields");
    return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
  });

  server.tool(
    "bot_field_set",
    [
      "Set bot field value(s). Three call shapes:",
      "  • field_id + field_value              — set one field by ID (fastest)",
      "  • field_name + field_value            — set one field by name (resolved via bot_field_list, case-insensitive)",
      "  • fields: [{ field_id|field_name, field_value }]  — set up to 20 fields atomically",
      "Bot field names are resolved up-front — ambiguous or unknown names fail with the full list.",
    ].join("\n"),
    {
      field_id: z.number().optional().describe("Bot field ID (for single field)"),
      field_name: z.string().optional().describe("Bot field name — case-insensitive, auto-resolved"),
      field_value: z.string().optional().describe("Value to set (for single field)"),
      fields: z.array(z.object({
        field_id: z.number().optional().describe("Field ID"),
        field_name: z.string().optional().describe("Field name — case-insensitive, auto-resolved"),
        field_value: z.string().describe("Value to set"),
      })).optional().describe("Multiple fields to set (max 20)"),
    },
    async (params) => {
      const client = getClient();
      const notes: string[] = [];

      if (params.fields?.length) {
        const resolved = [];
        for (const f of params.fields) {
          if (f.field_id) {
            resolved.push({ field_id: f.field_id, field_value: f.field_value });
          } else if (f.field_name) {
            const res = await resolveBotFieldId(f.field_name);
            notes.push(res.note);
            resolved.push({ field_id: res.id, field_value: f.field_value });
          } else {
            throw new Error("Each entry in 'fields' needs field_id or field_name.");
          }
        }
        await client.post("/fb/page/setBotFields", { fields: resolved });
      } else if (params.field_id && params.field_value !== undefined) {
        await client.post("/fb/page/setBotField", { field_id: params.field_id, field_value: params.field_value });
      } else if (params.field_name && params.field_value !== undefined) {
        const res = await resolveBotFieldId(params.field_name);
        notes.push(res.note);
        await client.post("/fb/page/setBotField", { field_id: res.id, field_value: params.field_value });
      } else {
        throw new Error("Provide field_id+field_value, field_name+field_value, or fields array");
      }

      const suffix = notes.length ? `\n${notes.join("\n")}` : "";
      return { content: [{ type: "text", text: `Bot Field(s) gesetzt.${suffix}` }] };
    },
  );

  // --- Flows ---
  server.tool("flow_list", "List all flows/automations in ManyChat with their folders.", {}, async () => {
    const result = await getClient().get("/fb/page/getFlows");
    return { content: [{ type: "text", text: formatFlows(result.data) }] };
  });

  // --- Growth Tools ---
  server.tool("growth_tool_list", "List all growth tools/widgets in ManyChat.", {}, async () => {
    const result = await getClient().get("/fb/page/getGrowthTools");
    return { content: [{ type: "text", text: formatGrowthTools(result.data as unknown as any[]) }] };
  });

  // --- Widgets (legacy/deprecated but exposed by API) ---
  server.tool("widget_list", "List all widgets in ManyChat (legacy endpoint; prefer growth_tool_list).", {}, async () => {
    const result = await getClient().get("/fb/page/getWidgets");
    return { content: [{ type: "text", text: formatWidgets(result.data as unknown as any[]) }] };
  });

  // --- OTN Topics ---
  server.tool("otn_topic_list", "List all One-Time Notification topics in ManyChat.", {}, async () => {
    const result = await getClient().get("/fb/page/getOtnTopics");
    return { content: [{ type: "text", text: formatOtnTopics(result.data as unknown as any[]) }] };
  });
}
