import { useEffect, useState } from 'react';
import { AreaMetricChart } from '@molecules';
import { Reveal, Card } from '@atoms';
import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

interface HealthStatus {
  status: string;
  service: string;
}

export default function DashboardScreen() {
  const [apiStatus, setApiStatus] = useState<string>('checking…');

  useEffect(() => {
    apiClient
      .get<HealthStatus>(API.HEALTH)
      .then((res) => setApiStatus(`${res.data.status} (${res.data.service})`))
      .catch(() => setApiStatus('unreachable'));
  }, []);

  const cards = [
    { title: 'Active pharmacies', value: '—', hint: 'KYC-approved tenants' },
    { title: 'KYC pending', value: '—', hint: 'Verification queue' },
    { title: 'Subscriptions due', value: '—', hint: 'Plan expiry window' },
  ];

  return (
    <Reveal className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Tenant pulse</h1>
        <p className="mt-1 font-mono text-xs text-muted">API health: {apiStatus}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.title}>
            <p className="text-xs text-muted">{c.title}</p>
            <p className="mt-2 font-mono text-2xl text-ink">{c.value}</p>
            <p className="mt-1 text-xs text-muted">{c.hint}</p>
          </Card>
        ))}
      </div>
      <section>
        <h2 className="mb-2 text-sm font-medium">Activations this month</h2>
        <AreaMetricChart data={[]} emptyLabel="No tenant activations in this window." />
      </section>
    </Reveal>
  );
}
