import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getLicense, saveLicense } from '@/lib/kv';

export async function POST(req) {
    const { error, status, session } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const body = await req.json();
    const { key, clientName, clientPhone, clientEmail, businessCategory, website, price, notes, features } = body;

    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

    const license = await getLicense(key);
    if (!license) return NextResponse.json({ error: 'License not found' }, { status: 404 });

    const priceNum = price !== undefined && price !== '' ? Math.max(0, parseFloat(price) || 0) : license.price;

    const updated = {
        ...license,
        clientName:       (clientName || license.clientName || '').trim(),
        clientPhone:      (clientPhone !== undefined ? clientPhone : license.clientPhone || '').trim(),
        clientEmail:      (clientEmail !== undefined ? clientEmail : license.clientEmail || '').trim(),
        businessCategory: (businessCategory !== undefined ? businessCategory : license.businessCategory || '').trim(),
        website:          (website !== undefined ? website : license.website || '').trim() || 'No website',
        price:            priceNum,
        notes:            (notes !== undefined ? notes : license.notes || '').trim(),
        features:         features || license.features,
        updatedAt:        Math.floor(Date.now() / 1000),
        updatedBy:        session.sub,
        updatedByName:    session.username,
    };

    await saveLicense(updated);
    return NextResponse.json({ success: true, license: updated });
}
