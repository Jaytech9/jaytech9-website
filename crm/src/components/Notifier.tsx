// The bell in the top bar: checks every minute for things waiting on you (new orders, change requests,
// bank-transfer claims, client messages, bookings, calls about to start, enquiries, reviews).
// Something new → a soft two-note chime, a desktop notification (if allowed) and a count in the tab title.
// While urgent items stay open, a gentle reminder repeats every 30 minutes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { db } from '../lib/db';
import { ago } from '../lib/format';

type Item = { key: string; kind: string; title: string; detail: string; href: string; at: string; urgent?: boolean };

const POLL = 60_000;
const REMIND = 30 * 60_000;
const store = {
  get: (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

let audio: AudioContext | null = null;
const unlock = () => { try { audio ??= new AudioContext(); if (audio.state === 'suspended') audio.resume(); } catch { /* no audio */ } };

/** A short, soft two-note chime (like a calendar alert), not a harsh beep. */
export function chime(urgent = false) {
  unlock();
  if (!audio) return;
  const t = audio.currentTime + 0.02;
  const notes = urgent ? [659.25, 987.77, 1318.5] : [659.25, 987.77];
  notes.forEach((f, i) => {
    const o = audio!.createOscillator(), g = audio!.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const s = t + i * 0.16;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.18, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.9);
    o.connect(g).connect(audio!.destination);
    o.start(s); o.stop(s + 1);
  });
}

export default function Notifier() {
  const nav = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(store.get('jt9-sound', 'on') === 'on');
  const [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const box = useRef<HTMLDivElement>(null);
  const soundRef = useRef(sound); soundRef.current = sound;

  const announce = useCallback((fresh: Item[], reminder = false) => {
    if (!fresh.length) return;
    const urgent = fresh.some((i) => i.urgent);
    if (soundRef.current) chime(urgent);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const first = fresh[0];
      const n = new Notification(reminder ? `Reminder: ${fresh.length} thing${fresh.length > 1 ? 's' : ''} waiting` : fresh.length > 1 ? `${fresh.length} new things need you` : first.title, {
        body: reminder ? fresh.slice(0, 3).map((i) => '• ' + i.title).join('\n') : fresh.length > 1 ? fresh.slice(0, 3).map((i) => '• ' + i.title).join('\n') : first.detail,
        icon: '/logo-512.png', tag: reminder ? 'jt9-reminder' : first.key,
      });
      n.onclick = () => { window.focus(); nav(fresh.length === 1 ? first.href : '/'); if (fresh.length > 1) setOpen(true); n.close(); };
    }
  }, [nav]);

  const check = useCallback(async () => {
    let list: Item[] = [];
    try { const r = await db.fn<{ items?: Item[] }>('attention', {}); list = r?.items ?? []; } catch { return; }
    setItems(list);
    const seen = new Set<string>(JSON.parse(store.get('jt9-seen', '[]')));
    const fresh = list.filter((i) => !seen.has(i.key));
    store.set('jt9-seen', JSON.stringify([...list.map((i) => i.key), ...seen].slice(0, 400)));
    if (fresh.length) { announce(fresh); store.set('jt9-reminded', String(Date.now())); return; }
    const pending = list.filter((i) => i.urgent);
    if (pending.length && Date.now() - Number(store.get('jt9-reminded', '0')) > REMIND) {
      announce(pending, true); store.set('jt9-reminded', String(Date.now()));
    }
  }, [announce]);

  useEffect(() => {
    check();
    const t = setInterval(check, POLL);
    const vis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [check]);

  // Count in the browser tab, so you see it from other tabs.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = items.length ? `(${items.length}) ${base}` : base;
  }, [items.length]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const toggleSound = () => { const v = !sound; setSound(v); store.set('jt9-sound', v ? 'on' : 'off'); if (v) chime(); };
  const askDesktop = async () => { unlock(); if (typeof Notification === 'undefined') return; setPerm(await Notification.requestPermission()); };
  const urgent = items.filter((i) => i.urgent).length;

  return (
    <div className="notif" ref={box}>
      <button type="button" className="icon-btn" aria-expanded={open} aria-haspopup="dialog" onClick={() => { unlock(); setOpen(!open); }}
        aria-label={items.length ? `${items.length} things need your attention` : 'Notifications'}>
        <Icon name="bell" />
        {items.length > 0 && <span className={`notif__badge ${urgent ? 'is-urgent' : ''}`}>{items.length > 99 ? '99+' : items.length}</span>}
      </button>
      {open && (
        <div className="notif__panel" role="dialog" aria-label="Needs your attention">
          <div className="notif__head">
            <strong>Needs your attention</strong>
            <span className="muted">{items.length ? `${items.length} open${urgent ? ` · ${urgent} urgent` : ''}` : 'All clear'}</span>
          </div>
          <ul className="notif__list">
            {!items.length && <li className="notif__empty"><Icon name="check" /> Nothing waiting. Nice work.</li>}
            {items.map((i) => (
              <li key={i.key}>
                <button type="button" onClick={() => { setOpen(false); nav(i.href); }}>
                  <span className={`notif__dot notif__dot--${i.urgent ? 'urgent' : i.kind}`} aria-hidden="true" />
                  <span className="notif__text"><strong>{i.title}</strong>{i.detail && <span>{i.detail}</span>}</span>
                  <time className="muted">{ago(i.at)}</time>
                </button>
              </li>
            ))}
          </ul>
          <div className="notif__foot">
            <button type="button" className="linkish" onClick={toggleSound}>{sound ? 'Sound on' : 'Sound off'}</button>
            {perm === 'default' && <button type="button" className="linkish" onClick={askDesktop}>Turn on desktop alerts</button>}
            {perm === 'granted' && <span className="muted">Desktop alerts on</span>}
            {perm === 'denied' && <span className="muted">Desktop alerts blocked in browser settings</span>}
            <button type="button" className="linkish" onClick={() => chime(true)}>Test sound</button>
          </div>
        </div>
      )}
    </div>
  );
}
