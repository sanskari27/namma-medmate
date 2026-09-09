import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Globe, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarMetricChart } from '@molecules/bar-metric-chart';
import { AreaMetricChart } from '@molecules/area-metric-chart';
import type { HomeDashboardView } from '@/services/homeDashboard';
import type { DashboardChartType, DashboardMetric } from '../../store/dashboard.slice';
import type { DashboardPeriod } from '@/services/homeDashboard';
import { ROUTES } from '@/libs/constants/routes.const';
import {
  DASHBOARD_CHART_TYPES,
  DASHBOARD_CONTENT,
  DASHBOARD_PERIODS,
} from '../../DashboardScreen.content';
import { formatDonutTooltip, formatPaise, pctOf, periodLabel } from '../../DashboardScreen.utils';

const CHANNEL_COLORS: Record<string, string> = {
  ONLINE: 'var(--dash-mid)',
  COUNTER: 'var(--dash-gold)',
};

export type DashboardSalesAnalyticsProps = {
  analytics: HomeDashboardView['analytics'];
  period: DashboardPeriod;
  metric: DashboardMetric;
  chartType: DashboardChartType;
  busy?: boolean;
  onPeriod: (period: DashboardPeriod) => void;
  onMetric: (metric: DashboardMetric) => void;
  onChartType: (chartType: DashboardChartType) => void;
};

export function DashboardSalesAnalytics({
  analytics,
  period,
  metric,
  chartType,
  busy = false,
  onPeriod,
  onMetric,
  onChartType,
}: DashboardSalesAnalyticsProps) {
  const totalLabel =
    metric === 'revenue' ? formatPaise(analytics.totalSalesPaise) : String(analytics.totalBillCount);
  const centerMetricLabel =
    metric === 'revenue' ? DASHBOARD_CONTENT.metricRevenue : DASHBOARD_CONTENT.metricOrders;

  const donutData = useMemo(
    () =>
      analytics.channelSplit
        .filter((row) => row.salesPaise > 0 || row.billCount > 0)
        .map((row) => ({
          name: row.label,
          key: row.key,
          value: metric === 'revenue' ? row.salesPaise / 100 : row.billCount,
          salesPaise: row.salesPaise,
          billCount: row.billCount,
        })),
    [analytics.channelSplit, metric],
  );

  const barData = useMemo(
    () =>
      analytics.trend.map((point) => ({
        label: point.date.slice(8),
        value: metric === 'revenue' ? point.salesPaise / 100 : point.billCount,
      })),
    [analytics.trend, metric],
  );

  const lineData = barData;

  return (
    <section className="dash-card" aria-labelledby="dash-sales-analytics">
      <div className="dash-card-head">
        <div>
          <h3 id="dash-sales-analytics">{DASHBOARD_CONTENT.analyticsTitle}</h3>
          <p>
            {totalLabel} · {periodLabel(analytics.period)}
          </p>
        </div>
        <div className="dash-toolbar" style={{ marginLeft: 'auto' }}>
          <div className="dash-seg" role="group" aria-label="Metric">
            <button
              type="button"
              className={metric === 'revenue' ? 'on' : undefined}
              disabled={busy}
              onClick={() => onMetric('revenue')}
            >
              {DASHBOARD_CONTENT.metricRevenue}
            </button>
            <button
              type="button"
              className={metric === 'orders' ? 'on' : undefined}
              disabled={busy}
              onClick={() => onMetric('orders')}
            >
              {DASHBOARD_CONTENT.metricOrders}
            </button>
          </div>
          <div className="dash-seg" role="group" aria-label="Period">
            {DASHBOARD_PERIODS.map((item) => (
              <button
                key={item}
                type="button"
                className={period === item ? 'on' : undefined}
                disabled={busy}
                onClick={() => onPeriod(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="dash-card-pad">
        <div className="dash-toolbar" style={{ marginBottom: 16 }}>
          {DASHBOARD_CHART_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`dash-chipbtn${chartType === item.id ? ' on' : ''}`}
              onClick={() => onChartType(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {chartType === 'donut' ? (
          <div className="dash-analytics-main">
            <div className="dash-donut-wrap">
              {donutData.length === 0 ? (
                <p className="dash-empty">{DASHBOARD_CONTENT.emptyAnalytics}</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={92}
                        paddingAngle={2}
                      >
                        {donutData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={CHANNEL_COLORS[entry.key] ?? 'var(--dash-mid)'}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="sr-only">
                    {donutData.map((entry) => (
                      <span key={entry.key}>
                        {entry.name}: {formatDonutTooltip(metric, entry.value, entry.salesPaise)}
                      </span>
                    ))}
                  </div>
                  <div className="dash-donut-center" aria-hidden="true">
                    <small>{centerMetricLabel}</small>
                    <strong>{totalLabel}</strong>
                  </div>
                </>
              )}
            </div>
            <div className="dash-legend">
              {analytics.channelSplit.map((row) => {
                const Icon = row.key === 'ONLINE' ? Globe : Receipt;
                return (
                  <Link key={row.key} className="dash-legend-row" to={ROUTES.SALES}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="em" aria-hidden="true">
                        <Icon size={14} />
                      </span>
                      {row.label}
                    </span>
                    <span>
                      {formatPaise(row.salesPaise)} · {pctOf(row.salesPaise, analytics.totalSalesPaise)}
                      %
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
        {chartType === 'bars' ? (
          <BarMetricChart data={barData} emptyLabel={DASHBOARD_CONTENT.emptyAnalytics} />
        ) : null}
        {chartType === 'line' ? (
          <AreaMetricChart data={lineData} emptyLabel={DASHBOARD_CONTENT.emptyAnalytics} />
        ) : null}
      </div>
    </section>
  );
}
