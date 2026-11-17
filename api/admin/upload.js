// POST /api/admin/upload -> geeft een signed upload-URL uit voor Supabase Storage.
// De browser uploadt daarna rechtstreeks naar Supabase (geen 4,5 MB function-limiet).
// Auth-gated; alleen ingelogde beheerders krijgen een token.
import { isAuthed } from '../_auth.js';
import { admin, BUCKET, publicUrl } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const filename = (req.body && req.body.filename) || 'bestand';
  const safe = String(filename).replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase().slice(-80) || 'bestand';
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;

  try {
    const { data, error } = await admin().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    res.status(200).json({
      bucket: BUCKET,
      path: data.path,
      token: data.token,
      publicUrl: publicUrl(path),
      supabaseUrl: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
    });
  } catch (e) {
    res.status(500).json({ error: e && e.message || 'Upload-URL mislukt' });
  }
}
