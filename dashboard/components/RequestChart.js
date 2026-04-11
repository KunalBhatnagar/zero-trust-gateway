'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function RequestChart({ data }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-white font-semibold mb-4">Requests / Minute — Last Hour</h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data || []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#f9fafb' }} />
          <Legend />
          <Line type="monotone" dataKey="count"  stroke="#3b82f6" strokeWidth={2} dot={false} name="Requests" />
          <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={false} name="Errors"   />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}