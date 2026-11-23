// CRM → Gallery: flyers, logos, banners and short videos shown on the website's Design gallery
// (jaytech9.com/design) and, when "featured", in "Recent designs" on the home page.
import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/db';
import { insertRow, logActivity, publishWebsiteSoon, removeRow, updateRow, useTable } from '../lib/store';
import { Button, Card, Empty, Field, Modal, PageHead, Pill, Segmented, Skeleton, Switch, useToast } from '../components/ui';
import { Icon } from '../components/Icon';
import { coverFromVideo, mediaSrc, preparePicture, removeMedia, uploadMedia } from '../lib/media';
import { DESIGN_CATEGORIES, type GalleryItem } from '../lib/types';

const catLabel = (id: string) => DESIGN_CATEGORIES.find((c) => c.id === id)?.label ?? id;
const PLATFORMS = [['', 'Not posted'], ['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['facebook', 'Facebook']] as const;

export default function Gallery() {
  const { rows, loaded, error } = useTable('gallery_items');
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'live' | 'hidden'>('all');
  const [editing, setEditing] = useState<Partial<GalleryItem> | null>(null);
  const [loves, setLoves] = useState<Record<string, number>>({});
  useEffect(() => { db.fn<Record<string, number>>('love-counts', {}).then((r) => { if (r && !(r as { demo?: boolean }).demo) setLoves(r); }).catch(() => {}); }, []);
  const lovesOf = (g: GalleryItem) => loves[`crm-${g.id.slice(0, 8)}`] ?? 0;
  const list = useMemo(() => rows.filter((r) => filter === 'all' || (filter === 'live' ? r.show : !r.show)), [rows, filter]);
  const publish = () => publishWebsiteSoon((ok) => toast(ok ? 'Website updated, live in about a minute' : 'Saved. The website could not be reached to update; use Settings → Publish.', ok ? 'ok' : 'error'));
  const quick = async (g: GalleryItem, patch: Partial<GalleryItem>, msg: string) => {
    try { await updateRow('gallery_items', g.id, patch); toast(msg); publish(); } catch (e) { toast((e as Error).message, 'error'); }
  };
  const move = async (g: GalleryItem, dir: -1 | 1) => {
    const sorted = [...rows].sort((a, b) => a.sort - b.sort);
    const i = sorted.findIndex((x) => x.id === g.id), j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const other = sorted[j];
    const [a, b] = [g.sort === other.sort ? i * 10 : other.sort, g.sort === other.sort ? j * 10 : g.sort];
    try { await updateRow('gallery_items', g.id, { sort: a }); await updateRow('gallery_items', other.id, { sort: b }); publish(); } catch (e) { toast((e as Error).message, 'error'); }
  };

  return (
    <>
      <PageHead title="Gallery" sub={<>Your work on <a href="https://jaytech9.com/design/" target="_blank" rel="noreferrer">jaytech9.com/design</a>. Featured pieces also show on the home page.</>}
        actions={<Button icon="plus" onClick={() => setEditing({ category: 'flyers', year: new Date().getFullYear(), show: true, featured: false, sort: (rows.reduce((m, r) => Math.min(m, r.sort), 100) - 10) })}>Add design or video</Button>} />
      <Card pad={false}>
        <div className="toolbar" style={{ padding: '16px 20px' }}>
          <Segmented label="Show" value={filter} onChange={setFilter} options={[{ id: 'all', label: `All ${rows.length}` }, { id: 'live', label: 'On website' }, { id: 'hidden', label: 'Hidden' }]} />
        </div>
        {error ? <Empty icon="star" title="The gallery is not set up yet" text="Run database/migrations/0004_gallery_and_logos.sql on the live database, then reload." />
          : !loaded ? <div style={{ padding: 20 }}><Skeleton /></div> : list.length === 0 ? (
            <Empty icon="star" title="Add your first piece" text="Upload a flyer, logo or short video. It shows on the website's gallery once you save." />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: '4px 20px 20px', display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
              {list.map((g) => (
                <li key={g.id} style={{ border: '1px solid #e3eaef', borderRadius: 16, overflow: 'hidden', background: '#fff', opacity: g.show ? 1 : 0.6 }}>
                  <button type="button" onClick={() => setEditing(g)} style={{ display: 'block', width: '100%', padding: 0, border: 0, background: '#f3f6f8', cursor: 'pointer', position: 'relative' }} aria-label={`Edit ${g.title}`}>
                    <img src={mediaSrc(g.image_key)} alt="" loading="lazy" style={{ display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }} />
                    {g.video_key && <span style={{ position: 'absolute', left: 10, top: 10, background: '#000a', color: '#fff', borderRadius: 999, padding: '2px 9px', fontSize: 12 }}>▶ Video</span>}
                    {g.featured && <span style={{ position: 'absolute', right: 10, top: 10, background: '#fff1d6', color: '#8a5300', borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>★ Home page</span>}
                  </button>
                  <div style={{ padding: '10px 12px', display: 'grid', gap: 8 }}>
                    <div><strong style={{ display: 'block', lineHeight: 1.3 }}>{g.title}</strong><small className="muted">{catLabel(g.category)} · {g.year}{g.client ? ` · ${g.client}` : ''}{lovesOf(g) > 0 && <> · <span style={{ color: '#e0444b', fontWeight: 600 }}>♥ {lovesOf(g)}</span></>}</small></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <Switch label="Show on website" on={g.show} onChange={(v) => quick(g, { show: v }, v ? 'Now on the website' : 'Hidden from the website')} />
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button type="button" className="icon-btn" aria-label="Move earlier" onClick={() => move(g, -1)}><Icon name="up" size={16} /></button>
                        <button type="button" className="icon-btn" aria-label="Move later" onClick={() => move(g, 1)}><Icon name="down" size={16} /></button>
                        <button type="button" className="icon-btn" aria-label={g.featured ? 'Remove from home page' : 'Feature on home page'} onClick={() => quick(g, { featured: !g.featured }, g.featured ? 'Removed from the home page' : 'Featured on the home page')}><Icon name="star" size={16} /></button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Card>
      {editing && <EditPiece item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); publish(); }} />}
    </>
  );
}

function EditPiece({ item, onClose, onSaved }: { item: Partial<GalleryItem>; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const isNew = !item.id;
  const [f, setF] = useState<Partial<GalleryItem>>(item);
  const [picture, setPicture] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(item.image_key ? mediaSrc(item.image_key) : '');
  const [busy, setBusy] = useState('');
  const set = (patch: Partial<GalleryItem>) => setF({ ...f, ...patch });
  const pickPicture = (file?: File) => { if (!file) return; setPicture(file); setPreview(URL.createObjectURL(file)); };
  const pickVideo = async (file?: File) => {
    if (!file) return;
    setVideo(file);
    if (!picture) { try { const c = await coverFromVideo(file); setPicture(c.file); setPreview(URL.createObjectURL(c.file)); } catch { /* they can add a cover */ } }
  };
  const save = async () => {
    if (!f.title?.trim()) return toast('Add a title.', 'error');
    if (!picture && !f.image_key) return toast('Add a picture (or a video, which makes its own cover).', 'error');
    if (f.post_url && !/^https:\/\//.test(f.post_url)) return toast('The post link should start with https://', 'error');
    try {
      const patch: Partial<GalleryItem> = {
        title: f.title.trim(), category: f.category ?? 'flyers', year: Number(f.year) || new Date().getFullYear(),
        client: f.client?.trim() || null, note: f.note?.trim() || null, alt: f.alt?.trim() || null,
        platform: (f.platform || null) as GalleryItem['platform'], post_url: f.post_url?.trim() || null,
        featured: !!f.featured, show: f.show !== false, sort: f.sort ?? 100,
      };
      const old = { image: item.image_key, video: item.video_key };
      if (picture) {
        setBusy('Preparing picture…');
        const p = await preparePicture(picture);
        setBusy('Uploading picture…');
        patch.image_key = await uploadMedia('gallery', p.file);
        patch.image_w = p.width; patch.image_h = p.height;
      }
      if (video) {
        setBusy(`Uploading video (${(video.size / 1048576).toFixed(0)} MB)…`);
        patch.video_key = await uploadMedia('gallery', video);
      }
      setBusy('Saving…');
      if (isNew) await insertRow('gallery_items', patch); else await updateRow('gallery_items', item.id!, patch);
      if (picture && old.image) removeMedia(old.image);
      if (video && old.video) removeMedia(old.video);
      logActivity('website', isNew ? 'Gallery piece added' : 'Gallery piece updated', patch.title);
      toast(isNew ? 'Added. Website updating…' : 'Saved. Website updating…');
      onSaved();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(''); }
  };
  const remove = async () => {
    if (!item.id || !window.confirm(`Delete "${item.title}" from the gallery? This can't be undone.`)) return;
    try { await removeRow('gallery_items', item.id); await removeMedia(item.image_key); await removeMedia(item.video_key); toast('Deleted'); onSaved(); }
    catch (e) { toast((e as Error).message, 'error'); }
  };
  const removeVideo = async () => { set({ video_key: null }); setVideo(null); };

  return (
    <Modal open wide title={isNew ? 'Add to gallery' : 'Edit gallery piece'} onClose={onClose}
      footer={<>{!isNew && <Button variant="danger" onClick={remove} disabled={!!busy}>Delete</Button>}<span style={{ flex: 1 }} /><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon="check" onClick={save} disabled={!!busy}>{busy || (isNew ? 'Add to gallery' : 'Save')}</Button></>}>
      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)' }}>
        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <div style={{ borderRadius: 14, background: '#f3f6f8', border: '1px dashed #c9d6df', minHeight: 200, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
            {preview ? <img src={preview} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'contain' }} /> : <span className="muted" style={{ padding: 20, textAlign: 'center' }}>No picture yet</span>}
          </div>
          <Field label="Picture" hint="JPG, PNG or WebP. Resized automatically for fast pages."><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pickPicture(e.target.files?.[0])} /></Field>
          <Field label="Short video (optional)" hint="MP4 best, up to 95 MB. A cover is taken from the video if you don't add a picture.">
            <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => pickVideo(e.target.files?.[0])} />
          </Field>
          {(f.video_key || video) && <div className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="check" size={14} /> {video ? video.name : 'Video attached'} <button type="button" className="linkish" onClick={removeVideo}>Remove video</button></div>}
        </div>
        <div className="form" style={{ alignContent: 'start' }}>
          <Field label="Title" wide><input value={f.title ?? ''} onChange={(e) => set({ title: e.target.value })} placeholder="Shop opening flyer" /></Field>
          <Field label="Category"><select value={f.category} onChange={(e) => set({ category: e.target.value })}>{DESIGN_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
          <Field label="Year"><input type="number" min="2015" max="2100" value={f.year ?? ''} onChange={(e) => set({ year: Number(e.target.value) })} /></Field>
          <Field label="Client name (optional)" hint="Only with the client's permission."><input value={f.client ?? ''} onChange={(e) => set({ client: e.target.value })} /></Field>
          <Field label="Picture description" hint="For blind visitors and Google. Say what the design shows."><input value={f.alt ?? ''} onChange={(e) => set({ alt: e.target.value })} placeholder="Red and gold anniversary flyer with church logo" /></Field>
          <Field label="Note about the brief (optional)" wide><textarea rows={2} value={f.note ?? ''} onChange={(e) => set({ note: e.target.value })} placeholder="One or two sentences: what the client needed." /></Field>
          <Field label="Also posted on"><select value={f.platform ?? ''} onChange={(e) => set({ platform: (e.target.value || null) as GalleryItem['platform'] })}>{PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Link to the post (optional)"><input type="url" value={f.post_url ?? ''} onChange={(e) => set({ post_url: e.target.value })} placeholder="https://" /></Field>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Switch label="Show on website" on={f.show !== false} onChange={(v) => set({ show: v })} /> Show on website</label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Switch label="Feature on home page" on={!!f.featured} onChange={(v) => set({ featured: v })} /> Feature on home page</label>
          </div>
          {!isNew && <div style={{ gridColumn: '1 / -1' }}><Pill tone={item.show ? 'green' : 'grey'}>{item.show ? 'On the website' : 'Hidden'}</Pill></div>}
        </div>
      </div>
    </Modal>
  );
}
