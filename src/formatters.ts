/**
 * Compact output formatters for ManyChat data
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function formatPageInfo(data: any): string {
  if (!data) return "Keine Seiteninformationen.";
  return [
    `Seite: ${data.name || "–"}`,
    `ID: ${data.id || "–"}`,
    data.username ? `Username: @${data.username}` : null,
    data.category ? `Kategorie: ${data.category}` : null,
    `Pro: ${data.is_pro ? "Ja" : "Nein"}`,
    data.timezone ? `Timezone: ${data.timezone}` : null,
  ].filter(Boolean).join("\n");
}

export function formatTags(tags: any[]): string {
  if (!tags?.length) return "Keine Tags vorhanden.";
  return `${tags.length} Tags:\n` + tags.map((t) => `  • ${t.name} (ID: ${t.id})`).join("\n");
}

export function formatCustomFields(fields: any[]): string {
  if (!fields?.length) return "Keine Custom Fields vorhanden.";
  return `${fields.length} Custom Fields:\n` + fields.map((f) =>
    `  • ${f.name} [${f.type}]${f.description ? ` — ${f.description}` : ""} (ID: ${f.id})`
  ).join("\n");
}

export function formatBotFields(fields: any[]): string {
  if (!fields?.length) return "Keine Bot Fields vorhanden.";
  return `${fields.length} Bot Fields:\n` + fields.map((f) =>
    `  • ${f.name} [${f.type}] = ${f.value ?? "–"}${f.description ? ` — ${f.description}` : ""} (ID: ${f.id})`
  ).join("\n");
}

export function formatFlows(data: any): string {
  const flows = data?.flows;
  const folders = data?.folders;
  if (!flows?.length) return "Keine Flows vorhanden.";
  const folderMap = new Map<number, string>();
  if (folders?.length) {
    for (const f of folders) folderMap.set(f.id, f.name);
  }
  return `${flows.length} Flows:\n` + flows.map((f: any) => {
    const folder = f.folder_id ? folderMap.get(f.folder_id) || `Folder ${f.folder_id}` : null;
    return `  • ${f.name}${folder ? ` [${folder}]` : ""} (ns: ${f.ns})`;
  }).join("\n");
}

export function formatGrowthTools(tools: any[]): string {
  if (!tools?.length) return "Keine Growth Tools vorhanden.";
  return `${tools.length} Growth Tools:\n` + tools.map((t) =>
    `  • ${t.name} [${t.type}] (ID: ${t.id})`
  ).join("\n");
}

export function formatWidgets(widgets: any[]): string {
  if (!widgets?.length) return "Keine Widgets vorhanden.";
  return `${widgets.length} Widgets:\n` + widgets.map((w) =>
    `  • ${w.name || w.caption || "–"}${w.type ? ` [${w.type}]` : ""} (ID: ${w.id})`
  ).join("\n");
}

export function formatOtnTopics(topics: any[]): string {
  if (!topics?.length) return "Keine OTN Topics vorhanden.";
  return `${topics.length} OTN Topics:\n` + topics.map((t) =>
    `  • ${t.name}${t.description ? ` — ${t.description}` : ""} (ID: ${t.id})`
  ).join("\n");
}

export function formatSubscriber(data: any): string {
  if (!data) return "Kein Subscriber gefunden.";
  const lines = [
    `Name: ${data.name || `${data.first_name || ""} ${data.last_name || ""}`.trim() || "–"}`,
    `ID: ${data.id}`,
    data.email ? `Email: ${data.email}${data.optin_email ? " ✓" : ""}` : null,
    data.phone ? `Telefon: ${data.phone}${data.optin_phone ? " ✓" : ""}` : null,
    data.whatsapp_phone ? `WhatsApp: ${data.whatsapp_phone}${data.optin_whatsapp ? " ✓" : ""}` : null,
    data.ig_username ? `Instagram: @${data.ig_username}` : null,
    data.gender ? `Geschlecht: ${data.gender}` : null,
    data.locale ? `Sprache: ${data.locale}` : null,
    data.timezone ? `Timezone: ${data.timezone}` : null,
    data.subscribed ? `Abonniert seit: ${data.subscribed}` : null,
    data.last_interaction ? `Letzte Interaktion: ${data.last_interaction}` : null,
    `Follow-up: ${data.is_followup_enabled ? "aktiv" : "inaktiv"}`,
    data.live_chat_url ? `Live Chat: ${data.live_chat_url}` : null,
  ];

  if (data.tags?.length) {
    lines.push(`Tags: ${data.tags.map((t: any) => t.name).join(", ")}`);
  }

  if (data.custom_fields?.length) {
    const filled = data.custom_fields.filter((f: any) => f.value !== null && f.value !== undefined && f.value !== "");
    if (filled.length) {
      lines.push("Custom Fields:");
      for (const f of filled) {
        lines.push(`  • ${f.name} = ${f.value}`);
      }
    }
  }

  return lines.filter(Boolean).join("\n");
}

export function formatSubscribers(subscribers: any[]): string {
  if (!subscribers?.length) return "Keine Subscriber gefunden.";
  return `${subscribers.length} Subscriber:\n` + subscribers.map((s) => {
    const parts = [
      s.name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "–",
      `ID: ${s.id}`,
    ];
    if (s.email) parts.push(s.email);
    if (s.phone) parts.push(s.phone);
    if (s.tags?.length) parts.push(`Tags: ${s.tags.map((t: any) => t.name).join(", ")}`);
    return `  • ${parts.join(" | ")}`;
  }).join("\n");
}
