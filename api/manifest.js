// PUBLIEK: GET /api/manifest -> het huidige manifest voor de loader op elke pagina.
// Gecachet op de CDN; de functie draait alleen bij revalidatie.
import { readManifest } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
  try {
    res.status(200).json(await readManifest());
  } catch {
    res.status(200).json({ version: 1, singles: {}, galleries: {} });
  }
}
