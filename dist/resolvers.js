/* eslint-disable @typescript-eslint/no-explicit-any */
import { getClient } from "./client.js";
const TTL_MS = 60_000;
const cache = new Map();
async function fetchList(endpoint) {
    const cached = cache.get(endpoint);
    if (cached && Date.now() - cached.fetchedAt < TTL_MS)
        return cached.data;
    const result = await getClient().get(endpoint);
    const list = result.data ?? [];
    cache.set(endpoint, { data: list, fetchedAt: Date.now() });
    return list;
}
export function invalidateResolverCache(endpoint) {
    if (endpoint)
        cache.delete(endpoint);
    else
        cache.clear();
}
function caseInsensitiveMatch(list, nameKey, idKey, query, kind) {
    const needle = query.trim().toLowerCase();
    const hits = list.filter((x) => String(x[nameKey] ?? "").trim().toLowerCase() === needle);
    if (hits.length === 1) {
        const hit = hits[0];
        const canonical = String(hit[nameKey]);
        const note = canonical === query
            ? `${kind} exakt gematcht: "${canonical}" (ID ${hit[idKey]}).`
            : `${kind} case-insensitiv gematcht — angefragt: "${query}", tatsächlich: "${canonical}" (ID ${hit[idKey]}). Nutze diese Schreibweise für Folge-Calls.`;
        return { id: Number(hit[idKey]), canonicalName: canonical, note };
    }
    if (hits.length > 1) {
        const names = hits.map((h) => `"${h[nameKey]}" (ID ${h[idKey]})`).join(", ");
        throw new Error(`Mehrdeutig: ${hits.length} ${kind}s matchen case-insensitiv auf "${query}": ${names}. Bitte mit exakter Schreibweise oder ID aufrufen.`);
    }
    const available = list.map((x) => `"${x[nameKey]}"`).join(", ") || "(keine vorhanden)";
    throw new Error(`${kind} "${query}" nicht gefunden. Verfügbare ${kind}s: ${available}. Erstelle ihn ggf. zuerst oder prüfe die Schreibweise.`);
}
export async function resolveTagId(name) {
    const list = await fetchList("/fb/page/getTags");
    return caseInsensitiveMatch(list, "name", "id", name, "Tag");
}
export async function resolveCustomFieldId(name) {
    const list = await fetchList("/fb/page/getCustomFields");
    return caseInsensitiveMatch(list, "name", "id", name, "Custom Field");
}
export async function resolveBotFieldId(name) {
    const list = await fetchList("/fb/page/getBotFields");
    return caseInsensitiveMatch(list, "name", "id", name, "Bot Field");
}
//# sourceMappingURL=resolvers.js.map