import { Reveal } from '@atoms';

export function AgingHeader() {
  return (
    <Reveal>
      <header className="border-b border-line pb-3">
        <h1 className="text-2xl font-semibold text-ink">Khata and stockist dues</h1>
        <p className="mt-1 text-sm text-muted">
          What patients owe us and what we owe stockists, aged as of one date.
        </p>
      </header>
    </Reveal>
  );
}
