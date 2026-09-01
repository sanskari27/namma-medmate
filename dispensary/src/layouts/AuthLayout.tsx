import { Outlet } from 'react-router-dom';
import { Reveal } from '@/components/Reveal';

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-canvas md:grid-cols-[minmax(0,1fr)_28rem]">
      <section className="relative hidden flex-col justify-between border-r border-line bg-canvas p-10 md:flex">
        <p className="font-serif text-3xl font-semibold text-brand">MedMate</p>
        <div>
          <p className="max-w-lg font-serif text-4xl leading-tight font-semibold text-ink">
            The counter, not a dashboard.
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            Bills, stock, and patients for this branch. Dense on purpose so a chemist can move without hunting for
            chrome.
          </p>
        </div>
        <p className="font-mono text-xs text-muted">IST — shop floor</p>
      </section>
      <section className="flex items-center border-l-4 border-brand bg-surface px-6 py-12">
        <Reveal className="mx-auto w-full max-w-sm">
          <p className="mb-8 font-serif text-2xl font-semibold text-brand md:hidden">MedMate</p>
          <Outlet />
        </Reveal>
      </section>
    </div>
  );
}
