import { Label } from '@atoms';
import type { CustomReportField } from '@/services/customReports';

export type CustomReportsColumnsProps = {
  fields: CustomReportField[];
  selected: string[];
  disabled?: boolean;
  onToggle: (key: string) => void;
};

export function CustomReportsColumns({
  fields,
  selected,
  disabled = false,
  onToggle,
}: CustomReportsColumnsProps) {
  return (
    <fieldset className="space-y-2 border border-line bg-surface p-3">
      <legend className="text-sm font-medium text-ink">Pick columns</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <Label key={field.key} className="flex items-center gap-2 font-normal">
            <input
              type="checkbox"
              checked={selected.includes(field.key)}
              disabled={disabled}
              onChange={() => onToggle(field.key)}
            />
            {field.label}
          </Label>
        ))}
      </div>
    </fieldset>
  );
}
