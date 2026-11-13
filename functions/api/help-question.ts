// POST /api/help-question { question, page } → saves a question the help bubble could not answer.
// Emails and phone numbers are already removed in the browser (src/help/bot.ts).
import type { Env } from '../_lib/env';
import { tooMany } from '../_lib/forms';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as { question?: string; page?: string };
    const question = String(body.question ?? '').trim().slice(0, 300);
    if (!question) return new Response(null, { status: 400 });
    if (await tooMany(env, request.headers.get('cf-connecting-ip') ?? 'unknown')) return new Response(null, { status: 429 });
    await env.DB.prepare('INSERT INTO help_questions (id, question, page, done, created_at) VALUES (?, ?, ?, 0, ?)')
      .bind(crypto.randomUUID(), question, String(body.page ?? '').slice(0, 120), new Date().toISOString()).run();
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 500 });
  }
};
