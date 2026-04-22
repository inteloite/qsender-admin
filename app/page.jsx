'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/apiFetch';

export default function RootPage() {
    const router = useRouter();
    useEffect(() => {
        if (!getToken()) { router.replace('/login'); return; }
        router.replace('/dashboard');
    }, []);
    return null;
}
