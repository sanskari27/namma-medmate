import type { SafetyEvaluation, SafetyWarning } from '@/services/medicationSafety';
import { checkStatusLabel, warningSummary } from '../../PosScreen.utils';

interface PosWarningPanelProps {
  evaluation: SafetyEvaluation | null;
  productNames?: Record<string, string>;
}

export function PosWarningPanel({ evaluation, productNames }: PosWarningPanelProps) {
  if (!evaluation) {
    return (
      <section
        className="rounded border border-dashed border-line bg-surface p-3"
        aria-label="Safety warnings"
      >
        <h2 className="text-sm font-semibold text-ink">Safety warnings</h2>
        <p className="mt-1 text-sm text-muted">
          Run a check after linking a customer and draft medicines.
        </p>
      </section>
    );
  }

  const incompleteLabel = checkStatusLabel(evaluation.checkStatus, evaluation.checkLabel);

  return (
    <section
      className="space-y-3 rounded border border-line bg-surface p-3"
      aria-label="Safety warnings"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Safety warnings</h2>
        <p className="font-mono text-xs text-muted">{evaluation.productsChecked} checked</p>
      </div>
      {incompleteLabel ? (
        <p
          role="status"
          className="rounded border border-warn/40 bg-warn/10 px-2 py-1.5 text-sm text-ink"
        >
          {incompleteLabel} — incomplete data is never treated as safe.
        </p>
      ) : null}
      {evaluation.warnings.length === 0 ? (
        <p className="text-sm text-muted">
          No allergy or duplicate-composition warnings on this draft.
        </p>
      ) : (
        <ul className="space-y-2">
          {evaluation.warnings.map((warning) => (
            <WarningRow key={warning.warningKey} warning={warning} productNames={productNames} />
          ))}
        </ul>
      )}
    </section>
  );
}

function WarningRow({
  warning,
  productNames,
}: {
  warning: SafetyWarning;
  productNames?: Record<string, string>;
}) {
  return (
    <li className="rounded border border-warn/50 bg-warn/10 px-3 py-2 text-sm text-ink">
      <p className="font-medium">
        {warning.kind === 'ALLERGY' ? 'Allergy warning' : 'Duplicate composition'}
      </p>
      <p className="mt-0.5 text-muted">{warningSummary(warning, productNames)}</p>
      <p className="mt-1 font-mono text-xs text-muted">
        Severity: {warning.severity} · Review required
      </p>
    </li>
  );
}
