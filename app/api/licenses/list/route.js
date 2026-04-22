import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listAllLicenses } from '@/lib/kv';

export async function GET(req) {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    const list = await listAllLicenses();
    list.sort((a, b) => (b.issuedAt || 0) - (a.issuedAt || 0));
    return NextResponse.json(list);
}
