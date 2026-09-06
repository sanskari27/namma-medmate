import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MetricPoint } from '@molecules/area-metric-chart/chart-types';

export default function LiveBarChart({ data }: { data: MetricPoint[] }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#c2d3c8" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#3a5248', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#3a5248', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <RechartsTooltip
            contentStyle={{
              background: '#f7faf7',
              border: '1px solid #c2d3c8',
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" fill="#0a6b47" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
