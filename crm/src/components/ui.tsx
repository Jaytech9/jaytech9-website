import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { initials } from '../lib/format';

export function Card({ title, action, children, className = '', pad = true, id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean; id?: string }) {
  const hid = id ? `${id}-h` : undefined;
  return (
    <section className={`card ${pad ? '' : 'card--flush'} ${className}`} aria-labelledby={title ? hid : undefined}>
      {(title || action) && (
        <header className="card__head">
          {title && <h2 id={hid} className="card__title">{title}</h2>}
          {action && <div className="card__action">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'grey' | 'teal';
export const Pill = ({ tone = 'grey', children }: { tone?: Tone; children: ReactNode }) => <span className={`pill pill--${tone}`}>{children}</span>;

export function Button({ variant = 'primary', icon, children, size, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'green'; icon?: string; size?: 'sm' }) {
  return (
    <button type="button" {...rest} className={`btn btn--${variant} ${size === 'sm' ? 'btn--sm' : ''} ${rest.className ?? ''}`}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  );
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      className={`switch ${on ? 'is-on' : ''}`} onClick={() => onChange(!on)}>
      <span className="switch__knob" />
    </button>
  );
}

export const Avatar = ({ name, size = 36, tone = 0 }: { name: string; size?: number; tone?: number }) => (
  <span className={`avatar avatar--${tone % 4}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">{initials(name)}</span>
);

export const Progress = ({ value, label }: { value: number; label: string }) => (
  <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
    <span style={{ width: `${Math.max(2, value)}%` }} className={value >= 100 ? 'is-done' : ''} />
  </div>
);

export function Empty({ icon = 'inbox', title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon"><Icon name={icon} size={22} /></span>
      <p className="empty__title">{title}</p>
      {text && <p className="empty__text">{text}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return <div className="skeleton" aria-busy="true" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <span key={i} />)}</div>;
}

export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  // Keep the content on screen while the closing animation plays.
  const [shown, setShown] = useState(open);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) { setShown(true); if (!d.open) d.showModal(); return; }
    if (!d.open) { setShown(false); return; }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { d.close(); setShown(false); return; }
    d.classList.add('is-closing');
    const t = setTimeout(() => { d.classList.remove('is-closing'); d.close(); setShown(false); }, 150);
    return () => clearTimeout(t);
  }, [open]);
  return (
    <dialog ref={ref} className={`modal ${wide ? 'modal--wide' : ''}`}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClose={() => { if (open) onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      {(open || shown) && (
        <div className="modal__box">
          <header className="modal__head">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
          </header>
          <div className="modal__body">{children}</div>
          {footer && <footer className="modal__foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? 'field--wide' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? 'is-on' : ''} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} aria-hidden="true" className={i <= value ? 'on' : ''}>★</span>)}
    </span>
  );
}

// Toasts
type Toast = { id: number; text: string; tone: 'ok' | 'error'; leaving?: boolean };
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, text, tone }]);
    // Slide out first, then remove.
    setTimeout(() => setItems((l) => l.map((t) => (t.id === id ? { ...t, leaving: true } : t))), 4000);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4220);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone} ${t.leaving ? 'is-leaving' : ''}`}><Icon name={t.tone === 'ok' ? 'check' : 'x'} size={16} />{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// Re-render every minute so "5 min ago" and "Today" stay true while the CRM is open.
export function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="page-head__sub">{sub}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="search">
      <Icon name="search" size={17} />
      <span className="visually-hidden">{placeholder}</span>
      <input type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
