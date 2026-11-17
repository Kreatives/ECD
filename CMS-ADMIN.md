# ECD media-CMS (`/admin`)

Simpele beheeromgeving om alle foto's, video's en galerijen/carousels van de site te
beheren — zonder code of redeploy. Wijzigingen staan direct live.

## Hoe het werkt

- **Geen build/CMS-database.** Elke pagina laadt `js/cms-loader.js` i.p.v. direct `main.js`.
  De loader haalt `GET /api/manifest` op, vervangt media en herrendert galerijen, en laadt
  dan pas `main.js` (zodat de carousels op de juiste DOM initialiseren).
- **Opslag:** geüploade bestanden + een klein `manifest.json` staan in **Supabase Storage**
  (bucket `media`, publiek). De `assets/`-map en de repo blijven ongemoeid; niet-gewijzigde
  media = originele asset.
- **Beheer:** `/admin` leest per pagina de `data-cms*`-attributen uit de HTML en combineert
  die met het manifest. Uploaden gaat via een signed upload-URL rechtstreeks browser →
  Supabase, dus ook grote video's (geen 4,5 MB function-limiet).

## Bestanden

| Pad | Rol |
|-----|-----|
| `js/cms-loader.js` | Past manifest toe op elke pagina, laadt daarna `main.js` |
| `admin/` | De beheer-UI (statisch, vanilla JS) |
| `api/manifest.js` | Publiek: manifest voor de loader (gecachet) |
| `api/admin/login.js` · `logout.js` | Wachtwoord → sessie-cookie |
| `api/admin/upload.js` | Signed upload-URL voor Supabase (auth) |
| `api/admin/manifest.js` | Manifest lezen/opslaan (auth) |
| `api/_auth.js` · `api/_manifest.js` · `api/_supabase.js` | Gedeelde helpers (auth, validatie, Supabase) |
| `scripts/tag_cms.py` | Eenmalig de HTML taggen (idempotent, al uitgevoerd) |

## Eenmalige setup

1. **Supabase:** maak een **publieke** bucket `media` (eenmalig; kan via het dashboard of
   `scripts/supabase_setup.mjs`).
2. **Env-variabelen** (Production + Preview + Development):
   | Variabele | Waarde |
   |-----------|--------|
   | `SUPABASE_URL` | `https://dtvscmezaymiqnxamihx.supabase.co` |
   | `SUPABASE_ANON_KEY` | de publishable key (`sb_publishable_…`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | de secret/service-role key (geheim!) |
   | `ADMIN_PASSWORD` | het inlogwachtwoord voor `/admin` |
   | `ADMIN_SECRET` | lange random string (`openssl rand -hex 32`) |
3. **Lokaal draaien:** `vercel env pull .env.local` en `vercel dev` → `http://localhost:3000/admin`.

Na een `git push` naar `main` deployt Vercel automatisch; `/admin` werkt dan live met dezelfde env-vars.

## Gebruik

1. Ga naar `/admin`, log in met het wachtwoord.
2. Kies links een pagina. Bovenaan staan de galerijen/carousels, daaronder de losse media.
3. **Galerij:** sleep om te sorteren, `×` om te verwijderen, “+ toevoegen” om te uploaden,
   “Alles terug naar standaard” om de originele set terug te zetten.
4. **Losse media:** “Vervang” (of “Vervang video” + “Poster”), “Standaard” zet het origineel terug.
5. Klik **Opslaan**. Binnen ~1 minuut (CDN-cache) staat het live.

## Nieuwe pagina of media toevoegen

Nieuwe `assets/`-media in de HTML? Run `python3 scripts/tag_cms.py` opnieuw (idempotent) en
voeg de pagina toe aan de `PAGES`-lijst bovenin `admin/admin.js`.
