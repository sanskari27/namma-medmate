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
      className="nd-card nd-card-pad nd-toolbar"
      aria-label="NDPS sale book filters"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <input
        className="nd-input"
        type="date"
        aria-label="From"
        value={filters.from}
        disabled={disabled}
        onChange={(event) => onChange({ ...filters, from: event.target.value })}
      />
      <input
        className="nd-input"
        type="date"
        aria-label="To"
        value={filters.to}
        disabled={disabled}
        onChange={(event) => onChange({ ...filters, to: event.target.value })}
      />
      <select
        className="nd-select"
        aria-label="Schedule"
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
      <select
        className="nd-select"
        aria-label="Pack"
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
      <select
        className="nd-select"
        aria-label="Patient"
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
      <select
        className="nd-select"
        aria-label="Pharmacist"
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
      <button type="submit" className="nd-btn nd-btn-ghost" disabled={disabled}>
        Apply
      </button>
    </form>
  );
}
