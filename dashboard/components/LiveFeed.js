'use client';
import { useState, useEffect } from 'react';
import { getSocket } from '../lib/socket';

const MAX = 60;

const statusColor  = c => c >= 500 ? 'text-red-400' : c >= 400 ? 'text-yellow-400' : 'text-green-400';
const methodColor  = m => ({ GET: 'text-blue-400', POST: 'text-green-400', PUT: 'text-yellow-400', DELETE: 'text-red-400', PATCH: 'text-purple-400' }[m] || 'text-gray-400');

export default function LiveFeed() {
  const [entries, setEntries]     = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    s.on('connect',     ()  => setConnected(true));
    s.on('disconnect',  ()  => setConnected(false));
    s.on('request:new', row => setEntries(p => [row, ...p].slice(0, MAX)));

    return () => {
      s.off('connect');
      s.off('disconnect');
      s.off('request:new');
    };
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col" style={{ height: 310 }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Live Feed</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-400">{connected ? 'Live' : 'Connecting...'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-px font-mono text-xs">
        {entries.length === 0 && (
          <p className="text-gray-600 text-center pt-8">Waiting for requests…</p>
        )}
        {entries.map((e, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800">
            <span className="text-gray-600 w-14 shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
            <span className={`w-12 shrink-0 font-bold ${methodColor(e.method)}`}>{e.method}</span>
            <span className="text-gray-300 flex-1 truncate">{e.endpoint}</span>
            <span className={`w-8 text-right shrink-0 font-bold ${statusColor(e.statusCode)}`}>{e.statusCode}</span>
            <span className="text-gray-600 w-12 text-right shrink-0">{e.responseTimeMs}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}