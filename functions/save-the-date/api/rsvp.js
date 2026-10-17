// POST /save-the-date/api/rsvp   new reply   → { ok, id, token }
// PUT  /save-the-date/api/rsvp   change it   → { ok }   (body includes id + token)

import { fail, json, newToken, passesTurnstile, readJson, sameOrigin, sha256, validateReply } from '../../_lib/rsvp.js';

async function parse(request) {
  if (!sameOrigin(request)) return { error: fail(403, 'forbidden') };
  const body = await readJson(request);
  if (!body) return { error: fail(400, 'bad_request') };
  return { body };
}

export async function onRequestPost({ request, env }) {
  const { body, error } = await parse(request);
  if (error) return error;

  // Honeypot: a hidden field people never see. Bots fill it; pretend it worked.
  if (body.website) return json({ ok: true, id: crypto.randomUUID(), token: newToken() });

  if (!(await passesTurnstile(env, body.turnstile, request))) return fail(400, 'verification');

  const { reply, errors } = validateReply(body);
  if (errors) return fail(422, 'invalid', { fields: errors });

  const id = crypto.randomUUID();
  const token = newToken();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO save_the_date (id, token_hash, name, phone, email, attending, guests, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, await sha256(token), reply.name, reply.phone, reply.email, reply.attending, reply.guests, now, now)
    .run();

  return json({ ok: true, id, token }, 201);
}

export async function onRequestPut({ request, env }) {
  const { body, error } = await parse(request);
  if (error) return error;
  if (typeof body.id !== 'string' || typeof body.token !== 'string') return fail(400, 'bad_request');

  const { reply, errors } = validateReply(body);
  if (errors) return fail(422, 'invalid', { fields: errors });

  const { meta } = await env.DB.prepare(
    `UPDATE save_the_date
        SET name = ?, phone = ?, email = ?, attending = ?, guests = ?, updated_at = ?, edits = edits + 1
      WHERE id = ? AND token_hash = ?`,
  )
    .bind(reply.name, reply.phone, reply.email, reply.attending, reply.guests, new Date().toISOString(), body.id, await sha256(body.token))
    .run();

  // Unknown id/token (e.g. the reply was deleted): the page then sends it as a new reply.
  if (!meta.changes) return fail(404, 'not_found');
  return json({ ok: true });
}
