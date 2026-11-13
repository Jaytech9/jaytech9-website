import { publishWebsiteSoon, logActivity, updateRow, useTable } from '../lib/store';
import { Card, PageHead, Pill, Skeleton, Switch, useNow, useToast } from '../components/ui';
import { ago } from '../lib/format';
import type { Section } from '../lib/types';

export default function Website() {
  const { rows, loaded } = useTable('site_sections');
  const now = useNow();
  const toast = useToast();
  const flip = async (s: Section, enabled: boolean) => {
    try {
      await updateRow('site_sections', s.key, { enabled });
      logActivity('website', `${s.label} ${enabled ? 'switched on' : 'switched off'}`);
      toast(`${s.label} ${enabled ? 'on' : 'off'}. Website updating…`);
      publishWebsiteSoon((ok) => toast(ok ? 'Website updated, live in about a minute' : 'Could not reach the website. Try again in Settings.', ok ? 'ok' : 'error'));
    } catch (e) { toast((e as Error).message, 'error'); }
  };
  const live = rows.filter((s) => s.enabled).length;
  return (
    <>
      <PageHead title="Website sections" sub="Switch a section off while it isn't ready, and back on when it is. No code needed." />
      <div className="grid grid--2">
        <Card title="Sections" action={<a href="https://jaytech9.com" target="_blank" rel="noreferrer">See live site</a>}>
          {!loaded ? <Skeleton /> : (
            <div>
              {rows.map((s) => (
                <div key={s.key} className="toggle-row">
                  <div className="toggle-row__main"><strong>{s.label}</strong><small>{s.location} · changed {ago(s.updated_at, now)}</small></div>
                  <Pill tone={s.enabled ? 'green' : 'grey'}>{s.enabled ? 'Live' : 'Hidden'}</Pill>
                  <Switch label={s.label} on={s.enabled} onChange={(v) => flip(s, v)} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="stack">
          <Card title="At a glance">
            <div className="funnel" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="funnel__step funnel__step--won"><small>Live</small><strong>{live}</strong></div>
              <div className="funnel__step"><small>Hidden</small><strong>{rows.length - live}</strong></div>
            </div>
          </Card>
          <Card title="How it works">
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--ink-2)' }}>
              <li>Flip a switch. It saves straight away.</li>
              <li>The website rebuilds itself in the background.</li>
              <li>About a minute later the change is live for every visitor.</li>
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
