import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { insertRow, logActivity, updateRow, useTable } from '../lib/store';
import { Button, Card, Empty, Field, Modal, PageHead, Pill, SearchBox, Segmented, Skeleton, useNow, useToast } from '../components/ui';
import ContactButtons from '../components/ContactButtons';
import { ago, dateMed, when } from '../lib/format';
import { SERVICES, type Booking, type BookingStatus } from '../lib/types';

const LABEL: Record<BookingStatus, [string, 'blue' | 'green' | 'grey' | 'red' | 'amber']> = {
  new: ['New', 'blue'], confirmed: ['Confirmed', 'green'], done: ['Done', 'grey'], cancelled: ['Cancelled', 'red'], no_show: ['No show', 'amber'],
};
export const BookingStatusPill = ({ s }: { s: BookingStatus }) => <Pill tone={LABEL[s][1]}>{LABEL[s][0]}</Pill>;

type Filter = 'upcoming' | 'new' | 'past' | 'all';
const METHODS = ['Phone call', 'WhatsApp call', 'Google Meet', 'In person (Accra)'];

export default function Bookings() {
  const { rows, loaded } = useTable('bookings');
  const deals = useTable('deals');
  const now = useNow();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(params.get('open'));
  const [creating, setCreating] = useState(params.get('new') === '1');
  useEffect(() => { if (params.get('new') || params.get('open')) setParams({}, { replace: true }); }, [params, setParams]);

  const list = useMemo(() => {
    const t = now.getTime();
    let l = rows;
    if (filter === 'upcoming') l = l.filter((b) => b.call_at && Date.parse(b.call_at) >= t - 3600e3 && ['new', 'confirmed'].includes(b.status)).sort((a, b) => Date.parse(a.call_at!) - Date.parse(b.call_at!));
    if (filter === 'new') l = l.filter((b) => b.status === 'new');
    if (filter === 'past') l = l.filter((b) => b.call_at && Date.parse(b.call_at) < t);
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((b) => [b.name, b.organisation, b.phone, b.email, b.service].some((v) => v?.toLowerCase().includes(s)));
    return l;
  }, [rows, filter, q, now]);
  const open = rows.find((b) => b.id === openId) ?? null;

  const setStatus = async (b: Booking, status: BookingStatus) => {
    try { await updateRow('bookings', b.id, { status }); logActivity('booking', `Booking ${LABEL[status][0].toLowerCase()}`, b.name, b.id); toast(`Marked as ${LABEL[status][0].toLowerCase()}`); }
    catch (e) { toast((e as Error).message, 'error'); }
  };
  const toDeal = async (b: Booking) => {
    if (deals.rows.some((d) => d.client_id && d.client_id === b.client_id && !['won', 'lost'].includes(d.stage))) { toast('This client already has an open deal'); return; }
    try {
      await insertRow('deals', { client_id: b.client_id ?? null, title: `${b.service ?? 'Project'} · ${b.organisation || b.name}`, service: b.service, value: 0, stage: 'call' });
      toast('Added to the pipeline');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  return (
    <>
      <PageHead title="Bookings" sub="Free calls booked on the website, or added by you." actions={<Button icon="plus" onClick={() => setCreating(true)}>New booking</Button>} />
      <Card pad={false}>
        <div className="toolbar" style={{ padding: '16px 20px' }}>
          <Segmented label="Show" value={filter} onChange={setFilter} options={[{ id: 'upcoming', label: 'Upcoming' }, { id: 'new', label: 'New' }, { id: 'past', label: 'Past' }, { id: 'all', label: 'All' }]} />
          <SearchBox value={q} onChange={setQ} placeholder="Search name, phone, service" />
        </div>
        {!loaded ? <div style={{ padding: 20 }}><Skeleton /></div> : list.length === 0 ? (
          <Empty icon="calendar" title="Nothing here" text={filter === 'upcoming' ? 'No calls coming up.' : 'Try another filter or search.'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Client</th><th>Call</th><th className="hide-sm">Service</th><th className="hide-sm">Budget</th><th>Status</th></tr></thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id} className="is-click" onClick={() => setOpenId(b.id)}>
                    <td><div className="who"><div><strong>{b.name}</strong><small>{b.organisation || b.phone}</small></div></div></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{b.call_at ? when(b.call_at, now) : '—'}<br /><small className="muted">{b.method}</small></td>
                    <td className="hide-sm">{b.service}{b.timeline?.startsWith('Urgent') && <> <Pill tone="amber">Urgent</Pill></>}</td>
                    <td className="hide-sm">{b.budget}</td>
                    <td><BookingStatusPill s={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!open} title={open?.name ?? ''} onClose={() => setOpenId(null)} footer={open && (
        <>
          {open.status === 'new' && <Button variant="green" icon="check" onClick={() => setStatus(open, 'confirmed')}>Confirm call</Button>}
          {['new', 'confirmed'].includes(open.status) && <Button variant="secondary" onClick={() => setStatus(open, 'done')}>Mark done</Button>}
          {['new', 'confirmed'].includes(open.status) && <Button variant="danger" onClick={() => setStatus(open, 'cancelled')}>Cancel</Button>}
          {open.status === 'done' && <Button icon="columns" onClick={() => toDeal(open)}>Add to pipeline</Button>}
        </>
      )}>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><BookingStatusPill s={open.status} /><span className="muted">Booked {ago(open.created_at, now)}</span></div>
            <ContactButtons phone={open.phone} email={open.email} name={open.name} />
            <dl className="dl">
              <dt>Call</dt><dd>{open.call_at ? `${when(open.call_at, now)} · ${open.method ?? ''}` : '—'}</dd>
              <dt>Service</dt><dd>{open.service}</dd>
              <dt>Organisation</dt><dd>{open.organisation || '—'}</dd>
              <dt>Budget</dt><dd>{open.budget || '—'}</dd>
              <dt>Timeline</dt><dd>{open.timeline || '—'}</dd>
              <dt>Phone</dt><dd>{open.phone || '—'}</dd>
              <dt>Email</dt><dd>{open.email || '—'}</dd>
              <dt>Found us</dt><dd>{open.source || '—'}</dd>
              <dt>Project</dt><dd style={{ fontWeight: 400 }}>{open.details || '—'}</dd>
            </dl>
          </div>
        )}
      </Modal>
      <NewBooking open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function NewBooking({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const clients = useTable('clients').rows;
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    try {
      const match = clients.find((c) => (f.phone && c.phone === f.phone) || (f.email && c.email?.toLowerCase() === f.email.toLowerCase()));
      const client = match ?? await insertRow('clients', { name: f.name, phone: f.phone || null, email: f.email || null, organisation: f.organisation || null, service: f.service, source: 'Added in CRM', marketing_opt_in: false });
      await insertRow('bookings', {
        client_id: client.id, name: f.name, phone: f.phone || null, email: f.email || null, organisation: f.organisation || null,
        service: f.service, method: f.method, call_at: f.when ? new Date(f.when).toISOString() : null, details: f.details || null,
        status: 'confirmed', source: 'Added in CRM',
      });
      toast('Booking added');
      onClose();
    } catch (err) { toast((err as Error).message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} title="New booking" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="nb" disabled={busy}>Save booking</Button></>}>
      <form id="nb" className="form" onSubmit={submit}>
        <Field label="Client name"><input name="name" required autoComplete="off" /></Field>
        <Field label="Organisation"><input name="organisation" /></Field>
        <Field label="Phone"><input name="phone" type="tel" placeholder="024 123 4567" /></Field>
        <Field label="Email"><input name="email" type="email" /></Field>
        <Field label="Service"><select name="service">{SERVICES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="How"><select name="method">{METHODS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Date and time" hint={`Ghana time. Today is ${dateMed(new Date())}.`} wide><input name="when" type="datetime-local" required /></Field>
        <Field label="Notes" wide><textarea name="details" rows={3} /></Field>
      </form>
    </Modal>
  );
}
