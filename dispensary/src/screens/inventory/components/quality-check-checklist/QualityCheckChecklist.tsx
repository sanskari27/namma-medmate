import type { QcChecklistState } from '../quality-check-workspace/QualityCheckWorkspace.utils';

export type QualityCheckChecklistProps = {
  formId: string;
  checklist: QcChecklistState;
  readOnly: boolean;
  onChange: (patch: Partial<QcChecklistState>) => void;
};

const ITEMS: Array<{ key: keyof QcChecklistState; label: string }> = [
  { key: 'visualInspectionPassed', label: 'Visual inspection passed' },
  { key: 'packagingIntact', label: 'Packaging intact' },
  { key: 'labelMatches', label: 'Label matches the indent' },
  { key: 'batchReadable', label: 'Batch number is readable' },
  { key: 'noDamage', label: 'No damage or contamination' },
];

export function QualityCheckChecklist({
  formId,
  checklist,
  readOnly,
  onChange,
}: QualityCheckChecklistProps) {
  return (
    <fieldset className="grid gap-2 border border-line bg-surface p-3" disabled={readOnly}>
      <legend className="px-1 text-sm font-medium text-ink">Inspection</legend>
      {ITEMS.map((item) => (
        <label key={item.key} className="flex items-center gap-2 text-sm text-ink">
          <input
            id={`${formId}-${item.key}`}
            type="checkbox"
            checked={checklist[item.key]}
            onChange={(event) => onChange({ [item.key]: event.target.checked })}
            className="size-4 accent-[var(--color-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
          {item.label}
        </label>
      ))}
    </fieldset>
  );
}
