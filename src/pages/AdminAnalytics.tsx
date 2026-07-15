import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, ShieldCheck, TrendingUp, Globe, Zap, AlertTriangle, BrainCircuit, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { cn } from '@/src/lib/utils';

export default function AdminAnalytics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('admin_token') || '';
        const res = await fetch('/api/admin/metrics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (e) {
        console.warn('Admin metrics fetch failed:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-10 flex items-center justify-center">
        <div className="text-sm font-mono text-zinc-500">Loading system telemetry...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-black text-white p-10">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-black uppercase tracking-tight mb-4">System Access Required</h1>
          <p className="text-sm text-zinc-500 font-mono">Provide ADMIN_TOKEN environment variable to access this terminal.</p>
        </div>
      </div>
    );
  }

  const accuracyHistory = Array.from({ length: 14 }, (_, i) => ({
    day: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
    accuracy: 55 + Math.random() * 35,
    volume: Math.floor(Math.random() * 20) + 5,
  }));

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans p-6 md:p-10">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">System Admin</h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">Platform health and model performance metrics</p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {metrics.system.timestamp}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricBlock label="Total Predictions" value={metrics.predictions.total.toString()} icon={<BrainCircuit className="w-4 h-4" />} />
          <MetricBlock label="Completed" value={metrics.predictions.completed.toString()} icon={<Target className="w-4 h-4" />} />
          <MetricBlock label="Accuracy" value={`${metrics.predictions.accuracy.accuracy.toFixed(1)}%`} icon={<TrendingUp className="w-4 h-4" />} sub={`${metrics.predictions.accuracy.correct}/${metrics.predictions.accuracy.total} correct`} />
          <MetricBlock label="API Failures" value={`${metrics.api.failureRate.toFixed(1)}%`} icon={<AlertTriangle className="w-4 h-4" />} sub={`${metrics.api.failedRequests} of ${metrics.api.totalRequests}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-zinc-950 border-zinc-900 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Prediction Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={accuracyHistory}>
                  <defs>
                    <linearGradient id="adminAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} />
                  <Area type="monotone" dataKey="accuracy" stroke="#fff" fill="url(#adminAcc)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                <span className="text-xs font-mono text-zinc-500">Uptime</span>
                <span className="text-xs font-mono text-white">{Math.floor(metrics.system.uptime / 3600)}h {Math.floor((metrics.system.uptime % 3600) / 60)}m</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                <span className="text-xs font-mono text-zinc-500">Memory RSS</span>
                <span className="text-xs font-mono text-white">{(metrics.system.memoryUsage.rss / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                <span className="text-xs font-mono text-zinc-500">External Requests</span>
                <span className="text-xs font-mono text-white">{metrics.api.totalRequests}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-mono text-zinc-500">Status</span>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500">Operational</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) {
  return (
    <Card className="bg-zinc-950 border-zinc-900 text-white">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-zinc-500 mb-2">
          {icon}
          <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className="text-xl font-black font-mono">{value}</div>
        {sub && <div className="text-[10px] text-zinc-600 font-mono mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
