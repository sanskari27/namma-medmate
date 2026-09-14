import type { FilterState } from '../../RegistersScreen.utils';

export type RegistersFiltersProps = {
  filters: FilterState;
  showBatch: boolean;
  disabled?: boolean;
  onChange: (next: FilterState) => void;
  onApply: () => void;
};

export function RegistersFilters({
  filters,
  showBatch,
  disabled = false,
  onChange,
  onApply,
}: RegistersFiltersProps) {
  return (
    <form
      className="rg-card rg-card-pad rg-toolbar"
      aria-label="Register book filters"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <label className="rg-field">
        From
        <input
          className="rg-input"
          type="date"
          value={filters.from}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, from: event.target.value })}
        />
      </label>
      <label className="rg-field">
        To
        <input
          className="rg-input"
          type="date"
          value={filters.to}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, to: event.target.value })}
        />
      </label>
      {showBatch ? (
        <label className="rg-field">
          Batch
          <input
            className="rg-input"
            value={filters.batchNumber}
            disabled={disabled}
            onChange={(event) => onChange({ ...filters, batchNumber: event.target.value })}
          />
        </label>
      ) : null}
      <button type="submit" className="rg-btn rg-btn-ghost" disabled={disabled}>
        Apply
      </button>
    </form>
  );
}
