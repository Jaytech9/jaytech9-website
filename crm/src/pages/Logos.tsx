// CRM → Client logos: the "Trusted by" row on the website. Add only clients who agreed to be shown.
import { useState } from 'react';
import { insertRow, logActivity, publishWebsiteSoon, removeRow, updateRow, useTable } from '../lib/store';
import { Button, Card, Empty, Field, Modal, PageHead, Skeleton, Switch, useToast } from '../components/ui';
import { Icon } from '../components/Icon';
import { mediaSrc, preparePicture, removeMedia, uploadMedia } from '../lib/media';
import type { BrandLogo } from '../lib/types';

export default function Logos() {
  const { rows, loaded, error } = useTable('brand_logos');
  const toast = useToast();
  const [editing, setEditing] = useState<Partial<BrandLogo> | null>(null);
  const publish = () => publishWebsiteSoon((ok) => toast(ok ? 'Website updated, live in about a minute' : 'Saved. The website could not be reached to update; use Settings → Publish.', ok ? 'ok' : 'error'));
  const sorted = [...rows].sort((a, b) => a.sort - b.sort);
  const move = async (l: BrandLogo, dir: -1 | 1) => {
    const i = sorted.findIndex((x) => x.id === l.id), j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    try { await updateRow('brand_logos', l.id, { sort: j * 10 }); await updateRow('brand_logos', sorted[j].id, { sort: i * 10 }); publish(); } catch (e) { toast((e as Error).message, 'error'); }
  };
  return (
    <>
      <PageHead title="Client logos" sub="The “Trusted by” row on the website. Only add clients who are happy to be named."
        actions={<Button icon="plus" onClick={() => setEditing({ show: true, sort: sorted.length * 10 })}>Add client</Button>} />
      <Card pad={false}>
        {error ? <Empty icon="users" title="Client logos are not set up yet" text="Run database/migrations/0004_gallery_and_logos.sql on the live database, then reload." />
          : !loaded ? <div style={{ padding: 20 }}><Skeleton /></div> : sorted.length === 0 ? (
            <Empty icon="users" title="No client logos yet" text="The “Trusted by” row stays hidden on the website until you add one." />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 20, display: 'grid', gap: 10 }}>
              {sorted.map((l) => (
                <li key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', border: '1px solid #e3eaef', borderRadius: 14, opacity: l.show ? 1 : 0.6 }}>
                  <div style={{ width: 96, height: 48, display: 'grid', placeItems: 'center', background: '#f3f6f8', borderRadius: 10, flex: 'none' }}>
                    {l.logo_key ? <img src={mediaSrc(l.logo_key)} alt="" style={{ maxWidth: 84, maxHeight: 38, objectFit: 'contain' }} /> : <small className="muted">No logo</small>}
                  </div>
                  <button type="button" onClick={() => setEditing(l)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}>
                    <strong>{l.name}</strong><br /><small className="muted">{l.url || 'No website link'}</small>
                  </button>
                  <Switch label="Show on website" on={l.show} onChange={async (v) => { try { await updateRow('brand_logos', l.id, { show: v }); publish(); } catch (e) { toast((e as Error).message, 'error'); } }} />
                  <button type="button" className="icon-btn" aria-label="Move up" onClick={() => move(l, -1)}><Icon name="up" size={16} /></button>
                  <button type="button" className="icon-btn" aria-label="Move down" onClick={() => move(l, 1)}><Icon name="down" size={16} /></button>
                </li>
              ))}
            </ul>
          )}
      </Card>
      {editing && <EditLogo item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); publish(); }} />}
    </>
  );
}

function EditLogo({ item, onClose, onSaved }: { item: Partial<BrandLogo>; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(item);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState('');
  const isNew = !item.id;
  const save = async () => {
    if (!f.name?.trim()) return toast('Add the client name.', 'error');
    if (f.url && !/^https:\/\//.test(f.url)) return toast('The website link should start with https://', 'error');
    try {
      const patch: Partial<BrandLogo> = { name: f.name.trim(), url: f.url?.trim() || null, show: f.show !== false, sort: f.sort ?? 100 };
      if (file) { setBusy('Uploading logo…'); patch.logo_key = await uploadMedia('logos', (await preparePicture(file, 600)).file); }
      setBusy('Saving…');
      if (isNew) await insertRow('brand_logos', patch); else await updateRow('brand_logos', item.id!, patch);
      if (file && item.logo_key) removeMedia(item.logo_key);
      logActivity('website', isNew ? 'Client logo added' : 'Client logo updated', patch.name);
      toast('Saved. Website updating…');
      onSaved();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(''); }
  };
  const remove = async () => {
    if (!item.id || !window.confirm(`Remove ${item.name} from the website?`)) return;
    try { await removeRow('brand_logos', item.id); await removeMedia(item.logo_key); toast('Removed'); onSaved(); } catch (e) { toast((e as Error).message, 'error'); }
  };
  return (
    <Modal open title={isNew ? 'Add client logo' : 'Edit client logo'} onClose={onClose}
      footer={<>{!isNew && <Button variant="danger" onClick={remove}>Remove</Button>}<span style={{ flex: 1 }} /><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon="check" onClick={save} disabled={!!busy}>{busy || 'Save'}</Button></>}>
      <div className="form">
        <Field label="Client name" wide><input value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Green Hatch Investments" /></Field>
        <Field label="Logo" hint="PNG with a see-through background looks best." wide><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
        <Field label="Their website (optional)" wide><input type="url" value={f.url ?? ''} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" /></Field>
      </div>
    </Modal>
  );
}
