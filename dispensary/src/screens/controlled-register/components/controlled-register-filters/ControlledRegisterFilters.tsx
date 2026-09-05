import { Button, Input, Label } from '@atoms';
import type { FilterState } from '../../ControlledRegisterScreen.utils';

export type FilterOption = { id: string; label: string };

export type ControlledRegisterFiltersProps = {
  filters: FilterState;
  products: FilterOption[];
  patients: FilterOption[];
  pharmacists: FilterOption[];
  disabled?: boolean;
  onChange: (next: FilterState) => void;
  onApply: () => void;
};

export function ControlledRegisterFilters({
  filters,
  products,
  patients,
  pharmacists,
  disabled = false,
  onChange,
  onApply,
}: ControlledRegisterFiltersProps) {
  return (
    <form
      className="flex flex-wrap items-end gap-3 border border-line bg-surface p-3"
      aria-label="NDPS sale book filters"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="sale-book-from">From</Label>
        <Input
          id="sale-book-from"
          type="date"
          value={filters.from}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, from: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sale-book-to">To</Label>
        <Input
          id="sale-book-to"
          type="date"
          value={filters.to}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, to: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sale-book-schedule">Schedule</Label>
        <select
          id="sale-book-schedule"
          className="h-10 min-w-[8rem] rounded-md border border-line bg-surface px-2 text-sm text-ink"
          value={filters.schedule}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, schedule: event.target.value })}
        >
          <option value="">All schedules</option>
          <option value="H">H</option>
          <option value="H1">H1</option>
          <option value="X">X</option>
          <option value="NDPS">NDPS</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sale-book-product">Pack</Label>
        <select
          id="sale-book-product"
          className="h-10 min-w-[10rem] rounded-md border border-line bg-surface px-2 text-sm text-ink"
          value={filters.productId}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, productId: event.target.value })}
        >
          <option value="">All packs</option>
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sale-book-patient">Patient</Label>
        <select
          id="sale-book-patient"
          className="h-10 min-w-[10rem] rounded-md border border-line bg-surface px-2 text-sm text-ink"
          value={filters.patientId}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, patientId: event.target.value })}
        >
          <option value="">All patients</option>
          {patients.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sale-book-pharmacist">Pharmacist</Label>
        <select
          id="sale-book-pharmacist"
          className="h-10 min-w-[10rem] rounded-md border border-line bg-surface px-2 text-sm text-ink"
          value={filters.pharmacistUserId}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, pharmacistUserId: event.target.value })}
        >
          <option value="">All pharmacists</option>
          {pharmacists.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline" disabled={disabled}>
        Apply filters
      </Button>
    </form>
  );
}
