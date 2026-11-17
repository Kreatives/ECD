// POST /api/admin/logout -> wist het sessie-cookie.
import { clearCookie } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Set-Cookie', clearCookie(req));
  res.status(200).json({ ok: true });
}
