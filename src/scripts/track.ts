// Client order page (/track/#token). See src/pages/track.astro. Everything is built with
// textContent (never innerHTML), so nothing a client or the team types can run as code.
type Step = { key: string; title: string; text: string };
export type Order = {
  ref: string; name: string; organisation: string | null; service: string | null; title: string | null; brief: string | null;
  status: string; total: number; deposit_pct: number; deposit: number; balance: number; late_discount: number; late: boolean;
  quote_note: string | null; turnaround_days: number | null; revisions_included: number; revisions_used: number;
  deposit_paid: boolean; materials_ready: boolean; started_at: string | null; due_at: string | null; wanted_by: string | null;
  preview_url: string | null; final_url: string | null; reviewed: boolean; created_at: string; can_pay: boolean;
  updates: { author: string; message: string; created_at: string }[];
  payments: { kind: string; amount: number; method: string; paid_at: string }[];
  files: { name: string; size: number }[];
};

const root = document.getElementById('t-root')!;
const STEPS: Step[] = JSON.parse(root.dataset.steps!);
const WA = root.dataset.wa!;
const $ = (id: string) => document.getElementById(id)!;
const params = new URLSearchParams(location.search);
const KEY = 'jt9-pay-token';

// Coming back from Paystack: the token was kept in this tab before leaving.
let token = location.hash.slice(1);
const reference = params.get('reference') || params.get('trxref');
if (!token && reference) { try { token = sessionStorage.getItem(KEY) ?? ''; } catch { /* storage off */ } }
if (token && !location.hash) history.replaceState(null, '', `/track/${location.search}#${token}`);

const ghs = (p: number) => `GH₵ ${(p / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Accra' });
const stamp = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' });
const safeUrl = (u: string | null) => (u && /^https:\/\//i.test(u) ? u : null);

type Kid = Node | string | null | false | undefined;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...kids: Kid[]) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else el.setAttribute(k, String(v));
  }
  for (const c of kids) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const btn = (label: string, cls = 'button', onClick?: (b: HTMLButtonElement) => void) => {
  const b = h('button', { class: cls, type: 'button' }, label);
  if (onClick) b.addEventListener('click', () => onClick(b));
  return b;
};

const STATUS: Record<string, [string, string, string]> = {
  requested: ['Request received', '', 'We are reading your brief and preparing a quote.'],
  quoted: ['Quote ready', 'amber', 'Your quote is ready. Pay the deposit to start the work.'],
  in_progress: ['In progress', '', 'We are working on your order.'],
  preview: ['Preview ready', 'amber', 'Your preview is ready to check.'],
  changes: ['Making changes', '', 'We are working on the changes you asked for.'],
  approved: ['Approved', 'amber', 'Thank you for approving. Pay the balance to download your files.'],
  completed: ['Completed', 'green', 'Your order is complete. Your files are ready to download.'],
  cancelled: ['Cancelled', 'grey', 'This order was cancelled.'],
};
const STEP_AT: Record<string, number> = { requested: 0, quoted: 1, in_progress: 2, changes: 2, preview: 3, approved: 4, completed: 5, cancelled: -1 };

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(path, { ...init, headers: { 'x-order-token': token, 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
  return body;
}
const busy = (b: HTMLButtonElement, on: boolean, label?: string) => { b.classList.toggle('is-busy', on); if (label) b.textContent = label; };
const errBox = () => h('p', { class: 'of-error', role: 'alert', hidden: true });
const fail = (box: HTMLElement, e: unknown) => { box.textContent = (e as Error).message; box.hidden = false; };
const act = async (b: HTMLButtonElement, box: HTMLElement, label: string, body: Record<string, unknown>) => {
  busy(b, true, 'Saving…');
  try { draw(await api('/api/track/action', { method: 'POST', body: JSON.stringify(body) })); }
  catch (e) { fail(box, e); busy(b, false, label); }
};

// Two taps instead of a browser dialog (dialogs are easy to tap by accident on phones).
function confirmInline(b: HTMLButtonElement, msg: string) {
  if (b.dataset.armed) return true;
  b.dataset.armed = '1'; const old = b.textContent; b.textContent = msg;
  setTimeout(() => { delete b.dataset.armed; if (!b.classList.contains('is-busy')) b.textContent = old; }, 4000);
  return false;
}

function payPanel(o: Order, kind: 'deposit' | 'balance') {
  const box = errBox();
  const label = kind === 'deposit' ? 'Pay deposit' : 'Pay balance';
  const out: Node[] = [h('p', { class: 't-amount' }, ghs(kind === 'deposit' ? o.deposit : o.balance))];
  if (o.can_pay) {
    out.push(btn(label, 'button of-button-wide', async (b) => {
      busy(b, true, 'Opening secure checkout…');
      try {
        const { url } = await api('/api/pay', { method: 'POST', body: JSON.stringify({ kind }) });
        try { sessionStorage.setItem(KEY, token); } catch { /* ok */ }
        location.href = url;
      } catch (e) { fail(box, e); busy(b, false, label); }
    }), h('p', { class: 'of-lock' }, 'Mobile Money or card, secured by Paystack'));
  } else {
    out.push(h('p', {}, 'Online payment is being switched on. For now, message us and we will share the Mobile Money details.'),
      h('a', { class: 'button of-button-wide', href: `${WA}?text=${encodeURIComponent(`Hi JayTech9, I'd like to pay the ${kind} for order ${o.ref}.`)}` }, 'Pay through WhatsApp'));
  }
  out.push(box);
  return out;
}

function reviewForm() {
  let rating = 0;
  const stars = h('div', { class: 't-stars', role: 'radiogroup', 'aria-label': 'Rating' });
  const paint = () => stars.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('is-on', i < rating); b.setAttribute('aria-checked', String(i + 1 === rating)); });
  for (let i = 1; i <= 5; i++) {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', 'aria-label': `${i} star${i > 1 ? 's' : ''}` }, '★');
    b.addEventListener('click', () => { rating = i; paint(); });
    stars.append(b);
  }
  const msg = h('textarea', { rows: 4, id: 't-review', maxlength: 2000, placeholder: 'How was working with us? What did the work help you do?' });
  const c1 = h('input', { type: 'checkbox', id: 't-c1' });
  const c2 = h('input', { type: 'checkbox', id: 't-c2' });
  const box = errBox();
  return h('div', { style: 'margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--line)' },
    h('h3', {}, 'How did we do?'), stars,
    h('div', { class: 'of-field', style: 'margin-top:1rem' }, h('label', { for: 't-review' }, 'Your review'), msg),
    h('label', { class: 'of-check' }, c1, h('span', {}, 'You may show my review on the JayTech9 website.')),
    h('label', { class: 'of-check' }, c2, h('span', {}, 'You may show the finished work in the JayTech9 portfolio.')),
    h('p', { class: 'of-hint' }, 'Both are optional and separate. Nothing is shown publicly without your tick.'),
    btn('Send review', 'button of-button-wide', (b) => act(b, box, 'Send review', { action: 'review', rating, message: msg.value, consent_review: c1.checked, consent_portfolio: c2.checked })),
    box);
}

function actionCard(o: Order) {
  const [label, , text] = STATUS[o.status] ?? STATUS.requested;
  const card = h('div', { class: 'of-card t-action' }, h('h2', {}, label), h('p', {}, text));
  if (o.status === 'quoted') {
    if (o.quote_note) card.append(h('p', { style: 'white-space:pre-line' }, o.quote_note));
    card.append(h('p', {}, `Deposit (${o.deposit_pct}% of ${ghs(o.total)}):`), ...payPanel(o, 'deposit'));
    if (!o.materials_ready) card.append(h('p', { class: 'of-hint' }, 'Tip: send any missing materials now, so the clock can start as soon as the deposit is in.'));
  }
  if (o.status === 'in_progress' && !o.materials_ready) card.append(h('p', { class: 'of-hint' }, 'We are still waiting for some materials. The delivery clock starts once everything is in. Send them with a message below or on WhatsApp.'));
  if (['preview', 'changes', 'approved'].includes(o.status)) {
    const url = safeUrl(o.preview_url);
    if (url) card.append(h('div', { class: 't-preview' }, h('strong', {}, 'Watermarked preview'),
      h('a', { class: 'button', href: url, target: '_blank', rel: 'noopener noreferrer' }, 'Open preview')));
  }
  if (o.status === 'preview') {
    const left = Math.max(0, o.revisions_included - o.revisions_used);
    const box = errBox();
    const ta = h('textarea', { rows: 4, id: 't-changes', maxlength: 3000, placeholder: 'What should we change? Be as specific as you can.' });
    card.append(
      btn('Approve the preview', 'button of-button-wide', (b) => { if (confirmInline(b, 'Tap again to confirm approval')) act(b, box, 'Approve the preview', { action: 'approve' }); }),
      h('div', { class: 'of-field', style: 'margin-top:1.5rem' }, h('label', { for: 't-changes' }, 'Need changes?'), ta,
        h('p', { class: 'of-hint' }, left > 0 ? `${left} of ${o.revisions_included} rounds of changes left, included in the price.` : 'Your included rounds are used. We will confirm the cost of extra changes before starting them.')),
      btn('Request changes', 'button button--quiet of-button-wide', (b) => {
        if (!ta.value.trim()) return fail(box, new Error('Please describe the changes you would like.'));
        act(b, box, 'Request changes', { action: 'changes', message: ta.value });
      }),
      box);
  }
  if (o.status === 'approved') {
    if (o.late_discount > 0) card.append(h('p', {}, h('span', { class: 'of-badge of-badge--green' }, `10% off: ${ghs(o.late_discount)}`), ' Your preview came after the due date, so we took 10% off the balance.'));
    card.append(h('p', {}, 'Balance to release your final files:'), ...payPanel(o, 'balance'));
  }
  if (o.status === 'completed') {
    const url = safeUrl(o.final_url);
    card.append(url ? h('a', { class: 'button of-button-wide', href: url, target: '_blank', rel: 'noopener noreferrer' }, 'Download final files')
      : h('p', {}, 'We are uploading your final files and will post the link here shortly.'));
    card.append(o.reviewed ? h('p', { class: 'of-ok' }, 'Thank you for your review!') : reviewForm());
  }
  if (o.status === 'requested' || o.status === 'cancelled') card.append(h('a', { class: 'button button--quiet', href: WA }, 'Chat on WhatsApp'));
  return card;
}

function stepsCard(o: Order) {
  const at = STEP_AT[o.status] ?? 0;
  return h('div', { class: 'of-card' }, h('h2', {}, 'Progress'),
    h('ol', { class: 'of-steps' }, ...STEPS.map((s, i) =>
      h('li', { class: `of-step ${i < at ? 'is-done' : i === at ? 'is-now' : ''}` },
        h('span', { class: 'of-step__dot', 'aria-hidden': 'true' }, i < at ? '✓' : String(i + 1)),
        h('div', {}, h('strong', {}, s.title, i < at ? h('span', { class: 'visually-hidden' }, ' (done)') : i === at ? h('span', { class: 'visually-hidden' }, ' (current step)') : null),
          h('p', {}, s.text))))));
}

function summaryCard(o: Order) {
  const rows: [string, string][] = [];
  if (o.service) rows.push(['Service', o.service]);
  if (o.total) {
    rows.push(['Total', ghs(o.total)]);
    rows.push([`Deposit (${o.deposit_pct}%)`, `${ghs(o.deposit)}${o.deposit_paid ? ' · paid' : ''}`]);
    rows.push(['Balance', `${ghs(o.balance)}${o.status === 'completed' ? ' · paid' : ''}`]);
  }
  if (o.turnaround_days) rows.push(['Delivery time', `${o.turnaround_days} day${o.turnaround_days > 1 ? 's' : ''}`]);
  rows.push(['Materials', o.materials_ready ? 'All received' : o.files.length ? `${o.files.length} file${o.files.length > 1 ? 's' : ''} received` : 'Waiting']);
  if (o.started_at) rows.push(['Clock started', day(o.started_at)]);
  rows.push(['Changes included', `${o.revisions_included} rounds (${o.revisions_used} used)`]);
  const card = h('div', { class: 'of-card' }, h('h2', {}, 'Summary'));
  if (o.due_at && ['in_progress', 'changes', 'preview'].includes(o.status)) {
    const left = Math.ceil((Date.parse(o.due_at) - Date.now()) / 86400000);
    card.append(h('div', { class: 't-due', style: 'margin-bottom:1rem' }, h('strong', {}, `Due ${day(o.due_at)}`),
      h('span', { class: `of-badge ${left < 0 ? 'of-badge--amber' : ''}` }, left > 1 ? `${left} days left` : left === 1 ? 'Tomorrow' : left === 0 ? 'Today' : 'Late: 10% off your balance')));
  }
  card.append(h('dl', { class: 'of-rows' }, ...rows.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))));
  if (o.payments.length) card.append(h('h3', { style: 'margin:1.25rem 0 0.5rem;font-size:1rem' }, 'Payments received'),
    h('dl', { class: 'of-rows' }, ...o.payments.map((p) => h('div', {}, h('dt', {}, `${p.kind === 'deposit' ? 'Deposit' : 'Balance'} · ${day(p.paid_at)}`), h('dd', {}, ghs(p.amount))))));
  return card;
}

function updatesCard(o: Order) {
  const ta = h('textarea', { rows: 3, id: 't-msg', maxlength: 3000, placeholder: 'Questions, extra details, links to more materials…' });
  const box = errBox();
  const open = o.status !== 'cancelled';
  return h('div', { class: 'of-card' }, h('h2', {}, 'Updates'),
    h('ul', { class: 't-updates' }, ...o.updates.map((u) => h('li', { class: u.author === 'client' ? 'is-client' : '' },
      h('small', {}, `${u.author === 'client' ? 'You' : u.author === 'team' ? 'JayTech9' : 'Update'} · ${stamp(u.created_at)}`), h('p', {}, u.message)))),
    open && h('div', { class: 'of-field', style: 'margin:1.25rem 0 0.75rem' }, h('label', { for: 't-msg' }, 'Message us'), ta),
    open && btn('Send message', 'button button--quiet', (b) => { if (ta.value.trim()) act(b, box, 'Send message', { action: 'message', message: ta.value }); }),
    box);
}

let banner: HTMLElement | null = null;
function draw(o: Order) {
  const [label, tone] = STATUS[o.status] ?? STATUS.requested;
  $('t-ref').textContent = `Order ${o.ref}`;
  $('t-title').textContent = o.title || o.service || 'Your order';
  $('t-lede').replaceChildren(h('span', { class: `of-badge ${tone ? `of-badge--${tone}` : ''}` }, label), ` Hello ${o.name.split(' ')[0]}, here is where your order stands.`);
  document.title = `Order ${o.ref} | JayTech9`;
  root.replaceChildren(...(banner ? [banner] : []),
    h('div', { class: 't-main' }, actionCard(o), updatesCard(o)),
    h('div', { class: 't-side' }, stepsCard(o), summaryCard(o)));
}

function makeBanner(text: string, ok = true, withCopy = false) {
  const b = h('div', { class: `t-banner ${ok ? 'of-ok' : 'of-error'}`, role: 'status', style: 'margin:0' }, text);
  if (withCopy) b.append(' ', btn('Copy my order link', 'linkish', async (c) => {
    try { await navigator.clipboard.writeText(`${location.origin}/track/#${token}`); c.textContent = 'Copied'; } catch { c.textContent = 'Copy it from the address bar'; }
  }));
  return b;
}

async function start() {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) {
    $('t-lede').textContent = 'Open the order link we sent you by WhatsApp or email.';
    root.replaceChildren(...(reference ? [makeBanner('If you just paid, your payment is being recorded. Open your order link to see it.')] : []),
      h('div', { class: 'of-card' }, h('h2', {}, 'We need your order link'),
        h('p', {}, 'For your privacy, each order has its own secret link. If you lost yours, message us with your order number and we will resend it.'),
        h('a', { class: 'button', href: WA }, 'Message us on WhatsApp')));
    return;
  }
  if (params.get('new')) banner = makeBanner('Request sent. Save this page: it is your private order link. We will also send it to you.', true, true);
  if (reference) {
    let status = 'pending';
    for (let i = 0; i < 6 && status === 'pending'; i++) {
      try { status = (await (await fetch(`/api/pay/verify?reference=${encodeURIComponent(reference)}`)).json()).status ?? 'failed'; } catch { status = 'pending'; }
      if (status === 'pending') await new Promise((r) => setTimeout(r, 2500));
    }
    banner = status === 'success' ? makeBanner('Payment received. Thank you!')
      : status === 'pending' ? makeBanner('Your payment is still being confirmed. Refresh this page in a minute.')
      : makeBanner('The payment did not go through and you were not charged. Please try again.', false);
    try { sessionStorage.removeItem(KEY); } catch { /* ok */ }
  }
  if (location.search) history.replaceState(null, '', `/track/#${token}`);
  try { draw(await api('/api/track')); }
  catch (e) {
    $('t-lede').textContent = (e as Error).message;
    root.replaceChildren(h('div', { class: 'of-card' }, h('p', {}, (e as Error).message), h('a', { class: 'button', href: WA }, 'Message us on WhatsApp')));
  }
}
start();
