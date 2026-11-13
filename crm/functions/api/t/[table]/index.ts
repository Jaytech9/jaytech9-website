// GET  /api/t/:table → all rows (newest first)
// POST /api/t/:table → add a row, returns it
import type { Ctx } from '../../../_lib/env';
import { HttpError, fail, json, now, uuid } from '../../../_lib/http';
import { ADMIN_ONLY_WRITE, HAS_UPDATED_AT, KEY, ORDER, READ_ONLY, fromDb, isTable, toDb } from '../../../_lib/tables';

const tableOf = (ctx: Ctx) => {
  const t = String(ctx.params.table);
  if (!isTable(t)) throw new HttpError(404, 'Unknown list');
  return t;
};

export const onRequestGet = async (ctx: Ctx) => {
  try {
    const t = tableOf(ctx);
    const { results } = await ctx.env.DB.prepare(`SELECT * FROM ${t} ORDER BY ${ORDER[t] ?? 'created_at DESC'} LIMIT 5000`).all();
    return json(results.map((r) => fromDb(r as Record<string, unknown>)));
  } catch (e) { return fail(e); }
};

export const onRequestPost = async (ctx: Ctx) => {
  try {
    const t = tableOf(ctx);
    if (READ_ONLY.has(t) || (ADMIN_ONLY_WRITE.has(t) && ctx.data.user.role !== 'admin')) throw new HttpError(403, 'Only an admin can do that.');
    const row = toDb(t, (await ctx.request.json()) as Record<string, unknown>);
    const key = KEY[t] ?? 'id';
    if (key === 'id') row.id = uuid();
    row.created_at ??= now();
    if (HAS_UPDATED_AT.has(t)) row.updated_at = now();
    if (t === 'activity') row.actor = ctx.data.user.email;
    if (t === 'campaigns') row.created_by = ctx.data.user.email;
    const cols = Object.keys(row);
    const stmt = `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) RETURNING *`;
    const saved = await ctx.env.DB.prepare(stmt).bind(...Object.values(row)).first();
    return json(fromDb(saved as Record<string, unknown>), 201);
  } catch (e) { return fail(e); }
};
