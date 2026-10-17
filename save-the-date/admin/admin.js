// Replies page: totals, a searchable list, CSV download and removing test replies.

const LABELS = { yes: 'Coming', maybe: 'Hoping to', no: "Can't make it" };
const $ = (sel) => document.querySelector(sel);
let replies = [];
let filter = 'all';

async function load() {
  $('#refresh').disabled = true;
  try {
    const res = await fetch('api/responses', { cache: 'no-store' });
    const data = await res.json();
    replies = data.replies || [];
    render();
  } catch {
    $('#empty').hidden = false;
    $('#empty').textContent = "Couldn't load replies. Try Refresh.";
  } finally {
    $('#refresh').disabled = false;
  }
}

function render() {
  const sum = (a) => replies.filter((r) => r.attending === a).reduce((n, r) => n + (r.guests || 0), 0);
  $('#s-yes').textContent = sum('yes');
  $('#s-maybe').textContent = sum('maybe');
  $('#s-likely').textContent = sum('yes') + sum('maybe');
  $('#s-no').textContent = replies.filter((r) => r.attending === 'no').length;
  $('#s-replies').textContent = replies.length;

  const phones = new Map();
  for (const r of replies) phones.set(r.phone, (phones.get(r.phone) || 0) + 1);

  const q = $('#search').value.trim().toLowerCase();
  const shown = replies.filter(
    (r) =>
      (filter === 'all' || r.attending === filter) &&
      (!q || [r.name, r.phone, r.email].some((v) => v.toLowerCase().includes(q))),
  );

  const rows = shown.map((r) => {
    const tr = document.createElement('tr');
    tr.append(
      cell('name', r.name, phones.get(r.phone) > 1 && el('span', 'dup', 'same phone')),
      cell('', '', el('span', `badge badge--${r.attending}`, LABELS[r.attending])),
      cell('num', r.guests ?? ''),
      cell('', '', link(`tel:${r.phone}`, r.phone), link(`https://wa.me/${r.phone.slice(1)}`, 'WhatsApp', 'wa')),
      cell('', '', link(`mailto:${r.email}`, r.email)),
      cell('when', when(r.created_at), r.edits ? el('span', 'edited', `changed ${when(r.updated_at)}`) : null),
      cell('actions', '', removeButton(r)),
    );
    return tr;
  });
  $('#rows').replaceChildren(...rows);
  $('#empty').hidden = shown.length > 0;
  $('#empty').textContent = replies.length ? 'No replies match.' : 'No replies yet.';
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function cell(className, text, ...children) {
  const td = el('td', className, text);
  td.append(...children.filter(Boolean));
  return td;
}
function link(href, text, className) {
  const a = el('a', className, text);
  a.href = href;
  if (href.startsWith('http')) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  return a;
}
function when(iso) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function removeButton(r) {
  const b = el('button', 'remove');
  b.type = 'button';
  b.setAttribute('aria-label', `Remove reply from ${r.name}`);
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  b.addEventListener('click', async () => {
    if (!confirm(`Remove the reply from ${r.name}? This can't be undone.`)) return;
    const res = await fetch('api/responses', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: r.id }),
    });
    if (res.ok) {
      replies = replies.filter((x) => x.id !== r.id);
      render();
    } else alert("Couldn't remove it. Please try again.");
  });
  return b;
}

$('#search').addEventListener('input', render);
$('#refresh').addEventListener('click', load);
for (const b of document.querySelectorAll('.filters button')) {
  b.addEventListener('click', () => {
    filter = b.dataset.filter;
    document.querySelectorAll('.filters button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  });
}

load();
