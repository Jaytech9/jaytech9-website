// GET /api/track — the client's private order page reads its order here.
// The secret token travels in the "x-order-token" header (never in the URL sent to the server),
// so it does not end up in logs or Referer headers.
import type { Env } from '../../_lib/env';
import { json, orderByToken, publicView } from '../../_lib/orders';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const o = await orderByToken(env, request.headers.get('x-order-token'));
  if (!o) return json({ error: 'We could not find that order. Please check the link we sent you.' }, 404);
  return json(await publicView(env, o));
};
