'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getToken, clearToken, apiFetch } from '@/lib/apiFetch';

const NAV = [
    { href: '/dashboard', icon: '◈', label: 'Dashboard' },
    { href: '/licenses',  icon: '⚿', label: 'Licenses'  },
    { href: '/sales',     icon: '₹', label: 'Sales'     },
    { href: '/expenses',  icon: '↓', label: 'Expenses'  },
];

export default function AppLayout({ children }) {
    const router   = useRouter();
    const pathname = usePathname();
    const [user,  setUser]  = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!getToken()) { router.replace('/login'); return; }
        const cached = localStorage.getItem('qsender_admin_user');
        if (cached) try { setUser(JSON.parse(cached)); } catch {}

        apiFetch('/api/auth/me').then(r => {
            if (!r) return;
            if (r.ok) {
                setUser(r.data);
                localStorage.setItem('qsender_admin_user', JSON.stringify(r.data));
            }
            setReady(true);
        });
    }, []);

    const logout = () => {
        clearToken();
        router.replace('/login');
    };

    if (!ready && !user) {
        return (
            <div style={{ minHeight: '100vh', background: '#0a0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a4560', fontSize: 13 }}>
                Loading…
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0a0d14' }}>
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-name">QSender</div>
                    <div className="sidebar-logo-sub">License Management</div>
                </div>

                <nav className="sidebar-nav">
                    {NAV.map(n => (
                        <Link
                            key={n.href}
                            href={n.href}
                            className={`nav-item${pathname.startsWith(n.href) ? ' active' : ''}`}
                        >
                            <span className="nav-icon" style={{ fontSize: 15 }}>{n.icon}</span>
                            <span>{n.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user-name">{user?.username}</div>
                    <div className="sidebar-user-sub">admin</div>
                    <button className="btn btn-danger btn-sm" onClick={logout} style={{ width: '100%' }}>
                        Sign Out
                    </button>
                </div>
            </aside>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {children}
            </main>
        </div>
    );
}
