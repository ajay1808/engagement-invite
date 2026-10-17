// GET /save-the-date/admin/api/export → all replies as a CSV file (opens in Google Sheets or Excel).
// Protected by ../_middleware.js.

import { REPLY_LABELS } from '../../../_lib/rsvp.js';

const COLUMNS = [
  ['Replied (UTC)', (r) => r.created_at.slice(0, 16).replace('T', ' ')],
  ['Last changed (UTC)', (r) => (r.edits ? r.updated_at.slice(0, 16).replace('T', ' ') : '')],
  ['Name', (r) => r.name],
  ['Phone', (r) => r.phone],
  ['Email', (r) => r.email],
  ['Reply', (r) => REPLY_LABELS[r.attending]],
  ['Guests', (r) => r.guests ?? ''],
];

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT * FROM save_the_date ORDER BY created_at').all();
  const lines = [COLUMNS.map(([title]) => title), ...results.map((r) => COLUMNS.map(([, get]) => get(r)))];
  const csv = '﻿' + lines.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="save-the-date-replies-${date}.csv"`,
      'cache-control': 'no-store',
    },
  });
}

// Quote every cell; a leading ' stops spreadsheets reading text as a formula
// (and keeps "+91…" phone numbers as text instead of turning them into numbers).
function cell(value) {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
