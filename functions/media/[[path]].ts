// GET /media/gallery/… and /media/logos/… — public pictures and videos uploaded in the CRM (stored in R2).
// Only these two folders are public; client order files are never served here.
// Supports Range requests so videos can be played and scrubbed.
import type { Env } from '../_lib/env';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const key = (Array.isArray(params.path) ? params.path : [params.path]).join('/');
  if (!/^(gallery|logos)\/[A-Za-z0-9._-]+$/.test(key) || !env.FILES) return new Response('Not found', { status: 404 });
  const range = request.headers.get('range');
  const obj = await env.FILES.get(key, range ? { range: request.headers } : undefined);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');   // keys never change: a new upload gets a new name
  headers.set('x-content-type-options', 'nosniff');
  headers.set('accept-ranges', 'bytes');
  if (range && obj.range && 'offset' in obj.range) {
    const start = obj.range.offset ?? 0;
    const len = obj.range.length ?? obj.size - start;
    headers.set('content-range', `bytes ${start}-${start + len - 1}/${obj.size}`);
    headers.set('content-length', String(len));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set('content-length', String(obj.size));
  return new Response(obj.body, { headers });
};
