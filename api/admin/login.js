// POST /api/admin/login  { password } -> zet sessie-cookie bij juist wachtwoord.
import { makeSessionCookie, safeEqual } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: 'ADMIN_PASSWORD is niet geconfigureerd' });
    return;
  }
  const password = (req.body && req.body.password) || '';
  if (!safeEqual(password, expected)) {
    res.status(401).json({ error: 'Onjuist wachtwoord' });
    return;
  }
  res.setHeader('Set-Cookie', makeSessionCookie(req));
  res.status(200).json({ ok: true });
}
