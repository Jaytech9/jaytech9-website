// Week view of call bookings and blocked times, plus the "Block time" and "Move time" dialogs.
// Times are Ghana time (GMT), the same as the website's booking page.
import { useMemo, useState } from 'react';
import { insertRow, logActivity, removeRow, updateRow, useTable } from '../lib/store';
import { Button, Field, Modal, useToast } from './ui';
import { Icon } from './Icon';
import { BOOKING_SLOTS, WORKING_DAYS, type BlockedTime, type Booking } from '../lib/types';

const DAY = 86400000;
export const dayOf = (iso: string) => iso.slice(0, 10);
export const slotOf = (iso: string) => iso.slice(11, 16);
const ACTIVE = ['new', 'confirmed'];
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));
export const niceDay = (d: string) => fmt(d, { weekday: 'short', day: 'numeric', month: 'short' });
const mondayOf = (d: Date) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; };
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Is this time free for a call? (no active booking, not blocked) */
export function isFree(day: string, slot: string, bookings: Booking[], blocks: BlockedTime[], ignoreId?: string) {
  if (blocks.some((b) => b.day === day && (!b.slot || b.slot === slot))) return false;
  return !bookings.some((b) => b.id !== ignoreId && b.call_at && ACTIVE.includes(b.status) && dayOf(b.call_at) === day && slotOf(b.call_at) === slot);
}

const TONE: Record<string, { bg: string; fg: string; border?: string }> = {
  new: { bg: '#e6f1fb', fg: '#0c447c', border: '#0068a1' },
  confirmed: { bg: '#e9f7e3', fg: '#1e5a0b' },
  done: { bg: '#f1f3f5', fg: '#5f6b73' },
  no_show: { bg: '#fff1d6', fg: '#8a5300' },
};

export default function BookingSchedule({ onOpen }: { onOpen: (id: string) => void }) {
  const bookings = useTable('bookings').rows;
  const blocksT = useTable('blocked_times');
  const blocks = blocksT.rows;
  const toast = useToast();
  const [week, setWeek] = useState(() => mondayOf(new Date()));
  const [blocking, setBlocking] = useState<{ day?: string; slot?: string } | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => isoDay(new Date(week.getTime() + i * DAY)))
    .filter((d) => WORKING_DAYS.includes(new Date(`${d}T12:00:00Z`).getUTCDay())), [week]);
  const inWeek = bookings.filter((b) => b.call_at && days.includes(dayOf(b.call_at)) && b.status !== 'cancelled');
  const slots = useMemo(() => [...new Set([...BOOKING_SLOTS, ...inWeek.map((b) => slotOf(b.call_at!))])].sort(), [inWeek]);
  const today = isoDay(new Date());
  const unblock = async (b: BlockedTime) => {
    if (!window.confirm(`Open ${niceDay(b.day)}${b.slot ? ` at ${b.slot}` : ' (whole day)'} for bookings again?`)) return;
    try { await removeRow('blocked_times', b.id); toast('Time opened on the website'); } catch (e) { toast((e as Error).message, 'error'); }
  };
  const cell: React.CSSProperties = { minHeight: 44, borderRadius: 8, padding: '5px 7px', fontSize: 12, lineHeight: 1.3, textAlign: 'left', width: '100%', font: 'inherit' };

  return (
    <div style={{ padding: '4px 20px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => setWeek(new Date(week.getTime() - 7 * DAY))}><Icon name="left" /></button>
          <strong style={{ minWidth: 170, textAlign: 'center' }}>{niceDay(days[0])} – {niceDay(days[days.length - 1])}</strong>
          <button type="button" className="icon-btn" aria-label="Next week" onClick={() => setWeek(new Date(week.getTime() + 7 * DAY))}><Icon name="chevron" /></button>
          <Button size="sm" variant="ghost" onClick={() => setWeek(mondayOf(new Date()))}>This week</Button>
        </div>
        <Button size="sm" variant="secondary" icon="lock" onClick={() => setBlocking({})}>Block time</Button>
      </div>
      {blocksT.error && <p className="muted" style={{ margin: '0 0 10px' }}>Blocking needs a database update (migration 0003). Bookings still show below.</p>}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(${days.length}, minmax(110px, 1fr))`, gap: 5, minWidth: 52 + days.length * 115 }}>
          <span />
          {days.map((d) => {
            const whole = blocks.find((b) => b.day === d && !b.slot);
            return (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: d === today ? 'var(--blue, #0068a1)' : 'var(--muted, #5f6b73)', padding: '4px 0' }}>
                {niceDay(d)}{whole && <><br /><button type="button" onClick={() => unblock(whole)} style={{ border: 0, background: '#f1f3f5', borderRadius: 999, padding: '1px 8px', fontSize: 11, cursor: 'pointer' }} title={whole.reason ?? ''}>Day blocked ✕</button></>}
              </div>
            );
          })}
          {slots.map((s) => (
            <div key={s} style={{ display: 'contents' }}>
              <span style={{ fontSize: 12, color: 'var(--muted, #5f6b73)', paddingTop: 12 }}>{s}</span>
              {days.map((d) => {
                const here = inWeek.filter((b) => dayOf(b.call_at!) === d && slotOf(b.call_at!) === s);
                const block = blocks.find((b) => b.day === d && (!b.slot || b.slot === s));
                const past = `${d}T${s}` < new Date().toISOString().slice(0, 16);
                if (here.length) return (
                  <div key={d} style={{ display: 'grid', gap: 3 }}>
                    {here.map((b) => {
                      const t = TONE[b.status] ?? TONE.done;
                      return (
                        <button key={b.id} type="button" onClick={() => onOpen(b.id)}
                          style={{ ...cell, background: t.bg, color: t.fg, border: t.border ? `1.5px solid ${t.border}` : '1.5px solid transparent', cursor: 'pointer' }}>
                          <strong style={{ fontWeight: 600 }}>{b.name.split(' ')[0]} {b.name.split(' ')[1]?.[0] ? `${b.name.split(' ')[1][0]}.` : ''}</strong>
                          {b.status === 'new' && <span style={{ fontWeight: 700 }}> · New</span>}
                          <br /><span style={{ opacity: 0.85 }}>{(b.service ?? '').split(' ')[0]}{b.method ? ` · ${b.method.replace(' call', '')}` : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                );
                if (block) return (
                  <button key={d} type="button" onClick={() => unblock(block)} title={block.reason ? `Blocked: ${block.reason}. Click to open again.` : 'Blocked. Click to open again.'}
                    style={{ ...cell, background: '#f1f3f5', color: '#5f6b73', border: '1.5px solid transparent', cursor: 'pointer' }}>
                    <Icon name="lock" size={12} /> Blocked{block.reason ? <><br /><span style={{ opacity: 0.8 }}>{block.reason}</span></> : null}
                  </button>
                );
                return (
                  <button key={d} type="button" disabled={past} onClick={() => setBlocking({ day: d, slot: s })} title={past ? '' : 'Free on the website. Click to block.'}
                    style={{ ...cell, background: 'transparent', border: '1px dashed #d6dfe6', cursor: past ? 'default' : 'pointer', opacity: past ? 0.4 : 1 }} aria-label={`${niceDay(d)} ${s} free`} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 12, color: 'var(--muted, #5f6b73)' }}>
        <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: TONE.new.bg, border: `1.5px solid ${TONE.new.border}` }} /> New, needs confirming</span>
        <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: TONE.confirmed.bg }} /> Confirmed</span>
        <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#f1f3f5' }} /> Blocked by you</span>
        <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, border: '1px dashed #9fb2bf' }} /> Free on the website (click to block)</span>
      </div>
      <BlockTime open={!!blocking} preset={blocking ?? {}} onClose={() => setBlocking(null)} bookings={bookings} />
    </div>
  );
}

function BlockTime({ open, preset, onClose, bookings }: { open: boolean; preset: { day?: string; slot?: string }; onClose: () => void; bookings: Booking[] }) {
  const toast = useToast();
  const blocks = useTable('blocked_times').rows;
  const [busy, setBusy] = useState(false);
  const [whole, setWhole] = useState(false);
  const [day, setDay] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [key, setKey] = useState('');
  const k = `${preset.day ?? ''}|${preset.slot ?? ''}|${open}`;
  if (open && key !== k) { setKey(k); setDay(preset.day ?? ''); setPicked(preset.slot ? [preset.slot] : []); setWhole(false); setReason(''); }
  const clash = day ? bookings.filter((b) => b.call_at && ACTIVE.includes(b.status) && dayOf(b.call_at) === day && (whole || picked.includes(slotOf(b.call_at)))) : [];
  const save = async () => {
    if (!day) { toast('Pick a day.', 'error'); return; }
    if (!whole && !picked.length) { toast('Pick at least one time, or block the whole day.', 'error'); return; }
    setBusy(true);
    try {
      const todo = whole ? [null] : picked.filter((s) => !blocks.some((b) => b.day === day && b.slot === s));
      for (const slot of todo) await insertRow('blocked_times', { day, slot, reason: reason.trim() || null });
      logActivity('booking', whole ? 'Day blocked' : 'Times blocked', `${niceDay(day)}${whole ? '' : ` ${picked.join(', ')}`}`);
      toast(whole ? 'Day blocked on the website' : `${picked.length} time${picked.length > 1 ? 's' : ''} blocked on the website`);
      onClose();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} title="Block time" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon="lock" disabled={busy} onClick={save}>Block</Button></>}>
      <div className="form">
        <Field label="Day" hint="Ghana time. Blocked times disappear from the website's booking page."><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></Field>
        <Field label="Reason (only you see this)"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Client meeting, travel, holiday…" /></Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, marginBottom: 10 }}>
            <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} /> Block the whole day
          </label>
          {!whole && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {BOOKING_SLOTS.map((s) => {
                const on = picked.includes(s);
                return <button key={s} type="button" onClick={() => setPicked(on ? picked.filter((x) => x !== s) : [...picked, s])}
                  className={`btn btn--sm ${on ? 'btn--primary' : 'btn--secondary'}`}>{s}</button>;
              })}
            </div>
          )}
          {clash.length > 0 && <p style={{ margin: '12px 0 0', color: '#8a5300', fontWeight: 600 }}>Heads up: {clash.map((b) => `${b.name} at ${slotOf(b.call_at!)}`).join(', ')} already booked. Blocking won't cancel them; move or cancel those calls too.</p>}
        </div>
      </div>
    </Modal>
  );
}

/** Move a booking to another free time. */
export function MoveTime({ booking, onClose, onMoved }: { booking: Booking | null; onClose: () => void; onMoved: (b: Booking, when: string) => void }) {
  const toast = useToast();
  const bookings = useTable('bookings').rows;
  const blocks = useTable('blocked_times').rows;
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);
  const open = !!booking;
  const dow = day ? new Date(`${day}T12:00:00Z`).getUTCDay() : -1;
  const free = day ? BOOKING_SLOTS.filter((s) => isFree(day, s, bookings, blocks, booking?.id) && `${day}T${s}` > new Date().toISOString().slice(0, 16)) : [];
  const save = async () => {
    if (!booking || !day || !slot) return;
    setBusy(true);
    try {
      const when = `${day}T${slot}:00.000Z`;
      await updateRow('bookings', booking.id, { call_at: when });
      logActivity('booking', 'Call moved', `${booking.name} → ${niceDay(day)} ${slot}`, booking.id);
      toast(`Moved to ${niceDay(day)} at ${slot}. The old time is free again.`);
      onMoved(booking, when);
      setDay(''); setSlot('');
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} title={`Move ${booking?.name ?? ''}'s call`} onClose={() => { setDay(''); setSlot(''); onClose(); }}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon="calendar" disabled={busy || !slot} onClick={save}>Move call</Button></>}>
      <div className="form">
        <Field label="New day" hint={booking?.call_at ? `Now: ${niceDay(dayOf(booking.call_at))} at ${slotOf(booking.call_at)}` : undefined}><input type="date" value={day} onChange={(e) => { setDay(e.target.value); setSlot(''); }} /></Field>
        <div style={{ gridColumn: '1 / -1' }}>
          {day && !WORKING_DAYS.includes(dow) && <p className="muted" style={{ margin: '0 0 8px' }}>That's a weekend day; it isn't offered on the website, but you can still use it.</p>}
          {day && (free.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {free.map((s) => <button key={s} type="button" onClick={() => setSlot(s)} className={`btn btn--sm ${slot === s ? 'btn--primary' : 'btn--secondary'}`}>{s}</button>)}
            </div>
          ) : <p className="muted" style={{ margin: 0 }}>No free times that day. Pick another day.</p>)}
        </div>
      </div>
    </Modal>
  );
}
