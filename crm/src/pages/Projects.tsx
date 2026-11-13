import { useMemo, useState } from 'react';
import { insertRow, logActivity, publishWebsiteSoon, removeRow, updateRow, useTable } from '../lib/store';
import { Button, Card, Empty, Field, Modal, PageHead, Pill, Progress, Segmented, Skeleton, Switch, useNow, useToast } from '../components/ui';
import { Icon } from '../components/Icon';
import { dateMed, dayKey, money } from '../lib/format';
import { PROJECT_STATUS, SERVICES, type Project, type ProjectStatus } from '../lib/types';

const TONE: Record<ProjectStatus, 'blue' | 'teal' | 'amber' | 'green' | 'grey'> = { planning: 'grey', in_progress: 'blue', review: 'amber', delivered: 'green', on_hold: 'grey' };
const label = (s: ProjectStatus) => PROJECT_STATUS.find((x) => x.id === s)!.label;

export default function Projects() {
  const { rows, loaded } = useTable('projects');
  const clients = useTable('clients').rows;
  const now = useNow();
  const toast = useToast();
  const [filter, setFilter] = useState<'active' | 'delivered' | 'all'>('active');
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [web, setWeb] = useState(false);
  const today = dayKey(now);
  const list = useMemo(() => rows.filter((p) => filter === 'all' || (filter === 'delivered' ? p.status === 'delivered' : p.status !== 'delivered'))
    .sort((a, b) => String(a.due_date ?? '9').localeCompare(String(b.due_date ?? '9'))), [rows, filter]);
  const clientName = (id?: string | null) => clients.find((c) => c.id === id)?.organisation || clients.find((c) => c.id === id)?.name;

  const openEdit = (p: Partial<Project>) => { setEditing(p); setWeb(!!p.show_on_website); };
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const status = f.status as ProjectStatus;
    const row: Partial<Project> = {
      title: f.title, client_id: f.client_id || null, service: f.service, status,
      progress: status === 'delivered' ? 100 : Number(f.progress || 0), value: Number(f.value || 0),
      start_date: f.start_date || null, due_date: f.due_date || null, show_on_website: web,
      website_summary: f.website_summary || null, website_outcome: f.website_outcome || null, live_url: f.live_url || null,
    };
    try {
      if (editing?.id) await updateRow('projects', editing.id, row); else await insertRow('projects', row);
      logActivity('project', editing?.id ? 'Project updated' : 'Project added', row.title);
      if (web || editing?.show_on_website) publishWebsiteSoon((ok) => toast(ok ? 'Website updating, live in about a minute' : 'Saved. Website will update on the next publish', ok ? 'ok' : 'error'));
      toast('Project saved'); setEditing(null);
    } catch (err) { toast((err as Error).message, 'error'); }
  };

  return (
    <>
      <PageHead title="Projects" sub="Track work from start to delivery, and choose which projects show on the website." actions={
        <><Segmented label="Show" value={filter} onChange={setFilter} options={[{ id: 'active', label: 'Active' }, { id: 'delivered', label: 'Delivered' }, { id: 'all', label: 'All' }]} />
          <Button icon="plus" onClick={() => openEdit({ status: 'planning', progress: 0, start_date: today })}>New project</Button></>} />
      {!loaded ? <div className="card"><Skeleton /></div> : list.length === 0 ? <Card><Empty icon="folder" title="No projects yet" text="Add your first project to track it here." action={<Button icon="plus" onClick={() => openEdit({ status: 'planning', progress: 0 })}>New project</Button>} /></Card> : (
        <div className="pgrid">
          {list.map((p) => {
            const late = p.due_date && p.status !== 'delivered' && p.due_date < today;
            return (
              <button key={p.id} type="button" className="card pcard" onClick={() => openEdit(p)}>
                <div className="pcard__top">
                  <Pill tone={TONE[p.status]}>{label(p.status)}</Pill>
                  {p.show_on_website && <Pill tone="green"><Icon name="globe" size={12} />On website</Pill>}
                </div>
                <div><h3>{p.title}</h3><p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>{clientName(p.client_id) ?? 'Own project'} · {p.service}</p></div>
                <div><div className="pcard__meta" style={{ marginBottom: 6 }}><span>Progress</span><strong>{p.progress}%</strong></div><Progress value={p.progress} label={`${p.title} progress`} /></div>
                <div className="pcard__meta">
                  <span style={late ? { color: 'var(--red)', fontWeight: 700 } : undefined}>{p.due_date ? `${late ? 'Overdue · ' : 'Due '}${dateMed(p.due_date)}` : 'No due date'}</span>
                  <strong>{money(p.value)}</strong>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal wide open={!!editing} title={editing?.id ? 'Edit project' : 'New project'} onClose={() => setEditing(null)} footer={
        <>
          {editing?.id && <Button variant="danger" icon="trash" onClick={async () => { if (!confirm('Delete this project?')) return; await removeRow('projects', editing.id!); setEditing(null); toast('Project deleted'); }}>Delete</Button>}
          <span style={{ flex: 1 }} />
          <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" form="pf">Save project</Button>
        </>}>
        {editing && (
          <form id="pf" className="form" onSubmit={save} key={editing.id ?? 'new'}>
            <Field label="Project name" wide><input name="title" required defaultValue={editing.title} placeholder="e.g. Stock system for Kasoa Hardware" /></Field>
            <Field label="Client"><select name="client_id" defaultValue={editing.client_id ?? ''}><option value="">Own project</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.organisation ? ` · ${c.organisation}` : ''}</option>)}</select></Field>
            <Field label="Service"><select name="service" defaultValue={editing.service ?? SERVICES[0]}>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Status"><select name="status" defaultValue={editing.status}>{PROJECT_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
            <Field label="Progress (%)"><input name="progress" type="number" min="0" max="100" step="5" defaultValue={editing.progress ?? 0} /></Field>
            <Field label="Start date"><input name="start_date" type="date" defaultValue={editing.start_date ?? ''} /></Field>
            <Field label="Due date"><input name="due_date" type="date" defaultValue={editing.due_date ?? ''} /></Field>
            <Field label="Value (GH₵)"><input name="value" type="number" min="0" step="50" defaultValue={editing.value ?? ''} /></Field>
            <Field label="Live link (optional)"><input name="live_url" type="url" placeholder="https://" defaultValue={editing.live_url ?? ''} /></Field>
            <div className="callout field--wide">
              <p>Show on the website<small>Adds this project to “Examples of our work”. Only name, summary and result are shown; money and contacts stay private.</small></p>
              <Switch label="Show on the website" on={web} onChange={setWeb} />
            </div>
            <div style={{ display: web ? 'contents' : 'none' }}>
                <Field label="Summary for the website" wide hint="One or two sentences."><textarea name="website_summary" rows={2} maxLength={220} defaultValue={editing.website_summary ?? ''} /></Field>
                <Field label="Result (optional)" wide hint="e.g. Donor reports in minutes instead of an afternoon"><input name="website_outcome" maxLength={120} defaultValue={editing.website_outcome ?? ''} /></Field>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
