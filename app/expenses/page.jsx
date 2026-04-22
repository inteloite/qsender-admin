'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch } from '@/lib/apiFetch';

const CATEGORIES = ['Software', 'Marketing', 'Server', 'Tools', 'Office', 'Travel', 'Other'];

const EMPTY = {
    title: '', amount: '', category: CATEGORIES[0], location: '', date: '', notes: '',
};

function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(v) {
    const n = Math.max(0, parseFloat(v) || 0);
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [search,   setSearch]   = useState('');

    const [showForm, setShowForm] = useState(false);
    const [form,     setForm]     = useState(EMPTY);
    const [editId,   setEditId]   = useState(null);
    const [busy,     setBusy]     = useState(false);
    const [err,      setErr]      = useState('');

    const [showHistory, setShowHistory] = useState(null);

    const load = async () => {
        setLoading(true);
        const r = await apiFetch('/api/expenses');
        if (r?.ok) setExpenses(r.data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const openAdd = () => {
        setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) });
        setEditId(null);
        setErr('');
        setShowForm(true);
    };

    const openEdit = (exp) => {
        setForm({
            title:    exp.title || '',
            amount:   String(exp.amount || ''),
            category: exp.category || CATEGORIES[0],
            location: exp.location || '',
            date:     exp.date || new Date().toISOString().slice(0, 10),
            notes:    exp.notes || '',
        });
        setEditId(exp.id);
        setErr('');
        setShowForm(true);
    };

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr('');
        const body = { ...form, amount: parseFloat(form.amount) };
        let r;
        if (editId) {
            r = await apiFetch('/api/expenses', { method: 'PATCH', body: { id: editId, ...body } });
        } else {
            r = await apiFetch('/api/expenses', { method: 'POST', body });
        }
        if (!r?.ok) { setErr(r?.data?.error || 'Failed to save'); setBusy(false); return; }
        setShowForm(false);
        setBusy(false);
        load();
    };

    const filtered = expenses.filter(e => {
        const q = search.toLowerCase();
        return !q || e.title?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q);
    });

    const total = expenses.reduce((s, e) => s + Math.max(0, parseFloat(e.amount) || 0), 0);
    const filteredTotal = filtered.reduce((s, e) => s + Math.max(0, parseFloat(e.amount) || 0), 0);

    return (
        <>
        <AppLayout>
            <div className="page">
                <div className="page-header">
                    <div>
                        <div className="page-title">Expenses</div>
                        <div className="page-subtitle">Total: {fmtMoney(total)}</div>
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>+ Add Expense</button>
                </div>

                <div className="page-body">
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }}>
                        <div className="stat-card">
                            <div className="stat-label">Total Expenses</div>
                            <div className="stat-value stat-red">{fmtMoney(total)}</div>
                            <div className="stat-sub">{expenses.length} record{expenses.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Filtered Total</div>
                            <div className="stat-value" style={{ color: '#f59e0b' }}>{fmtMoney(filteredTotal)}</div>
                            <div className="stat-sub">{filtered.length} match{filtered.length !== 1 ? 'es' : ''}</div>
                        </div>
                    </div>

                    <div className="search-bar" style={{ marginBottom: 14 }}>
                        <input className="form-input search-input" placeholder="Search by title, category or location…" value={search} onChange={e => setSearch(e.target.value)} />
                        {search && <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>Clear</button>}
                    </div>

                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                    <th>Location</th>
                                    <th>Date</th>
                                    <th>Notes</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="empty">Loading…</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="empty">No expenses found</td></tr>
                                ) : filtered.map(exp => (
                                    <tr key={exp.id}>
                                        <td><span className="bold">{exp.title}</span></td>
                                        <td><span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 12, background: 'rgba(124,58,237,.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,.25)' }}>{exp.category}</span></td>
                                        <td style={{ color: '#ef4444', fontWeight: 700 }}>{fmtMoney(exp.amount)}</td>
                                        <td>{exp.location || '—'}</td>
                                        <td>{exp.date || fmtDate(exp.createdAt)}</td>
                                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }}>{exp.notes || '—'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(exp)}>✎ Edit</button>
                                                {exp.originalValues && (
                                                    <button className="btn btn-ghost btn-sm" style={{ color: '#4a9eff' }} onClick={() => setShowHistory(exp)}>History</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>

        {/* ── Add / Edit Modal ───────────────────────────────────────────── */}
        {showForm && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
                <div className="modal" style={{ maxWidth: 500 }}>
                    <div className="modal-header">
                        <span className="modal-title">{editId ? 'Edit Expense' : 'Add Expense'}</span>
                        <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
                    </div>
                    <form onSubmit={submit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Vercel Pro subscription" autoFocus />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Amount (₹) *</label>
                                    <input className="form-input" type="number" min="0" step="0.01" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 2500" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category *</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Location</label>
                                    <input className="form-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Online / Mumbai" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details…" style={{ minHeight: 64 }} />
                            </div>
                            {err && <div className="form-error">{err}</div>}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : (editId ? 'Save Changes' : 'Add Expense')}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* ── History Modal ──────────────────────────────────────────────── */}
        {showHistory && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowHistory(null)}>
                <div className="modal" style={{ maxWidth: 500 }}>
                    <div className="modal-header">
                        <span className="modal-title">Edit History: {showHistory.title}</span>
                        <button className="modal-close" onClick={() => setShowHistory(null)}>×</button>
                    </div>
                    <div className="modal-body">
                        {!showHistory.originalValues || showHistory.originalValues.length === 0 ? (
                            <div className="empty">No edit history</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {showHistory.originalValues.map((snap, i) => {
                                    const current = i === 0 ? showHistory : showHistory.originalValues[i - 1];
                                    const changed = Object.keys(snap).filter(k => k !== 'editedAt' && String(snap[k]) !== String(current[k]));
                                    return (
                                        <div key={i} style={{ background: '#161c2d', border: '1px solid #252d42', borderRadius: 8, padding: '12px 14px' }}>
                                            <div style={{ fontSize: 11, color: '#4a5980', marginBottom: 8 }}>Edit #{showHistory.originalValues.length - i} — {snap.editedAt ? new Date(snap.editedAt).toLocaleString('en-IN') : 'Unknown date'}</div>
                                            {changed.length === 0 ? (
                                                <div style={{ fontSize: 12, color: '#3a4560' }}>No tracked changes</div>
                                            ) : changed.map(k => (
                                                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4 }}>
                                                    <span style={{ color: '#64748b', minWidth: 70, textTransform: 'capitalize' }}>{k}:</span>
                                                    <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>{String(snap[k])}</span>
                                                    <span style={{ color: '#4a5980' }}>→</span>
                                                    <span style={{ color: '#22c55e' }}>{String(current[k])}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={() => setShowHistory(null)}>Close</button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
