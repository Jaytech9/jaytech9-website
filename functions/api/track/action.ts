// POST /api/track/action — what a client can do on their order page:
//   { action: "approve" }                         accept the preview
//   { action: "changes", message }                ask for changes (counts against the included revisions)
//   { action: "message", message }                send a note to the team
//   { action: "review", rating, message, consent_review, consent_portfolio }  after completion
import type { Env } from '../../_lib/env';
import { tooMany } from '../../_lib/forms';
import { clean, json, now, orderByToken, publicView, uuid } from '../../_lib/orders';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (await tooMany(env, request.headers.get('cf-connecting-ip') ?? 'unknown')) return json({ error: 'Too many requests. Please wait a minute.' }, 429);
  const o = await orderByToken(env, request.headers.get('x-order-token'));
  if (!o) return json({ error: 'Order not found.' }, 404);
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const db = env.DB, t = now();
  const note = (msg: string, author = 'client') =>
    db.prepare('INSERT INTO order_updates (id, order_id, author, message, created_at) VALUES (?, ?, ?, ?, ?)').bind(uuid(), o.id, author, msg, t);

  switch (b.action) {
    case 'approve': {
      if (o.status !== 'preview') return json({ error: 'There is no preview waiting for approval.' }, 409);
      await db.batch([
        db.prepare("UPDATE orders SET status = 'approved', approved_at = ?, updated_at = ? WHERE id = ?").bind(t, t, o.id),
        note('Preview approved. The balance can now be paid to release the final files.'),
      ]);
      break;
    }
    case 'changes': {
      const msg = clean(b.message, 3000);
      if (o.status !== 'preview') return json({ error: 'Changes can be requested once a preview is ready.' }, 409);
      if (!msg) return json({ error: 'Please describe the changes you would like.' }, 400);
      const extra = o.revisions_used >= o.revisions_included;
      await db.batch([
        db.prepare("UPDATE orders SET status = 'changes', revisions_used = revisions_used + 1, updated_at = ? WHERE id = ?").bind(t, o.id),
        note(`Changes requested${extra ? ' (beyond the included rounds, so we will confirm any extra cost first)' : ''}: ${msg}`),
      ]);
      break;
    }
    case 'message': {
      const msg = clean(b.message, 3000);
      if (!msg) return json({ error: 'Please write a message.' }, 400);
      if (['completed', 'cancelled'].includes(o.status) && Date.now() - Date.parse(o.updated_at) > 90 * 86400e3) return json({ error: 'This order is closed. Please message us on WhatsApp.' }, 409);
      await note(msg).run();
      await db.prepare('UPDATE orders SET updated_at = ? WHERE id = ?').bind(t, o.id).run();
      break;
    }
    case 'review': {
      if (o.status !== 'completed') return json({ error: 'Reviews open once the order is complete.' }, 409);
      if (o.reviewed_at) return json({ error: 'Thank you, we already have your review.' }, 409);
      const rating = Math.round(Number(b.rating));
      const msg = clean(b.message, 2000);
      if (!(rating >= 1 && rating <= 5) || !msg) return json({ error: 'Please choose a star rating and write a few words.' }, 400);
      const showReview = b.consent_review === true, showWork = b.consent_portfolio === true;
      await db.batch([
        db.prepare('UPDATE orders SET review_rating = ?, review_message = ?, consent_review = ?, consent_portfolio = ?, reviewed_at = ?, updated_at = ? WHERE id = ?')
          .bind(rating, msg, showReview ? 1 : 0, showWork ? 1 : 0, t, t, o.id),
        // Goes into the normal Reviews queue in the CRM; it only shows on the website after approval AND consent.
        db.prepare("INSERT INTO reviews (id, name, organisation, rating, message, consent, product, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)")
          .bind(uuid(), o.name, o.organisation, rating, msg, showReview ? 1 : 0, o.service, t),
        note(`Review left (${rating}★). ${showReview ? 'OK to show the review.' : 'Review kept private.'} ${showWork ? 'OK to show the work in the portfolio.' : 'Work kept private.'}`, 'system'),
      ]);
      break;
    }
    default:
      return json({ error: 'Unknown action.' }, 400);
  }
  const fresh = await orderByToken(env, o.token);
  return json(await publicView(env, fresh!));
};
