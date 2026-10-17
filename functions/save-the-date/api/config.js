// GET /save-the-date/api/config → public settings the page needs (the Turnstile site key).

import { json } from '../../_lib/rsvp.js';

export function onRequestGet({ env }) {
  // Not cached, so switching the spam check on takes effect for everyone at once.
  return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || null });
}
