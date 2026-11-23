// Team uploads for an order: previews (watermarked in the browser first) and final files.
//   POST   /api/order-upload   multipart: id, kind ("preview" | "final"), files (any type, many)
//   DELETE /api/order-upload?id=…   removes one of the team's files (never the client's)
// Pages Functions accept about 100 MB per request, so very large videos still go by link.
import type { Ctx } from '../_lib/env';
import { HttpError, fail, json, now, uuid } from '../_lib/http';
import { fromDb } from '../_lib/tables';

const MAX_TOTAL = 95 * 1024 * 1024;

export const onRequestPost = async (ctx: Ctx) => {
  try {
    if (!ctx.env.FILES) throw new HttpError(503, 'File storage is not connected to the CRM yet.');
    const f = await ctx.request.formData();
    const id = String(f.get('id') ?? ''), kind = String(f.get('kind') ?? '');
    if (!['preview', 'final'].includes(kind)) throw new HttpError(400, 'Unknown file type.');
    const order = await ctx.env.DB.prepare('SELECT id, ref, status FROM orders WHERE id = ?').bind(id).first<{ id: string; ref: string; status: string }>();
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.status === 'cancelled') throw new HttpError(409, 'This order is cancelled.');
    const files = f.getAll('files').filter((x): x is File => x instanceof File && x.size > 0);
    if (!files.length) throw new HttpError(400, 'Choose at least one file.');
    if (files.length > 20) throw new HttpError(400, 'Upload at most 20 files at a time.');
    if (files.reduce((n, x) => n + x.size, 0) > MAX_TOTAL) throw new HttpError(413, 'Too big for one upload (95 MB). Upload fewer files at a time, or share very large videos by link.');
    const t = now();
    const rows = [];
    for (const file of files) {
      const key = `orders/${order.id}/${kind}/${uuid()}`;
      const name = file.name.replace(/[\\/\r\n"]/g, '_').slice(0, 200) || 'file';
      await ctx.env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type || 'application/octet-stream' } });
      const row = { id: uuid(), order_id: order.id, r2_key: key, name, size: file.size, type: file.type || null, kind, created_at: t };
      rows.push(row);
      await ctx.env.DB.prepare('INSERT INTO order_files (id, order_id, r2_key, name, size, type, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(row.id, row.order_id, row.r2_key, row.name, row.size, row.type, row.kind, row.created_at).run();
    }
    await ctx.env.DB.prepare('INSERT INTO activity (id, entity, entity_id, action, detail, actor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(uuid(), 'order', order.id, `${kind} files uploaded`, `${order.ref} · ${files.length} file${files.length > 1 ? 's' : ''}`, ctx.data.user.email, t).run();
    return json(rows.map((r) => fromDb(r)), 201);
  } catch (e) { return fail(e); }
};

export const onRequestDelete = async (ctx: Ctx) => {
  try {
    const id = new URL(ctx.request.url).searchParams.get('id') ?? '';
    const f = await ctx.env.DB.prepare("SELECT r2_key, kind FROM order_files WHERE id = ?").bind(id).first<{ r2_key: string; kind: string }>();
    if (!f) throw new HttpError(404, 'File not found.');
    if (f.kind === 'client') throw new HttpError(403, "Client files can't be removed here.");
    await ctx.env.FILES?.delete(f.r2_key);
    await ctx.env.DB.prepare('DELETE FROM order_files WHERE id = ?').bind(id).run();
    return json({ ok: true });
  } catch (e) { return fail(e); }
};
