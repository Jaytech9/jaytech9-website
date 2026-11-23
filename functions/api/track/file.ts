// GET /api/track/file?id=… — the client downloads a preview or final file (token in "x-order-token").
// Final files are only released once the balance is paid. Always sent as a download with a fixed type,
// so no uploaded file can run as a web page on jaytech9.com.
import type { Env } from '../../_lib/env';
import { clientMaySee, json, orderByToken } from '../../_lib/orders';

const SAFE_INLINE = /^(image\/(png|jpe?g|gif|webp|avif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|wav|ogg|webm)|application\/pdf)$/;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const o = await orderByToken(env, request.headers.get('x-order-token'));
  if (!o) return json({ error: 'Order not found.' }, 404);
  if (!env.FILES) return json({ error: 'File storage is not available.' }, 503);
  const id = new URL(request.url).searchParams.get('id') ?? '';
  const f = await env.DB.prepare('SELECT r2_key, name, type, kind FROM order_files WHERE id = ? AND order_id = ?').bind(id, o.id)
    .first<{ r2_key: string; name: string; type: string | null; kind: string }>();
  if (!f || !clientMaySee(o, f.kind)) return json({ error: f?.kind === 'final' ? 'Final files are released once the balance is paid.' : 'File not found.' }, f ? 403 : 404);
  const obj = await env.FILES.get(f.r2_key);
  if (!obj) return json({ error: 'File not found in storage.' }, 404);
  return new Response(obj.body, { headers: {
    'content-type': f.type && SAFE_INLINE.test(f.type) ? f.type : 'application/octet-stream',
    'content-disposition': `attachment; filename="${f.name.replace(/["\\\r\n]/g, '')}"`,
    'content-length': String(obj.size),
    'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
  } });
};
