// Maakt eenmalig de publieke Supabase Storage-bucket 'media' aan.
// Gebruik:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/supabase_setup.mjs
//   of:     vercel env pull .env.local  &&  node --env-file=.env.local scripts/supabase_setup.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Zet SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in de omgeving.');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data: buckets, error: listErr } = await sb.storage.listBuckets();
if (listErr) { console.error('Kon buckets niet ophalen:', listErr.message); process.exit(1); }

if (buckets.some((b) => b.name === 'media')) {
  console.log('Bucket "media" bestaat al.');
} else {
  const { error } = await sb.storage.createBucket('media', {
    public: true, // geen fileSizeLimit -> gebruikt de projectlimiet van Supabase
  });
  if (error) { console.error('createBucket fout:', error.message); process.exit(1); }
  console.log('Bucket "media" aangemaakt (public).');
}
