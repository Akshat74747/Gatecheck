'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DataPoint {
  severity: string;
  count: number;
}

interface Props {
  data: DataPoint[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#f87171',
  high:     '#fb923c',
  medium:   '#fcd34d',
  low:      '#818cf8',
  info:     '#94a3b8',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="clay p-3" style={{ borderRadius: '10px', fontSize: '11px' }}>
      <p className="text-muted-foreground mb-1 capitalize">{label}</p>
      <p style={{ color: SEVERITY_COLORS[label] ?? '#fff' }} className="font-medium">
        {payload[0].value} finding{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
};

export function FindingsBarChart({ data }: Props) {
  if (!data.length || data.every(d => d.count === 0)) return null;

  return (
    <div className="clay p-5" style={{ borderRadius: '20px' }}>
      <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-4">
        Findings by severity
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="30%">
          <XAxis
            dataKey="severity"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.charAt(0).toUpperCase() + v.slice(1)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={24}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.severity}
                fill={SEVERITY_COLORS[entry.severity] ?? '#94a3b8'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
