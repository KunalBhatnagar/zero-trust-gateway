'use client';
import { useState, useEffect } from 'react';
import StatsCards    from '../components/StatsCards';
import RequestChart  from '../components/RequestChart';
import LiveFeed      from '../components/LiveFeed';
import { getStats, getTimeline, getRecentThreats } from '../lib/api';

const severityStyle = {
  CRITICAL: 'bg-red-400/10 text-red-400 border-red-400/30',
  HIGH:     'bg-orange-400/10 text-orange-400 border-orange-400/30',
  MEDIUM:   'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  LOW:      'bg-blue-400/10 text-blue-400 border-blue-400/30',
};

export default function DashboardPage() {
  const [stats,    setStats]    = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [threats,  setThreats]  = useState([]);

  async function load() {
    try {
      const [s, t, th] = await Promise.all([getStats(), getTimeline(), getRecentThreats()]);
      setStats(s); setTimeline(t); setThreats(th);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm">Real-time API security monitoring</p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3"><RequestChart data={timeline} /></div>
        <div className="col-span-2"><LiveFeed /></div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Recent Threats</h2>
        {threats.length === 0
          ? <p className="text-gray-600 text-sm">No threats detected recently.</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-gray-800 text-xs">
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">IP</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {threats.map(t => (
                  <tr key={t.id} className="text-gray-300">
                    <td className="py-2.5 text-gray-500 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="py-2.5 font-mono text-xs">{t.ip_address}</td>
                    <td className="py-2.5 text-xs font-mono">{t.threat_type}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${severityStyle[t.severity] || ''}`}>
                        {t.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}