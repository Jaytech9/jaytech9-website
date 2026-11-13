// Settings: your account, the team (admins only), what is set up, and recent activity.
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/db';
import { insertRow, removeRow, updateRow, useTable } from '../lib/store';
import { Avatar, Button, Card, Field, Modal, PageHead, Pill, useToast } from '../components/ui';
import { ago } from '../lib/format';

type Status = { database: boolean; signIn: boolean; website: boolean; sms: boolean; email: boolean };

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const activity = useTable('activity').rows.slice(0, 12);
  const staff = useTable('staff');
  const [status, setStatus] = useState<Status | null>(null);
  const [adding, setAdding] = useState(false);
  const isAdmin = user?.role === 'admin';
  useEffect(() => {
    if (db.mode === 'api') fetch('/api/status').then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
  }, []);

  const steps: [string, keyof Status, string][] = [
    ['Database', 'database', 'Create the D1 database (DEPLOY.md, step 2).'],
    ['Staff sign-in (Cloudflare Access)', 'signIn', 'Add ACCESS_TEAM_DOMAIN and ACCESS_AUD (DEPLOY.md, step 4).'],
    ['Website updates from the CRM', 'website', 'Add the website deploy hook (DEPLOY.md, step 5).'],
    ['SMS sending', 'sms', 'Open an Arkesel account, register the sender name “JayTech9”, add ARKESEL_API_KEY.'],
    ['Email sending', 'email', 'Open a Resend account, verify jaytech9.com, add RESEND_API_KEY.'],
  ];

  const addStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      await insertRow('staff', { name: f.name, email: f.email.trim().toLowerCase(), role: f.role as 'admin' | 'staff' });
      toast('Added. Also add this email to the CRM policy in Cloudflare Access.');
      setAdding(false);
    } catch (err) { toast((err as Error).message, 'error'); }
  };

  return (
    <>
      <PageHead title="Settings" />
      <div className="grid grid--2">
        <div className="stack">
          <Card title="Your account">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={user?.name ?? ''} size={52} />
              <div><strong style={{ fontSize: 17 }}>{user?.name}</strong><p className="muted" style={{ margin: 0 }}>{user?.email} · {isAdmin ? 'Admin' : 'Staff'}</p></div>
            </div>
            {isAdmin && db.mode === 'api' && (
              <form className="toolbar" style={{ marginTop: 16 }} onSubmit={(e) => {
                e.preventDefault();
                const name = String(new FormData(e.currentTarget).get('name') ?? '').trim();
                if (name && user) updateRow('staff', user.id, { name }).then(() => { toast('Name saved'); setTimeout(() => location.reload(), 600); }).catch((err) => toast(err.message, 'error'));
              }}>
                <label className="visually-hidden" htmlFor="myname">Your name</label>
                <input id="myname" name="name" className="input" defaultValue={user?.name} style={{ flex: '1 1 200px' }} />
                <Button type="submit" variant="secondary" size="sm">Save name</Button>
              </form>
            )}
          </Card>

          <Card title="Team" action={isAdmin && <Button size="sm" icon="plus" onClick={() => setAdding(true)}>Add person</Button>}>
            <ul className="list">
              {staff.rows.map((s, i) => (
                <li key={s.id}>
                  <Avatar name={s.name} tone={i} />
                  <div className="list__main"><strong>{s.name}</strong><small>{s.email}</small></div>
                  {isAdmin && s.id !== user?.id ? (
                    <>
                      <select aria-label={`Role for ${s.name}`} value={s.role} className="input" style={{ width: 'auto', minHeight: 36, padding: '4px 8px' }}
                        onChange={(e) => updateRow('staff', s.id, { role: e.target.value as 'admin' | 'staff' }).catch((err) => toast(err.message, 'error'))}>
                        <option value="staff">Staff</option><option value="admin">Admin</option>
                      </select>
                      <Button size="sm" variant="danger" onClick={() => confirm(`Remove ${s.name} from the CRM?`) && removeRow('staff', s.id).catch((err) => toast(err.message, 'error'))}>Remove</Button>
                    </>
                  ) : <Pill tone={s.role === 'admin' ? 'blue' : 'grey'}>{s.role === 'admin' ? 'Admin' : 'Staff'}</Pill>}
                </li>
              ))}
              {staff.rows.length === 0 && <li className="muted">{db.mode === 'demo' ? 'The team list shows here in the live CRM.' : 'No one yet.'}</li>}
            </ul>
          </Card>

          <Card title="Setup checklist">
            <ul className="list">
              {steps.map(([t, k, how]) => {
                const ok = !!status?.[k];
                return (
                  <li key={t}>
                    <div className="list__main"><strong>{t}</strong><small style={{ whiteSpace: 'normal' }}>{db.mode === 'demo' ? 'Shown when the CRM is live.' : ok ? 'Set up' : how}</small></div>
                    {db.mode === 'api' && <Pill tone={ok ? 'green' : 'amber'}>{ok ? 'Done' : 'To do'}</Pill>}
                  </li>
                );
              })}
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

      <Modal open={adding} title="Add a person" onClose={() => setAdding(false)} footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" form="sf2">Add</Button></>}>
        <form id="sf2" className="form" onSubmit={addStaff}>
          <Field label="Name"><input name="name" required /></Field>
          <Field label="Work email"><input name="email" type="email" required /></Field>
          <Field label="Role" wide hint="Admins can add and remove people."><select name="role"><option value="staff">Staff</option><option value="admin">Admin</option></select></Field>
        </form>
      </Modal>
    </>
  );
}
