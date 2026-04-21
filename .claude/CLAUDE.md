# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
ManyChat MCP Server - Model Context Protocol server providing access to ManyChat API for chatbot management, subscriber operations, and messaging automation.

## Commands

```bash
# Development
npm run dev          # Start development server with tsx
npm run build        # Compile TypeScript to dist/
npm start           # Run compiled version from dist/

# Testing
# No test framework configured - relies on TypeScript strict mode and Zod runtime validation

# Installation & Usage
npx -y github:fabienbutz/manychat-mcp    # Direct GitHub installation
```

## Architecture

### MCP Server Structure
- **Entry Point**: `src/index.ts` — stdio transport, registers all tool groups
- **API Client**: `src/client.ts` — `ManyChatClient` wraps `https://api.manychat.com/fb` (Bearer auth). Lazy singleton via `getClient()`; errors normalized in `handleResponse()` (HTTP errors + API-level `status === "error"`)
- **Formatters**: `src/formatters.ts` — human-readable text output (raw JSON available via `detailed: true` on read tools)
- **Resolvers**: `src/resolvers.ts` — case-insensitive name→ID lookup for tags / custom fields / bot fields with 60s TTL cache. Invalidated on create/delete. All `*ByName` tool shapes go through these resolvers instead of the ManyChat `*ByName` endpoints, so the model never guesses casings and errors surface the full available list.
- **Tools**: Modular groups in `src/tools/` — 28 tools total:
  - `page.ts` (13) — page info, tags, custom fields, bot fields, flows, growth tools, OTN topics
  - `subscriber.ts` (9) — get/find/create/update, add/remove tag, set custom field, verify signed request
  - `sending.ts` (5) — `send_content`, `send_text`, `send_content_by_user_ref`, `send_flow`, `send_raw` (escape hatch). All accept `channel: facebook|instagram|whatsapp|telegram`.
  - `template.ts` (1) — single-use template link

### Adding a new tool
1. Pick the right file in `src/tools/` (or create a new group and register it in `index.ts`).
2. Call `server.tool(name, description, zodShape, handler)`. Use `getClient().get(...)`/`.post(...)`.
3. For POST bodies with optional params, pass through `cleanData()` to drop `undefined`/`null`.
4. For read tools returning records: support a `detailed: z.boolean().optional()` flag and branch between `JSON.stringify(...)` and a formatter in `src/formatters.ts`.
5. For tools that accept a human-provided name (tag, custom field, bot field): do NOT call the ManyChat `*ByName` endpoint directly. Resolve the name via `src/resolvers.ts` and call the `*ById` endpoint — this gives case-insensitive matching, ambiguity detection, and a full "available list" on miss. Call `invalidateResolverCache(endpoint)` after any create/delete that changes the underlying list.

### Key Patterns
- **Zod Validation**: All tool parameters use strict Zod schemas with `.describe()` per field
- **Error-First Design**: Throw `Error` with readable message — MCP surfaces it to the client
- **Stateless Tools**: Each tool call is independent; no session state on the server
- **Rate Limit Aware**: ManyChat limits are 100/s read, 10/s write, 25/s messages, 20/s flows — batch where possible

### Environment Configuration
Requires `MANYCHAT_API_KEY` environment variable for all operations.

### Claude Desktop Integration
Configure in `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "manychat": {
      "command": "npx",
      "args": ["-y", "github:fabienbutz/manychat-mcp"],
      "env": { "MANYCHAT_API_KEY": "YOUR_API_KEY" }
    }
  }
}
```

## Gotchas

- **ES Modules**: `"type": "module"` — relative imports must use the `.js` extension even in `.ts` files (e.g. `import ... from "./client.js"`)
- **No Testing Framework**: Quality assurance relies on TypeScript strict mode and Zod runtime validation
- **API Rate Limits**: ManyChat enforces strict rate limits — batch operations when possible
- **Environment Required**: All tools fail without `MANYCHAT_API_KEY` (read lazily on first tool call, not at startup)
- **Subscriber identification**: `subscriber_find` supports name / email / phone / custom-field; most other subscriber ops require `subscriber_id`
- **API namespace `/fb/` covers all channels**: Despite the name, `/fb/` is the single public ManyChat API namespace — it handles Messenger, Instagram, WhatsApp, and Telegram. Channel selection happens in the payload via `data.content.type: "instagram" | "whatsapp" | "telegram"` (omit for Messenger). Sending tools expose this as a `channel` parameter.
- **TikTok not supported**: ManyChat has no TikTok chat/messaging API (only inbound TikTok Lead Ads integration via Ads Manager). No way to send messages to TikTok users through this MCP.