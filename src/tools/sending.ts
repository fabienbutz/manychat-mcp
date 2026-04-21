import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, cleanData } from "../client.js";

const ChannelSchema = z.enum(["facebook", "instagram", "whatsapp", "telegram"]).optional()
  .describe("Target channel. Default 'facebook' (Messenger). Set 'telegram'/'whatsapp'/'instagram' when the subscriber lives on that channel — gets forwarded as content.type in the payload.");

function channelType(channel: string | undefined): string | undefined {
  return channel && channel !== "facebook" ? channel : undefined;
}

const ButtonSchema = z.object({
  type: z.enum(["url", "call", "flow", "buy", "dynamic_block_callback"]).describe("Button type"),
  caption: z.string().describe("Button text"),
  url: z.string().optional().describe("URL (for url/dynamic_block_callback type)"),
  phone: z.string().optional().describe("Phone number (for call type)"),
  target: z.string().optional().describe("Flow ID (for flow type)"),
  webview_size: z.enum(["full", "medium", "compact"]).optional().describe("Webview size (for url type)"),
  method: z.enum(["get", "post"]).optional().describe("HTTP method (for dynamic_block_callback)"),
});

const MessageSchema = z.object({
  type: z.enum(["text", "image", "video", "audio", "file", "cards"]).describe("Message type"),
  text: z.string().optional().describe("Text content (for text type)"),
  url: z.string().optional().describe("Media URL (for image/video/audio/file type)"),
  buttons: z.array(ButtonSchema).optional().describe("Buttons (max 3 for text, 1 for media)"),
});

const ActionSchema = z.object({
  action: z.enum(["add_tag", "remove_tag", "set_field_value", "unset_field_value"]).describe("Action type"),
  tag_name: z.string().optional().describe("Tag name (for add_tag/remove_tag)"),
  field_name: z.string().optional().describe("Field name (for set_field_value/unset_field_value)"),
  value: z.string().optional().describe("Field value (for set_field_value)"),
});

const QuickReplySchema = z.object({
  type: z.enum(["flow", "dynamic_block_callback"]).describe("Quick reply type"),
  caption: z.string().describe("Quick reply text"),
  target: z.string().optional().describe("Flow ID (for flow type)"),
  url: z.string().optional().describe("Callback URL (for dynamic_block_callback)"),
  method: z.enum(["get", "post"]).optional().describe("HTTP method (for dynamic_block_callback)"),
});

export function registerSendingTools(server: McpServer) {
  server.tool(
    "send_content",
    "Send dynamic content (text, images, videos, cards, buttons) to a ManyChat subscriber across any connected channel (Messenger, Instagram, WhatsApp, Telegram). Up to 10 messages, 5 actions, 11 quick replies per request.",
    {
      subscriber_id: z.string().describe("Subscriber ID (required)"),
      messages: z.array(MessageSchema).min(1).max(10).describe("Messages to send (1-10)"),
      actions: z.array(ActionSchema).optional().describe("Actions to perform (max 5)"),
      quick_replies: z.array(QuickReplySchema).optional().describe("Quick replies (max 11)"),
      message_tag: z.string().optional().describe("Message tag (required if >24h since last interaction)"),
      otn_topic_name: z.string().optional().describe("OTN topic name (for one-time notifications)"),
      channel: ChannelSchema,
    },
    async (params) => {
      const content: Record<string, unknown> = {
        messages: params.messages.map((m) => cleanData({
          type: m.type, text: m.text, url: m.url,
          buttons: m.buttons?.map((b) => cleanData({
            type: b.type, caption: b.caption, url: b.url, phone: b.phone,
            target: b.target, webview_size: b.webview_size, method: b.method,
          })),
        })),
      };
      if (params.actions?.length) {
        content.actions = params.actions.map((a) => cleanData({
          action: a.action, tag_name: a.tag_name, field_name: a.field_name, value: a.value,
        }));
      }
      if (params.quick_replies?.length) {
        content.quick_replies = params.quick_replies.map((q) => cleanData({
          type: q.type, caption: q.caption, target: q.target, url: q.url, method: q.method,
        }));
      }
      const ct = channelType(params.channel);
      if (ct) content.type = ct;

      const data: Record<string, unknown> = {
        subscriber_id: params.subscriber_id,
        data: { version: "v2", content },
      };
      if (params.message_tag) data.message_tag = params.message_tag;
      if (params.otn_topic_name) data.otn_topic_name = params.otn_topic_name;

      const result = await getClient().post("/fb/sending/sendContent", data);
      return { content: [{ type: "text", text: `Nachricht gesendet (${params.channel ?? "facebook"}). Status: ${result.status}` }] };
    }
  );

  server.tool(
    "send_text",
    "Send a simple text message to a ManyChat subscriber on any connected channel (Messenger, Instagram, WhatsApp, Telegram). Shortcut for send_content with a single text message.",
    {
      subscriber_id: z.string().describe("Subscriber ID (required)"),
      text: z.string().describe("Text message to send (required)"),
      message_tag: z.string().optional().describe("Message tag (required if >24h since last interaction)"),
      channel: ChannelSchema,
    },
    async (params) => {
      const content: Record<string, unknown> = { messages: [{ type: "text", text: params.text }] };
      const ct = channelType(params.channel);
      if (ct) content.type = ct;

      const data: Record<string, unknown> = {
        subscriber_id: params.subscriber_id,
        data: { version: "v2", content },
      };
      if (params.message_tag) data.message_tag = params.message_tag;

      const result = await getClient().post("/fb/sending/sendContent", data);
      return { content: [{ type: "text", text: `Nachricht gesendet (${params.channel ?? "facebook"}). Status: ${result.status}` }] };
    }
  );

  server.tool(
    "send_content_by_user_ref",
    "Send dynamic content to a Messenger user_ref (checkbox plugin / customer chat). Note: ManyChat does NOT process `actions` for this endpoint.",
    {
      user_ref: z.string().describe("Messenger user_ref (required)"),
      messages: z.array(MessageSchema).min(1).max(10).describe("Messages to send (1-10)"),
      quick_replies: z.array(QuickReplySchema).optional().describe("Quick replies (max 11)"),
      message_tag: z.string().optional().describe("Message tag (required if >24h since last interaction)"),
    },
    async (params) => {
      const content: Record<string, unknown> = {
        messages: params.messages.map((m) => cleanData({
          type: m.type, text: m.text, url: m.url,
          buttons: m.buttons?.map((b) => cleanData({
            type: b.type, caption: b.caption, url: b.url, phone: b.phone,
            target: b.target, webview_size: b.webview_size, method: b.method,
          })),
        })),
      };
      if (params.quick_replies?.length) {
        content.quick_replies = params.quick_replies.map((q) => cleanData({
          type: q.type, caption: q.caption, target: q.target, url: q.url, method: q.method,
        }));
      }

      const data: Record<string, unknown> = {
        user_ref: Number(params.user_ref),
        data: { version: "v2", content },
      };
      if (params.message_tag) data.message_tag = params.message_tag;

      const result = await getClient().post("/fb/sending/sendContentByUserRef", data);
      return { content: [{ type: "text", text: `Nachricht an user_ref gesendet. Status: ${result.status}` }] };
    }
  );

  server.tool(
    "send_raw",
    "Escape hatch: send a fully custom sendContent payload to any channel. Use this when the typed send_content/send_text tools don't cover a feature (e.g. channel-specific message types, templates, newer ManyChat payload fields). You supply the exact `data.content` object; we wrap it with subscriber_id + version v2 and POST to /fb/sending/sendContent.",
    {
      subscriber_id: z.string().describe("Subscriber ID (required)"),
      content: z.record(z.any()).describe("Raw content object, e.g. { type: 'telegram', messages: [...], actions: [...], quick_replies: [...] }. Set `type` for non-Messenger channels."),
      message_tag: z.string().optional().describe("Message tag (required if >24h since last interaction)"),
      otn_topic_name: z.string().optional().describe("OTN topic name (for one-time notifications)"),
    },
    async (params) => {
      const data: Record<string, unknown> = {
        subscriber_id: params.subscriber_id,
        data: { version: "v2", content: params.content },
      };
      if (params.message_tag) data.message_tag = params.message_tag;
      if (params.otn_topic_name) data.otn_topic_name = params.otn_topic_name;

      const result = await getClient().post("/fb/sending/sendContent", data);
      return { content: [{ type: "text", text: `Raw payload gesendet. Status: ${result.status}` }] };
    }
  );

  server.tool("send_flow", "Trigger a flow/automation for a ManyChat subscriber.", {
    subscriber_id: z.string().describe("Subscriber ID (required)"),
    flow_ns: z.string().describe("Flow namespace/ID (required, visible in flow URL)"),
  }, async (params) => {
    const result = await getClient().post("/fb/sending/sendFlow", {
      subscriber_id: params.subscriber_id, flow_ns: params.flow_ns,
    });
    return { content: [{ type: "text", text: `Flow gestartet. Status: ${result.status}` }] };
  });
}
