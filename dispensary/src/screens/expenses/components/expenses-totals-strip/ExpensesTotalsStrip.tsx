import type { ExpenseTotals } from '@/services/expenses';
import { formatPaise } from '../../ExpensesScreen.utils';

export type ExpensesTotalsStripProps = {
  totals: ExpenseTotals | null;
  allOutlets: boolean;
};

export function ExpensesTotalsStrip({ totals, allOutlets }: ExpensesTotalsStripProps) {
  const amount = formatPaise(totals?.totalPaise ?? 0);
  return (
    <p className="border border-line bg-surface px-3 py-2 font-mono text-sm text-ink">
      {allOutlets ? 'All outlets' : 'This outlet'}: {amount}
    </p>
  );
}
