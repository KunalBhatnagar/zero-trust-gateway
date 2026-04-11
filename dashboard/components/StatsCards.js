export default function StatsCards({ stats }) {
  const cards = [
    { label: 'Requests (24h)',  value: (stats?.totalRequests || 0).toLocaleString(), sub: `${stats?.requestsLastHour || 0} last hour`,  color: 'blue',   icon: '📡' },
    { label: 'Threats Today',   value: stats?.threatsToday  || '0',                  sub: 'anomalies detected',                         color: 'red',    icon: '🚨' },
    { label: 'Blocked IPs',     value: stats?.blockedIPs    || '0',                  sub: 'active bans in Redis',                       color: 'orange', icon: '🚫' },
    { label: 'Avg Response',    value: `${stats?.avgResponseTime || 0}ms`,            sub: 'gateway overhead',                           color: 'green',  icon: '⚡' },
  ];

  const border = { blue: 'border-blue-500/30 bg-blue-500/10', red: 'border-red-500/30 bg-red-500/10', orange: 'border-orange-500/30 bg-orange-500/10', green: 'border-green-500/30 bg-green-500/10' };
  const text   = { blue: 'text-blue-400', red: 'text-red-400', orange: 'text-orange-400', green: 'text-green-400' };

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className={`border rounded-xl p-5 ${border[c.color]}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{c.label}</span>
            <span>{c.icon}</span>
          </div>
          <p className={`text-2xl font-bold ${text[c.color]}`}>{c.value}</p>
          <p className="text-gray-500 text-xs mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}