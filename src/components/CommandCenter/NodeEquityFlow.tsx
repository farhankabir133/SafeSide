import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface NodeEquityFlowProps {
  data: any[];
  height?: number;
}

export const NodeEquityFlow: React.FC<NodeEquityFlowProps> = ({ data, height = 300 }) => {
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#3f3f46" 
            fontSize={10} 
            fontFamily="JetBrains Mono"
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="#3f3f46" 
            fontSize={10} 
            fontFamily="JetBrains Mono"
            tickLine={false}
            axisLine={false}
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '12px' }}
            labelStyle={{ fontSize: '10px', color: '#71717a', fontWeight: 'bold' }}
            itemStyle={{ fontSize: '12px', fontWeight: 'black', color: '#22c55e' }}
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke="#22c55e" 
            fillOpacity={1} 
            fill="url(#equityGradient)" 
            strokeWidth={3}
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
