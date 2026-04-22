import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listAllLicenses, listAllExpenses } from '@/lib/kv';

export async function GET(req) {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const [licenses, expenses] = await Promise.all([
        listAllLicenses(),
        listAllExpenses(),
    ]);

    const totalRevenue  = licenses.filter(l => !l.revoked && l.price > 0)
        .reduce((s, l) => s + Number(l.price), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const moneyLeft     = totalRevenue - totalExpenses;

    return NextResponse.json({ totalRevenue, totalExpenses, moneyLeft });
}
