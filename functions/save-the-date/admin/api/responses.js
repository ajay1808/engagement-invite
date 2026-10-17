// GET    /save-the-date/admin/api/responses   all replies, newest first
// DELETE /save-the-date/admin/api/responses   { id } removes one (e.g. a test reply)
// Protected by ../_middleware.js.

import { fail, json, readJson, sameOrigin } from '../../../_lib/rsvp.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, phone, email, attending, guests, created_at, updated_at, edits
       FROM save_the_date
      ORDER BY created_at DESC`,
  ).all();
  return json({ ok: true, replies: results });
}

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return fail(403, 'forbidden');
  const body = await readJson(request);
  if (!body || typeof body.id !== 'string') return fail(400, 'bad_request');
  const { meta } = await env.DB.prepare('DELETE FROM save_the_date WHERE id = ?').bind(body.id).run();
  return meta.changes ? json({ ok: true }) : fail(404, 'not_found');
}
