type StallStripProps = {
  used: number;
  cap: number | null;
  unit: string;
};

export function StallStrip({ used, cap, unit }: StallStripProps) {
  const unlimited = cap == null;
  const slots = unlimited ? Math.max(used, 1) : cap;
  const shown = Math.min(slots, 12);
  const summary = unlimited
    ? `${used} ${unit} in use (no till-login cap on this plan)`
    : `${used} of ${cap} ${unit} in use`;

  return (
    <div>
      <p className="font-mono text-sm text-ink">{summary}</p>
      <ol className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
        {Array.from({ length: shown }, (_, index) => {
          const filled = index < used;
          return (
            <li
              key={index}
              className={
                filled
                  ? 'size-5 border border-brand bg-brand-soft'
                  : 'size-5 border border-line bg-canvas'
              }
            />
          );
        })}
        {slots > shown ? (
          <li className="px-1 font-mono text-xs text-muted">+{slots - shown}</li>
        ) : null}
      </ol>
    </div>
  );
}
