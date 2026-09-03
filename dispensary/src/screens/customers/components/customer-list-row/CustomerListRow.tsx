import type { Customer } from '@/services/customers';
import { Droplets, Phone } from 'lucide-react';
import { formatPhone, hasHealthFlag, railClass } from '../../CustomersScreen.utils';

export type CustomerListRowProps = {
  customer: Customer;
  active: boolean;
  nameId: string;
  metaId: string;
  onSelect: (customer: Customer) => void;
};

export function CustomerListRow({
  customer,
  active,
  nameId,
  metaId,
  onSelect,
}: CustomerListRowProps) {
  return (
    <li className="flex items-stretch">
      <span className={`w-1 shrink-0 ${railClass(customer)}`} aria-hidden />
      <button
        type="button"
        aria-labelledby={nameId}
        aria-describedby={metaId}
        className={`flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
          active ? 'bg-brand-soft' : 'hover:bg-canvas/80'
        }`}
        onClick={() => onSelect(customer)}
        aria-current={active ? 'true' : undefined}
      >
        <span id={nameId} className="truncate text-sm font-medium text-ink">
          {customer.name}
        </span>
        <span
          id={metaId}
          className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted"
        >
          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
            <Phone className="size-3" aria-hidden />
            {formatPhone(customer.phone)}
          </span>
          {customer.bloodGroup ? (
            <span className="inline-flex items-center gap-1 font-mono">
              <Droplets className="size-3" aria-hidden />
              {customer.bloodGroup}
            </span>
          ) : null}
          {hasHealthFlag(customer) ? <span className="text-warn">Health note</span> : null}
        </span>
      </button>
    </li>
  );
}
