'use client';
import { useState, useEffect } from 'react';
import { getAllThreats, getBlockedIPs, unblockIP } from '../../lib/api';

const severityStyle = {
  CRITICAL: 'bg-red-400/10 text-red-400 border-red-400/30',
  HIGH:     'bg-orange-400/10 text-orange-400 border-orange-400/30',
  MEDIUM:   'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  LOW:      'bg-blue-400/10 text-blue-400 border-blue-400/30',
};

export default function ThreatsPage() {
  const [threats,  setThreats]  = useState([]);
  const [blocked,  setBlocked]  = useState([]);
  const [tab,      setTab]      = useState('threats');
  const [loading,  setLoading]  = useState(true);

  async function load() {
    const [t, b] = await Promise.all([getAllThreats(), getBlockedIPs()]);
    setThreats(t); setBlocked(b); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleUnblock(ip) {
    await unblockIP(ip);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Threat Intelligence</h1>
        <p className="text-gray-500 text-sm">Detected attacks and blocked IPs</p>
      </div>

      <div className="flex gap-2">
        {[
          { id: 'threats', label: `Threat Events (${threats.length})` },
          { id: 'blocked', label: `Blocked IPs (${blocked.length})`   },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : tab === 'threats' ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-left border-b border-gray-800 text-xs">
                {['Time', 'IP', 'Type', 'Severity', 'Details'].map(h => <th key={h} className="pb-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {threats.map(t => (
                <tr key={t.id}>
                  <td className="py-3 text-gray-500 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="py-3 font-mono text-xs text-white">{t.ip_address}</td>
                  <td className="py-3 text-xs font-mono text-gray-300">{t.threat_type}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${severityStyle[t.severity] || ''}`}>
                      {t.severity}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">
                    {t.details?.ratio ? `${Number(t.details.ratio).toFixed(1)}x spike` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-left border-b border-gray-800 text-xs">
                {['IP Address', 'Reason', 'Expires In', 'Source', ''].map(h => <th key={h} className="pb-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {blocked.map(b => (
                <tr key={b.ip}>
                  <td className="py-3 font-mono text-white text-sm">{b.ip}</td>
                  <td className="py-3 text-gray-300 text-xs">{b.reason}</td>
                  <td className="py-3 text-gray-500 text-xs">
                    {b.expiresIn === -1 ? 'Permanent' : `${Math.round(b.expiresIn / 60)}m`}
                  </td>
                  <td className="py-3 text-xs">
                    <span className={b.autoban ? 'text-orange-400' : 'text-gray-500'}>
                      {b.autoban ? 'Auto-detected' : 'Manual'}
                    </span>
                  </td>
                  <td className="py-3">
                    <button onClick={() => handleUnblock(b.ip)} className="text-xs text-blue-400 hover:text-blue-300">
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}