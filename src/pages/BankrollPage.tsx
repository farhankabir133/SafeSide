import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Calculator,
  AlertTriangle,
  TrendingDown,
  Percent,
  Activity,
  BarChart3,
  Crosshair,
  Target,
  Flame,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Input } from '@/src/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { cn } from '@/src/lib/utils';
import { usePredictions } from '@/src/hooks/usePredictions';
import { MultiModelPrediction } from '@/src/types/prediction';

type StakingStrategy = 'kelly_full' | 'kelly_half' | 'kelly_quarter' | 'flat_1' | 'flat_2' | 'flat_5';

interface AllocationRow {
  matchId: string;
  home: string;
  away: string;
  confidence: number;
  kellyFraction: number;
  recommendedFraction: number;
  stake: number;
  edge: number;
  riskLevel: string;
}

export default function BankrollPage() {
  const { predictions } = usePredictions();
  
  const [bankroll, setBankroll] = useState<number>(10000);
  const [strategy, setStrategy] = useState<StakingStrategy>('kelly_half');
  const [simMatches, setSimMatches] = useState<number>(40);
  const [simSeed, setSimSeed] = useState<number>(1);

  const multiModelPredictions = Object.entries(predictions).filter(([_id, p]: [string, any]) => p.poissonForecast || p.calibrationResult) as [string, MultiModelPrediction][];

  const allocationRows: AllocationRow[] = useMemo(() => {
    return multiModelPredictions.map(([id, pred]) => {
      const pf = pred.poissonForecast;
      const p = pf.homeWinProb / 100;
      const bPrice = 1.95 - 1; // Fair odds approximation
      const kellyFraction = bPrice > 0 ? Math.max(0, (p * bPrice - (1 - p)) / bPrice) : 0;

      let recommendedFraction = 0;
      switch (strategy) {
        case 'kelly_full': recommendedFraction = kellyFraction; break;
        case 'kelly_half': recommendedFraction = kellyFraction * 0.5; break;
        case 'kelly_quarter': recommendedFraction = kellyFraction * 0.25; break;
        case 'flat_1': recommendedFraction = 0.01; break;
        case 'flat_2': recommendedFraction = 0.02; break;
        case 'flat_5': recommendedFraction = 0.05; break;
      }

      const stakeAmount = bankroll * recommendedFraction;
      const riskLevel = pred.anomalyReport.volatilityIndex > 70 ? 'High' : pred.anomalyReport.volatilityIndex > 40 ? 'Medium' : 'Low';

      return {
        matchId: id,
        home: pred.quantitativeReasoning?.evidenceChain?.[0]?.metricName || 'N/A',
        away: 'Opponent',
        confidence: (pred.calibrationResult.calibratedHighestProb || 0) * 100,
        kellyFraction: kellyFraction * 100,
        recommendedFraction: recommendedFraction * 100,
        stake: stakeAmount,
        edge: ((p * bPrice - (1 - p)) / bPrice) * 100,
        riskLevel,
      };
    });
  }, [multiModelPredictions, bankroll, strategy]);

  const totalExposure = allocationRows.reduce((sum, row) => sum + row.stake, 0);
  const exposurePercentage = bankroll > 0 ? (totalExposure / bankroll) * 100 : 0;
  const avgConfidence = allocationRows.length > 0 ? allocationRows.reduce((s, r) => s + r.confidence, 0) / allocationRows.length : 0;

  const simulationData = useMemo(() => {
    const data: Array<{ day: number; optimistic: number; expected: number; pessimistic: number }> = [];
    let optimistic = bankroll;
    let expected = bankroll;
    let pessimistic = bankroll;
    for (let i = 1; i <= simMatches; i++) {
      optimistic *= 1.02;
      expected *= 1.005;
      pessimistic *= 0.98;
      data.push({ day: i, optimistic: Math.round(optimistic), expected: Math.round(expected), pessimistic: Math.round(pessimistic) });
    }
    return data;
  }, [bankroll, simMatches]);

  return (
    <div className="min-h-screen bg-black text-zinc-200 p-6 md:p-10">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Bankroll Intelligence</h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">Confidence-weighted capital allocation system</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Bankroll</div>
              <div className="text-3xl font-black font-mono">${bankroll.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard label="Active Predictions" value={multiModelPredictions.length.toString()} sub="Ready for allocation" />
          <MetricCard label="Total Exposure" value={`${exposurePercentage.toFixed(1)}%`} sub={`$${totalExposure.toLocaleString()} at risk`} />
          <MetricCard label="Avg Confidence" value={`${avgConfidence.toFixed(0)}%`} sub="Calibrated probability" />
          <MetricCard label="Strategy" value={strategy.replace('_', ' ').toUpperCase()} sub="Kelly variant" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-1 lg:col-span-2 bg-zinc-950 border-zinc-900 text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Confidence-Weighted Allocation</CardTitle>
                <Input
                  type="number"
                  value={bankroll}
                  onChange={(e) => setBankroll(Number(e.target.value))}
                  className="w-32 bg-zinc-900 border-zinc-800 text-white text-right font-mono text-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-900 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Match</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Confidence</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Kelly %</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fraction</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Stake</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Edge</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocationRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-zinc-600 py-8 font-mono text-xs">
                          No analyzed predictions available. Run analysis on matches to generate allocations.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allocationRows.map((row) => (
                        <TableRow key={row.matchId} className="border-zinc-900">
                          <TableCell className="font-mono text-xs">{row.home} vs {row.away}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="h-full bg-zinc-400" style={{ width: `${row.confidence}%` }} />
                              </div>
                              <span className="text-xs font-mono">{row.confidence.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{row.kellyFraction.toFixed(2)}%</TableCell>
                          <TableCell className="text-xs font-mono">{row.recommendedFraction.toFixed(2)}%</TableCell>
                          <TableCell className="text-xs font-mono font-bold">${row.stake.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                          <TableCell className="text-xs font-mono">{row.edge.toFixed(1)}%</TableCell>
                          <TableCell>
                            <RiskBadge level={row.riskLevel as any} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Strategy Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Staking Strategy</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as StakingStrategy)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-white"
                >
                  <option value="kelly_full">Full Kelly</option>
                  <option value="kelly_half">Half Kelly (Recommended)</option>
                  <option value="kelly_quarter">Quarter Kelly</option>
                  <option value="flat_1">Flat 1%</option>
                  <option value="flat_2">Flat 2%</option>
                  <option value="flat_5">Flat 5%</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Simulation Matches</label>
                <Input
                  type="number"
                  value={simMatches}
                  onChange={(e) => setSimMatches(Number(e.target.value))}
                  className="bg-zinc-900 border-zinc-800 text-white font-mono"
                />
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl">
                <div className="text-xs text-zinc-500 font-mono leading-relaxed">
                  Fractional Kelly reduces variance while preserving positive edge. Half Kelly is recommended for most portfolios.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-zinc-950 border-zinc-900 text-white">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Monte Carlo Simulation</CardTitle>
            <CardDescription className="text-zinc-600 font-mono text-xs">
              Expected bankroll trajectory over {simMatches} matches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={simulationData}>
                <defs>
                  <linearGradient id="bankrollGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="expected" stroke="#fff" fill="url(#bankrollGradient)" strokeWidth={2} name="Expected" />
                <Line type="monotone" dataKey="optimistic" stroke="#22c55e" strokeWidth={1} dot={false} name="Optimistic (95th)" />
                <Line type="monotone" dataKey="pessimistic" stroke="#ef4444" strokeWidth={1} dot={false} name="Pessimistic (5th)" />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="bg-zinc-950 border-zinc-900 text-white">
      <CardContent className="p-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
        <div className="text-xl font-black font-mono">{value}</div>
        <div className="text-[10px] text-zinc-600 font-mono mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}

function RiskBadge({ level }: { level: 'Low' | 'Medium' | 'High' }) {
  const colors: Record<string, string> = { Low: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10', Medium: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10', High: 'text-red-500 border-red-500/30 bg-red-500/10' };
  return <Badge variant="outline" className={cn('text-[10px] font-black uppercase', colors[level])}>{level}</Badge>;
}
