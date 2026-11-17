// Validatie/normalisatie van het CMS-manifest. Puur, zonder opslag-afhankelijkheid.

export function emptyManifest() {
  return { version: 1, updatedAt: null, singles: {}, galleries: {} };
}

const KEY_RE = /^[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/i;
const MAX_KEYS = 300;
const MAX_ITEMS = 100;

// Toegestane bronnen: geüploade Supabase-URL's (https) of originele site-assets (/assets/...).
function isUrl(v) {
  return typeof v === 'string' && v.length <= 2048 &&
    (/^https:\/\//i.test(v) || /^\/assets\//.test(v));
}
function cleanAlt(v) {
  return typeof v === 'string' ? v.slice(0, 300) : '';
}

// Normaliseer en strip alles wat niet aan het schema voldoet. Nooit throwen.
export function normalize(input) {
  const out = emptyManifest();
  if (!input || typeof input !== 'object') return out;

  const singles = input.singles && typeof input.singles === 'object' ? input.singles : {};
  let n = 0;
  for (const [key, val] of Object.entries(singles)) {
    if (n >= MAX_KEYS) break;
    if (!KEY_RE.test(key) || !val || typeof val !== 'object') continue;
    const entry = {};
    if (isUrl(val.src)) entry.src = val.src;
    if (isUrl(val.poster)) entry.poster = val.poster;
    if (Object.keys(entry).length) { out.singles[key] = entry; n++; }
  }

  const galleries = input.galleries && typeof input.galleries === 'object' ? input.galleries : {};
  let g = 0;
  for (const [key, val] of Object.entries(galleries)) {
    if (g >= MAX_KEYS) break;
    if (!KEY_RE.test(key) || !val || typeof val !== 'object' || !Array.isArray(val.items)) continue;
    const items = [];
    for (const it of val.items) {
      if (items.length >= MAX_ITEMS) break;
      if (!it || typeof it !== 'object' || !isUrl(it.src)) continue;
      const type = it.type === 'video' ? 'video' : 'image';
      items.push({ type, src: it.src, alt: cleanAlt(it.alt) });
    }
    out.galleries[key] = { items };
    g++;
  }

  if (typeof input.updatedAt === 'string') out.updatedAt = input.updatedAt.slice(0, 40);
  return out;
}
