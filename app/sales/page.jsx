'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch } from '@/lib/apiFetch';

const PLAN_LABELS = {
    trial1day: 'Trial 1d', trial: 'Trial 3d', weekly: 'Weekly',
    monthly: 'Monthly', '3months': '3 Months', '6months': '6 Months',
    yearly: 'Yearly', lifetime: 'Lifetime', custom: 'Custom',
};

function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(v) {
    const n = Math.max(0, parseFloat(v) || 0);
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const PERIODS = [
    { key: 'all',   label: 'All Time' },
    { key: 'month', label: 'This Month' },
    { key: 'week',  label: 'This Week' },
    { key: 'today', label: 'Today' },
];

export default function SalesPage() {
    const [sales,   setSales]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [period,  setPeriod]  = useState('all');
    const [search,  setSearch]  = useState('');

    useEffect(() => {
        apiFetch('/api/sales').then(r => {
            if (r?.ok) setSales(r.data);
            setLoading(false);
        });
    }, []);

    const nowTs      = Math.floor(Date.now() / 1000);
    const d          = new Date();
    const todayStart = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000);
    const weekStart  = todayStart - (d.getDay() * 86400);
    const monthStart = Math.floor(new Date(d.getFullYear(), d.getMonth(), 1).getTime() / 1000);

    const inPeriod = (l) => {
        const ts = l.issuedAt || 0;
        if (period === 'today') return ts >= todayStart;
        if (period === 'week')  return ts >= weekStart;
        if (period === 'month') return ts >= monthStart;
        return true;
    };

    const periodSales = sales.filter(inPeriod);

    const filtered = periodSales.filter(l => {
        const q = search.toLowerCase();
        return !q || l.clientName?.toLowerCase().includes(q) || l.plan?.toLowerCase().includes(q);
    });

    const totalRevenue  = filtered.reduce((s, l) => s + Math.max(0, parseFloat(l.discountedPrice ?? l.price) || 0), 0);
    const totalDiscount = filtered.reduce((s, l) => {
        const base = Math.max(0, parseFloat(l.price) || 0);
        const paid = Math.min(base, Math.max(0, parseFloat(l.discountedPrice ?? l.price) || 0));
        return s + Math.max(0, base - paid);
    }, 0);

    const planTotals = filtered.reduce((acc, l) => {
        const plan = l.plan || 'unknown';
        if (!acc[plan]) acc[plan] = { count: 0, amount: 0 };
        acc[plan].count++;
        acc[plan].amount += Math.max(0, parseFloat(l.discountedPrice ?? l.price) || 0);
        return acc;
    }, {});

    return (
        <AppLayout>
            <div className="page">
                <div className="page-header">
                    <div>
                        <div className="page-title">Sales</div>
                        <div className="page-subtitle">Revenue from license sales</div>
                    </div>
                </div>

                <div className="page-body">
                    {/* Period filter */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                        {PERIODS.map(p => (
                            <button key={p.key} onClick={() => setPeriod(p.key)}
                                className={`btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-ghost'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
                        <div className="stat-card">
                            <div className="stat-label">Revenue ({PERIODS.find(p => p.key === period)?.label})</div>
                            <div className="stat-value stat-green">{fmtMoney(totalRevenue)}</div>
                            <div className="stat-sub">{filtered.length} sale{filtered.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Total Discounts Given</div>
                            <div className="stat-value" style={{ color: '#f59e0b' }}>{fmtMoney(totalDiscount)}</div>
                            <div className="stat-sub">Deducted from original prices</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Original Price Total</div>
                            <div className="stat-value stat-accent">{fmtMoney(totalRevenue + totalDiscount)}</div>
                            <div className="stat-sub">Before discounts</div>
                        </div>
                    </div>

                    {/* Plan breakdown */}
                    {Object.keys(planTotals).length > 0 && (
                        <div className="card" style={{ marginBottom: 24 }}>
                            <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 12, fontSize: 13 }}>Revenue by Plan</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {Object.entries(planTotals).sort((a, b) => b[1].amount - a[1].amount).map(([plan, t]) => (
                                    <div key={plan} style={{ background: '#161c2d', border: '1px solid #252d42', borderRadius: 8, padding: '8px 14px' }}>
                                        <div style={{ fontSize: 11, color: '#4a5980', marginBottom: 4, textTransform: 'capitalize' }}>{PLAN_LABELS[plan] || plan}</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>{fmtMoney(t.amount)}</div>
                                        <div style={{ fontSize: 11, color: '#4a5980' }}>{t.count} sale{t.count !== 1 ? 's' : ''}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="search-bar" style={{ marginBottom: 14 }}>
                        <input className="form-input search-input" placeholder="Search by client or plan…" value={search} onChange={e => setSearch(e.target.value)} />
                        {search && <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>Clear</button>}
                    </div>

                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th>Phone</th>
                                    <th>Plan</th>
                                    <th>Original Price</th>
                                    <th>Paid (After Discount)</th>
                                    <th>Discount</th>
                                    <th>Issued At</th>
                                    <th>Expiry</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={8} className="empty">Loading…</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="empty">No sales for this period</td></tr>
                                ) : filtered.map(l => {
                                    const baseAmt = Math.max(0, parseFloat(l.price) || 0);
                                    const paidAmt = Math.min(baseAmt, Math.max(0, parseFloat(l.discountedPrice ?? l.price) || 0));
                                    const discAmt = Math.max(0, baseAmt - paidAmt);
                                    return (
                                        <tr key={l.key}>
                                            <td><span className="bold">{l.clientName}</span></td>
                                            <td>{l.clientPhone || '—'}</td>
                                            <td><span className={`badge badge-plan-${l.plan}`}>{l.plan}</span></td>
                                            <td>{fmtMoney(baseAmt)}</td>
                                            <td style={{ color: '#22c55e', fontWeight: 700 }}>{fmtMoney(paidAmt)}</td>
                                            <td style={{ color: discAmt > 0 ? '#f59e0b' : '#4a5980' }}>{discAmt > 0 ? fmtMoney(discAmt) : '—'}</td>
                                            <td>{fmtDate(l.issuedAt)}</td>
                                            <td>{l.isLifetime ? <span style={{ color: '#a78bfa' }}>Lifetime</span> : fmtDate(l.expiryTs)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
