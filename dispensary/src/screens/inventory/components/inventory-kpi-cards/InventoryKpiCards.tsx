import {
  Box,
  CalendarClock,
  Clock3,
  CreditCard,
  Tag,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';
import type { InventoryOverviewSummary } from '@/services/inventory';
import { INVENTORY_CONTENT } from '../../InventoryScreen.content';
import { formatPaise } from '../../InventoryScreen.format';

type InventoryKpiCardsProps = {
  summary: InventoryOverviewSummary | null;
};

type Kpi = {
  key: string;
  label: string;
  value: string;
  hint: string;
  Icon: LucideIcon;
  iconClass: string;
};

export function InventoryKpiCards({ summary }: InventoryKpiCardsProps) {
  const cards: Kpi[] = [
    {
      key: 'skus',
      label: INVENTORY_CONTENT.kpis.totalSkus,
      value: summary ? String(summary.totalSkus) : '—',
      hint: summary
        ? `${summary.totalUnits.toLocaleString('en-IN')} units in stock`
        : '…',
      Icon: Box,
      iconClass: 'bg-brand-soft text-brand',
    },
    {
      key: 'cost',
      label: INVENTORY_CONTENT.kpis.stockValue,
      value: summary ? formatPaise(summary.stockValueCostPaise) : '—',
      hint:
        summary?.marginPercent != null
          ? `≈ ${summary.marginPercent}% margin`
          : 'purchase cost',
      Icon: CreditCard,
      iconClass: 'bg-[#e8eef8] text-[#3b5bdb]',
    },
    {
      key: 'retail',
      label: INVENTORY_CONTENT.kpis.retailValue,
      value: summary ? formatPaise(summary.retailValueMrpPaise) : '—',
      hint: 'potential revenue',
      Icon: Tag,
      iconClass: 'bg-brand-soft text-brand',
    },
    {
      key: 'low',
      label: INVENTORY_CONTENT.kpis.lowStock,
      value: summary ? String(summary.lowStockCount) : '—',
      hint: summary ? `${summary.outOfStockCount} out of stock` : '…',
      Icon: TrendingDown,
      iconClass: 'bg-[#fff1e6] text-warn',
    },
    {
      key: 'expiring',
      label: INVENTORY_CONTENT.kpis.expiring,
      value: summary ? String(summary.expiringCount) : '—',
      hint: summary ? `${formatPaise(summary.expiringValuePaise)} at risk` : '…',
      Icon: CalendarClock,
      iconClass: 'bg-[#fde8e8] text-danger',
    },
    {
      key: 'dead',
      label: INVENTORY_CONTENT.kpis.deadStock,
      value: summary ? String(summary.deadStockCount) : '—',
      hint: summary ? `${formatPaise(summary.deadStockValuePaise)} tied up` : '…',
      Icon: Clock3,
      iconClass: 'bg-[#f3ece4] text-[#8a5a2b]',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <article
          key={card.key}
          className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3"
        >
          <span
            className={`inline-grid size-9 shrink-0 place-items-center rounded-lg ${card.iconClass}`}
            aria-hidden
          >
            <card.Icon className="size-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">{card.label}</p>
            <p className="truncate text-xl font-semibold tabular-nums text-ink">{card.value}</p>
            <p className="truncate text-xs text-muted">{card.hint}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
