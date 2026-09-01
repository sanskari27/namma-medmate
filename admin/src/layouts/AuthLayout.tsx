import { Outlet } from 'react-router-dom';
import { Reveal } from '@/components/Reveal';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <section className="flex w-full max-w-md flex-col justify-center border-r border-line bg-surface px-8 py-12 sm:px-10">
        <Reveal>
          <p className="font-serif text-2xl font-semibold">MedMate HQ</p>
          <p className="mt-1 mb-8 text-sm text-muted">Platform operators only</p>
          <Outlet />
        </Reveal>
      </section>
      <section className="hidden flex-1 flex-col justify-between p-10 md:flex">
        <p className="font-mono text-xs tracking-wide text-brand">Master console</p>
        <ul className="space-y-4 text-sm text-ink">
          <li className="border-l border-brand pl-3">Tenant KYC queue</li>
          <li className="border-l border-line pl-3">Plan and expiry overrides</li>
          <li className="border-l border-line pl-3">Impersonation for support</li>
        </ul>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Built to scan many pharmacies — not to run a single counter.
        </p>
      </section>
    </div>
  );
}
