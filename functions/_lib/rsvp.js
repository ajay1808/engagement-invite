// Shared helpers for the save-the-date reply form.
// (No onRequest* exports here, so Cloudflare doesn't turn this file into a route.)

export const REPLY_LABELS = {
  yes: "Yes, I'll be there",
  maybe: 'Hoping to, not sure yet',
  no: "Sorry, I can't make it",
};

const MAX_BODY = 4096;
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export const fail = (status, error, extra = {}) => json({ ok: false, error, ...extra }, status);

// Writes must come from this site's own pages (blocks other sites posting on a guest's behalf).
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function readJson(request) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) return null;
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  try {
    const body = JSON.parse(text);
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

const squash = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

// The page sends "+<country code><number>"; keep digits only.
export function normalisePhone(value) {
  const s = String(value ?? '').trim();
  if (!s.startsWith('+')) return null;
  const digits = s.slice(1).replace(/[\s().-]/g, '');
  return /^\d{8,15}$/.test(digits) ? `+${digits}` : null;
}

// Returns { reply } when valid, or { errors: { field: message } }.
export function validateReply(body) {
  const errors = {};
  const name = squash(body.name);
  if (name.length < 2 || name.length > 80) errors.name = 'Please enter your name.';

  const phone = normalisePhone(body.phone);
  if (!phone) errors.phone = 'Please enter your number, with country code.';

  const email = squash(body.email).toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) errors.email = 'Please check your email address.';

  const attending = String(body.attending ?? '');
  if (!(attending in REPLY_LABELS)) errors.attending = 'Please choose one.';

  let guests = null;
  if (attending !== 'no') {
    guests = Number(body.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > 10) errors.guests = 'Choose between 1 and 10.';
  }

  return Object.keys(errors).length ? { errors } : { reply: { name, phone, email, attending, guests } };
}

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time comparison of two strings (hash first so lengths match).
export async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

// Cloudflare Turnstile spam check. Skipped while TURNSTILE_SECRET isn't set.
export async function passesTurnstile(env, token, request) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token || typeof token !== 'string') return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const out = await res.json();
    return out.success === true;
  } catch {
    return false;
  }
}
