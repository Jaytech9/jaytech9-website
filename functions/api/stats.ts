// GET /api/stats — live public counts (home page numbers strip, donation progress).
import type { Env } from '../_lib/env';
import { publicStats } from '../_lib/stats';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    return new Response(JSON.stringify(await publicStats(env)), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' } });
  } catch {
    return new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } });
  }
};
