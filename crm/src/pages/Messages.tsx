import { useMemo, useState } from 'react';
import { insertRow, load, updateRow, useTable } from '../lib/store';
import { db } from '../lib/db';
import { Button, Card, Empty, Field, Modal, PageHead, Pill, Segmented, useNow, useToast } from '../components/ui';
import { Icon } from '../components/Icon';
import { OPT_OUT, personalise, resolveAudience, smsParts } from '../lib/audience';
import { wa } from '../lib/contact';
import { ago, when } from '../lib/format';
import { SERVICES, type AudienceSpec, type Campaign, type Channel } from '../lib/types';

type Aud = 'opted_in' | 'service' | 'client';
const CH: { id: Channel; label: string }[] = [{ id: 'sms', label: 'SMS' }, { id: 'whatsapp', label: 'WhatsApp' }, { id: 'email', label: 'Email' }];
const chLabel = (c: Channel) => CH.find((x) => x.id === c)!.label;

export default function Messages() {
  const clients = useTable('clients').rows;
  const campaigns = useTable('campaigns');
  const now = useNow();
  const toast = useToast();
  const [channel, setChannel] = useState<Channel>('sms');
  const [kind, setKind] = useState<'promotion' | 'update'>('promotion');
  const [aud, setAud] = useState<Aud>('opted_in');
  const [service, setService] = useState<string>(SERVICES[0]);
  const [clientId, setClientId] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('Hi [first name], ');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waList, setWaList] = useState<{ name: string; phone: string }[] | null>(null);

  const spec: AudienceSpec = aud === 'client' ? { type: 'client', client_id: clientId } : aud === 'service' ? { type: 'service', service } : { type: 'opted_in' };
  const effectiveKind = aud === 'client' ? kind : 'promotion';
  const recipients = useMemo(() => resolveAudience(clients, spec, channel, effectiveKind), [clients, channel, effectiveKind, aud, service, clientId]); // eslint-disable-line react-hooks/exhaustive-deps
  const full = effectiveKind === 'promotion' && channel === 'sms' ? `${text.trim()} ${OPT_OUT}` : text.trim();
  const sms = smsParts(personalise(full, 'Akosua'));
  const audienceLabel = aud === 'client' ? `One client: ${clients.find((c) => c.id === clientId)?.name ?? ''}` : aud === 'service' ? `Clients by service: ${service}` : 'All clients who opted in';
  const ready = text.replace('Hi [first name],', '').trim().length > 3 && recipients.length > 0 && (channel !== 'email' || subject.trim());

  const send = async (scheduledAt?: string) => {
    if (!ready) return;
    setBusy(true);
    try {
      const c = await insertRow('campaigns', {
        channel, kind: effectiveKind, audience: audienceLabel, audience_spec: spec, subject: channel === 'email' ? subject : null,
        message: text.trim(), recipients: recipients.length, status: scheduledAt || channel === 'whatsapp' ? (scheduledAt ? 'scheduled' : 'sent') : 'draft',
        scheduled_at: scheduledAt ?? null, sent_at: channel === 'whatsapp' && !scheduledAt ? new Date().toISOString() : null,
      });
      if (channel === 'whatsapp' && !scheduledAt) {
        setWaList(recipients.map((r) => ({ name: r.name, phone: r.phone! })));
      } else if (!scheduledAt) {
        const res = await db.fn<{ sent: number; failed?: number }>('send-message', { campaign_id: c.id, expected: recipients.length });
        await updateRow('campaigns', c.id, { status: 'sent', sent_at: new Date().toISOString(), recipients: res.sent });
        toast(`Sent to ${res.sent} ${res.sent === 1 ? 'person' : 'people'}${db.mode === 'demo' ? ' (demo, nothing really sent)' : ''}`);
      } else {
        toast(`Scheduled for ${when(scheduledAt, now)}`);
      }
      setText('Hi [first name], '); setSubject(''); setScheduleOpen(false);
    } catch (e) { toast((e as Error).message, 'error'); load('campaigns', true); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title="Messages" sub="Send updates and promotions by SMS, WhatsApp or email." />
      <div className="grid grid--2">
        <Card title="New message">
          <div className="compose">
            <Segmented label="Send by" value={channel} onChange={setChannel} options={CH} />
            <div className="form">
              <Field label="To">
                <select value={aud} onChange={(e) => setAud(e.target.value as Aud)}>
                  <option value="opted_in">All clients who opted in</option>
                  <option value="service">Clients by service</option>
                  <option value="client">One client</option>
                </select>
              </Field>
              {aud === 'service' && <Field label="Service"><select value={service} onChange={(e) => setService(e.target.value)}>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select></Field>}
              {aud === 'client' && (
                <>
                  <Field label="Client"><select value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Choose a client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.organisation ? ` · ${c.organisation}` : ''}</option>)}</select></Field>
                  <Field label="Type" wide><Segmented label="Type" value={kind} onChange={setKind} options={[{ id: 'update', label: 'Project update' }, { id: 'promotion', label: 'Promotion' }]} /></Field>
                </>
              )}
              {channel === 'email' && <Field label="Subject" wide><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. 10% off new websites this month" /></Field>}
              <Field label="Message" wide hint="[first name] is replaced with each client's first name.">
                <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
              </Field>
            </div>
            <div className="counter">
              <span>{effectiveKind === 'promotion' && channel === 'sms' ? `Sender: JayTech9 · “${OPT_OUT}” added` : channel === 'sms' ? 'Sender: JayTech9' : channel === 'whatsapp' ? 'Opens WhatsApp for each person' : 'From: JayTech9'}</span>
              {channel === 'sms' && <span className={sms.parts > 1 ? 'over' : ''}>{full.length}/{sms.limit} · {sms.parts} SMS each</span>}
            </div>
            <div className="callout">
              <p><strong className="tnum">{recipients.length}</strong> {recipients.length === 1 ? 'person' : 'people'} will get this
                <small>{effectiveKind === 'promotion' ? 'Promotions only go to clients who agreed to receive offers.' : 'Updates go to this client only.'}</small></p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {channel !== 'whatsapp' && <Button variant="secondary" icon="clock" disabled={!ready || busy} onClick={() => setScheduleOpen(true)}>Schedule</Button>}
              <Button variant="green" icon="send" disabled={!ready || busy} onClick={() => send()} style={{ flex: 1 }}>{busy ? 'Sending…' : channel === 'whatsapp' ? 'Prepare WhatsApp messages' : 'Send now'}</Button>
            </div>
          </div>
        </Card>
        <Card title="Preview">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ alignSelf: 'flex-start', maxWidth: '100%', padding: '12px 14px', borderRadius: '16px 16px 16px 4px', background: channel === 'whatsapp' ? '#dcf8c6' : 'var(--surface-2)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {channel === 'email' && subject && <strong style={{ display: 'block', marginBottom: 6 }}>{subject}</strong>}
              {personalise(full, recipients[0]?.name ?? 'Akosua') || <span className="muted">Your message shows here.</span>}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Shown as {recipients[0]?.name ?? 'a client'} will see it.</p>
          </div>
        </Card>
      </div>

      <Card title="Sent and scheduled" pad={false}>
        {campaigns.rows.length === 0 ? <Empty icon="send" title="No messages yet" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Message</th><th>By</th><th className="hide-sm">To</th><th className="num">People</th><th>When</th></tr></thead>
              <tbody>
                {campaigns.rows.map((c: Campaign) => (
                  <tr key={c.id}>
                    <td style={{ maxWidth: 360 }}><strong style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject || c.message}</strong><small className="muted">{c.kind === 'update' ? 'Update' : 'Promotion'}</small></td>
                    <td>{chLabel(c.channel)}</td>
                    <td className="hide-sm">{c.audience}</td>
                    <td className="num">{c.recipients}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {c.status === 'scheduled' && c.scheduled_at ? <Pill tone="blue">{when(c.scheduled_at, now)}</Pill>
                        : c.status === 'failed' ? <Pill tone="red">Failed</Pill>
                        : c.status === 'draft' ? <Pill>Not sent</Pill>
                        : <span className="muted">{ago(c.sent_at ?? c.created_at, now)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={scheduleOpen} title="Schedule message" onClose={() => setScheduleOpen(false)} footer={<><Button variant="secondary" onClick={() => setScheduleOpen(false)}>Cancel</Button><Button type="submit" form="sf" disabled={busy}>Schedule</Button></>}>
        <form id="sf" className="form" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('at')); const d = new Date(v); if (d.getTime() < Date.now() + 60000) { toast('Choose a time in the future', 'error'); return; } send(d.toISOString()); }}>
          <Field label="Send on" wide hint="Ghana time. Sent within 15 minutes of this time."><input name="at" type="datetime-local" required /></Field>
        </form>
      </Modal>

      <Modal open={!!waList} title="Send on WhatsApp" onClose={() => setWaList(null)} footer={<Button onClick={() => setWaList(null)}>Done</Button>}>
        <p style={{ marginTop: 0 }} className="muted">WhatsApp sends one chat at a time. Tap each person to open the chat with your message ready.</p>
        <ul className="list recips">
          {waList?.map((r) => (
            <li key={r.phone}>
              <div className="list__main"><strong>{r.name}</strong><small>{r.phone}</small></div>
              <a className="btn btn--sm btn--green" href={wa(r.phone, personalise(text.trim(), r.name))} target="_blank" rel="noreferrer"><Icon name="chat" size={16} />Open chat</a>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
