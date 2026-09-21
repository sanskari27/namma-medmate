import { HOSPITAL_SALES_REGISTER_CONTENT } from '../../HospitalSalesRegisterScreen.content';
import type { RegisterFilters } from '../../HospitalSalesRegisterScreen.utils';

type WardOption = { id: string; name: string };

type Props = {
  filters: RegisterFilters;
  wards: WardOption[];
  disabled: boolean;
  onChange: (next: RegisterFilters) => void;
};

export function HospitalSalesRegisterFilters({ filters, wards, disabled, onChange }: Props) {
  return (
    <div className="ps-filters">
      <label className="ps-field">
        {HOSPITAL_SALES_REGISTER_CONTENT.fromLabel}
        <input
          type="date"
          aria-label={HOSPITAL_SALES_REGISTER_CONTENT.fromLabel}
          disabled={disabled}
          value={filters.from}
          onChange={(event) => onChange({ ...filters, from: event.target.value })}
        />
      </label>
      <label className="ps-field">
        {HOSPITAL_SALES_REGISTER_CONTENT.toLabel}
        <input
          type="date"
          aria-label={HOSPITAL_SALES_REGISTER_CONTENT.toLabel}
          disabled={disabled}
          value={filters.to}
          onChange={(event) => onChange({ ...filters, to: event.target.value })}
        />
      </label>
      <label className="ps-field">
        {HOSPITAL_SALES_REGISTER_CONTENT.paymentLabel}
        <select
          aria-label={HOSPITAL_SALES_REGISTER_CONTENT.paymentLabel}
          disabled={disabled}
          value={filters.paymentMode}
          onChange={(event) => onChange({ ...filters, paymentMode: event.target.value })}
        >
          <option value="">{HOSPITAL_SALES_REGISTER_CONTENT.allPayments}</option>
          <option value="CASH">{HOSPITAL_SALES_REGISTER_CONTENT.cash}</option>
          <option value="UPI">{HOSPITAL_SALES_REGISTER_CONTENT.upi}</option>
          <option value="CARD">{HOSPITAL_SALES_REGISTER_CONTENT.card}</option>
          <option value="CREDIT">{HOSPITAL_SALES_REGISTER_CONTENT.credit}</option>
          <option value="INSURANCE_TPA">{HOSPITAL_SALES_REGISTER_CONTENT.insuranceTpa}</option>
        </select>
      </label>
      <label className="ps-field">
        {HOSPITAL_SALES_REGISTER_CONTENT.paidLabel}
        <select
          aria-label={HOSPITAL_SALES_REGISTER_CONTENT.paidLabel}
          disabled={disabled}
          value={filters.paid}
          onChange={(event) =>
            onChange({ ...filters, paid: event.target.value as RegisterFilters['paid'] })
          }
        >
          <option value="">{HOSPITAL_SALES_REGISTER_CONTENT.allPaid}</option>
          <option value="PAID">{HOSPITAL_SALES_REGISTER_CONTENT.paidOnly}</option>
          <option value="UNPAID">{HOSPITAL_SALES_REGISTER_CONTENT.unpaidOnly}</option>
        </select>
      </label>
      <label className="ps-field">
        {HOSPITAL_SALES_REGISTER_CONTENT.insurerLabel}
        <input
          aria-label={HOSPITAL_SALES_REGISTER_CONTENT.insurerLabel}
          disabled={disabled}
          value={filters.insurer}
          onChange={(event) => onChange({ ...filters, insurer: event.target.value })}
        />
      </label>
      <label className="ps-field">
        {HOSPITAL_SALES_REGISTER_CONTENT.wardLabel}
        <select
          aria-label={HOSPITAL_SALES_REGISTER_CONTENT.wardLabel}
          disabled={disabled}
          value={filters.wardId}
          onChange={(event) => onChange({ ...filters, wardId: event.target.value })}
        >
          <option value="">{HOSPITAL_SALES_REGISTER_CONTENT.allWards}</option>
          {wards.map((ward) => (
            <option key={ward.id} value={ward.id}>
              {ward.name}
            </option>
          ))}
        </select>
      </label>
      <label className="ps-field ps-field-search">
        {HOSPITAL_SALES_REGISTER_CONTENT.searchLabel}
        <input
          aria-label={HOSPITAL_SALES_REGISTER_CONTENT.searchLabel}
          disabled={disabled}
          value={filters.q}
          placeholder={HOSPITAL_SALES_REGISTER_CONTENT.searchPlaceholder}
          onChange={(event) => onChange({ ...filters, q: event.target.value })}
        />
      </label>
    </div>
  );
}
