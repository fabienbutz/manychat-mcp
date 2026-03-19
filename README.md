# ManyChat MCP Server

MCP-Server für die komplette ManyChat API. Ermöglicht Claude Desktop den Zugriff auf Subscriber, Tags, Custom Fields, Flows, Nachrichten und mehr.

## 21 Tools

### Page & Konfiguration
- `page_get_info` — Seiten-/Bot-Informationen
- `tag_list` / `tag_create` / `tag_delete` — Tags verwalten
- `custom_field_list` / `custom_field_create` — Custom Fields
- `bot_field_list` / `bot_field_create` / `bot_field_set` — Bot Fields
- `flow_list` — Flows/Automationen auflisten
- `growth_tool_list` — Growth Tools
- `otn_topic_list` — One-Time Notification Topics

### Subscriber
- `subscriber_get` — Subscriber-Details abrufen
- `subscriber_find` — Suche nach Name, Email, Telefon oder Custom Field
- `subscriber_create` / `subscriber_update` — Erstellen & Bearbeiten
- `subscriber_add_tag` / `subscriber_remove_tag` — Tags zuweisen/entfernen
- `subscriber_set_custom_field` — Custom Fields setzen

### Nachrichten
- `send_content` — Dynamische Inhalte senden (Text, Bilder, Videos, Buttons)
- `send_text` — Einfache Textnachricht senden
- `send_flow` — Flow/Automation für Subscriber starten

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

## Rate Limits

| Aktion | Limit |
|--------|-------|
| Lese-Abfragen (GET) | 100/s |
| Schreib-Operationen | 10/s |
| Nachrichten senden | 25/s |
| Flows triggern | 20/s |
