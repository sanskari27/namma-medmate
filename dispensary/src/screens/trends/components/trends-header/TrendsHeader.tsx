import { Reveal } from '@atoms';

export function TrendsHeader({ planGate = false }: { planGate?: boolean }) {
  return (
    <Reveal>
      <header className="border-b border-line pb-3">
        <h1 className="text-2xl font-semibold text-ink">Compare weeks</h1>
        <p className="mt-1 text-sm text-muted">
          This week vs last week from completed bills. Only till facts already collected.
          {planGate ? ' Growth unlocks these charts.' : ''}
        </p>
      </header>
    </Reveal>
  );
}
