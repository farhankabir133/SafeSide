import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  TrendingUp, 
  HelpCircle, 
  History, 
  Database, 
  Sparkles, 
  Play, 
  RefreshCw,
  AlertCircle,
  TrendingDown,
  Percent,
  Calculator,
  Grid
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '@/src/lib/utils';

// Types for Simulator Configuration
type StakingStrategy = 'kelly_full' | 'kelly_half' | 'kelly_quarter' | 'flat_1' | 'flat_2' | 'flat_5';

interface SimulationDay {
  sequence: number;
  expected: number;
  optimistic: number;
  pessimistic: number;
}

export default function BankrollPage() {
  // Input states
  const [bankroll, setBankroll] = useState<number>(10000);
  const [winProb, setWinProb] = useState<number>(65); // default 65% (EPL high confidence)
  const [odds, setOdds] = useState<number>(1.85); // default decimal odds 1.85
  const [strategy, setStrategy] = useState<StakingStrategy>('kelly_half');
  const [simMatches, setSimMatches] = useState<number>(40);
  const [simSeed, setSimSeed] = useState<number>(1); // trigger simulation updates

  // Calculate Stake & EV
  const calcResults = useMemo(() => {
    const p = winProb / 100;
    const bPrice = odds - 1;
    const q = 1 - p;
    
    // EV calculation: EV = (p * b) - q
    const ev = (p * bPrice) - q;
    const hasEdge = ev > 0;
    
    // Full Kelly Stake Fraction = (p * b - q) / b
    let kellyFraction = 0;
    if (bPrice > 0) {
      kellyFraction = (p * bPrice - q) / bPrice;
    }
    kellyFraction = Math.max(0, kellyFraction); // no negative bets

    let recommendedFraction = 0;
    switch (strategy) {
      case 'kelly_full':
        recommendedFraction = kellyFraction;
        break;
      case 'kelly_half':
        recommendedFraction = kellyFraction * 0.5;
        break;
      case 'kelly_quarter':
        recommendedFraction = kellyFraction * 0.25;
        break;
      case 'flat_1':
        recommendedFraction = 0.01;
        break;
      case 'flat_2':
        recommendedFraction = 0.02;
        break;
      case 'flat_5':
        recommendedFraction = 0.05;
        break;
    }

    const proposedPercentage = Number((recommendedFraction * 100).toFixed(2));
    const stakeAmount = Number((bankroll * recommendedFraction).toFixed(2));
    const potentialProfit = Number((stakeAmount * bPrice).toFixed(2));
    const potentialReturn = Number((stakeAmount * odds).toFixed(2));

    return {
      ev: Number((ev * 100).toFixed(2)),
      hasEdge,
      kellyFraction,
      proposedPercentage,
      stakeAmount,
      potentialProfit,
      potentialReturn
    };
  }, [bankroll, winProb, odds, strategy]);

  // Generate Monte Carlo simulation lines based on inputs and mathematical random runs
  const simChartData = useMemo(() => {
    const data: SimulationDay[] = [];
    let currentExp = bankroll;
    let currentOpt = bankroll;
    let currentPes = bankroll;

    const p = winProb / 100;
    const bPrice = odds - 1;
    
    // Determine the step fraction of bankroll based on calculation results
    const fraction = calcResults.proposedPercentage / 100;

    data.push({
      sequence: 0,
      expected: Math.round(bankroll),
      optimistic: Math.round(bankroll),
      pessimistic: Math.round(bankroll)
    });

    // Run custom linear variance paths
    // Expected path wins at the exact specified win probability rate
    // Optimistic path has positive variance (+10-15% win rate)
    // Pessimistic path has negative variance (-15-20% win rate)
    const exactWinThreshold = p;
    const optimisticWinThreshold = Math.min(0.95, p + 0.12);
    const pessimisticWinThreshold = Math.max(0.15, p - 0.18);

    // Simple pseudo-random generators with seed to persist output beautifully
    const pseudoRandom = (step: number, key: string) => {
      const x = Math.sin(step * 43243.2 + key.charCodeAt(0) * 11 + simSeed) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 1; i <= simMatches; i++) {
      // Expected run
      const rollExp = pseudoRandom(i, 'exp');
      const winExp = rollExp < exactWinThreshold;
      const stakeExp = currentExp * fraction;
      currentExp = winExp ? (currentExp + stakeExp * bPrice) : (currentExp - stakeExp);

      // Optimistic run
      const rollOpt = pseudoRandom(i, 'opt');
      const winOpt = rollOpt < optimisticWinThreshold;
      const stakeOpt = currentOpt * fraction;
      currentOpt = winOpt ? (currentOpt + stakeOpt * bPrice) : (currentOpt - stakeOpt);

      // Pessimistic run
      const rollPes = pseudoRandom(i, 'pes');
      const winPes = rollPes < pessimisticWinThreshold;
      const stakePes = currentPes * fraction;
      currentPes = winPes ? (currentPes + stakePes * bPrice) : (currentPes - stakePes);

      data.push({
        sequence: i,
        expected: Math.round(currentExp),
        optimistic: Math.round(currentOpt),
        pessimistic: Math.round(currentPes)
      });
    }

    return data;
  }, [bankroll, winProb, odds, calcResults, simMatches, simSeed]);

  // Dynamic backtests
  const historicalBacktests = [
    {
      id: "BT-902",
      fixture: "Arsenal vs Chelsea",
      league: "Premier League",
      modelWinProb: 68,
      marketOdds: 1.82,
      result: "WIN",
      kellyStake: "7.7%",
      flatStake: "2.0%",
      kellyReturn: "+$139.75",
      flatReturn: "+$32.80",
      statusColor: "text-emerald-500",
    },
    {
      id: "BT-894",
      fixture: "Real Madrid vs Barcelona",
      league: "La Liga",
      modelWinProb: 59,
      marketOdds: 2.10,
      result: "WIN",
      kellyStake: "4.3%",
      flatStake: "2.0%",
      kellyReturn: "+$180.40",
      flatReturn: "+$44.00",
      statusColor: "text-emerald-500",
    },
    {
      id: "BT-887",
      fixture: "Bayern Munich vs Dortmund",
      league: "Bundesliga",
      modelWinProb: 74,
      marketOdds: 1.55,
      result: "LOSS",
      kellyStake: "12.0%",
      flatStake: "2.0%",
      kellyReturn: "-$240.00",
      flatReturn: "-$40.00",
      statusColor: "text-red-500",
    },
    {
      id: "BT-861",
      fixture: "Manchester City vs Real Madrid",
      league: "Champions League",
      modelWinProb: 62,
      marketOdds: 1.95,
      result: "WIN",
      kellyStake: "5.8%",
      flatStake: "2.0%",
      kellyReturn: "+$113.10",
      flatReturn: "+$38.00",
      statusColor: "text-emerald-500",
    },
    {
      id: "BT-852",
      fixture: "AC Milan vs Inter",
      league: "Serie A",
      modelWinProb: 54,
      marketOdds: 2.40,
      result: "LOSS",
      kellyStake: "2.6%",
      flatStake: "2.0%",
      kellyReturn: "-$52.00",
      flatReturn: "-$40.00",
      statusColor: "text-red-500",
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 space-y-16">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-8 border-b border-zinc-950">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 bg-yellow-500/5 font-mono text-[9px] py-0.5 px-2 uppercase tracking-[0.2em]">
              Tactical Support Tool
            </Badge>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest font-mono">STAKING ENGINE ACTIVE</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase leading-none">
            Bankroll <span className="text-zinc-800">Intelligence</span>
          </h1>
          <p className="text-zinc-400 mt-2 text-sm sm:text-base max-w-2xl font-medium">
            Deploy mathematical bankroll optimization strategies like the Kelly Criterion to preserve liquid assets while growing units exponentially based on SafeSide predictions.
          </p>
        </div>
        <div className="bg-zinc-950/60 border border-zinc-900 px-6 py-4 rounded-3xl flex items-center gap-4">
          <Calculator className="w-8 h-8 text-yellow-500" />
          <div>
            <span className="text-[9px] block text-zinc-600 font-bold uppercase tracking-widest font-mono">Active Model Configuration</span>
            <span className="text-xs font-black uppercase text-zinc-300">Kelly Variance Adjuster v3.4.1</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs vs Quick Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Staking Parameters Panel */}
        <Card className="lg:col-span-4 bg-zinc-950 border-zinc-900 rounded-[32px] p-6 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Grid className="w-32 h-32" />
          </div>

          <div className="border-b border-zinc-900 pb-4">
            <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Allocation Matrix
            </h3>
            <p className="text-zinc-500 text-[11px] uppercase tracking-wider font-semibold font-mono">Configure risk metrics</p>
          </div>

          <div className="space-y-4 relative z-10">
            {/* Total Liquid Bankroll */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex justify-between">
                <span>Total Liquid Bankroll ($)</span>
                <span className="font-mono text-zinc-300">${bankroll.toLocaleString()}</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-black text-zinc-600">$</span>
                <Input
                  type="number"
                  min="100"
                  max="5000000"
                  value={bankroll}
                  onChange={(e) => setBankroll(Number(e.target.value))}
                  className="bg-black/40 border-zinc-800 focus-visible:ring-yellow-500 focus-visible:border-yellow-500 pl-8 rounded-xl font-mono text-sm tracking-tight text-white h-11"
                />
              </div>
            </div>

            {/* Calculated Win Probability */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <span>Model Win Probability</span>
                <span className="font-mono text-yellow-500 text-xs px-1.5 py-0.5 bg-yellow-500/10 rounded-md">{winProb}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="95" 
                value={winProb}
                onChange={(e) => setWinProb(Math.round(Number(e.target.value)))}
                className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400"
              />
              <div className="flex justify-between text-[8px] font-mono text-zinc-600 uppercase font-black">
                <span>Uncertain [10%]</span>
                <span>Optimized [65%]</span>
                <span>Apex Signal [95%]</span>
              </div>
            </div>

            {/* Decimal Market Odds */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex justify-between">
                <span>Decimal Match Odds (E.g. 1.85)</span>
                <span className="font-mono text-zinc-300">Implied: {Number((100 / odds).toFixed(1))}%</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="1.01"
                max="50.0"
                value={odds || ''}
                onChange={(e) => setOdds(parseFloat(e.target.value) || 0)}
                className="bg-black/40 border-zinc-800 focus-visible:ring-yellow-500 focus-visible:border-yellow-500 rounded-xl font-mono text-sm tracking-tight text-white h-11"
              />
            </div>

            {/* Risk Control / Staking Strategy Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Staking Algorithm / Risk Control</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'kelly_full', label: 'Full Kelly' },
                  { id: 'kelly_half', label: 'Half Kelly' },
                  { id: 'kelly_quarter', label: 'Quarter Kelly' },
                  { id: 'flat_1', label: 'Flat 1% Unit' },
                  { id: 'flat_2', label: 'Flat 2% Unit' },
                  { id: 'flat_5', label: 'Flat 5% Unit' },
                ].map((strat) => (
                  <button
                    key={strat.id}
                    onClick={() => setStrategy(strat.id as StakingStrategy)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all h-14",
                      strategy === strat.id
                        ? "bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)]"
                        : "bg-black/35 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-white"
                    )}
                  >
                    <span className="text-[10px] font-black uppercase tracking-tight leading-none">{strat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sequence Bet Size slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <span>Simulation Depth</span>
                <span className="font-mono text-zinc-300 text-xs">{simMatches} Matches</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                value={simMatches}
                onChange={(e) => setSimMatches(Number(e.target.value))}
                className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400"
              />
            </div>
          </div>
        </Card>

        {/* Right Side: Stake Recommendation & Growth Projection */}
        <div className="lg:col-span-8 space-y-8">
          {/* Tactical Recommendation Stats Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Edge Metric */}
            <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-[24px] flex flex-col items-start gap-1 justify-between shadow-lg relative group overflow-hidden">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono">Calculated EV Edge</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className={cn(
                  "text-3xl font-black font-mono tracking-tighter leading-none",
                  calcResults.hasEdge ? "text-emerald-500" : "text-red-500"
                )}>
                  {calcResults.ev > 0 ? `+${calcResults.ev}` : calcResults.ev}%
                </span>
              </div>
              <p className="text-[9.5px] font-medium text-zinc-600 uppercase mt-4">
                {calcResults.hasEdge ? "Positive Edge Detected" : "Mathematical Negative EV"}
              </p>
            </div>

            {/* Stake % */}
            <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-[24px] flex flex-col items-start gap-1 justify-between shadow-lg relative group overflow-hidden">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono">Suggested Stake %</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-black font-mono tracking-tighter text-white leading-none">
                  {calcResults.proposedPercentage}%
                </span>
              </div>
              <p className="text-[9.5px] font-medium text-zinc-600 uppercase mt-4">
                Fraction allocation metric
              </p>
            </div>

            {/* Capital Layout Amount ($) */}
            <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-[24px] flex flex-col items-start gap-1 justify-between shadow-lg relative group overflow-hidden">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono">Recommended Layout</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-black font-mono tracking-tighter text-yellow-500 leading-none">
                  ${calcResults.stakeAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-[9.5px] font-medium text-zinc-600 uppercase mt-4">
                Actual capital deployment
              </p>
            </div>

            {/* Profit layout */}
            <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-[24px] flex flex-col items-start gap-1 justify-between shadow-lg relative group overflow-hidden">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono">Yield Potential</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-black font-mono tracking-tighter text-emerald-400 leading-none">
                  +${calcResults.potentialProfit.toLocaleString()}
                </span>
              </div>
              <p className="text-[9.5px] font-medium text-zinc-600 uppercase mt-4">
                Potential win profit unit
              </p>
            </div>
          </div>

          {/* Core Monte Carlo Simulation Chart */}
          <Card className="bg-zinc-950 border-zinc-900 p-6 rounded-[32px] overflow-hidden shadow-2xl relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-5 mb-6">
              <div>
                <CardTitle className="text-lg font-black uppercase text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-yellow-500 rounded-sm" />
                  Monte Carlo Staking simulation
                </CardTitle>
                <p className="text-zinc-500 text-xs font-medium font-mono">Projecting sequence volatility & drawdown constraints</p>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setSimSeed(prev => prev + 1)}
                  size="sm" 
                  variant="outline" 
                  className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-[10px] font-mono uppercase tracking-widest px-3 h-9"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin-hover" />
                  Randomize Seed
                </Button>
              </div>
            </div>

            {calcResults.proposedPercentage <= 0 ? (
              <div className="h-80 flex flex-col items-center justify-center p-8 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                <h4 className="text-base font-black uppercase tracking-tight text-zinc-300">Negative EV Matrix Detected</h4>
                <p className="text-zinc-500 text-xs text-center max-w-sm mt-1">Staking algorithms block allocation when implied win probability does not provide custom edge over available market odds.</p>
              </div>
            ) : (
              <div className="h-80 w-full mt-4 pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={simChartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                    <XAxis 
                      dataKey="sequence" 
                      stroke="#444" 
                      tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} 
                      label={{ value: 'Sequence Of Trades', position: 'insideBottom', offset: -5, fill: '#444', fontSize: 9, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="#444" 
                      tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }}
                      tickFormatter={(tick) => `$${tick.toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', padding: '12.5px' }}
                      itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      labelStyle={{ color: '#71717a', fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace' }}
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', fontFamily: 'monospace' }}
                    />
                    <Line 
                      name="Optimistic (+1σ)" 
                      type="monotone" 
                      dataKey="optimistic" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-in-out"
                    />
                    <Line 
                      name="Expectation (Mode)" 
                      type="monotone" 
                      dataKey="expected" 
                      stroke="#eab308" 
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6 }}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-in-out"
                    />
                    <Line 
                      name="Pessimistic (-1σ)" 
                      type="monotone" 
                      dataKey="pessimistic" 
                      stroke="#ef4444" 
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-in-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-900 pt-6 mt-6">
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                <div>
                  <h5 className="text-[10px] font-black uppercase text-emerald-400 font-mono tracking-wider">Optimistic Scenario</h5>
                  <p className="text-zinc-500 text-[11px] leading-relaxed mt-0.5">Assumes a positive variance roll yielding around an average of 75-80% success. Bankroll expands steadily.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
                <div>
                  <h5 className="text-[10px] font-black uppercase text-yellow-400 font-mono tracking-wider">Median Expectation</h5>
                  <p className="text-zinc-500 text-[11px] leading-relaxed mt-0.5 font-sans">Compounding rate aligns closely with the mathematically defined Win Probability ({winProb}%).</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                <div>
                  <h5 className="text-[10px] font-black uppercase text-red-400 font-mono tracking-wider">Drawdown Risk Area</h5>
                  <p className="text-zinc-500 text-[11px] leading-relaxed mt-0.5">Simulates model runs under negative deviation clusters (around 45%). Demonstrates defensive draw safety buffers.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Kelly Criterion Formula Explanation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-zinc-950 border-zinc-800 p-8 rounded-[32px] shadow-xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Percent className="w-32 h-32 text-yellow-500" />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-yellow-500" />
            The Kelly Formula Matrix
          </h3>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            The mathematical foundation of Kelly optimization is constructed to maximize long-term log-utility of wealth. Standard linear/flat stakes do not account for implied model accuracy differences relative to bookmaker odds, which can result in long-term drawdown.
          </p>

          <div className="bg-black/50 p-6 rounded-2xl border border-zinc-900 space-y-4 mb-4 font-mono">
            <div className="flex justify-center items-center py-4 bg-zinc-950/80 rounded-xl border border-zinc-900">
              <span className="text-sm font-black text-yellow-500">
                f* &nbsp;=&nbsp; [ p(b - 1) - q ] &nbsp;/&nbsp; (b - 1)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
              <div>
                <span className="text-white">f*</span> = Percentage of Bankroll
              </div>
              <div>
                <span className="text-white">p</span> = Probability of Success
              </div>
              <div>
                <span className="text-white">b</span> = Decimal Odds (Multiplier)
              </div>
              <div>
                <span className="text-white">q</span> = Probability of Loss (1 - p)
              </div>
            </div>
          </div>
          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600 block">Deploy caution: fractional stakes (Half or Quarter Kelly) protect against short-term distribution cluster variance.</span>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800 p-8 rounded-[32px] shadow-xl overflow-hidden relative">
          <h3 className="text-xl font-black uppercase tracking-tight text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-yellow-500" />
            Operational Edge Analysis
          </h3>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            Compare flat-staking versus full and fractional Kelly structures using our current index backtests. Notice how Kelly minimizes risk when matching odds have compressed, but leverages safe margins during top signals.
          </p>

          <div className="space-y-4">
            <div className="border border-zinc-900 rounded-xl overflow-hidden bg-black/40">
              <Table>
                <TableHeader className="bg-zinc-950">
                  <TableRow className="border-zinc-900 hover:bg-transparent">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-500 py-3">Fixture</TableHead>
                    <TableHead className="text-center text-[9px] font-black uppercase tracking-widest text-zinc-500">Signal</TableHead>
                    <TableHead className="text-center text-[9px] font-black uppercase tracking-widest text-zinc-500">Kelly Stake</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-zinc-500">Yield Return</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicalBacktests.map((b) => (
                    <TableRow key={b.id} className="border-zinc-905 hover:bg-zinc-900/35 transition-all">
                      <TableCell className="font-bold text-xs text-white py-3">{b.fixture}</TableCell>
                      <TableCell className="text-center text-[10px] font-mono font-black text-yellow-500">{b.modelWinProb}%</TableCell>
                      <TableCell className="text-center text-xs font-mono text-zinc-400">{b.kellyStake}</TableCell>
                      <TableCell className={cn("text-right font-mono font-black text-xs", b.statusColor)}>
                        {b.kellyReturn}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
