import { ROUTES } from '@/libs/constants/routes.const';
import type { DashboardPeriod } from '@/services/homeDashboard';

/** User-facing content for the home dashboard. Keep strings here — not inline in JSX. */
export const DASHBOARD_CONTENT = {
  regionHero: 'Shop greeting and quick actions',
  regionKpis: 'Key counters',
  storeOpen: 'Store open',
  metricThisMonth: 'This month',
  metricAvgBillToday: 'Avg bill today',
  metricItemsSoldToday: 'Items sold today',
  metricDuesToCollect: 'Dues to collect',
  kpiTodaySales: "Today's sales",
  kpiOrdersToday: 'Orders today',
  kpiPrescriptions: 'Prescriptions',
  kpiStockAlerts: 'Stock alerts',
  kpiPendingReview: 'pending review',
  kpiAllCaughtUp: 'all caught up',
  kpiAwaitingAction: 'awaiting action',
  kpiLow: 'low',
  kpiExpiring: 'expiring',
  kpiToVerify: 'to verify',
  kpiAction: 'action',
  kpiNewSuffix: 'new',
  titleViewSales: 'View all sales',
  titleViewOrders: 'View orders',
  titleReviewPrescriptions: 'Review prescriptions',
  titleOpenInventory: 'Open inventory',
  analyticsTitle: 'Sales analytics',
  metricRevenue: 'Revenue',
  metricOrders: 'Orders',
  chartDonut: 'Donut',
  chartBars: 'Grouped bars',
  chartLine: 'Line',
  channelSplit: 'Channel split',
  paymentModes: 'Payment modes',
  topCategories: 'Top categories',
  actualPrefix: 'actual',
  attentionTitle: 'Needs your attention',
  expiringTitle: 'Expiring soon',
  topSellersTitle: 'Top sellers',
  recentTitle: 'Recent transactions',
  linkViewAll: 'View all',
  linkViewAllArrow: 'View all →',
  linkInventoryArrow: 'Inventory →',
  linkReportsArrow: 'Reports →',
  emptyChannel: 'No channel data yet.',
  emptyPayments: 'No payments recorded yet.',
  emptyCategories: 'No category sales yet.',
  emptyAttention: 'Nothing urgent on this counter.',
  emptyExpiring: 'No batches nearing expiry.',
  emptyTopSellers: 'No seller data yet.',
  emptyRecent: 'No completed bills yet today.',
  emptyAnalytics: 'No sales in this window yet.',
  quickActions: [
    {
      to: ROUTES.SALES,
      title: 'New sale',
      subtitle: 'Counter / POS',
      tone: 'green' as const,
    },
    {
      to: ROUTES.PURCHASES,
      title: 'New purchase',
      subtitle: 'Goods inward',
      tone: 'blue' as const,
    },
    {
      to: ROUTES.PRESCRIPTIONS,
      title: 'Prescriptions',
      subtitleKey: 'pending' as const,
      tone: 'gold' as const,
    },
    {
      to: ROUTES.INVENTORY,
      title: 'Reorder',
      subtitleKey: 'low' as const,
      tone: 'violet' as const,
    },
  ],
} as const;

export const DASHBOARD_PERIODS: readonly DashboardPeriod[] = ['7D', '30D', '12M'];

export const DASHBOARD_CHART_TYPES = [
  { id: 'donut' as const, label: DASHBOARD_CONTENT.chartDonut },
  { id: 'bars' as const, label: DASHBOARD_CONTENT.chartBars },
  { id: 'line' as const, label: DASHBOARD_CONTENT.chartLine },
];

export function pendingCountLabel(count: number): string {
  return `${count} pending`;
}

export function lowCountLabel(count: number): string {
  return `${count} low`;
}

export function topSellersHeading(periodLabelText: string): string {
  return `${DASHBOARD_CONTENT.topSellersTitle} · ${periodLabelText}`;
}

export function actualPeriodCaption(periodLabelText: string): string {
  return `${DASHBOARD_CONTENT.actualPrefix} · ${periodLabelText}`;
}
