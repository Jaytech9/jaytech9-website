import { useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';
import { db, googleSignIn } from '../lib/db';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(db.mode === 'demo' ? 'demo@jaytech9.com' : '');
  const [password, setPassword] = useState(db.mode === 'demo' ? 'demo' : '');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const year = new Date().getFullYear();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setNote(''); setBusy(true);
    try { await signIn(email.trim(), password); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  const forgot = async () => {
    setError(''); setNote('');
    if (!email.trim()) { setError('Enter your work email first, then choose “Forgot password?”.'); return; }
    try { await db.resetPassword(email.trim()); setNote('If that email is on the staff list, a reset link is on its way.'); } catch (err) { setError((err as Error).message); }
  };

  return (
    <div className="login">
      <section className="login__art" aria-label="JayTech9">
        <div className="login__brand"><img src="/logo.png" alt="" />JayTech9 CRM</div>
        <div>
          <h1>Run the business <span>from one place.</span></h1>
          <p>Bookings, enquiries, projects, messages and your website, all in one secure workspace.</p>
        </div>
        <p className="login__foot">© {year} Jay Tech 9 Enterprise</p>
      </section>

      <section className="login__panel">
        <form className="login__form" onSubmit={submit} noValidate>
          <div>
            <h2>Welcome back</h2>
            <p>Sign in to your workspace.</p>
          </div>
          {googleSignIn && (
            <>
              <button type="button" className="btn btn--google" onClick={() => db.signInWithGoogle().catch((e) => setError(e.message))}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>
                Continue with Google
              </button>
              <div className="login__or">or with email</div>
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {note && <p className="form-ok" role="status">{note}</p>}
          <label className="field">
            <span className="field__label">Work email</span>
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@jaytech9.com" />
          </label>
          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="field__label" htmlFor="pw">Password</label>
              <button type="button" className="btn btn--ghost btn--sm" style={{ height: 'auto', padding: 0 }} onClick={forgot}>Forgot password?</button>
            </div>
            <div className="pw">
              <input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
              <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}><Icon name={show ? 'eyeoff' : 'eye'} size={20} /></button>
            </div>
          </div>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="secure"><Icon name="lock" size={16} />Staff accounts only. Your session is encrypted.</p>
          {db.mode === 'demo' && <p className="demo-bar">Demo mode: press Sign in to explore with sample data.</p>}
        </form>
      </section>
    </div>
  );
}
