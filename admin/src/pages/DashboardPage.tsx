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
    { title: 'Active pharmacies', value: '—' },
    { title: 'KYC pending', value: '—' },
    { title: 'Subscriptions due', value: '—' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">HQ Dashboard</h2>
      <p className="text-sm text-slate-400">API health: {apiStatus}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">{c.title}</p>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
