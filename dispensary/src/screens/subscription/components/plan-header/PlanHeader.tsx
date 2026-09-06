import { Reveal } from '@atoms';

export function PlanHeader() {
  return (
    <Reveal>
      <header className="flex flex-col gap-1 border-b border-dashed border-line pb-3">
        <h1 className="font-sans text-xl font-semibold text-ink">Plan for this pharmacy</h1>
        <p className="text-sm text-muted">
          Read this like the shop licence board: stalls filled, till keys issued, and the monthly
          rate if you add another outlet.
        </p>
      </header>
    </Reveal>
  );
}
