// Gedeelde auth-helper voor de /admin API's.
// Eén gedeeld wachtwoord (ADMIN_PASSWORD) -> HMAC-ondertekend sessie-cookie (ADMIN_SECRET).
// Geen externe dependencies: alleen Node crypto.
import crypto from 'node:crypto';

const COOKIE = 'cms_session';
const MAX_AGE = 60 * 60 * 12; // 12 uur

function secret() {
  const s = process.env.ADMIN_SECRET;
  if (!s) throw new Error('ADMIN_SECRET is niet ingesteld');
  return s;
}

function isLocal(req) {
  const host = (req.headers && req.headers.host) || '';
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
}

function cookieFlags(req) {
  // Secure weglaten op localhost zodat het cookie ook over http werkt tijdens `vercel dev`.
  const base = 'HttpOnly; SameSite=Lax; Path=/';
  return isLocal(req) ? base : base + '; Secure';
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function makeToken() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && Date.now() <= exp;
}

export function makeSessionCookie(req) {
  return `${COOKIE}=${makeToken()}; ${cookieFlags(req)}; Max-Age=${MAX_AGE}`;
}

export function clearCookie(req) {
  return `${COOKIE}=; ${cookieFlags(req)}; Max-Age=0`;
}

function parseCookies(req) {
  const header = (req.headers && req.headers.cookie) || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      if (k) out[k] = decodeURIComponent(v);
    }
  });
  return out;
}

export function isAuthed(req) {
  return verifyToken(parseCookies(req)[COOKIE]);
}

// Constant-time string vergelijking voor het wachtwoord.
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
