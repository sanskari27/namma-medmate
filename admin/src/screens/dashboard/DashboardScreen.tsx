import { useEffect, useState } from 'react';
import { AreaMetricChart } from '@molecules';
import { Reveal, Card } from '@atoms';
import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import { listKycQueue } from '@/services/kyc';
import { listSubscriptions } from '@/services/subscriptions';
import { listTenants } from '@/services/tenants';

interface HealthStatus {
  status: string;
  service: string;
}

type PulseStatus = 'loading' | 'ready' | 'empty' | 'failure';

type Pulse = {
  status: PulseStatus;
  pharmacies: number | null;
  kycPending: number | null;
  subsDue: number | null;
};

const emptyPulse: Pulse = {
  status: 'loading',
  pharmacies: null,
  kycPending: null,
  subsDue: null,
};

function dueSoon(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) {
    return false;
  }
  return at <= Date.now() + 30 * 24 * 60 * 60 * 1000;
}

function displayValue(status: PulseStatus, value: number | null): string {
  if (status === 'loading') {
    return '…';
  }
  if (status === 'failure' || value == null) {
    return '—';
  }
  return String(value);
}

export default function DashboardScreen() {
  const [apiStatus, setApiStatus] = useState<string>('checking…');
  const [pulse, setPulse] = useState<Pulse>(emptyPulse);

  useEffect(() => {
    apiClient
      .get<HealthStatus>(API.HEALTH)
      .then((res) => setApiStatus(`${res.data.status} (${res.data.service})`))
      .catch(() => setApiStatus('unreachable'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listTenants(), listKycQueue(), listSubscriptions()])
      .then(([tenants, kyc, subs]) => {
        if (cancelled) {
          return;
        }
        const pharmacies = tenants.filter((row) => row.status === 'ACTIVE').length;
        const kycPending = kyc.filter((row) => row.status === 'SUBMITTED').length;
        const subsDue = subs.filter(
          (row) => row.status !== 'ACTIVE' || dueSoon(row.expiresAt),
        ).length;
        setPulse({
          status: tenants.length + kyc.length + subs.length === 0 ? 'empty' : 'ready',
          pharmacies,
          kycPending,
          subsDue,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPulse({ status: 'failure', pharmacies: null, kycPending: null, subsDue: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { title: 'Active pharmacies', value: displayValue(pulse.status, pulse.pharmacies), hint: 'KYC-approved tenants' },
    { title: 'KYC pending', value: displayValue(pulse.status, pulse.kycPending), hint: 'Verification queue' },
    { title: 'Subscriptions due', value: displayValue(pulse.status, pulse.subsDue), hint: 'Plan expiry window' },
  ];

  return (
    <Reveal className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Tenant pulse</h1>
        <p className="mt-1 font-mono text-xs text-muted">API health: {apiStatus}</p>
      </div>
      {pulse.status === 'failure' ? (
        <p role="alert" className="text-sm text-danger">
          Could not load tenant pulse. Retry this HQ desk.
        </p>
      ) : null}
      {pulse.status === 'empty' ? (
        <p role="status" className="text-sm text-muted">
          No pharmacies, KYC packs, or subscriptions on file yet.
        </p>
      ) : null}
      {pulse.status === 'loading' ? (
        <p role="status" className="text-sm text-muted">
          Loading tenant pulse…
        </p>
      ) : null}
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
