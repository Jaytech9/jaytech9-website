// PATCH  /api/t/:table/:id → change some fields, returns the row
// DELETE /api/t/:table/:id → remove it
import type { Ctx } from '../../../_lib/env';
import { HttpError, fail, json, now } from '../../../_lib/http';
import { ADMIN_ONLY_WRITE, HAS_UPDATED_AT, KEY, NO_CREATE_DELETE, READ_ONLY, fromDb, isTable, toDb } from '../../../_lib/tables';

function target(ctx: Ctx) {
  const t = String(ctx.params.table);
  if (!isTable(t)) throw new HttpError(404, 'Unknown list');
  if (READ_ONLY.has(t) || (ADMIN_ONLY_WRITE.has(t) && ctx.data.user.role !== 'admin')) throw new HttpError(403, 'Only an admin can do that.');
  return { t, key: KEY[t] ?? 'id', id: String(ctx.params.id) };
}

export const onRequestPatch = async (ctx: Ctx) => {
  try {
    const { t, key, id } = target(ctx);
    const row = toDb(t, (await ctx.request.json()) as Record<string, unknown>);
    delete row.created_at;
    if (HAS_UPDATED_AT.has(t)) row.updated_at = now();
    const cols = Object.keys(row);
    if (!cols.length) throw new HttpError(400, 'Nothing to change');
    const saved = await ctx.env.DB.prepare(`UPDATE ${t} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${key} = ? RETURNING *`)
      .bind(...Object.values(row), id).first();
    if (!saved) throw new HttpError(404, 'Not found. Someone may have deleted it.');
    return json(fromDb(saved as Record<string, unknown>));
  } catch (e) { return fail(e); }
};

export const onRequestDelete = async (ctx: Ctx) => {
  try {
    const { t, key, id } = target(ctx);
    if (NO_CREATE_DELETE.has(t) && ctx.data.user.role !== 'admin') throw new HttpError(403, 'Only an admin can delete an order.');
    if (t === 'staff' && id === ctx.data.user.id) throw new HttpError(400, 'You cannot remove yourself.');
    await ctx.env.DB.prepare(`DELETE FROM ${t} WHERE ${key} = ?`).bind(id).run();
    return json({ ok: true });
  } catch (e) { return fail(e); }
};
