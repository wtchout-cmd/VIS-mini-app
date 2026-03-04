/**
 * VIS TMS — API Layer
 * All n8n webhook calls go through here.
 * Set VITE_N8N_BASE_URL in your .env file.
 */

const BASE = import.meta.env.VITE_N8N_BASE_URL || 'https://primary-production-c41f.up.railway.app';

const handleResponse = async (res) => {
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

/** GET all drivers from the dashboard sheet */
export const getDrivers = () =>
  fetch(`${BASE}/webhook/get-drivers`, { headers: { 'Accept': 'application/json' } })
    .then(handleResponse);

/** GET all booked loads from the Booked Loads sheet */
export const getLoads = () =>
  fetch(`${BASE}/webhook/get-loads`, { headers: { 'Accept': 'application/json' } })
    .then(handleResponse);

/**
 * POST a rate confirmation PDF/image to n8n for AI extraction.
 * Returns extracted load data + a sessionKey (Redis key) for the next step.
 * @param {File} file
 * @param {number|string} telegramUserId
 * @param {string} clientPrefix  e.g. 'ClientA'
 */
export const uploadRatecon = async (file, telegramUserId, clientPrefix = 'default') => {
  const formData = new FormData();
  formData.append('data', file, file.name || 'ratecon.pdf');
  formData.append('telegramUserId', String(telegramUserId));
  formData.append('clientPrefix', clientPrefix);

  return fetch(`${BASE}/webhook/web-ratecon-upload`, {
    method: 'POST',
    body: formData,
  }).then(handleResponse);
};

/**
 * POST driver assignment — triggers the full completion chain:
 * send to driver group, update dashboard, save booked load.
 * @param {object} payload
 * @param {string} payload.sessionKey   Redis key from uploadRatecon response
 * @param {string} payload.truckId      Truck ID from driver list
 * @param {number|string} payload.telegramUserId
 */
export const assignDriver = ({ sessionKey, truckId, telegramUserId }) =>
  fetch(`${BASE}/webhook/web-assign-driver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionKey, truckId, telegramUserId }),
  }).then(handleResponse);

/**
 * GET analytics computed from real sheet data.
 * Optional — falls back to client-side calculation if endpoint doesn't exist.
 */
export const getAnalytics = () =>
  fetch(`${BASE}/webhook/get-analytics`, { headers: { 'Accept': 'application/json' } })
    .then(handleResponse)
    .catch(() => null); // graceful fallback
