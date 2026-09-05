import { Reveal } from '@atoms';

export function ReturnsHeader() {
  return (
    <Reveal>
      <header className="border-b border-line pb-3">
        <p className="font-mono text-xs tracking-wide text-muted">Counter returns</p>
        <h1 className="text-2xl font-semibold text-ink">Take a sale back</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Find a collected bill, pick the qty still sold, record why you approved it, then refund
          cash or write a credit note. Accepted packs go back to the original batch.
        </p>
      </header>
    </Reveal>
  );
}
