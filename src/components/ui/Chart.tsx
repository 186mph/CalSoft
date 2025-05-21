import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  month: string;
  value: number;
}

interface ChartProps {
  data: ChartData[];
  fontColor?: string;
  barColor?: string;
}

function formatValue(value: number): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

export function Chart({ data, fontColor = 'var(--foreground)', barColor = 'var(--primary)' }: ChartProps) {
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis 
            dataKey="month" 
            stroke={fontColor}
            tick={{ fill: fontColor }}
          />
          <YAxis 
            stroke={fontColor}
            tickFormatter={formatValue}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              color: fontColor,
            }}
            labelStyle={{ color: fontColor, fontWeight: 500 }}
            itemStyle={{ color: fontColor, fontWeight: 500 }}
            formatter={(value: number) => formatValue(value)}
          />
          <Bar 
            dataKey="value" 
            fill={barColor}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 