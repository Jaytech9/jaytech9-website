import { useMemo, useState } from 'react';
import { logActivity, updateRow, useTable } from '../lib/store';
import { Avatar, Button, Card, Empty, Modal, PageHead, Pill, SearchBox, Segmented, Skeleton, useNow, useToast } from '../components/ui';
import ContactButtons from '../components/ContactButtons';
import { ago } from '../lib/format';
import type { Enquiry, EnquiryStatus } from '../lib/types';

const TONE: Record<EnquiryStatus, ['blue' | 'green' | 'grey', string]> = { new: ['blue', 'New'], replied: ['green', 'Replied'], closed: ['grey', 'Closed'] };

export default function Enquiries() {
  const { rows, loaded } = useTable('enquiries');
  const now = useNow();
  const toast = useToast();
  const [filter, setFilter] = useState<'new' | 'all'>('new');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((e) => (filter === 'all' || e.status === 'new') && (!s || [e.name, e.message, e.needs, e.email, e.phone].some((v) => v?.toLowerCase().includes(s))));
  }, [rows, filter, q]);
  const open = rows.find((e) => e.id === openId) ?? null;
  const set = async (e: Enquiry, status: EnquiryStatus) => {
    try { await updateRow('enquiries', e.id, { status }); logActivity('enquiry', `Enquiry ${status}`, e.name, e.id); toast(`Marked as ${TONE[status][1].toLowerCase()}`); setOpenId(null); }
    catch (err) { toast((err as Error).message, 'error'); }
  };
  return (
    <>
      <PageHead title="Enquiries" sub="Messages sent from the website contact form." />
      <Card pad={false}>
        <div className="toolbar" style={{ padding: '16px 20px' }}>
          <Segmented label="Show" value={filter} onChange={setFilter} options={[{ id: 'new', label: 'Needs a reply' }, { id: 'all', label: 'All' }]} />
          <SearchBox value={q} onChange={setQ} placeholder="Search enquiries" />
        </div>
        {!loaded ? <div style={{ padding: 20 }}><Skeleton /></div> : list.length === 0 ? <Empty icon="inbox" title={filter === 'new' ? 'Inbox clear' : 'No enquiries'} text={filter === 'new' ? 'Every enquiry has a reply.' : undefined} /> : (
          <ul className="list" style={{ padding: '0 20px 8px' }}>
            {list.map((e, i) => (
              <li key={e.id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(e.id)}>
                <Avatar name={e.name} tone={i} />
                <div className="list__main"><strong>{e.name}{e.organisation ? ` · ${e.organisation}` : ''}</strong><small>{e.needs ? `${e.needs}: ` : ''}{e.message}</small></div>
                <span className="muted hide-sm" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{ago(e.created_at, now)}</span>
                <Pill tone={TONE[e.status][0]}>{TONE[e.status][1]}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Modal open={!!open} title={open?.name ?? ''} onClose={() => setOpenId(null)} footer={open && (
        <>
          {open.status !== 'closed' && <Button variant="secondary" onClick={() => set(open, 'closed')}>Close</Button>}
          {open.status === 'new' && <Button variant="green" icon="check" onClick={() => set(open, 'replied')}>Mark replied</Button>}
          {open.status === 'closed' && <Button variant="secondary" onClick={() => set(open, 'new')}>Reopen</Button>}
        </>
      )}>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span className="muted">Sent {ago(open.created_at, now)}</span>
            <p style={{ margin: 0, padding: 14, borderRadius: 12, background: 'var(--surface-2)' }}>{open.message}</p>
            <ContactButtons phone={open.phone} email={open.email} name={open.name} />
            <dl className="dl"><dt>Needs</dt><dd>{open.needs || '—'}</dd><dt>Phone</dt><dd>{open.phone || '—'}</dd><dt>Email</dt><dd>{open.email || '—'}</dd><dt>Organisation</dt><dd>{open.organisation || '—'}</dd></dl>
          </div>
        )}
      </Modal>
    </>
  );
}
