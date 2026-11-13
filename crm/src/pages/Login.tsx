// Sign-in screen.
//  - Live CRM: Cloudflare Access shows its own sign-in (email + one-time code) BEFORE this app loads,
//    so staff normally never see this page. It only appears if a session expired mid-way.
//  - Demo mode (`npm run dev`): press Sign in to explore with sample data.
import { useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';
import { db } from '../lib/db';

export default function Login() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const year = new Date().getFullYear();
  const demo = db.mode === 'demo';

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await signIn('', ''); } catch (err) { setError((err as Error).message); setBusy(false); }
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
        <form className="login__form" onSubmit={go}>
          <div>
            <h2>Welcome back</h2>
            <p>{demo ? 'Demo workspace with sample data.' : 'Sign in with your JayTech9 work email. We send a one-time code, so there is no password to remember or steal.'}</p>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn--primary" disabled={busy}>
            <Icon name="mail" />{busy ? 'Opening sign-in…' : demo ? 'Sign in to the demo' : 'Sign in with work email'}
          </button>
          <p className="secure"><Icon name="lock" size={16} />Staff accounts only. Protected by Cloudflare Access.</p>
          {demo && <p className="demo-bar">Demo mode: nothing you do here is saved.</p>}
        </form>
      </section>
    </div>
  );
}
