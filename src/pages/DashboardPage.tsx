import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { 
  Target, 
  Trophy, 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar
} from 'recharts';

import { NodeEquityFlow } from '@/src/components/CommandCenter/NodeEquityFlow';

export default function DashboardPage() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    winRate: 0,
    avgConfidence: 0,
    streak: 0,
    roi: 0
  });

  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    if (user) {
      fetchUserPredictions();
    }
  }, [user]);

  const fetchUserPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setPredictions(data);
        calculateStats(data);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: any[]) => {
    const total = data.length;
    const completed = data.filter(p => p.status === 'completed');
    const wins = completed.filter(p => p.outcome === 'win').length;
    const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;
    
    const avgConfidence = data.length > 0 
      ? data.reduce((acc, p) => acc + (p.confidence_score || 0), 0) / data.length 
      : 0;

    // ROI calculation (Mock unit stake $10, odds 1.9)
    const unitPrice = 10;
    const avgOdds = 1.9;
    const netProfit = (wins * unitPrice * (avgOdds - 1)) - ((completed.length - wins) * unitPrice);
    const roi = completed.length > 0 ? (netProfit / (completed.length * unitPrice)) * 100 : 0;

    // Current Streak
    let streak = 0;
    for (const p of completed) {
      if (p.outcome === 'win') streak++;
      else break;
    }

    setStats({ total, winRate, avgConfidence, streak, roi });
  };

  const pagedPredictions = predictions.slice(page * pageSize, (page + 1) * pageSize);

  const chartData = React.useMemo(() => {
    // Cumulative P&L relative to 100 units
    let balance = 100;
    return predictions.slice().reverse().map(p => {
      if (p.status === 'completed') {
        if (p.outcome === 'win') balance += 9; // 1.9 odds
        else balance -= 10;
      }
      return {
        date: new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        balance
      };
    });
  }, [predictions]);

  const leagueAccuracyData = React.useMemo(() => {
    const leagues: Record<string, { total: number; wins: number }> = {};
    predictions.forEach(p => {
      if (p.status === 'completed' && p.competition_name) {
        const name = p.competition_name;
        if (!leagues[name]) leagues[name] = { total: 0, wins: 0 };
        leagues[name].total++;
        if (p.outcome === 'win') leagues[name].wins++;
      }
    });
    return Object.entries(leagues).map(([name, s]) => ({
      name: name.split(' ')[0],
      accuracy: (s.wins / s.total) * 100
    })).sort((a, b) => b.accuracy - a.accuracy);
  }, [predictions]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-24 space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 bg-zinc-900 rounded-3xl" />)}
      </div>
      <Skeleton className="h-[400px] bg-zinc-900 rounded-3xl" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
        <div>
          <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 bg-yellow-500/5 font-mono text-[9px] py-1.5 px-4 rounded-lg uppercase tracking-[0.2em] mb-4">
             Terminal Dashboard Overlay
          </Badge>
          <h2 className="text-6xl font-black tracking-tighter uppercase leading-[0.9]">Command <br/><span className="text-zinc-600">Cockpit</span></h2>
        </div>
        <div className="text-right">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Node Operator</p>
          <p className="text-xl font-black text-white">{user?.email?.split('@')[0].toUpperCase()}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {[
          { label: 'Intelligence Scans', value: stats.total, icon: Target, color: 'text-blue-500', trend: 'Global Network' },
          { label: 'Unit Accuracy', value: `${stats.winRate.toFixed(1)}%`, icon: Trophy, color: 'text-emerald-500', trend: 'Delta: Stable' },
          { label: 'Tactical ROI', value: `${stats.roi.toFixed(1)}%`, icon: stats.roi >= 0 ? TrendingUp : TrendingDown, color: stats.roi >= 0 ? 'text-yellow-500' : 'text-red-500', trend: '1.9 Avg Basis' },
          { label: 'Operational Streak', value: stats.streak, icon: Activity, color: 'text-zinc-100', trend: 'Verified' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-zinc-950 border-zinc-900 p-8 rounded-[40px] relative overflow-hidden group hover:border-zinc-700 transition-all duration-500">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <stat.icon className={`w-20 h-20 ${stat.color}`} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-2">{stat.label}</p>
                <p className={`text-5xl font-black tracking-tighter mb-4 ${stat.color}`}>{stat.value}</p>
                <div className="flex items-center gap-2">
                   <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", stat.color.replace('text-', 'bg-'))} />
                   <span className="text-[9px] font-black uppercase text-zinc-700 tracking-widest">{stat.trend}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
        {/* P&L Flow Chart */}
        <div className="lg:col-span-8">
          <Card className="bg-zinc-950 border-zinc-900 p-10 rounded-[48px] h-[500px]">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-1">Performance Vector</h3>
                <p className="text-xl font-black uppercase tracking-tighter">Node Equity Flow</p>
              </div>
              <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
                 <Activity className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
            <NodeEquityFlow data={chartData} height={320} />
          </Card>
        </div>

        {/* Accuracy by League */}
        <div className="lg:col-span-4">
          <Card className="bg-zinc-950 border-zinc-900 p-10 rounded-[48px] h-[500px] flex flex-col">
            <div className="mb-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-1">Calibration Grid</h3>
              <p className="text-xl font-black uppercase tracking-tighter">Theater Accuracy</p>
            </div>
            <div className="flex-1 w-full min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leagueAccuracyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#3f3f46" 
                      fontSize={10} 
                      fontFamily="JetBrains Mono"
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip 
                      cursor={{fill: '#18181b'}}
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '12px' }}
                    />
                    <Bar dataKey="accuracy" fill="#eab308" radius={[0, 8, 8, 0]} barSize={24} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
            <div className="mt-8 pt-6 border-t border-zinc-900 italic">
               <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">Optimization suggests focus on high-liquidity European markets for maximum drift capture.</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Predictions Table */}
      <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden">
        <div className="p-8 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
              <Activity className="w-5 h-5 text-zinc-400" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Mission Log</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-zinc-500 px-4">Page {page + 1}</span>
            <button 
              disabled={(page + 1) * pageSize >= predictions.length}
              onClick={() => setPage(p => p + 1)}
              className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-black/50">
            <TableRow className="border-zinc-900 hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase text-zinc-500 pl-8">Match / Competition</TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase text-zinc-500">Predicted</TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase text-zinc-500">Actual</TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase text-zinc-500">Risk</TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase text-zinc-500">Outcome</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase text-zinc-500 pr-8">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedPredictions.length > 0 ? pagedPredictions.map((p) => (
              <TableRow key={p.id} className="border-zinc-900 hover:bg-zinc-900/30 transition-colors">
                <TableCell className="pl-8">
                  <p className="font-bold uppercase tracking-tight text-zinc-100">{p.home_team} vs {p.away_team}</p>
                  <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">{p.competition_name || 'LEAGUE SCAN'}</p>
                </TableCell>
                <TableCell className="text-center font-mono font-black text-zinc-400">
                  {p.prediction_score_home} - {p.prediction_score_away}
                </TableCell>
                <TableCell className="text-center font-mono font-black text-zinc-100">
                  {p.status === 'completed' ? `${p.actual_score_home} - ${p.actual_score_away}` : '--'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={p.risk_level === 'High' ? 'destructive' : 'outline'} className="text-[9px] uppercase tracking-widest py-0 px-2 h-5">
                    {p.risk_level || 'LOW'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    className={cn(
                      "text-[9px] uppercase tracking-widest py-0 px-2 h-5",
                      p.outcome === 'win' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                      p.outcome === 'loss' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      "bg-zinc-900 text-zinc-500"
                    )}
                  >
                    {p.status === 'completed' ? p.outcome?.toUpperCase() : 'PENDING'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-[10px] font-mono text-zinc-600 pr-8">
                  {new Date(p.created_at).toLocaleDateString([], { month: '2-digit', day: '2-digit', year: '2-digit' })}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-zinc-600 font-black uppercase text-[10px] tracking-widest">
                  No mission data logged.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
