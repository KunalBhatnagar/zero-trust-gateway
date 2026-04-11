'use client';
import { useState, useEffect } from 'react';
import { getAPIKeys, createAPIKey, revokeAPIKey } from '../../lib/api';

export default function ClientsPage() {
  const [keys,      setKeys]      = useState([]);
  const [newKey,    setNewKey]    = useState(null);
  const [creating,  setCreating]  = useState(false);
  const [form,      setForm]      = useState({ clientName: '', rateLimitPerMin: 100, scopes: '' });

  async function load() { setKeys(await getAPIKeys()); }
  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.clientName) return;
    setCreating(true);
    const result = await createAPIKey({
      clientName:      form.clientName,
      rateLimitPerMin: parseInt(form.rateLimitPerMin),
      scopes:          form.scopes.split(',').map(s => s.trim()).filter(Boolean)
    });
    setNewKey(result);
    setForm({ clientName: '', rateLimitPerMin: 100, scopes: '' });
    await load();
    setCreating(false);
  }

  async function handleRevoke(id, name) {
    if (!confirm(`Revoke key for "${name}"?`)) return;
    await revokeAPIKey(id);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">API Clients</h1>
        <p className="text-gray-500 text-sm">Issue and manage API keys</p>
      </div>

      {/* One-time key display */}
      {newKey && (
        <div className="bg-green-900/20 border border-green-600/40 rounded-xl p-5">
          <p className="text-green-400 font-semibold mb-1">✅ Key created — save it now, it won't be shown again</p>
          <code className="block bg-gray-950 rounded-lg p-3 text-green-300 text-sm font-mono break-all mt-3">
            {newKey.key}
          </code>
          <button onClick={() => setNewKey(null)} className="mt-3 text-sm text-gray-500 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Issue New Key</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Client Name',          key: 'clientName',      placeholder: 'Mobile App',                type: 'text'   },
            { label: 'Rate Limit (req/min)', key: 'rateLimitPerMin', placeholder: '100',                      type: 'number' },
            { label: 'Scopes',               key: 'scopes',          placeholder: 'read:users, write:orders',  type: 'text'   },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleCreate}
          disabled={!form.clientName || creating}
          className="mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm px-5 py-2 rounded-lg font-medium transition-colors"
        >
          {creating ? 'Creating…' : 'Issue Key'}
        </button>
      </div>

      {/* Keys table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">All Keys</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-left border-b border-gray-800 text-xs">
              {['Client', 'Scopes', 'Rate Limit', 'Status', 'Created', ''].map(h => (
                <th key={h} className="pb-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {keys.map(k => (
              <tr key={k.id}>
                <td className="py-3 text-white font-medium">{k.client_name}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1">
                    {(k.scopes || []).map(s => (
                      <span key={s} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="py-3 text-gray-300">{k.rate_limit_per_min}/min</td>
                <td className="py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${k.is_active ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                    {k.is_active ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="py-3 text-gray-500 text-xs">{new Date(k.created_at).toLocaleDateString()}</td>
                <td className="py-3">
                  {k.is_active && (
                    <button onClick={() => handleRevoke(k.id, k.client_name)} className="text-xs text-red-400 hover:text-red-300">
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}