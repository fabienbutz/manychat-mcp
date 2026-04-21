# ManyChat MCP Server

MCP-Server mit vollständiger Abdeckung der ManyChat API (Page API + Profile API). Ermöglicht Claude Desktop und Claude Code den Zugriff auf Subscriber, Tags, Custom Fields, Flows, Nachrichten, Webview-Verifizierung und Template-Sharing.

## 27 Tools (volle API-Abdeckung)

### Page & Konfiguration
- `page_get_info` — Seiten-/Bot-Informationen
- `tag_list` / `tag_create` / `tag_delete` — Tags verwalten
- `custom_field_list` / `custom_field_create` — Custom Fields
- `bot_field_list` / `bot_field_create` / `bot_field_set` — Bot Fields (einzeln oder Batch via `fields`)
- `flow_list` — Flows/Automationen auflisten
- `growth_tool_list` — Growth Tools
- `widget_list` — Legacy-Widgets (ManyChat deprecated, aber API liefert noch)
- `otn_topic_list` — One-Time Notification Topics

### Subscriber
- `subscriber_get` — Details per ID
- `subscriber_get_by_user_ref` — Details per Messenger `user_ref`
- `subscriber_find` — Suche nach Name, Email, Telefon oder Custom Field
- `subscriber_create` / `subscriber_update` — Erstellen & Bearbeiten
- `subscriber_add_tag` / `subscriber_remove_tag` — Tags zuweisen/entfernen
- `subscriber_set_custom_field` — Custom Fields setzen (einzeln oder Batch)
- `subscriber_verify_signed_request` — Messenger-Webview `signed_request` verifizieren

### Nachrichten
- `send_content` — Dynamische Inhalte senden (Text, Bilder, Videos, Buttons, Quick Replies, Actions)
- `send_content_by_user_ref` — Dynamische Inhalte an Messenger `user_ref` (keine Actions)
- `send_text` — Einfache Textnachricht senden
- `send_flow` — Flow/Automation für Subscriber starten

### Templates (Profile API)
- `template_generate_single_use_link` — Einmal-Installationslink für Template generieren

## Installation

### Voraussetzung
- [Node.js](https://nodejs.org/) (Version 18+)

### Claude Desktop konfigurieren

ManyChat API-Key: In ManyChat unter **Settings → API** generieren.

Füge folgendes in deine `claude_desktop_config.json` ein:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "manychat": {
      "command": "npx",
      "args": ["-y", "github:fabienbutz/manychat-mcp"],
      "env": {
        "MANYCHAT_API_KEY": "DEIN_API_KEY"
      }
    }
  }
}
```

Claude Desktop neu starten — fertig!

### Claude Code (Projekt-MCP)

Das Repository enthält eine `.mcp.json`, die per `${MANYCHAT_API_KEY}` auf deine Shell-Umgebungsvariable verweist. Lokal kannst du alternativ eine `.env` anlegen (siehe `.env.example`) — der Server lädt sie beim Start via `dotenv`.

```bash
cp .env.example .env
# MANYCHAT_API_KEY eintragen
npm install
npm run dev
```

## Rate Limits

| Aktion | Limit |
|--------|-------|
| Lese-Abfragen (GET) | 100/s |
| Schreib-Operationen | 10/s |
| Nachrichten senden | 25/s |
| Flows triggern | 20/s |
