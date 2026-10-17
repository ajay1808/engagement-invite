// Password-protects everything under /save-the-date/admin/ (the replies page and its data).
// The password is the ADMIN_PASSWORD secret; any username works.

import { safeEqual } from '../../_lib/rsvp.js';

export async function onRequest({ request, env, next }) {
  if (!env.ADMIN_PASSWORD) {
    return new Response('The replies page has no password set yet (ADMIN_PASSWORD).', {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }

  if (!(await authorised(request, env.ADMIN_PASSWORD))) {
    return new Response('Password needed.', {
      status: 401,
      headers: {
        'www-authenticate': 'Basic realm="Shreya & Ajay replies", charset="UTF-8"',
        'cache-control': 'no-store',
      },
    });
  }

  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'no-store');
  out.headers.set('x-robots-tag', 'noindex, nofollow');
  out.headers.set('referrer-policy', 'no-referrer');
  out.headers.set('x-frame-options', 'DENY');
  return out;
}

async function authorised(request, password) {
  const [scheme, encoded] = (request.headers.get('authorization') || '').split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  let decoded;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
  return safeEqual(decoded.slice(decoded.indexOf(':') + 1), password);
}
