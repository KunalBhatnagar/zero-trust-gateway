const BASE      = process.env.NEXT_PUBLIC_GATEWAY_URL || '';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY   || 'admin_key';

const h = {
  'Content-Type': 'application/json',
  'x-admin-key': ADMIN_KEY
};

export const getStats        = () => fetch(`${BASE}/admin/stats`,               { headers: h }).then(r => r.json());
export const getTimeline     = () => fetch(`${BASE}/admin/requests/timeline`,   { headers: h }).then(r => r.json());
export const getRecentThreats= () => fetch(`${BASE}/admin/threats/recent`,      { headers: h }).then(r => r.json());
export const getAllThreats    = () => fetch(`${BASE}/admin/threats/recent?limit=100`, { headers: h }).then(r => r.json());
export const getBlockedIPs   = () => fetch(`${BASE}/admin/blocked`,             { headers: h }).then(r => r.json());
export const getAPIKeys      = () => fetch(`${BASE}/admin/keys`,                { headers: h }).then(r => r.json());

export const unblockIP = (ip) =>
  fetch(`${BASE}/admin/blocked/${ip}`, { method: 'DELETE', headers: h }).then(r => r.json());

export const revokeAPIKey = (id) =>
  fetch(`${BASE}/admin/keys/${id}`, { method: 'DELETE', headers: h }).then(r => r.json());

export const createAPIKey = (body) =>
  fetch(`${BASE}/admin/keys`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(r => r.json());