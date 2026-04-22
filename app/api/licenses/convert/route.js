import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getLicense, saveLicense } from '@/lib/kv';
import { generateKey, planToExpiry } from '@/lib/license';

export async function POST(req) {
    const { error, status, session } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const body = await req.json();
    const { oldKey, plan, deviceLimit, customDays, price, discountedPrice, notes, features, machineId: machineIdOverride } = body;

    if (!oldKey) return NextResponse.json({ error: 'oldKey required' }, { status: 400 });
    if (!plan)   return NextResponse.json({ error: 'plan required' },   { status: 400 });

    const oldLicense = await getLicense(oldKey);
    if (!oldLicense) return NextResponse.json({ error: 'Original license not found' }, { status: 404 });

    const isTrial     = oldLicense.plan === 'trial' || oldLicense.plan === 'trial1day';
    const wasFreePlan = !isTrial && (parseFloat(oldLicense.price) || 0) === 0;
    if (!isTrial && !wasFreePlan && !oldLicense.revoked) {
        return NextResponse.json({ error: 'Only trial or free licenses can be converted' }, { status: 400 });
    }

    const DEFAULT_FEATURES = {
        mobile: true, trustBuilder: true, autoReply: true,
        chatbot: true, liveChat: true, groupGrabber: true,
    };

    const dl          = Math.max(1, Math.min(255, parseInt(deviceLimit) || 1));
    const expiryTs    = planToExpiry(plan, customDays);
    const isLifetime  = plan === 'lifetime';
    const resolvedMid = (machineIdOverride && machineIdOverride.trim())
        ? machineIdOverride.trim().toUpperCase()
        : oldLicense.machineId;
    const newKey      = generateKey({ machineId: resolvedMid, expiryTs, deviceLimit: dl });

    const priceNum      = Math.max(0, parseFloat(price) || 0);
    const discountedRaw = (discountedPrice === '' || discountedPrice == null)
        ? priceNum
        : Math.max(0, parseFloat(discountedPrice) || 0);
    const discountedNum  = Math.min(priceNum, discountedRaw);
    const discountAmount = Math.max(0, priceNum - discountedNum);
    const nowTs          = Math.floor(Date.now() / 1000);

    // Revoke old trial
    await saveLicense({
        ...oldLicense,
        revoked:       true,
        revokedBy:     session.sub,
        revokedByName: session.username,
        revokedAt:     nowTs,
        revokedReason: `Converted to ${plan} plan (key: ${newKey})`,
    });

    // Create new paid license inheriting all client data
    const newLicense = {
        key:              newKey,
        plan,
        deviceLimit:      dl,
        expiryTs,
        isLifetime,
        price:            priceNum,
        discountedPrice:  discountedNum,
        discountAmount,
        machineId:        resolvedMid,
        clientName:       oldLicense.clientName,
        clientPhone:      oldLicense.clientPhone,
        clientEmail:      oldLicense.clientEmail,
        businessCategory: oldLicense.businessCategory,
        website:          oldLicense.website,
        notes:            (notes || oldLicense.notes || '').trim(),
        features:         features || oldLicense.features || DEFAULT_FEATURES,
        issuedBy:         session.sub,
        issuedByName:     session.username,
        issuedAt:         nowTs,
        activated:        false,
        activatedAt:      null,
        revoked:          false,
        revokedBy:        null,
        revokedByName:    null,
        revokedAt:        null,
        revokedReason:    null,
        convertedFromKey: oldKey,
    };

    await saveLicense(newLicense);
    return NextResponse.json({ success: true, key: newKey, license: newLicense });
}
