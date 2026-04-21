import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerTemplateTools(server: McpServer) {
  server.tool(
    "template_generate_single_use_link",
    "Generate a single-use installation link for a ManyChat template. Requires the template to be active with single-use sharing enabled (Profile > Templates).",
    {
      template_id: z.number().describe("Template ID (required)"),
    },
    async (params) => {
      const result = await getClient().post("/user/template/generateSingleUseLink", {
        template_id: params.template_id,
      });
      return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
    }
  );
}
