import { Input, Label } from '@atoms';
import type { CustomReportField, CustomReportOperator } from '@/services/customReports';
import type { FilterDraft } from '../../CustomReportsScreen.utils';

export type CustomReportsFiltersProps = {
  fields: CustomReportField[];
  operators: CustomReportOperator[];
  draft: FilterDraft;
  disabled?: boolean;
  onChange: (next: FilterDraft) => void;
};

export function CustomReportsFilters({
  fields,
  operators,
  draft,
  disabled = false,
  onChange,
}: CustomReportsFiltersProps) {
  return (
    <fieldset className="grid gap-3 border border-line bg-surface p-3 sm:grid-cols-3">
      <legend className="text-sm font-medium text-ink">Filter (optional)</legend>
      <div className="space-y-1.5">
        <Label htmlFor="custom-report-filter-field">Column</Label>
        <select
          id="custom-report-filter-field"
          className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink"
          value={draft.field}
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, field: event.target.value })}
        >
          <option value="">Any</option>
          {fields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="custom-report-filter-op">Match</Label>
        <select
          id="custom-report-filter-op"
          className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink"
          value={draft.operator}
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, operator: event.target.value })}
        >
          {operators.map((operator) => (
            <option key={operator.key} value={operator.key}>
              {operator.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="custom-report-filter-value">Value</Label>
        <Input
          id="custom-report-filter-value"
          value={draft.value}
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, value: event.target.value })}
        />
      </div>
    </fieldset>
  );
}
