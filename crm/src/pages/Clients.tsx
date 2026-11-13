import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { insertRow, updateRow, useTable } from '../lib/store';
import { Avatar, Button, Card, Empty, Field, Modal, PageHead, Pill, SearchBox, Skeleton, Switch, useNow, useToast } from '../components/ui';
import ContactButtons from '../components/ContactButtons';
import { ago, dateMed, money, when } from '../lib/format';
import { SERVICES, type Client } from '../lib/types';
import { BookingStatusPill } from './Bookings';

export default function Clients() {
  const { rows, loaded } = useTable('clients');
  const bookings = useTable('bookings').rows, deals = useTable('deals').rows, projects = useTable('projects').rows;
  const now = useNow();
  const toast = useToast();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((c) => !s || [c.name, c.organisation, c.phone, c.email].some((v) => v?.toLowerCase().includes(s)));
  }, [rows, q]);
  const open = rows.find((c) => c.id === openId) ?? null;
  const spent = (id: string) => deals.filter((d) => d.client_id === id && d.stage === 'won').reduce((s, d) => s + Number(d.value), 0);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const row = { name: f.name, organisation: f.organisation || null, phone: f.phone || null, email: f.email || null, service: f.service || null, source: f.source || null, notes: f.notes || null, marketing_opt_in: f.opt === 'on' };
    try {
      if (editing?.id) await updateRow('clients', editing.id, row); else await insertRow('clients', row);
      toast(editing?.id ? 'Client updated' : 'Client added');
      setEditing(null);
    } catch (err) { toast((err as Error).message, 'error'); }
  };

  return (
    <>
      <PageHead title="Clients" sub={`${rows.length} people and organisations.`} actions={<Button icon="plus" onClick={() => setEditing({})}>Add client</Button>} />
      <Card pad={false}>
        <div className="toolbar" style={{ padding: '16px 20px' }}><SearchBox value={q} onChange={setQ} placeholder="Search name, phone or email" /></div>
        {!loaded ? <div style={{ padding: 20 }}><Skeleton /></div> : list.length === 0 ? <Empty icon="users" title="No clients found" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Client</th><th className="hide-sm">Phone</th><th className="hide-sm">Service</th><th className="num">Won</th><th className="hide-sm">Messages</th></tr></thead>
              <tbody>
                {list.map((c, i) => (
                  <tr key={c.id} className="is-click" onClick={() => setOpenId(c.id)}>
                    <td><div className="who"><Avatar name={c.name} tone={i} /><div><strong>{c.name}</strong><small>{c.organisation || c.email}</small></div></div></td>
                    <td className="hide-sm tnum">{c.phone}</td>
                    <td className="hide-sm">{c.service}</td>
                    <td className="num">{money(spent(c.id))}</td>
                    <td className="hide-sm">{c.marketing_opt_in ? <Pill tone="green">Opted in</Pill> : <Pill>Not opted in</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal wide open={!!open} title={open?.name ?? ''} onClose={() => setOpenId(null)} footer={open && <Button variant="secondary" icon="edit" onClick={() => { setEditing(open); setOpenId(null); }}>Edit</Button>}>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <ContactButtons phone={open.phone} email={open.email} name={open.name} />
            <dl className="dl">
              <dt>Organisation</dt><dd>{open.organisation || '—'}</dd><dt>Phone</dt><dd>{open.phone || '—'}</dd><dt>Email</dt><dd>{open.email || '—'}</dd>
              <dt>Client since</dt><dd>{dateMed(open.created_at)}</dd><dt>Found us</dt><dd>{open.source || '—'}</dd><dt>Total won</dt><dd>{money(spent(open.id))}</dd>
              <dt>Notes</dt><dd style={{ fontWeight: 400 }}>{open.notes || '—'}</dd>
            </dl>
            <div className="callout">
              <p>Promotional messages<small>Only switch on if the client agreed to receive offers.</small></p>
              <Switch label="Promotional messages" on={open.marketing_opt_in} onChange={(v) => updateRow('clients', open.id, { marketing_opt_in: v }).catch((e) => toast(e.message, 'error'))} />
            </div>
            <h3 style={{ fontSize: 15 }}>History</h3>
            <ul className="list">
              {[
                ...bookings.filter((b) => b.client_id === open.id).map((b) => ({ at: b.created_at, el: <><div className="list__main"><strong>Booking · {b.service}</strong><small>{b.call_at ? when(b.call_at, now) : ''}</small></div><BookingStatusPill s={b.status} /></> })),
                ...deals.filter((d) => d.client_id === open.id).map((d) => ({ at: d.created_at, el: <><div className="list__main"><strong>Deal · {d.title}</strong><small>{ago(d.created_at, now)}</small></div><span className="tnum" style={{ fontWeight: 700 }}>{money(d.value)}</span></> })),
                ...projects.filter((p) => p.client_id === open.id).map((p) => ({ at: p.created_at, el: <><div className="list__main"><strong>Project · {p.title}</strong><small>{p.progress}% done</small></div></> })),
              ].sort((a, b) => b.at.localeCompare(a.at)).map((x, i) => <li key={i}>{x.el}</li>)}
            </ul>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} title={editing?.id ? 'Edit client' : 'Add client'} onClose={() => setEditing(null)} footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" form="cf">Save</Button></>}>
        {editing && (
          <form id="cf" className="form" onSubmit={save} key={editing.id ?? 'new'}>
            <Field label="Name"><input name="name" required defaultValue={editing.name} /></Field>
            <Field label="Organisation"><input name="organisation" defaultValue={editing.organisation ?? ''} /></Field>
            <Field label="Phone"><input name="phone" type="tel" defaultValue={editing.phone ?? ''} /></Field>
            <Field label="Email"><input name="email" type="email" defaultValue={editing.email ?? ''} /></Field>
            <Field label="Main service"><select name="service" defaultValue={editing.service ?? ''}><option value="">—</option>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="How they found us"><input name="source" defaultValue={editing.source ?? ''} /></Field>
            <Field label="Notes" wide><textarea name="notes" rows={3} defaultValue={editing.notes ?? ''} /></Field>
            <label className="check field--wide"><input type="checkbox" name="opt" defaultChecked={editing.marketing_opt_in} />The client agreed to receive offers by SMS, WhatsApp or email</label>
          </form>
        )}
      </Modal>
    </>
  );
}
