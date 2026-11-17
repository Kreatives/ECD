// ADMIN: GET -> huidig manifest (voor de editor), POST -> gevalideerd manifest opslaan.
import { isAuthed } from '../_auth.js';
import { normalize } from '../_manifest.js';
import { readManifest, writeManifest } from '../_supabase.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(await readManifest());
    return;
  }

  if (req.method === 'POST') {
    const clean = normalize(req.body);
    clean.updatedAt = new Date().toISOString();
    try {
      await writeManifest(clean);
    } catch (e) {
      res.status(500).json({ error: 'Opslaan naar Supabase mislukt: ' + (e && e.message || 'onbekend') });
      return;
    }
    res.status(200).json({ ok: true, updatedAt: clean.updatedAt });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
