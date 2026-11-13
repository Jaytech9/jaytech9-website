import { useAuth } from '../lib/auth';
import { db } from '../lib/db';
import { useTable } from '../lib/store';
import { Avatar, Button, Card, PageHead, Pill, useToast } from '../components/ui';
import { ago } from '../lib/format';

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const activity = useTable('activity').rows.slice(0, 12);
  const live = db.mode === 'live';
  const steps: [string, boolean, string][] = [
    ['Database and staff sign-in (Supabase)', live, 'Create a free Supabase project, run supabase/schema.sql, and add the keys to Netlify.'],
    ['Website forms flow into the CRM', live, 'Add the Supabase keys to the website on Netlify too.'],
    ['Website updates when you switch sections', live, 'Add a Netlify build hook to the CRM settings.'],
    ['SMS sending', false, 'Open an Arkesel account, register the sender name “JayTech9”, add the API key.'],
    ['Email sending', false, 'Open a Resend account, verify jaytech9.com, add the API key.'],
  ];
  return (
    <>
      <PageHead title="Settings" />
      <div className="grid grid--2">
        <div className="stack">
          <Card title="Your account">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={user?.name ?? ''} size={52} />
              <div><strong style={{ fontSize: 17 }}>{user?.name}</strong><p className="muted" style={{ margin: 0 }}>{user?.email} · {user?.role === 'admin' ? 'Admin' : 'Staff'}</p></div>
            </div>
          </Card>
          <Card title="Setup checklist">
            <ul className="list">
              {steps.map(([t, ok, how]) => (
                <li key={t}>
                  <div className="list__main"><strong>{t}</strong><small style={{ whiteSpace: 'normal' }}>{ok ? 'Connected' : how}</small></div>
                  <Pill tone={ok ? 'green' : 'amber'}>{ok ? 'Done' : 'To do'}</Pill>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Website">
            <p className="muted" style={{ marginTop: 0 }}>Rebuild the website now, for example after approving several reviews.</p>
            <Button icon="refresh" onClick={() => db.fn('publish-site', {}).then(() => toast('Website updating, live in about a minute')).catch((e) => toast(e.message, 'error'))}>Update website now</Button>
          </Card>
        </div>
        <Card title="Recent activity">
          {activity.length === 0 ? <p className="muted">Nothing yet.</p> : (
            <ul className="list">
              {activity.map((a) => <li key={a.id}><div className="list__main"><strong>{a.action}</strong><small>{a.detail}</small></div><span className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{ago(a.created_at)}</span></li>)}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
