// Supabase Storage-laag voor het CMS: media-uploads + het manifest.
// Server gebruikt de service-role key (geheim). De browser upload rechtstreeks
// naar Supabase via een signed upload-URL (geen 4,5 MB function-limiet).
import { createClient } from '@supabase/supabase-js';
import { normalize, emptyManifest } from './_manifest.js';

export const BUCKET = 'media';
export const MANIFEST_PATH = 'manifest.json';

let _admin = null;
export function admin() {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY niet ingesteld');
  _admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _admin;
}

export function publicUrl(path) {
  return admin().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Verse read via de storage-API (omzeilt de CDN-cache zodat opslaan direct zichtbaar is).
export async function readManifest() {
  try {
    const { data, error } = await admin().storage.from(BUCKET).download(MANIFEST_PATH);
    if (error || !data) return emptyManifest();
    return normalize(JSON.parse(await data.text()));
  } catch {
    return emptyManifest();
  }
}

export async function writeManifest(clean) {
  const { error } = await admin().storage.from(BUCKET).upload(
    MANIFEST_PATH,
    Buffer.from(JSON.stringify(clean)),
    { contentType: 'application/json', upsert: true, cacheControl: '60' }
  );
  if (error) throw new Error(error.message);
}
