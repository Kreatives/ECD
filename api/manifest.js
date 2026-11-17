// PUBLIEK: GET /api/manifest -> het huidige manifest voor de loader op elke pagina.
// Gecachet op de CDN; de functie draait alleen bij revalidatie.
import { readManifest } from './_supabase.js';

export default async function handler(req, res) {
  // Kort cachen zodat wijzigingen binnen ~10s live zijn, maar bezoekers niet
  // elke pageview een functie-call triggeren. Geen lange stale-while-revalidate
  // (die serveerde eerder tot 24u het oude manifest).
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=20');
  try {
    res.status(200).json(await readManifest());
  } catch {
    res.status(200).json({ version: 1, singles: {}, galleries: {} });
  }
}
