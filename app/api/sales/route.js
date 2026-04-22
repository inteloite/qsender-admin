import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listAllLicenses } from '@/lib/kv';

export async function GET(req) {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const list = await listAllLicenses();
    const sales = list
        .filter(l => l.price > 0)
        .map(l => ({
            key:            l.key,
            clientName:     l.clientName,
            clientPhone:    l.clientPhone || '',
            plan:           l.plan,
            price:          l.price,
            discountedPrice: l.discountedPrice ?? null,
            issuedBy:       l.issuedBy,
            issuedByName:   l.issuedByName,
            issuedAt:       l.issuedAt,
            revoked:        l.revoked || false,
        }))
        .sort((a, b) => (b.issuedAt || 0) - (a.issuedAt || 0));

    return NextResponse.json(sales);
}
