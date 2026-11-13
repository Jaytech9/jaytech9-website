// GET /api/me → the signed-in staff member
import type { Ctx } from '../_lib/env';
import { json } from '../_lib/http';

export const onRequestGet = (ctx: Ctx) => json(ctx.data.user);
