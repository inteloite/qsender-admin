'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch } from '@/lib/apiFetch';

function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDaysLeft(l) {
    if (l.isLifetime) return null;
    return Math.floor((l.expiryTs - Math.floor(Date.now() / 1000)) / 86400);
}

export default function DashboardPage() {
    const [licenses, setLicenses] = useState([]);
    const [sales,    setSales]    = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [stats,    setStats]    = useState({ totalRevenue: 0, totalExpenses: 0, moneyLeft: 0 });
    const [loading,  setLoading]  = useState(true);

    useEffect(() => {
        const load = async () => {
            const [lRes, sRes, eRes, stRes] = await Promise.all([
                apiFetch('/api/licenses/list'),
                apiFetch('/api/sales'),
                apiFetch('/api/expenses'),
                apiFetch('/api/stats'),
            ]);
            if (lRes?.ok)  setLicenses(lRes.data);
            if (sRes?.ok)  setSales(sRes.data);
            if (eRes?.ok)  setExpenses(eRes.data);
            if (stRes?.ok) setStats(stRes.data);
            setLoading(false);
        };
        load();
    }, []);

    const now        = Math.floor(Date.now() / 1000);
    const todayStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime() / 1000);
    const total      = licenses.length;
    const active     = licenses.filter(l => !l.revoked && (l.isLifetime || l.expiryTs > now)).length;
    const revoked    = licenses.filter(l => l.revoked).length;
    const expired    = licenses.filter(l => !l.revoked && !l.isLifetime && l.expiryTs <= now).length;
    const issuedToday = licenses.filter(l => (l.issuedAt || 0) >= todayStart).length;

    const planCount = licenses.reduce((acc, l) => {
        if (!l.revoked) acc[l.plan] = (acc[l.plan] || 0) + 1;
        return acc;
    }, {});

    const recent = [...licenses].slice(0, 8);

    return (
        <AppLayout>
            <div className="page">
                <div className="page-header">
                    <div>
                        <div className="page-title">Dashboard</div>
                        <div className="page-subtitle">Overview of your license business</div>
                    </div>
                </div>

                <div className="page-body">
                    {loading ? (
                        <div className="empty">Loading stats…</div>
                    ) : (
                        <>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-label">Total Licenses</div>
                                    <div className="stat-value stat-accent">{total}</div>
                                    <div className="stat-sub">All time issued</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Active</div>
                                    <div className="stat-value stat-green">{active}</div>
                                    <div className="stat-sub">Not expired or revoked</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Revoked</div>
                                    <div className="stat-value stat-red">{revoked}</div>
                                    <div className="stat-sub">Manually revoked</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Expired</div>
                                    <div className="stat-value" style={{ color: '#64748b' }}>{expired}</div>
                                    <div className="stat-sub">Past expiry date</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Issued Today</div>
                                    <div className="stat-value" style={{ color: '#f59e0b' }}>{issuedToday}</div>
                                    <div className="stat-sub">Since midnight</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Total Revenue</div>
                                    <div className="stat-value stat-green">₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
                                    <div className="stat-sub">From license sales</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Total Expenses</div>
                                    <div className="stat-value stat-red">₹{stats.totalExpenses.toLocaleString('en-IN')}</div>
                                    <div className="stat-sub">All recorded expenses</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Money Left</div>
                                    <div className="stat-value" style={{ color: stats.moneyLeft >= 0 ? '#22c55e' : '#ef4444' }}>
                                        ₹{stats.moneyLeft.toLocaleString('en-IN')}
                                    </div>
                                    <div className="stat-sub">Revenue minus expenses</div>
                                </div>
                            </div>

                            {/* Plan breakdown */}
                            {Object.keys(planCount).length > 0 && (
                                <div className="card" style={{ marginBottom: 24 }}>
                                    <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 14, fontSize: 14 }}>Active Licenses by Plan</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                        {Object.entries(planCount).map(([plan, count]) => (
                                            <div key={plan} style={{ background: '#161c2d', border: '1px solid #252d42', borderRadius: 8, padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                                                <span style={{ fontWeight: 700, fontSize: 20, color: '#e2e8f0' }}>{count}</span>
                                                <span style={{ fontSize: 12, color: '#4a5980', textTransform: 'capitalize' }}>{plan}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 12, fontSize: 14 }}>Recent Licenses</div>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Client</th>
                                            <th>Key</th>
                                            <th>Plan</th>
                                            <th>Issued At</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recent.length === 0 ? (
                                            <tr><td colSpan={5} className="empty">No licenses yet</td></tr>
                                        ) : recent.map(l => {
                                            const days = getDaysLeft(l);
                                            const isExpired = !l.isLifetime && days !== null && days < 0;
                                            return (
                                                <tr key={l.key}>
                                                    <td><span className="bold">{l.clientName}</span></td>
                                                    <td><span className="mono">{l.key.slice(0, 20)}…</span></td>
                                                    <td><span className={`badge badge-plan-${l.plan}`}>{l.plan}</span></td>
                                                    <td>{fmtDate(l.issuedAt)}</td>
                                                    <td>
                                                        {l.revoked   && <span className="badge badge-revoked">Revoked</span>}
                                                        {!l.revoked && isExpired  && <span className="badge badge-expired">Expired</span>}
                                                        {!l.revoked && !isExpired && <span className="badge badge-active">Active</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
