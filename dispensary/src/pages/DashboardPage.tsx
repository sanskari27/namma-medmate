import { useEffect, useState } from 'react';
import { AreaMetricChart } from '@/components/charts/AreaMetricChart';
import { Reveal } from '@/components/Reveal';
import { Card } from '@/components/ui/card';
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
    { title: "Today's sales", value: '—', hint: 'Paise, this branch' },
    { title: 'Low stock items', value: '—', hint: 'Below reorder' },
    { title: 'Expiring batches (30d)', value: '—', hint: 'Check FEFO' },
  ];

  return (
    <Reveal className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">Counter overview</h1>
        <p className="mt-1 font-mono text-xs text-muted">API health: {apiStatus}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.title}>
            <p className="text-sm text-muted">{c.title}</p>
            <p className="mt-2 font-mono text-2xl font-medium text-ink">{c.value}</p>
            <p className="mt-1 text-xs text-muted">{c.hint}</p>
          </Card>
        ))}
      </div>
      <section>
        <h2 className="mb-2 text-sm font-medium text-ink">Sales this week</h2>
        <AreaMetricChart data={[]} emptyLabel="No bills recorded yet for this branch." />
      </section>
    </Reveal>
  );
}
