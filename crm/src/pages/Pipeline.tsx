import { useState } from 'react';
import { insertRow, logActivity, removeRow, updateRow, useTable } from '../lib/store';
import { Button, Field, Modal, PageHead, Skeleton, useNow, useToast } from '../components/ui';
import { ago, money } from '../lib/format';
import { SERVICES, SERVICE_SHORT, STAGES, type Deal, type Stage } from '../lib/types';

export default function Pipeline() {
  const { rows, loaded } = useTable('deals');
  const clients = useTable('clients').rows;
  const now = useNow();
  const toast = useToast();
  const [over, setOver] = useState<Stage | null>(null);
  const [editing, setEditing] = useState<Partial<Deal> | null>(null);
  const open = rows.filter((d) => !['won', 'lost'].includes(d.stage));
  const total = open.reduce((s, d) => s + Number(d.value), 0);
  const name = (id?: string | null) => clients.find((c) => c.id === id)?.name;

  const move = async (id: string, stage: Stage) => {
    const d = rows.find((x) => x.id === id);
    if (!d || d.stage === stage) return;
    try {
      await updateRow('deals', id, { stage, closed_at: stage === 'won' || stage === 'lost' ? new Date().toISOString() : null });
      logActivity('deal', `Moved to ${STAGES.find((s) => s.id === stage)!.label}`, d.title, id);
      if (stage === 'won') toast('Deal won. Create a project for it in Projects.');
    } catch (e) { toast((e as Error).message, 'error'); }
  };
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const row = { title: f.title, client_id: f.client_id || null, service: f.service, value: Number(f.value || 0), stage: f.stage as Stage };
    try {
      if (editing?.id) await updateRow('deals', editing.id, { ...row, closed_at: ['won', 'lost'].includes(row.stage) ? editing.closed_at ?? new Date().toISOString() : null });
      else await insertRow('deals', { ...row, closed_at: ['won', 'lost'].includes(row.stage) ? new Date().toISOString() : null });
      toast('Deal saved'); setEditing(null);
    } catch (err) { toast((err as Error).message, 'error'); }
  };

  return (
    <>
      <PageHead title="Pipeline" sub={<>Open deals worth <strong className="tnum" style={{ color: 'var(--ink)' }}>{money(total)}</strong>. Drag a card to move it.</>} actions={<Button icon="plus" onClick={() => setEditing({ stage: 'new' })}>New deal</Button>} />
      {!loaded ? <div className="card"><Skeleton /></div> : (
        <div className="board">
          {STAGES.map((s) => {
            const list = rows.filter((d) => d.stage === s.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
            const shown = s.id === 'won' || s.id === 'lost' ? list.slice(0, 8) : list;
            return (
              <section key={s.id} aria-label={s.label} className={`col ${over === s.id ? 'is-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOver(s.id); }} onDragLeave={() => setOver(null)}
                onDrop={(e) => { e.preventDefault(); setOver(null); move(e.dataTransfer.getData('text/plain'), s.id); }}
                style={s.id === 'won' ? { background: '#d5efdc' } : undefined}>
                <div className="col__head"><h2>{s.label} <span>{list.length}</span></h2><span>{money(list.reduce((a, d) => a + Number(d.value), 0), true)}</span></div>
                {shown.map((d) => (
                  <button key={d.id} className="deal" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', d.id)} onClick={() => setEditing(d)}>
                    <strong>{d.title}</strong>
                    <small>{name(d.client_id) ?? 'No client'} · {ago(d.updated_at, now)}</small>
                    <div className="deal__foot"><span>{money(d.value)}</span><small>{SERVICE_SHORT[d.service ?? ''] ?? d.service}</small></div>
                  </button>
                ))}
                {list.length > shown.length && <small className="muted" style={{ padding: '0 4px' }}>+{list.length - shown.length} older</small>}
              </section>
            );
          })}
        </div>
      )}
      <Modal open={!!editing} title={editing?.id ? 'Edit deal' : 'New deal'} onClose={() => setEditing(null)} footer={
        <>
          {editing?.id && <Button variant="danger" icon="trash" onClick={async () => { await removeRow('deals', editing.id!); setEditing(null); toast('Deal deleted'); }}>Delete</Button>}
          <span style={{ flex: 1 }} />
          <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" form="df">Save</Button>
        </>}>
        {editing && (
          <form id="df" className="form" onSubmit={save} key={editing.id ?? 'new'}>
            <Field label="What is the deal" wide><input name="title" required defaultValue={editing.title} placeholder="e.g. Online shop for Osu Bites" /></Field>
            <Field label="Client"><select name="client_id" defaultValue={editing.client_id ?? ''}><option value="">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.organisation ? ` · ${c.organisation}` : ''}</option>)}</select></Field>
            <Field label="Service"><select name="service" defaultValue={editing.service ?? SERVICES[0]}>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Value (GH₵)"><input name="value" type="number" min="0" step="50" inputMode="decimal" defaultValue={editing.value ?? ''} /></Field>
            <Field label="Stage"><select name="stage" defaultValue={editing.stage}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
          </form>
        )}
      </Modal>
    </>
  );
}
