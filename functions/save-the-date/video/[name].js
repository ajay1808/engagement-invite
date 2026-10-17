// GET /save-the-date/video/<file>: serves the save-the-date video with byte-range support.
// Cloudflare Pages' static hosting ignores "Range" requests, and iPhones won't play
// a video without them, so the file is sliced here instead.

const FILES = {
  'save-the-date.mp4': '/save-the-date/media/save-the-date.mp4',
};

export async function onRequest({ request, env, params }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } });
  }
  const path = FILES[params.name];
  if (!path) return new Response('Not found', { status: 404 });

  const asset = await env.ASSETS.fetch(new URL(path, request.url), { headers: { 'accept-encoding': 'identity' } });
  if (!asset.ok) return asset;

  let body = asset.body;
  let size = Number(asset.headers.get('content-length'));
  if (!size) {
    const buffer = await asset.arrayBuffer();
    size = buffer.byteLength;
    body = new Blob([buffer]).stream();
  }

  const headers = new Headers({
    'content-type': 'video/mp4',
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=604800',
  });
  const etag = asset.headers.get('etag');
  if (etag) headers.set('etag', etag);

  const range = parseRange(request.headers.get('range'), size);
  if (range === 'invalid') {
    body.cancel();
    headers.set('content-range', `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }

  const [start, end] = range ?? [0, size - 1];
  const length = end - start + 1;
  headers.set('content-length', String(length));
  if (range) headers.set('content-range', `bytes ${start}-${end}/${size}`);

  if (request.method === 'HEAD') {
    body.cancel();
    return new Response(null, { status: range ? 206 : 200, headers });
  }

  // FixedLengthStream lets the response carry an exact Content-Length.
  const out = new FixedLengthStream(length);
  slice(body, start, end).pipeTo(out.writable).catch(() => {});
  return new Response(out.readable, { status: range ? 206 : 200, headers });
}

// "bytes=0-", "bytes=100-199", "bytes=-500" → [start, end]; null when absent.
function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return 'invalid';
  let start, end;
  if (m[1] === '') {
    start = Math.max(size - Number(m[2]), 0);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start > end || start >= size ? 'invalid' : [start, end];
}

// Pass through only bytes start..end of a stream, then stop reading.
function slice(stream, start, end) {
  let pos = 0;
  return stream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        const from = Math.max(start - pos, 0);
        const to = Math.min(end + 1 - pos, chunk.byteLength);
        if (from < to) controller.enqueue(chunk.subarray(from, to));
        pos += chunk.byteLength;
        if (pos > end) controller.terminate();
      },
    }),
  );
}
