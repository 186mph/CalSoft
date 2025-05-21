import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';

interface ForecastData {
  month: string;
  actual?: number;
  forecast?: number;
}

interface RevenueForecastChartProps {
  data: ForecastData[];
  fontColor?: string;
  actualColor?: string;
  forecastColor?: string;
}

function formatValue(value: number | undefined): string {
  if (!value) return '$0';
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

export function RevenueForecastChart({ 
  data, 
  fontColor = 'var(--foreground)', 
  actualColor = '#4f46e5', 
  forecastColor = '#f26722' 
}: RevenueForecastChartProps) {
  
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
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
            itemStyle={{ color: fontColor }}
            formatter={(value: number) => formatValue(value)}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="actual" 
            fill={actualColor} 
            fillOpacity={0.3} 
            stroke={actualColor} 
            name="Actual Revenue" 
          />
          <Line 
            type="monotone" 
            dataKey="forecast" 
            strokeDasharray="5 5"
            stroke={forecastColor} 
            name="Forecast" 
            strokeWidth={2} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
} 