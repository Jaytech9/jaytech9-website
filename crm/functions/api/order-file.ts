// GET /api/order-file?id=… — download a file a client uploaded with their order (staff only; the
// /api middleware has already checked the sign-in). Files live in the private R2 bucket.
import type { Ctx } from '../_lib/env';
import { HttpError, fail } from '../_lib/http';

export const onRequestGet = async (ctx: Ctx) => {
  try {
    if (!ctx.env.FILES) throw new HttpError(503, 'File storage is not connected to the CRM yet.');
    const id = new URL(ctx.request.url).searchParams.get('id') ?? '';
    const f = await ctx.env.DB.prepare('SELECT r2_key, name, type FROM order_files WHERE id = ?').bind(id).first<{ r2_key: string; name: string; type: string | null }>();
    if (!f) throw new HttpError(404, 'File not found.');
    const obj = await ctx.env.FILES.get(f.r2_key);
    if (!obj) throw new HttpError(404, 'File not found in storage.');
    return new Response(obj.body, { headers: {
      'content-type': f.type || 'application/octet-stream',
      'content-disposition': `attachment; filename="${f.name.replace(/["\\\r\n]/g, '')}"`,
      'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff',
    } });
  } catch (e) { return fail(e); }
};
