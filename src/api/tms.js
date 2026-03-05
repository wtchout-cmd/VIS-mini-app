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
 * fetches load from Redis, sends to driver Telegram group, updates dashboard.
 */
export const assignDriver = ({
  sessionKey,
  truckId,
  driverName,
  driverChatId,
  groupChatId,
  telegramUserId,
  driverCurrentStatus,
  dispatchUsername,
}) =>
  fetch(`${BASE}/webhook/web-assign-driver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionKey,
      truckId,
      driverName,
      driverChatId:        driverChatId || null,
      groupChatId,
      telegramUserId,
      driverCurrentStatus: driverCurrentStatus || 'READY',
      dispatchUsername:    dispatchUsername || String(telegramUserId),
    }),
  }).then(handleResponse);

/**
 * GET live fleet locations from Redis (synced every 5 min from ELD stub).
 */
export const getFleetLocations = () =>
  fetch(`${BASE}/webhook/get-fleet`, { headers: { 'Accept': 'application/json' } })
    .then(handleResponse)
    .catch(() => ({ trucks: [] }));

/**
 * GET analytics computed from real sheet data.
 * Optional — falls back to client-side calculation if endpoint doesn't exist.
 */
export const getAnalytics = () =>
  fetch(`${BASE}/webhook/get-analytics`, { headers: { 'Accept': 'application/json' } })
    .then(handleResponse)
    .catch(() => null);
