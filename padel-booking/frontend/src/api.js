/**
 * Client API — communique avec le backend Express
 */
const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Compte ──
export const getAccount    = ()      => request('GET',    '/account');
export const saveAccount   = (data)  => request('POST',   '/account', data);
export const deleteAccount = ()      => request('DELETE', '/account');

// ── Préférences ──
export const getPreferences   = ()        => request('GET',    '/preferences');
export const addPreference    = (data)    => request('POST',   '/preferences', data);
export const patchPreference  = (id, d)   => request('PATCH',  `/preferences/${id}`, d);
export const removePreference = (id)      => request('DELETE', `/preferences/${id}`);

// ── Réservations ──
export const getBookings  = ()     => request('GET',  '/bookings');
export const runBookings  = ()     => request('POST', '/bookings/run');
export const testBooking  = (data) => request('POST', '/bookings/test', data);

// ── Scheduler ──
export const getScheduler   = ()     => request('GET',  '/scheduler');
export const startScheduler = (cron) => request('POST', '/scheduler/start', { cron });
export const stopScheduler  = ()     => request('POST', '/scheduler/stop');

// ── SSE ──
export function subscribeEvents(handlers) {
  const es = new EventSource(`${BASE}/events`);
  Object.entries(handlers).forEach(([event, fn]) => es.addEventListener(event, e => fn(JSON.parse(e.data))));
  return () => es.close();
}
