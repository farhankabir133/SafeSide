import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, History } from 'lucide-react';

interface HistoricalAnalysisProps {
  data: {
    date: string;
    accuracy: number;
    volume: number;
  }[];
}

export const HistoricalAnalysis: React.FC<HistoricalAnalysisProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-zinc-950 border-zinc-900 rounded-3xl p-12 text-center">
        <History className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
        <h4 className="text-xl font-black uppercase tracking-tighter text-zinc-500">No Historical Data</h4>
        <p className="text-zinc-600 text-sm mt-2 max-w-xs mx-auto">Complete more predictions to unlock trend visualization and performance analytics.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          <h3 className="text-2xl font-black uppercase tracking-tighter">Performance Timeline</h3>
        </div>
        <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 bg-emerald-500/5 px-3 py-1 text-[10px] uppercase font-bold tracking-widest">
          Live Intelligence Tracking
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#52525b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => {
                    const [y, m, d] = val.split('-');
                    return `${d}/${m}`;
                  }}
                />
                <YAxis 
                  stroke="#52525b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#09090b', 
                    borderColor: '#27272a', 
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontFamily: 'monospace'
                  }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAccuracy)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-zinc-950 border-zinc-900 rounded-3xl p-6 hover:border-emerald-500/30 transition-all group">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
              <Trophy className="w-3 h-3 text-emerald-500" />
              Peak Accuracy
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-emerald-500 leading-none">
                {Math.max(...data.map(d => d.accuracy)).toFixed(1)}%
              </span>
              <span className="text-emerald-500/40 text-[10px] font-bold uppercase tracking-widest">Single Session</span>
            </div>
            <div className="mt-8 space-y-2">
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${Math.max(...data.map(d => d.accuracy))}%` }}
                />
              </div>
              <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Verification Node Pulse</p>
            </div>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900 rounded-3xl p-6 hover:border-blue-500/30 transition-all group">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
              <History className="w-3 h-3 text-blue-500" />
              Analysis Bulk
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-blue-500 leading-none">
                {data.reduce((acc, curr) => acc + curr.volume, 0)}
              </span>
              <span className="text-blue-500/40 text-[10px] font-bold uppercase tracking-widest">Signals Processed</span>
            </div>
            <div className="mt-8">
              <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                System throughput growing at a steady pace across multiple league frequencies.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
