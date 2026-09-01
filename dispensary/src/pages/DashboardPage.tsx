import { useEffect, useState } from 'react';
import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

interface HealthStatus {
  status: string;
  service: string;
}

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState<string>('checking…');

  useEffect(() => {
    apiClient
      .get<HealthStatus>(API.HEALTH)
      .then((res) => setApiStatus(`${res.data.status} (${res.data.service})`))
      .catch(() => setApiStatus('unreachable'));
  }, []);

  const cards = [
    { title: "Today's sales", value: '—' },
    { title: 'Low stock items', value: '—' },
    { title: 'Expiring batches (30d)', value: '—' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-800">Dashboard</h2>
      <p className="text-sm text-slate-500">API health: {apiStatus}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{c.title}</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
