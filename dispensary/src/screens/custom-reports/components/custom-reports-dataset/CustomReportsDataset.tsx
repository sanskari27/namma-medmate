import { Label } from '@atoms';
import type { CustomReportDataset } from '@/services/customReports';

export type CustomReportsDatasetProps = {
  datasets: CustomReportDataset[];
  selected: string;
  disabled?: boolean;
  onSelect: (key: string) => void;
};

export function CustomReportsDataset({
  datasets,
  selected,
  disabled = false,
  onSelect,
}: CustomReportsDatasetProps) {
  return (
    <fieldset className="space-y-2 border border-line bg-surface p-3">
      <legend className="text-sm font-medium text-ink">What to list</legend>
      <div className="flex flex-wrap gap-3">
        {datasets.map((dataset) => (
          <Label key={dataset.key} className="flex items-center gap-2 font-normal">
            <input
              type="radio"
              name="custom-report-dataset"
              value={dataset.key}
              checked={selected === dataset.key}
              disabled={disabled}
              onChange={() => onSelect(dataset.key)}
            />
            {dataset.label}
          </Label>
        ))}
      </div>
    </fieldset>
  );
}
