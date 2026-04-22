'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch } from '@/lib/apiFetch';

const PLANS = [
    { value: 'trial1day', label: 'Trial (1 day)'       },
    { value: 'trial',     label: 'Trial (3 days)'      },
    { value: 'weekly',    label: 'Weekly (7 days)'     },
    { value: 'monthly',   label: 'Monthly (30 days)'   },
    { value: '3months',   label: '3 Months (90 days)'  },
    { value: '6months',   label: '6 Months (180 days)' },
    { value: 'yearly',    label: 'Yearly (365 days)'   },
    { value: 'lifetime',  label: 'Lifetime'            },
    { value: 'custom',    label: 'Custom days'         },
];

const FEATURE_OPTIONS = [
    { key: 'mobile',       label: 'Open on Mobile',  sub: 'Cloudflare tunnel'   },
    { key: 'trustBuilder', label: 'Trust Builder',   sub: 'Account warming'     },
    { key: 'autoReply',    label: 'Auto Reply',      sub: 'Auto responses'      },
    { key: 'chatbot',      label: 'Chatbot Flows',   sub: 'Flow builder'        },
    { key: 'liveChat',     label: 'Live Chat',       sub: 'Real-time chat'      },
    { key: 'groupGrabber', label: 'Group Grabber',   sub: 'Extract groups'      },
];

const DEFAULT_FEATURES = {
    mobile: true, trustBuilder: true, autoReply: true,
    chatbot: true, liveChat: true, groupGrabber: true,
};

const EMPTY_FORM = {
    clientName: '', clientPhone: '', clientEmail: '',
    businessCategory: '', website: '',
    machineId: '', plan: 'monthly', deviceLimit: '1',
    customDays: '', notes: '', price: '', discountedPrice: '',
    features: { ...DEFAULT_FEATURES },
};

function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(v) {
    const n = Math.max(0, parseFloat(v) || 0);
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getDaysLeft(l) {
    if (l.isLifetime) return null;
    return Math.floor((l.expiryTs - Math.floor(Date.now() / 1000)) / 86400);
}

function getLicenseStatus(l, nowTs) {
    if (l.revoked) return 'Revoked';
    if (!l.isLifetime && (l.expiryTs || 0) <= nowTs) return 'Expired';
    return 'Active';
}

function csvEscape(value) {
    const s = String(value ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

async function loadImageAsDataUrl(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
}

export default function LicensesPage() {
    const [licenses,  setLicenses]  = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [search,    setSearch]    = useState('');

    // Generate modal
    const [showGen,   setShowGen]   = useState(false);
    const [form,      setForm]      = useState(EMPTY_FORM);
    const [genBusy,   setGenBusy]   = useState(false);
    const [genErr,    setGenErr]     = useState('');
    const [genKey,    setGenKey]    = useState('');
    const [generatedLicense, setGeneratedLicense] = useState(null);
    const [invoiceBusy, setInvoiceBusy] = useState(false);

    // Revoke
    const [showRev,   setShowRev]   = useState(null);
    const [revReason, setRevReason] = useState('');
    const [revBusy,   setRevBusy]   = useState(false);

    // Delete
    const [showDel,   setShowDel]   = useState(null);
    const [delBusy,   setDelBusy]   = useState(false);

    // Edit
    const [showEdit,  setShowEdit]  = useState(null);
    const [editForm,  setEditForm]  = useState({ clientName: '', clientPhone: '', clientEmail: '', businessCategory: '', website: '', price: '', notes: '', features: { ...DEFAULT_FEATURES } });
    const [editBusy,  setEditBusy]  = useState(false);
    const [editErr,   setEditErr]   = useState('');

    // Detail
    const [showDetail, setShowDetail] = useState(null);

    // Convert
    const [showConvert,   setShowConvert]   = useState(null);
    const [convertForm,   setConvertForm]   = useState({ plan: 'monthly', deviceLimit: '1', customDays: '', price: '', discountedPrice: '', notes: '', machineId: '', features: { ...DEFAULT_FEATURES } });
    const [convertBusy,   setConvertBusy]   = useState(false);
    const [convertErr,    setConvertErr]    = useState('');
    const [convertedKey,  setConvertedKey]  = useState('');
    const [convertedLicense, setConvertedLicense] = useState(null);

    // Export
    const [exportFormat, setExportFormat] = useState('csv');
    const [exportBusy,   setExportBusy]   = useState(false);

    const [copied, setCopied] = useState('');

    const load = async () => {
        setLoading(true);
        const r = await apiFetch('/api/licenses/list');
        if (r?.ok) setLicenses(r.data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const filtered = licenses.filter(l => {
        if (l.revoked && l.revokedReason?.startsWith('Converted to')) return false;
        const q = search.toLowerCase();
        return !q || l.clientName?.toLowerCase().includes(q) ||
            l.key.toLowerCase().includes(q) ||
            l.clientPhone?.toLowerCase().includes(q) ||
            l.machineId?.toLowerCase().includes(q);
    });

    const copyKey = (key) => {
        navigator.clipboard.writeText(key);
        setCopied(key);
        setTimeout(() => setCopied(''), 1800);
    };

    // ── Generate ──────────────────────────────────────────────────────────
    const generate = async (e) => {
        e.preventDefault();
        setGenBusy(true);
        setGenErr('');
        const r = await apiFetch('/api/licenses/generate', { method: 'POST', body: form });
        if (!r) return;
        if (!r.ok) { setGenErr(r.data.error || 'Failed'); setGenBusy(false); return; }
        setGenKey(r.data.key);
        setGeneratedLicense(r.data.license || null);
        setGenBusy(false);
        load();
    };

    const formPrice       = Math.max(0, parseFloat(form.price) || 0);
    const formDiscounted  = form.discountedPrice === '' ? formPrice : Math.min(formPrice, Math.max(0, parseFloat(form.discountedPrice) || 0));
    const formDiscount    = Math.max(0, formPrice - formDiscounted);
    const formDiscPct     = formPrice > 0 ? Math.round((formDiscount / formPrice) * 100) : 0;

    // ── Invoice PDF ───────────────────────────────────────────────────────
    const downloadInvoiceForLicense = async (license) => {
        if (!license) return;
        setInvoiceBusy(true);
        try {
            const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ]);
            const l = license;
            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            const pageWidth  = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const issuedDate     = fmtDate(l.issuedAt);
            const dueDate        = l.isLifetime ? 'Lifetime' : fmtDate(l.expiryTs);
            const invoiceId      = `INV-${String(l.key || '').slice(4, 12)}`;
            const baseAmount     = Math.max(0, parseFloat(l.price) || 0);
            const paidAmount     = Math.min(baseAmount, Math.max(0, parseFloat(l.discountedPrice ?? l.price) || 0));
            const discountAmount = Math.max(0, baseAmount - paidAmount);
            const hasDiscount    = discountAmount > 0;
            const discountPct    = baseAmount > 0 ? Math.round((discountAmount / baseAmount) * 100) : 0;
            const activeFeatures = FEATURE_OPTIONS
                .filter(f => (l.features ? l.features[f.key] !== false : true))
                .map(f => f.label).join(', ') || '-';

            // Header
            doc.setFillColor(12, 36, 74);
            doc.rect(0, 0, pageWidth, 100, 'F');
            doc.setFillColor(14, 116, 144);
            doc.rect(0, 92, pageWidth, 8, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(26);
            doc.text('QSender', 40, 52);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text('License Activation Invoice', 40, 70);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('INVOICE', pageWidth - 130, 38);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Invoice #: ${invoiceId}`, pageWidth - 200, 56);
            doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 200, 72);
            doc.text(`Issued: ${issuedDate}`, pageWidth - 200, 88);

            // Bill To
            doc.setFillColor(245, 247, 251);
            doc.rect(40, 118, pageWidth - 80, 84, 'F');
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('Bill To', 52, 138);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Client: ${l.clientName || '-'}`, 52, 156);
            doc.text(`Phone: ${l.clientPhone || '-'}`, 52, 172);
            doc.text(`Email: ${l.clientEmail || '-'}`, 52, 188);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('Account Details', pageWidth - 250, 138);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Business: ${l.businessCategory || '-'}`, pageWidth - 250, 156);
            doc.text(`Website: ${l.website || 'No website'}`, pageWidth - 250, 172);
            doc.text(`Issued By: ${l.issuedByName || '-'}`, pageWidth - 250, 188);

            autoTable(doc, {
                startY: 224,
                head: [['Description', 'Details', 'Amount']],
                body: [
                    ['Product', 'QSender Software License Activation', fmtMoney(baseAmount)],
                    ['Plan', String(l.plan || '-').toUpperCase(), ''],
                    ['Validity', `${issuedDate} to ${dueDate}`, ''],
                    ['Device Limit', String(l.deviceLimit || 1), ''],
                    ['License Key', l.key || '-', ''],
                    ['Machine ID', l.machineId || '-', ''],
                    ['Features', activeFeatures, ''],
                    ...(hasDiscount ? [['Discounted Price', `${discountPct}% discount applied`, fmtMoney(paidAmount)]] : []),
                ],
                theme: 'grid',
                styles: { fontSize: 9.5, cellPadding: 7, textColor: [30, 41, 59] },
                headStyles: { fillColor: [12, 36, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 130, fontStyle: 'bold' },
                    1: { cellWidth: 330 },
                    2: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
                },
            });

            let finalY = doc.lastAutoTable?.finalY || 450;
            doc.setDrawColor(226, 232, 240);
            doc.line(40, finalY + 24, pageWidth - 40, finalY + 24);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.text('Total Amount', pageWidth - 200, finalY + 52);
            doc.text(fmtMoney(paidAmount), pageWidth - 60, finalY + 52, { align: 'right' });

            if (l.notes) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9.5);
                doc.setTextColor(71, 85, 105);
                doc.text(`Note: ${l.notes}`, 40, finalY + 48, { maxWidth: 320 });
            }

            doc.setFillColor(240, 249, 255);
            const tosY = finalY + 90;
            doc.rect(40, tosY, pageWidth - 80, 80, 'F');
            doc.setDrawColor(14, 116, 144);
            doc.rect(40, tosY, pageWidth - 80, 80);
            doc.setTextColor(3, 105, 161);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Terms & Conditions', 52, tosY + 18);
            doc.setTextColor(71, 85, 105);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text([
                '• License is non-transferable and bound to the registered machine.',
                '• QSender is not liable for any restrictions imposed by WhatsApp / Meta.',
                '• All outbound messages must comply with Meta\'s WhatsApp policy guidelines.',
            ], 52, tosY + 34, { lineHeightFactor: 1.6 });

            doc.setFillColor(248, 250, 252);
            doc.rect(0, pageHeight - 44, pageWidth, 44, 'F');
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(9);
            doc.text('Thank you for choosing QSender.', pageWidth / 2, pageHeight - 20, { align: 'center' });

            const safeName = (l.clientName || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            doc.save(`qsender-invoice-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);
        } finally {
            setInvoiceBusy(false);
        }
    };

    // ── Revoke ────────────────────────────────────────────────────────────
    const revoke = async () => {
        setRevBusy(true);
        const r = await apiFetch('/api/licenses/revoke', { method: 'POST', body: { key: showRev, reason: revReason } });
        if (r?.ok) { setShowRev(null); setRevReason(''); load(); }
        setRevBusy(false);
    };

    // ── Delete ────────────────────────────────────────────────────────────
    const deleteLic = async () => {
        setDelBusy(true);
        const r = await apiFetch('/api/licenses/delete', { method: 'POST', body: { key: showDel.key } });
        if (r?.ok) { setShowDel(null); load(); }
        setDelBusy(false);
    };

    // ── Edit ──────────────────────────────────────────────────────────────
    const updateLicense = async (e) => {
        e.preventDefault();
        setEditBusy(true);
        setEditErr('');
        const r = await apiFetch('/api/licenses/update', {
            method: 'POST',
            body: { key: showEdit.key, ...editForm },
        });
        if (!r?.ok) { setEditErr(r?.data?.error || 'Failed to update'); setEditBusy(false); return; }
        setShowEdit(null);
        setEditBusy(false);
        load();
    };

    // ── Convert ───────────────────────────────────────────────────────────
    const openConvert = (license) => {
        setShowConvert(license);
        setConvertForm({
            plan: 'monthly', deviceLimit: String(license.deviceLimit || 1),
            customDays: '', price: '', discountedPrice: '',
            notes: license.notes || '',
            machineId: license.machineId || '',
            features: license.features ? { ...license.features } : { ...DEFAULT_FEATURES },
        });
        setConvertErr('');
        setConvertedKey('');
        setConvertedLicense(null);
    };

    const convertLicense = async (e) => {
        e.preventDefault();
        setConvertBusy(true);
        setConvertErr('');
        const r = await apiFetch('/api/licenses/convert', {
            method: 'POST',
            body: { oldKey: showConvert.key, ...convertForm },
        });
        if (!r?.ok) { setConvertErr(r?.data?.error || 'Conversion failed'); setConvertBusy(false); return; }
        setConvertedKey(r.data.key);
        setConvertedLicense(r.data.license || null);
        setConvertBusy(false);
        load();
    };

    // ── Export ────────────────────────────────────────────────────────────
    const downloadCsv = () => {
        const nowTs   = Math.floor(Date.now() / 1000);
        const headers = ['Client Name','Phone','Email','Business Category','Website','Plan','Price','Discounted Price','Device Limit','Machine ID','Key','Issued At','Expiry','Status','Revoked Reason','Features','Notes'];
        const rows    = licenses.map(l => {
            const feats = FEATURE_OPTIONS.filter(f => l.features ? l.features[f.key] !== false : true).map(f => f.label).join(' | ');
            return [
                l.clientName || '', l.clientPhone || '', l.clientEmail || '',
                l.businessCategory || '', l.website || '',
                l.plan || '', l.price || 0, l.discountedPrice ?? '',
                l.deviceLimit || 1, l.machineId || '', l.key || '',
                fmtDate(l.issuedAt), l.isLifetime ? 'Lifetime' : fmtDate(l.expiryTs),
                getLicenseStatus(l, nowTs), l.revokedReason || '',
                feats, l.notes || '',
            ].map(csvEscape).join(',');
        });
        const csv  = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `qsender-licenses-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const downloadPdf = async () => {
        const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
            import('jspdf'), import('jspdf-autotable'),
        ]);
        const nowTs = Math.floor(Date.now() / 1000);
        const doc   = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        doc.setFontSize(14);
        doc.text('QSender Licenses — Full Export', 36, 30);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 36, 48);
        const body = licenses.map(l => {
            const feats = FEATURE_OPTIONS.filter(f => l.features ? l.features[f.key] !== false : true).map(f => f.label).join(', ');
            return [
                l.clientName || '-', l.plan || '-', fmtMoney(l.discountedPrice ?? l.price),
                l.deviceLimit || 1, fmtDate(l.issuedAt),
                l.isLifetime ? 'Lifetime' : fmtDate(l.expiryTs),
                getLicenseStatus(l, nowTs),
                `Key: ${l.key}\nMachine: ${l.machineId}\nFeatures: ${feats}`,
            ];
        });
        autoTable(doc, {
            startY: 60,
            head: [['Client','Plan','Price','Devices','Issued At','Expiry','Status','Details']],
            body,
            styles: { fontSize: 8, cellPadding: 3, valign: 'top' },
            headStyles: { fillColor: [124, 58, 237] },
            columnStyles: {
                0: { cellWidth: 90 }, 1: { cellWidth: 55 }, 2: { cellWidth: 58 },
                3: { cellWidth: 44 }, 4: { cellWidth: 62 }, 5: { cellWidth: 62 },
                6: { cellWidth: 50 }, 7: { cellWidth: 280 },
            },
        });
        doc.save(`qsender-licenses-${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const downloadLicenses = async () => {
        if (!licenses.length) return;
        setExportBusy(true);
        try { exportFormat === 'pdf' ? await downloadPdf() : downloadCsv(); }
        finally { setExportBusy(false); }
    };

    const now = Math.floor(Date.now() / 1000);

    return (
        <>
        <AppLayout>
            <div className="page">
                <div className="page-header">
                    <div>
                        <div className="page-title">Licenses</div>
                        <div className="page-subtitle">{licenses.length} total issued</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select className="form-select" style={{ width: 110 }} value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
                            <option value="csv">CSV</option>
                            <option value="pdf">PDF</option>
                        </select>
                        <button className="btn btn-ghost" onClick={downloadLicenses} disabled={exportBusy || licenses.length === 0}>
                            {exportBusy ? 'Preparing…' : 'Download'}
                        </button>
                        <button className="btn btn-primary" onClick={() => { setShowGen(true); setGenKey(''); setGeneratedLicense(null); setForm(EMPTY_FORM); }}>
                            + Generate Key
                        </button>
                    </div>
                </div>

                <div className="page-body">
                    <div className="search-bar">
                        <input className="form-input search-input" placeholder="Search by client, key, phone or machine ID…" value={search} onChange={e => setSearch(e.target.value)} />
                        {search && <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>Clear</button>}
                    </div>

                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th>Key</th>
                                    <th>Plan</th>
                                    <th>Devices</th>
                                    <th>Expiry / Days Left</th>
                                    <th>Machine ID</th>
                                    <th>Issued At</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={9} className="empty">Loading…</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={9} className="empty">No licenses found</td></tr>
                                ) : filtered.map(l => {
                                    const days = getDaysLeft(l);
                                    const isExpired = !l.isLifetime && days !== null && days < 0;
                                    const isTrial   = l.plan === 'trial' || l.plan === 'trial1day';
                                    return (
                                        <tr key={l.key}>
                                            <td>
                                                <div className="bold" style={{ cursor: 'pointer', color: '#a78bfa', textDecoration: 'underline', textDecorationStyle: 'dotted' }} onClick={() => setShowDetail(l)}>{l.clientName}</div>
                                                {l.clientPhone && <div className="dim">{l.clientPhone}</div>}
                                            </td>
                                            <td>
                                                <span className="mono copy-key" title="Click to copy" onClick={() => copyKey(l.key)}>
                                                    {copied === l.key ? '✓ Copied!' : l.key.slice(0, 23) + '…'}
                                                </span>
                                            </td>
                                            <td><span className={`badge badge-plan-${l.plan}`}>{l.plan}</span></td>
                                            <td style={{ textAlign: 'center' }}>{l.deviceLimit}</td>
                                            <td>
                                                {l.isLifetime ? (
                                                    <span style={{ color: '#a78bfa', fontWeight: 600 }}>Lifetime</span>
                                                ) : (
                                                    <>
                                                        <div>{fmtDate(l.expiryTs)}</div>
                                                        <div className="dim" style={{ color: days !== null && days < 7 && days >= 0 ? '#f59e0b' : '' }}>
                                                            {days !== null && days >= 0 ? `${days}d left` : days !== null ? 'Expired' : ''}
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                            <td><span className="mono" style={{ fontSize: 11 }}>{(l.machineId || '').slice(0, 16)}…</span></td>
                                            <td>{fmtDate(l.issuedAt)}</td>
                                            <td>
                                                {l.revoked   && <span className="badge badge-revoked">Revoked</span>}
                                                {!l.revoked && isExpired  && <span className="badge badge-expired">Expired</span>}
                                                {!l.revoked && !isExpired && <span className="badge badge-active">Active</span>}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => {
                                                        setShowEdit(l);
                                                        setEditForm({ clientName: l.clientName || '', clientPhone: l.clientPhone || '', clientEmail: l.clientEmail || '', businessCategory: l.businessCategory || '', website: l.website || '', price: l.price ?? '', notes: l.notes || '', features: { ...DEFAULT_FEATURES, ...(l.features || {}) } });
                                                        setEditErr('');
                                                    }}>✎</button>
                                                    {!l.revoked && (
                                                        <button className="btn btn-danger btn-sm" onClick={() => { setShowRev(l.key); setRevReason(''); }}>Revoke</button>
                                                    )}
                                                    {isTrial && !l.revoked && (
                                                        <button className="btn btn-sm" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,.35)' }} onClick={() => openConvert(l)} title="Convert to paid plan">
                                                            Convert
                                                        </button>
                                                    )}
                                                    <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,.3)' }} onClick={() => setShowDel({ key: l.key, clientName: l.clientName, price: Math.max(0, parseFloat(l.discountedPrice ?? l.price) || 0), plan: l.plan || '' })}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>

        {/* ── Generate Modal ──────────────────────────────────────────────── */}
        {showGen && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !genKey && setShowGen(false)}>
                <div className="modal">
                    <div className="modal-header">
                        <span className="modal-title">{genKey ? '✓ Key Generated' : 'Generate License Key'}</span>
                        <button className="modal-close" onClick={() => setShowGen(false)}>×</button>
                    </div>
                    {genKey ? (
                        <div className="modal-body">
                            <div style={{ background: '#161c2d', border: '1px solid #7c3aed', borderRadius: 10, padding: '16px 18px' }}>
                                <div style={{ fontSize: 11, color: '#4a5980', marginBottom: 6, fontWeight: 600 }}>LICENSE KEY</div>
                                <div style={{ fontFamily: 'Courier New, monospace', fontSize: 14, color: '#a78bfa', letterSpacing: '.5px', wordBreak: 'break-all' }}>{genKey}</div>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { navigator.clipboard.writeText(genKey); setCopied('__gen__'); setTimeout(() => setCopied(''), 2000); }}>
                                {copied === '__gen__' ? '✓ Key Copied!' : 'Copy Key'}
                            </button>
                            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => downloadInvoiceForLicense(generatedLicense)} disabled={!generatedLicense || invoiceBusy}>
                                {invoiceBusy ? 'Preparing Invoice…' : 'Download Invoice (PDF)'}
                            </button>
                            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => { setGenKey(''); setGeneratedLicense(null); setForm(EMPTY_FORM); }}>
                                Generate Another
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={generate}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Client Name *</label>
                                        <input className="form-input" required value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="e.g. John Doe" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">WhatsApp / Phone</label>
                                        <input className="form-input" value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} placeholder="+91 9876543210" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="client@email.com" />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Business Category</label>
                                        <input className="form-input" value={form.businessCategory} onChange={e => setForm(f => ({ ...f, businessCategory: e.target.value }))} placeholder="e.g. E-commerce" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Website</label>
                                        <input className="form-input" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Machine ID *</label>
                                    <input className="form-input" required value={form.machineId} onChange={e => setForm(f => ({ ...f, machineId: e.target.value }))} placeholder="Paste from QSender app License screen" style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }} />
                                    <span style={{ fontSize: 11, color: '#3a4560' }}>Found in the QSender desktop app → License screen</span>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Plan *</label>
                                        <select className="form-select" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                                            {PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Device Limit *</label>
                                        <input className="form-input" type="number" min={1} max={255} required value={form.deviceLimit} onChange={e => setForm(f => ({ ...f, deviceLimit: e.target.value }))} />
                                    </div>
                                </div>
                                {form.plan === 'custom' && (
                                    <div className="form-group">
                                        <label className="form-label">Custom Days *</label>
                                        <input className="form-input" type="number" min={1} required={form.plan === 'custom'} value={form.customDays} onChange={e => setForm(f => ({ ...f, customDays: e.target.value }))} placeholder="e.g. 45" />
                                    </div>
                                )}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Price (₹)</label>
                                        <input className="form-input" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 999" />
                                        <label className="form-label" style={{ marginTop: 8 }}>Discounted Price (₹)</label>
                                        <input className="form-input" type="number" min="0" step="0.01" value={form.discountedPrice} onChange={e => setForm(f => ({ ...f, discountedPrice: e.target.value }))} placeholder="Leave blank for no discount" />
                                        <span style={{ fontSize: 11, color: '#4a5980', marginTop: 4 }}>
                                            Discount: <span style={{ color: '#22c55e', fontWeight: 700 }}>₹{formDiscount.toLocaleString('en-IN')}</span>
                                            <span style={{ color: '#4a9eff', fontWeight: 700 }}> ({formDiscPct}%)</span>
                                        </span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Notes</label>
                                        <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal note" style={{ minHeight: 80 }} />
                                    </div>
                                </div>
                                {/* Features */}
                                <div className="form-group">
                                    <label className="form-label" style={{ marginBottom: 8 }}>Features Included</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                        {FEATURE_OPTIONS.map(({ key, label, sub }) => (
                                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, border: '1px solid', borderColor: form.features[key] ? '#7c3aed' : '#252d42', background: form.features[key] ? 'rgba(124,58,237,.1)' : 'transparent', transition: 'all .15s', userSelect: 'none' }}>
                                                <input type="checkbox" checked={form.features[key] ?? true} onChange={e => setForm(f => ({ ...f, features: { ...f.features, [key]: e.target.checked } }))} style={{ accentColor: '#7c3aed', width: 14, height: 14, flexShrink: 0 }} />
                                                <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: form.features[key] ? '#e2e8f0' : '#4a5980' }}>{label}</span>
                                                    <span style={{ fontSize: 10, color: '#3a4560' }}>{sub}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, features: { ...DEFAULT_FEATURES } }))} style={{ marginTop: 6, background: 'none', border: 'none', color: '#4a5980', fontSize: 11, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                                        ↺ Select all
                                    </button>
                                </div>
                                {genErr && <div className="form-error">{genErr}</div>}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowGen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={genBusy}>{genBusy ? 'Generating…' : 'Generate Key'}</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )}

        {/* ── Detail Modal ────────────────────────────────────────────────── */}
        {showDetail && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
                <div className="modal" style={{ maxWidth: 580 }}>
                    <div className="modal-header">
                        <span className="modal-title">📋 License Details</span>
                        <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
                    </div>
                    <div className="modal-body">
                        {[
                            ['Client Name',       showDetail.clientName],
                            ['Phone',             showDetail.clientPhone || '—'],
                            ['Email',             showDetail.clientEmail || '—'],
                            ['Business',          showDetail.businessCategory || '—'],
                            ['Website',           showDetail.website || '—'],
                            ['Plan',              showDetail.plan],
                            ['Device Limit',      showDetail.deviceLimit],
                            ['Price',             fmtMoney(showDetail.price)],
                            ['Discounted Price',  showDetail.discountedPrice != null ? fmtMoney(showDetail.discountedPrice) : '—'],
                            ['Issued At',         fmtDate(showDetail.issuedAt)],
                            ['Expiry',            showDetail.isLifetime ? 'Lifetime' : fmtDate(showDetail.expiryTs)],
                            ['Activated',         showDetail.activated ? `Yes (${fmtDate(showDetail.activatedAt)})` : 'No'],
                        ].reduce((rows, [label, value], i) => {
                            if (i % 2 === 0) rows.push([]);
                            rows[rows.length - 1].push({ label, value });
                            return rows;
                        }, []).map((pair, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                                {pair.map(({ label, value }) => (
                                    <div key={label}>
                                        <div style={{ fontSize: 10, color: '#4a5980', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                                        <div style={{ fontSize: 13, color: '#e2e8f0' }}>{String(value)}</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                        <div>
                            <div style={{ fontSize: 10, color: '#4a5980', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>License Key</div>
                            <div style={{ fontFamily: 'Courier New, monospace', fontSize: 12, color: '#a78bfa', background: '#161c2d', borderRadius: 7, padding: '8px 12px', wordBreak: 'break-all', cursor: 'pointer' }} onClick={() => copyKey(showDetail.key)}>
                                {copied === showDetail.key ? '✓ Copied!' : showDetail.key}
                            </div>
                        </div>
                        {showDetail.notes && (
                            <div>
                                <div style={{ fontSize: 10, color: '#4a5980', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
                                <div style={{ fontSize: 13, color: '#94a3b8' }}>{showDetail.notes}</div>
                            </div>
                        )}
                        {showDetail.revoked && (
                            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '10px 14px' }}>
                                <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>REVOKED</div>
                                <div style={{ fontSize: 12, color: '#fca5a5' }}>By: {showDetail.revokedByName} on {fmtDate(showDetail.revokedAt)}</div>
                                {showDetail.revokedReason && <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 2 }}>Reason: {showDetail.revokedReason}</div>}
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: 10, color: '#4a5980', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Features</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {FEATURE_OPTIONS.map(({ key, label }) => (
                                    <span key={key} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid', borderColor: showDetail.features?.[key] !== false ? 'rgba(124,58,237,.4)' : '#252d42', background: showDetail.features?.[key] !== false ? 'rgba(124,58,237,.12)' : 'transparent', color: showDetail.features?.[key] !== false ? '#a78bfa' : '#3a4560' }}>
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={() => downloadInvoiceForLicense(showDetail)} disabled={invoiceBusy}>
                            {invoiceBusy ? 'Preparing…' : '↓ Invoice PDF'}
                        </button>
                        <button className="btn btn-ghost" onClick={() => setShowDetail(null)}>Close</button>
                    </div>
                </div>
            </div>
        )}

        {/* ── Edit Modal ──────────────────────────────────────────────────── */}
        {showEdit && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEdit(null)}>
                <div className="modal">
                    <div className="modal-header">
                        <span className="modal-title">Edit License</span>
                        <button className="modal-close" onClick={() => setShowEdit(null)}>×</button>
                    </div>
                    <form onSubmit={updateLicense}>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Client Name *</label>
                                    <input className="form-input" required value={editForm.clientName} onChange={e => setEditForm(f => ({ ...f, clientName: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" value={editForm.clientPhone} onChange={e => setEditForm(f => ({ ...f, clientPhone: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={editForm.clientEmail} onChange={e => setEditForm(f => ({ ...f, clientEmail: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Business Category</label>
                                    <input className="form-input" value={editForm.businessCategory} onChange={e => setEditForm(f => ({ ...f, businessCategory: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Website</label>
                                    <input className="form-input" value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Price (₹)</label>
                                    <input className="form-input" type="number" min="0" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-textarea" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 60 }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ marginBottom: 8 }}>Features</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                    {FEATURE_OPTIONS.map(({ key, label }) => (
                                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '7px 10px', borderRadius: 7, border: '1px solid', borderColor: editForm.features[key] ? '#7c3aed' : '#252d42', background: editForm.features[key] ? 'rgba(124,58,237,.1)' : 'transparent', userSelect: 'none' }}>
                                            <input type="checkbox" checked={editForm.features[key] ?? true} onChange={e => setEditForm(f => ({ ...f, features: { ...f.features, [key]: e.target.checked } }))} style={{ accentColor: '#7c3aed', width: 14, height: 14 }} />
                                            <span style={{ fontSize: 12, fontWeight: 600, color: editForm.features[key] ? '#e2e8f0' : '#4a5980' }}>{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {editErr && <div className="form-error">{editErr}</div>}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-ghost" onClick={() => setShowEdit(null)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={editBusy}>{editBusy ? 'Saving…' : 'Save Changes'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* ── Revoke Modal ────────────────────────────────────────────────── */}
        {showRev && (
            <div className="modal-overlay">
                <div className="modal" style={{ maxWidth: 420 }}>
                    <div className="modal-header">
                        <span className="modal-title">Revoke License</span>
                        <button className="modal-close" onClick={() => setShowRev(null)}>×</button>
                    </div>
                    <div className="modal-body">
                        <div style={{ color: '#94a3b8', fontSize: 13 }}>This will immediately invalidate the key. The client's app will show as unlicensed on next startup.</div>
                        <div style={{ fontFamily: 'Courier New, monospace', fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,.08)', borderRadius: 7, padding: '8px 12px', wordBreak: 'break-all' }}>{showRev}</div>
                        <div className="form-group">
                            <label className="form-label">Reason (optional)</label>
                            <input className="form-input" value={revReason} onChange={e => setRevReason(e.target.value)} placeholder="e.g. Refund requested" autoFocus />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={() => setShowRev(null)}>Cancel</button>
                        <button className="btn btn-danger" onClick={revoke} disabled={revBusy}>{revBusy ? 'Revoking…' : 'Confirm Revoke'}</button>
                    </div>
                </div>
            </div>
        )}

        {/* ── Delete Modal ────────────────────────────────────────────────── */}
        {showDel && (
            <div className="modal-overlay">
                <div className="modal" style={{ maxWidth: 440 }}>
                    <div className="modal-header">
                        <span className="modal-title">Delete License</span>
                        <button className="modal-close" onClick={() => setShowDel(null)} disabled={delBusy}>×</button>
                    </div>
                    <div className="modal-body">
                        {showDel.price > 0 && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '12px 14px' }}>
                                <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>⚠ This license has a paid amount!</div>
                                <div style={{ color: '#fca5a5', fontSize: 12 }}>Amount: <strong>₹{showDel.price.toLocaleString('en-IN')}</strong> ({showDel.plan})</div>
                            </div>
                        )}
                        <p style={{ color: '#94a3b8', fontSize: 13 }}>Permanently delete license for <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{showDel.clientName}</span>?<br /><span style={{ fontSize: 12, color: '#ef4444' }}>This cannot be undone.</span></p>
                        <div style={{ fontFamily: 'Courier New, monospace', fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,.03)', borderRadius: 7, padding: '8px 12px', wordBreak: 'break-all' }}>{showDel.key}</div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={() => setShowDel(null)} disabled={delBusy}>Cancel</button>
                        <button className="btn btn-danger" onClick={deleteLic} disabled={delBusy}>{delBusy ? 'Deleting…' : (showDel.price > 0 ? 'Delete Anyway' : 'Delete Permanently')}</button>
                    </div>
                </div>
            </div>
        )}

        {/* ── Convert Modal ───────────────────────────────────────────────── */}
        {showConvert && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !convertedKey && setShowConvert(null)}>
                <div className="modal">
                    <div className="modal-header">
                        <span className="modal-title">{convertedKey ? '✓ Conversion Complete' : `Convert Trial → Paid`}</span>
                        <button className="modal-close" onClick={() => setShowConvert(null)}>×</button>
                    </div>
                    {convertedKey ? (
                        <div className="modal-body">
                            <div style={{ background: '#161c2d', border: '1px solid #7c3aed', borderRadius: 10, padding: '16px 18px' }}>
                                <div style={{ fontSize: 11, color: '#4a5980', marginBottom: 6, fontWeight: 600 }}>NEW LICENSE KEY</div>
                                <div style={{ fontFamily: 'Courier New, monospace', fontSize: 14, color: '#a78bfa', wordBreak: 'break-all' }}>{convertedKey}</div>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { navigator.clipboard.writeText(convertedKey); setCopied('__conv__'); setTimeout(() => setCopied(''), 2000); }}>
                                {copied === '__conv__' ? '✓ Copied!' : 'Copy New Key'}
                            </button>
                            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => downloadInvoiceForLicense(convertedLicense)} disabled={!convertedLicense || invoiceBusy}>
                                {invoiceBusy ? 'Preparing…' : 'Download Invoice (PDF)'}
                            </button>
                            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setShowConvert(null)}>Close</button>
                        </div>
                    ) : (
                        <form onSubmit={convertLicense}>
                            <div className="modal-body">
                                <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#fcd34d' }}>
                                    Converting: <strong>{showConvert.clientName}</strong> ({showConvert.plan}) → New paid plan. Trial will be revoked.
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">New Plan *</label>
                                        <select className="form-select" value={convertForm.plan} onChange={e => setConvertForm(f => ({ ...f, plan: e.target.value }))}>
                                            {PLANS.filter(p => p.value !== 'trial' && p.value !== 'trial1day').map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Device Limit</label>
                                        <input className="form-input" type="number" min={1} max={255} value={convertForm.deviceLimit} onChange={e => setConvertForm(f => ({ ...f, deviceLimit: e.target.value }))} />
                                    </div>
                                </div>
                                {convertForm.plan === 'custom' && (
                                    <div className="form-group">
                                        <label className="form-label">Custom Days *</label>
                                        <input className="form-input" type="number" min={1} required value={convertForm.customDays} onChange={e => setConvertForm(f => ({ ...f, customDays: e.target.value }))} />
                                    </div>
                                )}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Price (₹) *</label>
                                        <input className="form-input" type="number" min="0" step="0.01" required value={convertForm.price} onChange={e => setConvertForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 999" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Discounted Price (₹)</label>
                                        <input className="form-input" type="number" min="0" step="0.01" value={convertForm.discountedPrice} onChange={e => setConvertForm(f => ({ ...f, discountedPrice: e.target.value }))} placeholder="Leave blank for no discount" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-textarea" value={convertForm.notes} onChange={e => setConvertForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 50 }} />
                                </div>
                                {convertErr && <div className="form-error">{convertErr}</div>}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowConvert(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={convertBusy}>{convertBusy ? 'Converting…' : 'Convert & Generate'}</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )}
        </>
    );
}
