// Gifts made on jaytech9.com/donate through Paystack (payments with kind "donation").
import { useMemo } from 'react';
import { useTable } from '../lib/store';
import { Card, Empty, PageHead, Pill, Skeleton, useNow } from '../components/ui';
import { ago, dateMed } from '../lib/format';

const ghs = (p: number) => `GH₵ ${(p / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Donations() {
  const { rows, loaded, error } = useTable('payments');
  const now = useNow();
  const gifts = useMemo(() => rows.filter((p) => p.kind === 'donation' && p.status !== 'failed'), [rows]);
  const paid = gifts.filter((g) => g.status === 'success');
  const total = paid.reduce((n, g) => n + g.amount, 0);
  const month = paid.filter((g) => g.paid_at && g.paid_at.slice(0, 7) === now.toISOString().slice(0, 7)).reduce((n, g) => n + g.amount, 0);
  return (
    <>
      <PageHead title="Donations" sub="Gifts made online on the website's Donate page. Thank each donor personally." />
      <div className="kpis" style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 20 }}>
        <Card><small className="muted">Raised in total</small><div style={{ fontSize: 28, fontWeight: 800 }}>{ghs(total)}</div></Card>
        <Card><small className="muted">This month</small><div style={{ fontSize: 28, fontWeight: 800 }}>{ghs(month)}</div></Card>
        <Card><small className="muted">Donors</small><div style={{ fontSize: 28, fontWeight: 800 }}>{paid.length}</div></Card>
      </div>
      <Card pad={false}>
        {error ? <Empty icon="heart" title="Donations are not set up yet" text="Run database/migrations/0001_orders_and_payments.sql on the live database, then reload." />
          : !loaded ? <div style={{ padding: 20 }}><Skeleton /></div> : gifts.length === 0 ? (
          <Empty icon="heart" title="No gifts yet" text="Gifts appear here as soon as Paystack confirms them." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Donor</th><th>Amount</th><th className="hide-sm">Message</th><th>When</th><th>Status</th></tr></thead>
              <tbody>
                {gifts.map((g) => (
                  <tr key={g.id}>
                    <td><strong>{g.payer_name || 'No name given'}</strong><br /><small className="muted">{g.payer_email}</small></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{ghs(g.amount)}{g.channel && <><br /><small className="muted">{g.channel.replace('_', ' ')}</small></>}</td>
                    <td className="hide-sm" style={{ maxWidth: 320, whiteSpace: 'pre-line' }}>{g.message || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{g.paid_at ? dateMed(g.paid_at) : ago(g.created_at, now)}</td>
                    <td>{g.status === 'success' ? <Pill tone="green">Received</Pill> : <Pill tone="grey">Not completed</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
