// Website forms post to their "thanks" page (e.g. /book/thanks/). For a POST we save the form into
// the database, then send the visitor to that same page with a normal GET, which shows "Thank you".
// Everything else passes straight through to the static site.
// Which paths run this code is listed in public/_routes.json (keeps every other page free and fast).
import type { Env } from './_lib/env';
import { saveForm, tooMany } from './_lib/forms';

const errorPage = (msg: string, status: number) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Not sent | JayTech9</title>
<body style="font-family:system-ui,sans-serif;max-width:34rem;margin:15vh auto;padding:0 1.25rem;color:#10293a;line-height:1.5">
<h1 style="font-size:1.6rem">Sorry, your message was not sent</h1><p>${msg}</p>
<p>Please try again, or message us on <a href="https://wa.me/233506181501">WhatsApp</a>.</p>
<p><a href="javascript:history.back()">← Go back to the form</a></p></body>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  if (request.method !== 'POST' || new URL(request.url).pathname.startsWith('/api/')) return ctx.next();

  let form: FormData;
  try { form = await request.formData(); } catch { return errorPage('The form could not be read.', 400); }

  // Hidden "company-website" field: people never see it, bots fill it in. Pretend it worked.
  const bot = !!String(form.get('company-website') ?? '').trim();
  if (!bot) {
    try {
      if (await tooMany(env, request.headers.get('cf-connecting-ip') ?? 'unknown')) return errorPage('Too many messages in a short time. Please wait a minute.', 429);
      if (!(await saveForm(env, form))) return errorPage('Some details were missing.', 400);
    } catch (e) {
      console.error('form not saved', (e as Error).message);
      return errorPage('Something went wrong on our side.', 500);
    }
  }
  return Response.redirect(request.url, 303);
};
