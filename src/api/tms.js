/**
 * tms.js — VIS TMS API Layer (frontend)
 * Points to the Express/Supabase backend on Railway.
 *
 * .env vars needed:
 *   VITE_API_BASE_URL   — https://your-app.up.railway.app
 *   VITE_API_SECRET     — same value as API_SECRET in backend
 */

const BASE   = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const SECRET = import.meta.env.VITE_API_SECRET   || '';

const jsonHeaders = {
  'Accept':        'application/json',
  'Content-Type':  'application/json',
  ...(SECRET ? { 'Authorization': `Bearer ${SECRET}` } : {}),
};

const readHeaders = {
  'Accept': 'application/json',
  ...(SECRET ? { 'Authorization': `Bearer ${SECRET}` } : {}),
};

const handle = async (res) => {
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] ${text}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
};

// ── Read ──────────────────────────────────────────────────────────────────────

export const getDrivers   = () => fetch(`${BASE}/webhook/get-drivers`,   { headers: readHeaders }).then(handle);
export const getLoads     = () => fetch(`${BASE}/webhook/get-loads`,     { headers: readHeaders }).then(handle);
export const getAnalytics = () => fetch(`${BASE}/webhook/get-analytics`, { headers: readHeaders }).then(handle).catch(() => null);
export const getFleet     = () => fetch(`${BASE}/webhook/get-fleet`,     { headers: readHeaders }).then(handle).catch(() => ({ vehicles: [] }));

// ── Driver CRUD ───────────────────────────────────────────────────────────────

export const createDriver = (data) =>
  fetch(`${BASE}/drivers`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle);

export const updateDriver = (truckId, data) =>
  fetch(`${BASE}/drivers/${encodeURIComponent(truckId)}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle);

export const updateDriverStatus = (truckId, status) =>
  fetch(`${BASE}/drivers/${encodeURIComponent(truckId)}/status`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ status }) }).then(handle);

export const deleteDriver = (truckId) =>
  fetch(`${BASE}/drivers/${encodeURIComponent(truckId)}`, { method: 'DELETE', headers: readHeaders }).then(handle);

// ── Ratecon flow ──────────────────────────────────────────────────────────────

export const uploadRatecon = (file, telegramUserId, clientPrefix = 'default') => {
  const form = new FormData();
  form.append('data', file, file.name || 'ratecon.pdf');
  form.append('telegramUserId', String(telegramUserId));
  form.append('clientPrefix', clientPrefix);
  const headers = SECRET ? { 'Authorization': `Bearer ${SECRET}` } : {};
  return fetch(`${BASE}/webhook/web-ratecon-upload`, { method: 'POST', headers, body: form }).then(handle);
};

export const assignDriver = ({ sessionKey, truckId, telegramUserId }) =>
  fetch(`${BASE}/webhook/web-assign-driver`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ sessionKey, truckId, telegramUserId }),
  }).then(handle);

// ── Admin ─────────────────────────────────────────────────────────────────────

export const syncFromSheets = () =>
  fetch(`${BASE}/admin/sync-from-sheets`, { method: 'POST', headers: jsonHeaders }).then(handle);
