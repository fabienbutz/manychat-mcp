#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerPageTools } from "./tools/page.js";
import { registerSubscriberTools } from "./tools/subscriber.js";
import { registerSendingTools } from "./tools/sending.js";
const server = new McpServer({
    name: "manychat",
    version: "1.0.0",
});
registerPageTools(server);
registerSubscriberTools(server);
registerSendingTools(server);
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map