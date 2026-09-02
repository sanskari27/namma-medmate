import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MetricPoint } from '@molecules/area-metric-chart/chart-types';

export default function LiveAreaChart({ data }: { data: MetricPoint[] }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#3a4860" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#9aa6bb', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9aa6bb', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <RechartsTooltip
            contentStyle={{
              background: '#232c3f',
              border: '1px solid #3a4860',
              borderRadius: 2,
              fontSize: 12,
              color: '#e8eef6',
            }}
          />
          <Area
            type="stepAfter"
            dataKey="value"
            stroke="#5ba4cf"
            fill="#1a3344"
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
