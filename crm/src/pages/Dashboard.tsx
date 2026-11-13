import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTable } from '../lib/store';
import { Button, Card, Empty, Pill, Progress, Segmented, Skeleton, Stars, useNow } from '../components/ui';
import { Icon } from '../components/Icon';
import { AreaChart, BarChart, RankBars, Sparkline } from '../components/charts';
import { PERIODS, type Period, groupCount, inRange, isOpenDeal, monthly, range, series, upcoming } from '../lib/analytics';
import { ago, dateShort, greeting, money, num, pct, time, weekday, when } from '../lib/format';
import { STAGES } from '../lib/types';
import { BookingStatusPill } from './Bookings';

function Delta({ now, prev, suffix = 'vs last period' }: { now: number; prev: number; suffix?: string }) {
  const d = pct(now, prev);
  const tone = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
  return (
    <span className="kpi__foot">
      <span className={`delta delta--${tone}`}>{d > 0 && <Icon name="up" size={12} stroke={2.5} />}{d < 0 && <Icon name="down" size={12} stroke={2.5} />}{d > 0 ? '+' : ''}{d}%</span>
      <span>{suffix}</span>
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const now = useNow();
  const nav = useNavigate();
  const [period, setPeriod] = useState<Period>('30d');
  const b = useTable('bookings'), d = useTable('deals'), e = useTable('enquiries'), p = useTable('projects'), r = useTable('reviews');
  const loading = !b.loaded || !d.loaded;

  const m = useMemo(() => {
    const { from, to, prevFrom } = range(period, now);
    const bookingsNow = b.rows.filter((x) => inRange(x.created_at, from, to));
    const bookingsPrev = b.rows.filter((x) => inRange(x.created_at, prevFrom, from));
    const won = (a: Date, z: Date) => d.rows.filter((x) => x.stage === 'won' && inRange(x.closed_at, a, z));
    const lost = (a: Date, z: Date) => d.rows.filter((x) => x.stage === 'lost' && inRange(x.closed_at, a, z));
    const wonNow = won(from, to), wonPrev = won(prevFrom, from);
    const rev = (l: typeof wonNow) => l.reduce((s, x) => s + Number(x.value), 0);
    const rate = (w: number, l: number) => (w + l === 0 ? 0 : Math.round((w / (w + l)) * 100));
    const open = d.rows.filter(isOpenDeal);
    return {
      bookingsNow, bookingsPrev,
      revNow: rev(wonNow), revPrev: rev(wonPrev),
      rateNow: rate(wonNow.length, lost(from, to).length), ratePrev: rate(wonPrev.length, lost(prevFrom, from).length),
      wonCount: wonNow.length,
      pipeline: open.reduce((s, x) => s + Number(x.value), 0), openCount: open.length,
      trend: series(b.rows, (x) => x.created_at, period, undefined, now),
      revenue: monthly(d.rows.filter((x) => x.stage === 'won'), (x) => x.closed_at, (x) => Number(x.value), period === '12m' ? 12 : 6, now),
      byService: groupCount(bookingsNow, (x) => x.service),
      bySource: groupCount(bookingsNow, (x) => x.source, 5),
      stages: STAGES.filter((s) => s.id !== 'lost').map((s) => {
        const list = d.rows.filter((x) => x.stage === s.id);
        return { ...s, count: list.length, value: list.reduce((a, x) => a + Number(x.value), 0) };
      }),
    };
  }, [b.rows, d.rows, period, now]);

  const next = upcoming(b.rows, now, 7).slice(0, 5);
  const newBookings = b.rows.filter((x) => x.status === 'new').length;
  const newEnq = e.rows.filter((x) => x.status === 'new').length;
  const pending = r.rows.filter((x) => x.status === 'pending');
  const activeProjects = p.rows.filter((x) => ['planning', 'in_progress', 'review'].includes(x.status))
    .sort((a, z) => String(a.due_date).localeCompare(String(z.due_date))).slice(0, 4);
  const periodWord = PERIODS.find((x) => x.id === period)!.label.toLowerCase();
  const todo = [newBookings && `${newBookings} new booking${newBookings > 1 ? 's' : ''}`, newEnq && `${newEnq} enquir${newEnq > 1 ? 'ies' : 'y'}`, pending.length && `${pending.length} review${pending.length > 1 ? 's' : ''}`].filter(Boolean);

  return (
    <>
      <div className="hello">
        <div>
          <h1>{greeting(now)}, <span>{user?.name.split(' ')[0]}</span></h1>
          <p>{todo.length ? `${todo.join(', ')} waiting for you.` : 'You are all caught up.'}</p>
        </div>
        <div className="page-head__actions">
          <Segmented label="Period" value={period} options={PERIODS} onChange={setPeriod} />
          <Button icon="plus" onClick={() => nav('/bookings?new=1')}>New booking</Button>
        </div>
      </div>

      {loading ? <div className="card"><Skeleton rows={5} /></div> : (
        <>
          <div className="grid grid--kpi">
            <Card className="kpi">
              <div className="kpi__top"><span className="kpi__label">Bookings</span><span className="kpi__ic"><Icon name="calendar" /></span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                <span className="kpi__value">{num(m.bookingsNow.length)}</span>
                <Sparkline values={m.trend.map((x) => x.value)} label="Bookings trend" />
              </div>
              <Delta now={m.bookingsNow.length} prev={m.bookingsPrev.length} />
            </Card>
            <Card className="kpi">
              <div className="kpi__top"><span className="kpi__label">Revenue won</span><span className="kpi__ic kpi__ic--green"><Icon name="money" /></span></div>
              <span className="kpi__value">{money(m.revNow, true)}</span>
              <Delta now={m.revNow} prev={m.revPrev} suffix={`${m.wonCount} deal${m.wonCount === 1 ? '' : 's'} won`} />
            </Card>
            <Card className="kpi">
              <div className="kpi__top"><span className="kpi__label">Open pipeline</span><span className="kpi__ic"><Icon name="columns" /></span></div>
              <span className="kpi__value">{money(m.pipeline, true)}</span>
              <span className="kpi__foot"><span>{m.openCount} open deals</span><Link to="/pipeline">View</Link></span>
            </Card>
            <Card className="kpi">
              <div className="kpi__top"><span className="kpi__label">Win rate</span><span className="kpi__ic kpi__ic--amber"><Icon name="trophy" /></span></div>
              <span className="kpi__value">{m.rateNow}%</span>
              <span className="kpi__foot">
                <span className={`delta delta--${m.rateNow > m.ratePrev ? 'up' : m.rateNow < m.ratePrev ? 'down' : 'flat'}`}>{m.rateNow - m.ratePrev > 0 ? '+' : ''}{m.rateNow - m.ratePrev} pts</span>
                <span>won of closed deals</span>
              </span>
            </Card>
          </div>

          <div className="grid grid--2">
            <Card title="Bookings over time" action={<span className="muted" style={{ fontWeight: 500 }}>{period === '12m' ? 'Per month' : 'Per week'}</span>}>
              <div className="chart-sum"><strong>{num(m.bookingsNow.length)}</strong><span>bookings in the last {periodWord}</span></div>
              <AreaChart data={m.trend} caption={`Bookings ${period === '12m' ? 'per month' : 'per week'}`} />
            </Card>
            <Card title="Up next" action={<Link to="/bookings">All bookings</Link>}>
              {next.length === 0 ? <Empty icon="calendar" title="No calls in the next 7 days" text="New bookings from the website will show here." /> : (
                <ul className="list">
                  {next.map((x) => (
                    <li key={x.id}>
                      <span className="time-chip"><small>{weekday(x.call_at!)}</small><strong>{time(x.call_at!)}</strong></span>
                      <div className="list__main"><strong>{x.name}</strong><small>{x.service} · {x.method}</small></div>
                      {x.timeline?.startsWith('Urgent') ? <Pill tone="amber">Urgent</Pill> : <BookingStatusPill s={x.status} />}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid grid--3">
            <Card title="Revenue won" action={<span className="muted" style={{ fontWeight: 500 }}>Per month</span>}>
              <div className="chart-sum"><strong>{money(m.revenue.reduce((s, x) => s + x.value, 0), true)}</strong><span>last {m.revenue.length} months</span></div>
              <BarChart data={m.revenue} caption="Revenue won per month" format={(n) => money(n, true).replace('GH₵ ', '')} height={200} />
            </Card>
            <Card title="Bookings by service">
              {m.byService.length ? <RankBars data={m.byService} /> : <Empty title="No bookings in this period" />}
            </Card>
            <Card title="Where clients find us">
              {m.bySource.length ? <RankBars data={m.bySource} /> : <Empty title="No bookings in this period" />}
            </Card>
          </div>

          <Card title="Sales pipeline" action={<Link to="/pipeline">Open board</Link>}>
            <div className="funnel">
              {m.stages.map((s) => (
                <div key={s.id} className={`funnel__step ${s.id === 'won' ? 'funnel__step--won' : ''}`}>
                  <small>{s.label}</small><strong>{s.count}</strong><span>{money(s.value, true)}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid--2">
            <Card title="Latest bookings" pad={false} action={<Link to="/bookings">View all</Link>}>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Client</th><th className="hide-sm">Service</th><th>Call</th><th>Status</th></tr></thead>
                  <tbody>
                    {b.rows.slice(0, 6).map((x) => (
                      <tr key={x.id} className="is-click" onClick={() => nav(`/bookings?open=${x.id}`)}>
                        <td><div className="who"><div><strong>{x.name}</strong><small>{ago(x.created_at, now)}</small></div></div></td>
                        <td className="hide-sm">{x.service}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{x.call_at ? when(x.call_at, now) : '—'}</td>
                        <td><BookingStatusPill s={x.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="stack">
              <Card title="Projects due" action={<Link to="/projects">All projects</Link>}>
                {activeProjects.length === 0 ? <Empty icon="folder" title="No active projects" /> : (
                  <ul className="list">
                    {activeProjects.map((x) => (
                      <li key={x.id} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <strong style={{ fontSize: 14.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</strong>
                          <span className="muted tnum" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{x.due_date ? `Due ${dateShort(x.due_date)}` : ''}</span>
                        </div>
                        <Progress value={x.progress} label={`${x.title} progress`} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Reviews waiting" action={<Link to="/reviews">Review</Link>}>
                {pending.length === 0 ? <p className="muted" style={{ margin: 0 }}>No reviews waiting.</p> : (
                  <ul className="list">
                    {pending.slice(0, 2).map((x) => (
                      <li key={x.id}>
                        <div className="list__main"><strong>{x.name}</strong><small>“{x.message}”</small></div>
                        <Stars value={x.rating ?? 5} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
