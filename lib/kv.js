import { kv } from '@vercel/kv';

// ── Admin (single admin) ─────────────────────────────────────────────────────

export async function getAdmin(id) {
    return kv.get(`admin:${id}`);
}

export async function getAdminByUsername(username) {
    const id = await kv.get(`admin:u:${username.toLowerCase()}`);
    if (!id) return null;
    return kv.get(`admin:${id}`);
}

export async function saveAdmin(admin) {
    await kv.set(`admin:${admin.id}`, admin);
    await kv.set(`admin:u:${admin.username.toLowerCase()}`, admin.id);
    await kv.sadd('admins', admin.id);
}

export async function listAdmins() {
    const ids = await kv.smembers('admins');
    if (!ids || !ids.length) return [];
    const rows = await Promise.all(ids.map(id => kv.get(`admin:${id}`)));
    return rows.filter(Boolean);
}

// ── Licenses ──────────────────────────────────────────────────────────────────

export async function getLicense(key) {
    return kv.get(`license:${key.toUpperCase()}`);
}

export async function saveLicense(license) {
    const k = license.key.toUpperCase();
    await kv.set(`license:${k}`, license);
    await kv.sadd('licenses', k);
}

export async function listAllLicenses() {
    const keys = await kv.smembers('licenses');
    if (!keys || !keys.length) return [];
    const rows = await Promise.all(keys.map(k => kv.get(`license:${k}`)));
    return rows.filter(Boolean);
}

export async function deleteLicense(license) {
    const k = license.key.toUpperCase();
    await Promise.all([
        kv.del(`license:${k}`),
        kv.srem('licenses', k),
    ]);
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function getExpense(id) {
    return kv.get(`expense:${id}`);
}

export async function saveExpense(expense) {
    await kv.set(`expense:${expense.id}`, expense);
    await kv.sadd('expenses', expense.id);
}

export async function listAllExpenses() {
    const ids = await kv.smembers('expenses');
    if (!ids || !ids.length) return [];
    const rows = await Promise.all(ids.map(id => kv.get(`expense:${id}`)));
    return rows.filter(Boolean);
}
