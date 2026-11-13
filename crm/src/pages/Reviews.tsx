import { useState } from 'react';
import { logActivity, publishWebsiteSoon, updateRow, useTable } from '../lib/store';
import { Button, Card, Empty, Field, Modal, PageHead, Pill, Segmented, Skeleton, Stars, Switch, useNow, useToast } from '../components/ui';
import { ago } from '../lib/format';
import type { Review, ReviewStatus } from '../lib/types';

export default function Reviews() {
  const { rows, loaded } = useTable('reviews');
  const sections = useTable('site_sections').rows;
  const now = useNow();
  const toast = useToast();
  const [tab, setTab] = useState<ReviewStatus>('pending');
  const [editing, setEditing] = useState<Review | null>(null);
  const accept = sections.find((s) => s.key === 'accept_reviews');
  const list = rows.filter((r) => r.status === tab);
  const count = (s: ReviewStatus) => rows.filter((r) => r.status === s).length;

  const set = async (r: Review, status: ReviewStatus, patch: Partial<Review> = {}) => {
    try {
      await updateRow('reviews', r.id, { ...patch, status });
      logActivity('review', status === 'approved' ? 'Review approved' : status === 'rejected' ? 'Review rejected' : 'Review moved back', r.name, r.id);
      toast(status === 'approved' ? 'Approved. It will show on the website in about a minute.' : status === 'rejected' ? 'Rejected. It will not show.' : 'Moved back to waiting');
      if (status === 'approved' || r.status === 'approved') publishWebsiteSoon();
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  return (
    <>
      <PageHead title="Reviews" sub="Reviews from the website wait here. Nothing shows on the site until you approve it." />
      {accept && (
        <div className="callout card" style={{ background: 'var(--surface)' }}>
          <p><strong>Accept new reviews</strong><small>Shows the “Share your experience” form on the website.</small></p>
          <Pill tone={accept.enabled ? 'green' : 'grey'}>{accept.enabled ? 'Open' : 'Closed'}</Pill>
          <Switch label="Accept new reviews" on={accept.enabled} onChange={(v) => updateRow('site_sections', accept.key, { enabled: v }).then(() => { publishWebsiteSoon(); toast(v ? 'Review form is open' : 'Review form is closed'); }).catch((e) => toast(e.message, 'error'))} />
        </div>
      )}
      <Card>
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <Segmented label="Show" value={tab} onChange={setTab} options={[{ id: 'pending', label: `Waiting (${count('pending')})` }, { id: 'approved', label: `On website (${count('approved')})` }, { id: 'rejected', label: `Rejected (${count('rejected')})` }]} />
        </div>
        {!loaded ? <Skeleton /> : list.length === 0 ? <Empty icon="star" title={tab === 'pending' ? 'No reviews waiting' : 'Nothing here yet'} text={tab === 'pending' ? 'New reviews from the website will appear here.' : undefined} /> : (
          <div className="grid grid--2e">
            {list.map((r) => (
              <article key={r.id} className="review">
                <div className="review__head">
                  <strong>{r.name}{r.organisation && <span className="muted" style={{ fontWeight: 500 }}> · {r.role ? `${r.role}, ` : ''}{r.organisation}</span>}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>{ago(r.created_at, now)}</span>
                </div>
                <Stars value={r.rating ?? 5} />
                <p>“{r.message}”</p>
                {!r.consent && <Pill tone="amber">No permission to publish</Pill>}
                <div className="review__actions">
                  {r.status !== 'approved' && <Button size="sm" variant="green" disabled={!r.consent} onClick={() => set(r, 'approved')}>Approve</Button>}
                  <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>Edit</Button>
                  {r.status !== 'rejected' && <Button size="sm" variant="danger" onClick={() => set(r, 'rejected')}>{r.status === 'approved' ? 'Remove from website' : 'Reject'}</Button>}
                  {r.status === 'rejected' && <Button size="sm" variant="ghost" onClick={() => set(r, 'pending')}>Move back</Button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
      <Modal open={!!editing} title="Edit review" onClose={() => setEditing(null)} footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" form="rf">Save</Button></>}>
        {editing && (
          <form id="rf" className="form" key={editing.id} onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
            await set(editing, editing.status, { name: f.name, role: f.role || null, organisation: f.organisation || null, message: f.message });
            setEditing(null);
          }}>
            <Field label="Name"><input name="name" required defaultValue={editing.name} /></Field>
            <Field label="Role"><input name="role" defaultValue={editing.role ?? ''} placeholder="e.g. Director" /></Field>
            <Field label="Organisation" wide><input name="organisation" defaultValue={editing.organisation ?? ''} /></Field>
            <Field label="Review" wide hint="Fix spelling only. Keep the client's meaning."><textarea name="message" rows={4} required defaultValue={editing.message} /></Field>
          </form>
        )}
      </Modal>
    </>
  );
}
