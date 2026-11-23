// Service orders: request → quote → deposit → work → preview → approval → balance → final files.
// All changes go through /api/order (crm/functions/api/order.ts), which applies the money and deadline
// rules shared with the website. Clients follow along on their private page: jaytech9.com/track/#…
import { Fragment, useMemo, useState } from 'react';
import { load, putRow, updateRow, useTable } from '../lib/store';
import { db } from '../lib/db';
import { Button, Card, Empty, Field, Modal, PageHead, Pill, SearchBox, Segmented, Skeleton, useNow, useToast } from '../components/ui';
import ContactButtons from '../components/ContactButtons';
import { Icon } from '../components/Icon';
import { ago, dateMed, when } from '../lib/format';
import { SERVICES, type Order, type OrderStatus } from '../lib/types';

const SITE = 'https://jaytech9.com';
type Tone = 'blue' | 'green' | 'grey' | 'red' | 'amber' | 'teal';
export const ORDER_STATUS: Record<OrderStatus, [string, Tone]> = {
  requested: ['Needs a quote', 'blue'], quoted: ['Quote sent', 'amber'], in_progress: ['In progress', 'teal'],
  preview: ['Preview sent', 'amber'], changes: ['Changes asked', 'red'], approved: ['Approved', 'amber'],
  completed: ['Completed', 'green'], cancelled: ['Cancelled', 'grey'],
};
const StatusPill = ({ s }: { s: OrderStatus }) => <Pill tone={ORDER_STATUS[s][1]}>{ORDER_STATUS[s][0]}</Pill>;

/** Same rules as functions/_lib/orders.ts → money(). Amounts in pesewas. */
export function orderMoney(o: Pick<Order, 'total' | 'deposit_pct' | 'preview_at' | 'due_at'>) {
  const deposit = Math.round((o.total * o.deposit_pct) / 100);
  const full = o.total - deposit;
  const late = !!(o.preview_at && o.due_at && Date.parse(o.preview_at) > Date.parse(o.due_at));
  const off = late ? Math.round(full * 0.1) : 0;
  return { deposit, full, late, off, balance: full - off };
}
const ghs = (p: number) => `GH₵ ${(p / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const trackUrl = (o: Order) => `${SITE}/track/#${o.token}`;
const waNumber = (p?: string | null) => { const d = (p ?? '').replace(/\D/g, ''); return d.startsWith('0') ? `233${d.slice(1)}` : d; };
const needsYou = (o: Order) => ['requested', 'changes', 'approved'].includes(o.status) || (o.status === 'in_progress' && !o.materials_ready_at);

async function act(body: Record<string, unknown>) {
  const row = await db.fn<Order>('order', body);
  if ((row as unknown as { demo?: boolean }).demo) throw new Error('Orders need the live CRM (not the local demo).');
  putRow('orders', row);
  load('order_updates', true); load('payments', true);
  return row;
}

type Filter = 'active' | 'needs' | 'done' | 'all';
export default function Orders() {
  const { rows, loaded, error } = useTable('orders');
  const now = useNow();
  const [filter, setFilter] = useState<Filter>('active');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const list = useMemo(() => {
    let l = rows;
    if (filter === 'active') l = l.filter((o) => !['completed', 'cancelled'].includes(o.status));
    if (filter === 'needs') l = l.filter(needsYou);
    if (filter === 'done') l = l.filter((o) => o.status === 'completed');
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((o) => [o.ref, o.name, o.organisation, o.phone, o.email, o.service, o.title].some((v) => v?.toLowerCase().includes(s)));
    return l;
  }, [rows, filter, q]);
  const open = rows.find((o) => o.id === openId) ?? null;
  const unpaid = rows.filter((o) => ['approved', 'preview', 'changes', 'in_progress'].includes(o.status)).reduce((n, o) => n + orderMoney(o).balance, 0);

  return (
    <>
      <PageHead title="Orders" sub={<>Service orders from <a href={`${SITE}/order/`} target="_blank" rel="noreferrer">jaytech9.com/order</a>. Balances still to come: <strong>{ghs(unpaid)}</strong></>}
        actions={<Button icon="plus" onClick={() => setCreating(true)}>New order</Button>} />
      <Card pad={false}>
        <div className="toolbar" style={{ padding: '16px 20px' }}>
          <Segmented label="Show" value={filter} onChange={setFilter} options={[{ id: 'active', label: 'Active' }, { id: 'needs', label: 'Needs you' }, { id: 'done', label: 'Completed' }, { id: 'all', label: 'All' }]} />
          <SearchBox value={q} onChange={setQ} placeholder="Search ref, name, phone" />
        </div>
        {error ? <Empty icon="bag" title="Orders are not set up yet" text="Run database/migrations/0001_orders_and_payments.sql on the live database, then reload." />
          : !loaded ? <div style={{ padding: 20 }}><Skeleton /></div> : list.length === 0 ? (
          <Empty icon="bag" title="No orders here" text={filter === 'needs' ? 'Nothing waiting on you.' : 'New requests from the website appear here.'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Client</th><th>Order</th><th className="hide-sm">Total</th><th className="hide-sm">Due</th><th>Status</th></tr></thead>
              <tbody>
                {list.map((o) => {
                  const late = o.due_at && !o.preview_at && Date.parse(o.due_at) < now.getTime();
                  return (
                    <tr key={o.id} className="is-click" onClick={() => setOpenId(o.id)}>
                      <td><div className="who"><div><strong>{o.name}</strong><small>{o.organisation || o.phone || o.email}</small></div></div></td>
                      <td><strong style={{ fontWeight: 600 }}>{o.title || o.service}</strong><br /><small className="muted">{o.ref} · {ago(o.created_at, now)}</small></td>
                      <td className="hide-sm">{o.total ? ghs(o.total) : '—'}</td>
                      <td className="hide-sm" style={{ whiteSpace: 'nowrap' }}>{o.due_at ? <>{dateMed(o.due_at)}{late && <> <Pill tone="red">Late</Pill></>}</> : '—'}</td>
                      <td><StatusPill s={o.status} />{o.status === 'in_progress' && !o.materials_ready_at && <><br /><small className="muted">Waiting for materials</small></>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <OrderModal o={open} onClose={() => setOpenId(null)} />}
      <NewOrder open={creating} onClose={() => setCreating(false)} onCreated={(o) => { setCreating(false); setOpenId(o.id); }} />
    </>
  );
}

function OrderModal({ o, onClose }: { o: Order; onClose: () => void }) {
  const toast = useToast();
  const now = useNow();
  const updates = useTable('order_updates').rows.filter((u) => u.order_id === o.id);
  const payments = useTable('payments').rows.filter((p) => p.order_id === o.id && p.status === 'success');
  const files = useTable('order_files').rows.filter((f) => f.order_id === o.id);
  const [busy, setBusy] = useState(false);
  const m = orderMoney(o);
  const run = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try { await act({ id: o.id, ...body }); toast(ok); return true; }
    catch (e) { toast((e as Error).message, 'error'); return false; }
    finally { setBusy(false); }
  };
  const form = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); return Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>; };
  const link = trackUrl(o);
  const waText = encodeURIComponent(`Hello ${o.name.split(' ')[0]}, this is JayTech9. You can follow your order ${o.ref} here, pay securely and approve the work: ${link}`);
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast('Client link copied'); } catch { toast('Could not copy. Select the link and copy it.', 'error'); } };
  const closed = ['completed', 'cancelled'].includes(o.status);

  return (
    <Modal open wide title={`${o.ref} · ${o.name}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusPill s={o.status} />
          {o.due_at && <Pill tone={!o.preview_at && Date.parse(o.due_at) < now.getTime() ? 'red' : 'grey'}>Due {when(o.due_at, now)}</Pill>}
          {m.late && <Pill tone="amber">Late: 10% off the balance</Pill>}
          <span className="muted">Requested {ago(o.created_at, now)}</span>
        </div>
        <ContactButtons phone={o.phone} email={o.email} name={o.name} />

        <Card title="Client's order page">
          <p className="muted" style={{ margin: '0 0 10px', wordBreak: 'break-all' }}>{link}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" variant="secondary" icon="copy" onClick={copy}>Copy link</Button>
            {o.phone && <a className="btn btn--green btn--sm" href={`https://wa.me/${waNumber(o.phone)}?text=${waText}`} target="_blank" rel="noreferrer"><Icon name="chat" size={16} /> Send on WhatsApp</a>}
            {o.email && <a className="btn btn--secondary btn--sm" href={`mailto:${o.email}?subject=${encodeURIComponent(`Your JayTech9 order ${o.ref}`)}&body=${waText}`}><Icon name="mail" size={16} /> Email it</a>}
          </div>
        </Card>

        <dl className="dl">
          <dt>Service</dt><dd>{o.service}{o.title ? ` · ${o.title}` : ''}</dd>
          <dt>Brief</dt><dd style={{ fontWeight: 400, whiteSpace: 'pre-line' }}>{o.brief || '—'}</dd>
          {o.wanted_by && <><dt>Wanted by</dt><dd>{dateMed(o.wanted_by)}</dd></>}
          <dt>Materials</dt><dd style={{ fontWeight: 400 }}>
            {o.materials_link && <div><a href={o.materials_link} target="_blank" rel="noreferrer noopener">{o.materials_link}</a></div>}
            {files.map((f) => <div key={f.id}><a href={`/api/order-file?id=${encodeURIComponent(f.id)}`}><Icon name="file" size={14} /> {f.name}</a> <small className="muted">{Math.max(1, Math.round(f.size / 1024))} KB</small></div>)}
            {!o.materials_link && !files.length && 'None yet'}
          </dd>
        </dl>

        {o.total > 0 && (
          <dl className="dl">
            <dt>Total</dt><dd>{ghs(o.total)} · {o.turnaround_days} days · {o.revisions_included} rounds ({o.revisions_used} used)</dd>
            <dt>Deposit {o.deposit_pct}%</dt><dd>{ghs(m.deposit)} {o.deposit_paid_at ? <Pill tone="green">Paid {dateMed(o.deposit_paid_at)}</Pill> : <Pill tone="grey">Not paid</Pill>}</dd>
            <dt>Balance</dt><dd>{ghs(m.balance)}{m.off > 0 && <small className="muted"> (after {ghs(m.off)} late discount)</small>} {o.balance_paid_at ? <Pill tone="green">Paid {dateMed(o.balance_paid_at)}</Pill> : null}</dd>
            {payments.map((p) => <Fragment key={p.id}><dt>{p.kind === 'deposit' ? 'Deposit' : 'Balance'} payment</dt><dd style={{ fontWeight: 400 }}>{ghs(p.amount)} · {p.method === 'paystack' ? `Paystack${p.channel ? ` (${p.channel.replace('_', ' ')})` : ''}` : 'Recorded by hand'} · {p.paid_at ? dateMed(p.paid_at) : ''}</dd></Fragment>)}
          </dl>
        )}

        {['requested', 'quoted'].includes(o.status) && (
          <Card title={o.status === 'requested' ? 'Send a quote' : 'Quote (can change until the deposit is paid)'}>
            <form className="form" onSubmit={(e) => { const f = form(e); run({ action: 'quote', total: Number(f.total), deposit_pct: Number(f.deposit_pct), turnaround_days: Number(f.days), revisions_included: Number(f.revs), quote_note: f.note }, 'Quote saved. Send the client their link.'); }}>
              <Field label="Total price (GH₵)"><input name="total" type="number" min="1" step="0.01" required defaultValue={o.total ? o.total / 100 : ''} /></Field>
              <Field label="Payment split"><select name="deposit_pct" defaultValue={o.deposit_pct}><option value="70">70% now, 30% on delivery</option><option value="50">50/50 (large projects)</option><option value="60">60% now, 40% on delivery</option><option value="100">100% up front</option></select></Field>
              <Field label="Delivery time (days)" hint="Counted from when the deposit AND all materials are in."><input name="days" type="number" min="1" max="365" required defaultValue={o.turnaround_days ?? ''} /></Field>
              <Field label="Rounds of changes included"><input name="revs" type="number" min="0" max="20" required defaultValue={o.revisions_included} /></Field>
              <Field label="Note for the client" hint="What is included, format, sizes, milestones for big projects…" wide><textarea name="note" rows={3} defaultValue={o.quote_note ?? ''} /></Field>
              <div><Button type="submit" disabled={busy} icon="send">Save quote</Button></div>
            </form>
          </Card>
        )}

        {!closed && (
          <Card title="Work">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <Button size="sm" variant={o.materials_ready_at ? 'secondary' : 'green'} icon="check" disabled={busy}
                onClick={() => run({ action: 'materials', ready: !o.materials_ready_at }, o.materials_ready_at ? 'Marked as still waiting' : 'Materials marked as received')}>
                {o.materials_ready_at ? 'Materials: received (undo)' : 'All materials received'}
              </Button>
              {o.status === 'quoted' && <Button size="sm" variant="secondary" icon="money" disabled={busy} onClick={() => run({ action: 'mark_paid', kind: 'deposit' }, 'Deposit recorded')}>Deposit paid by MoMo/cash</Button>}
              {['preview', 'changes', 'approved'].includes(o.status) && <Button size="sm" variant="secondary" icon="money" disabled={busy} onClick={() => run({ action: 'mark_paid', kind: 'balance' }, 'Balance recorded. Order completed.')}>Balance paid by MoMo/cash</Button>}
              {o.status === 'changes' && <Button size="sm" variant="secondary" icon="refresh" disabled={busy} onClick={() => run({ action: 'resume' }, 'Back in progress')}>Working on changes</Button>}
            </div>
            {['in_progress', 'changes', 'preview'].includes(o.status) && (
              <form className="form" onSubmit={(e) => { const f = form(e); run({ action: 'preview', url: f.url, message: f.msg }, 'Preview sent to the client'); }}>
                <Field label="Preview link (watermarked)" hint="Google Drive, YouTube unlisted, a staging site…" wide><input name="url" type="url" required placeholder="https://" defaultValue={o.preview_url ?? ''} /></Field>
                <Field label="Message with the preview" wide><input name="msg" placeholder="Your preview is ready." /></Field>
                <div><Button type="submit" disabled={busy} icon="eye">{o.preview_at ? 'Send new preview' : 'Send preview'}</Button></div>
              </form>
            )}
            <form className="form" style={{ marginTop: 14 }} onSubmit={(e) => { const f = form(e); run({ action: 'final', url: f.url }, 'Final files link saved'); }}>
              <Field label="Final files link" hint="Only shown to the client after the balance is paid." wide><input name="url" type="url" required placeholder="https://" defaultValue={o.final_url ?? ''} /></Field>
              <div><Button type="submit" variant="secondary" disabled={busy}>Save final link</Button></div>
            </form>
            {o.started_at && (
              <form className="form" style={{ marginTop: 14 }} onSubmit={(e) => { const f = form(e); run({ action: 'due', due_at: f.due }, 'Due date changed'); }}>
                <Field label="Move the due date" hint="Only when the delay is on the client's side (late materials or feedback)."><input name="due" type="date" required /></Field>
                <div><Button type="submit" variant="secondary" disabled={busy} icon="clock">Change date</Button></div>
              </form>
            )}
          </Card>
        )}
        {o.status === 'completed' && !o.final_url && (
          <Card title="Final files">
            <form className="form" onSubmit={(e) => { const f = form(e); run({ action: 'final', url: f.url }, 'Final files released'); }}>
              <Field label="Final files link" wide><input name="url" type="url" required placeholder="https://" /></Field>
              <div><Button type="submit" disabled={busy}>Release files</Button></div>
            </form>
          </Card>
        )}

        {o.reviewed_at && (
          <Card title={`Client review · ${'★'.repeat(o.review_rating ?? 0)}`}>
            <p style={{ margin: '0 0 8px', whiteSpace: 'pre-line' }}>{o.review_message}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill tone={o.consent_review ? 'green' : 'grey'}>{o.consent_review ? 'May show the review' : 'Review private'}</Pill>
              <Pill tone={o.consent_portfolio ? 'green' : 'grey'}>{o.consent_portfolio ? 'May show the work in the portfolio' : 'Work private'}</Pill>
            </div>
            <p className="muted" style={{ margin: '8px 0 0' }}>The review is also waiting in Reviews for your approval.</p>
          </Card>
        )}

        <Card title="Updates (the client sees these)">
          {!closed && (
            <form className="form" onSubmit={async (e) => { const el = e.currentTarget; const f = form(e); if (await run({ action: 'update', message: f.msg }, 'Update posted')) el.reset(); }}>
              <Field label="Post an update" wide><textarea name="msg" rows={2} required placeholder="Started on the storyboard today…" /></Field>
              <div><Button type="submit" size="sm" disabled={busy} icon="send">Post update</Button></div>
            </form>
          )}
          <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 10 }}>
            {updates.map((u) => (
              <li key={u.id} style={{ padding: '10px 12px', borderRadius: 12, background: u.author === 'client' ? '#e6f1f8' : 'var(--surface-2, #f3f6f8)' }}>
                <small className="muted">{u.author === 'client' ? o.name : u.author === 'team' ? 'JayTech9' : 'System'} · {ago(u.created_at, now)}</small>
                <div style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{u.message}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Field label="Internal notes (never shown to the client)" wide>
          <textarea rows={2} defaultValue={o.notes ?? ''} onBlur={(e) => { if (e.target.value !== (o.notes ?? '')) updateRow('orders', o.id, { notes: e.target.value }).then(() => toast('Notes saved')).catch((x) => toast((x as Error).message, 'error')); }} />
        </Field>
        {!closed && <div><Button variant="danger" size="sm" disabled={busy} onClick={() => { const r = window.prompt('Cancel this order? Add a short reason for the client (optional).'); if (r !== null) run({ action: 'cancel', reason: r }, 'Order cancelled'); }}>Cancel order</Button></div>}
      </div>
    </Modal>
  );
}

function NewOrder({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (o: Order) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    try { const o = await act({ action: 'create', ...f }); toast(`Order ${o.ref} opened`); onCreated(o); }
    catch (err) { toast((err as Error).message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} title="New order" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="no" disabled={busy}>Open order</Button></>}>
      <form id="no" className="form" onSubmit={submit}>
        <Field label="Client name"><input name="name" required autoComplete="off" /></Field>
        <Field label="Organisation"><input name="organisation" /></Field>
        <Field label="Phone"><input name="phone" type="tel" placeholder="024 123 4567" /></Field>
        <Field label="Email"><input name="email" type="email" /></Field>
        <Field label="Service"><select name="service">{SERVICES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Short title"><input name="title" placeholder="30-second promo video" /></Field>
        <Field label="Brief" wide><textarea name="brief" rows={3} /></Field>
      </form>
    </Modal>
  );
}
