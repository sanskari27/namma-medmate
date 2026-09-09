import { Area, AreaChart, ResponsiveContainer } from 'recharts';

export type DashboardSparklineProps = {
  values: number[];
  tone?: 'green' | 'blue' | 'gold' | 'rose';
};

const STROKE: Record<NonNullable<DashboardSparklineProps['tone']>, string> = {
  green: '#2f7d52',
  blue: '#3b82f6',
  gold: '#cf9846',
  rose: '#e2542a',
};

const FILL: Record<NonNullable<DashboardSparklineProps['tone']>, string> = {
  green: '#e6f2eb',
  blue: '#eef4ff',
  gold: '#fbf3e3',
  rose: '#fdeeee',
};

export function DashboardSparkline({ values, tone = 'green' }: DashboardSparklineProps) {
  const data = values.map((value, index) => ({ index, value }));
  if (data.every((point) => point.value === 0)) {
    return <div className="dash-spark dash-spark-flat" aria-hidden="true" />;
  }
  return (
    <div className="dash-spark" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="value"
            stroke={STROKE[tone]}
            fill={FILL[tone]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
