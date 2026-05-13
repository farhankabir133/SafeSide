import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Progress } from '@/src/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { 
  Zap, 
  AlertTriangle, 
  ShieldCheck, 
  Target, 
  Shield, 
  Info, 
  Activity, 
  History, 
  MessageSquare,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Dna,
  BrainCircuit
} from 'lucide-react';
import { MatchAnalysis } from '@/src/services/geminiService';
import { Skeleton } from '@/src/components/ui/skeleton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PredictionCardProps {
  match: any;
  analysis: MatchAnalysis;
  onQueryAgent?: () => void;
  onViewDetails?: () => void;
  isFlashing?: boolean;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ match, analysis, onQueryAgent, onViewDetails, isFlashing }) => {
  const { prediction, risk_assessment, micro_events, reasoning_summary, form_analysis } = analysis;
  const [h2hData, setH2hData] = useState<any>(null);
  const [h2hLoading, setH2hLoading] = useState(false);

  const homeTeam = match.homeTeam.name;
  const awayTeam = match.awayTeam.name;
  const competition = match.competition?.name || "Global Competition";
  const matchDate = new Date(match.utcDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const matchTime = new Date(match.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    async function fetchH2H() {
      try {
        setH2hLoading(true);
        const res = await fetch(`/api/matches/${match.id}/head2head`);
        if (res.ok) {
          const data = await res.json();
          setH2hData(data);
        }
      } catch (err) {
        console.error("H2H fetch error:", err);
      } finally {
        setH2hLoading(false);
      }
    }
    fetchH2H();
  }, [match.id]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5';
      case 'Medium': return 'border-yellow-500/20 text-yellow-400 bg-yellow-500/5';
      case 'High': return 'border-red-500/20 text-red-400 bg-red-500/5';
      default: return 'border-zinc-800 text-zinc-400 bg-zinc-900';
    }
  };

  const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(match.status);

  // Dynamic live probability adjustment
  const liveProbabilities = React.useMemo(() => {
    const base = prediction.win_probability;
    if (!isLive) return base;

    const homeScore = match.score?.fullTime?.home ?? 0;
    const awayScore = match.score?.fullTime?.away ?? 0;
    const diff = homeScore - awayScore;

    let homeShift = diff * 15;
    let awayShift = -diff * 15;
    
    let home = Math.max(5, Math.min(95, base.home + homeShift));
    let away = Math.max(5, Math.min(95, base.away + awayShift));
    let draw = Math.max(5, 100 - (home + away));

    return { home, away, draw: Math.round(draw) };
  }, [match.score?.fullTime, match.status, prediction.win_probability, isLive]);

  return (
    <Card className="bg-zinc-950 border-zinc-900 text-zinc-100 overflow-hidden rounded-[32px] group/card hover:border-zinc-700/50 transition-all duration-500">
      <CardHeader className="pb-6 border-b border-zinc-900 bg-black/20">
        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col gap-3">
             <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={cn("font-mono text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg", getRiskColor(risk_assessment.level))}>
                  {risk_assessment.level} MISSION PROFILE
                </Badge>
                {prediction.value_bet && (
                   <Badge className="bg-emerald-500 text-black font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <TrendingUp className="w-3 h-3" />
                      Value Identified
                   </Badge>
                )}
                {prediction.trap_game_warning && (
                   <Badge className="bg-red-500 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                      <AlertCircle className="w-3 h-3" />
                      Trap Game Alert
                   </Badge>
                )}
             </div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">
              <span className="text-zinc-400">{competition}</span>
              <span className="opacity-30">•</span>
              <div className="flex items-center gap-2">
                <span>{matchDate}</span>
                <span className="opacity-30">@</span>
                <span className="text-zinc-100">{matchTime}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Confidence</span>
                <div className="flex items-center gap-2">
                   <span className="text-xl font-black text-yellow-500">{prediction.confidence_score}%</span>
                </div>
             </div>
             <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover/card:border-emerald-500/50 transition-colors">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4 md:gap-0">
          <div className="md:col-span-3 flex flex-col md:flex-row items-center gap-6 px-4">
            <div className="w-20 h-20 bg-zinc-900 rounded-3xl border border-zinc-800 p-4 transition-transform group-hover/card:scale-105 duration-500 flex items-center justify-center">
               <img src={match.homeTeam.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="text-center md:text-left flex-1 min-w-0">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Host Entity</p>
              <h3 className="text-2xl font-black tracking-tighter truncate uppercase text-zinc-100">{homeTeam}</h3>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                 <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                   Prob: {isLive ? liveProbabilities.home : prediction.win_probability.home}%
                 </span>
                 {risk_assessment.fatigue_index && (
                   <span className="text-[9px] font-black text-zinc-600 uppercase">Fatigue: {risk_assessment.fatigue_index.home}/10</span>
                 )}
              </div>
            </div>
          </div>
          
          <div className="md:col-span-1 flex flex-col items-center justify-center relative py-4">
             <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                <Target className="w-20 h-20 text-yellow-500" />
             </div>
             <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl py-3 px-6 shadow-xl relative z-10">
                <p className="text-[8px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-1 text-center">Scoreline</p>
                <p className="text-2xl font-black text-white tracking-tighter text-center">{prediction.scoreline}</p>
             </div>
             <div className="mt-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{prediction.safe_side}</span>
             </div>
          </div>

          <div className="md:col-span-3 flex flex-col md:flex-row-reverse items-center gap-6 px-4">
            <div className="w-20 h-20 bg-zinc-900 rounded-3xl border border-zinc-800 p-4 transition-transform group-hover/card:scale-105 duration-500 flex items-center justify-center">
               <img src={match.awayTeam.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="text-center md:text-right flex-1 min-w-0">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Assailant Node</p>
              <h3 className="text-2xl font-black tracking-tighter truncate uppercase text-zinc-100">{awayTeam}</h3>
              <div className="flex items-center justify-center md:justify-end gap-3 mt-2">
                 {risk_assessment.fatigue_index && (
                   <span className="text-[9px] font-black text-zinc-600 uppercase">Fatigue: {risk_assessment.fatigue_index.away}/10</span>
                 )}
                 <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">
                   Prob: {isLive ? liveProbabilities.away : prediction.win_probability.away}%
                 </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-8 pb-4">
        <Tabs defaultValue="strategy" className="w-full">
           <TabsList className="w-full grid grid-cols-4 bg-zinc-900/50 p-1 rounded-2xl h-12 mb-8">
              <TabsTrigger value="strategy" className="data-[state=active]:bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest">Tactical Audit</TabsTrigger>
              <TabsTrigger value="risk" className="data-[state=active]:bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest">Risk Guard</TabsTrigger>
              <TabsTrigger value="modeling" className="data-[state=active]:bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest">Quant Model</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest">H2H Logs</TabsTrigger>
           </TabsList>

           <TabsContent value="strategy" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {[
                    { label: 'Expected Goals (xG)', value: `${prediction.expected_goals?.home || '--'} vs ${prediction.expected_goals?.away || '--'}`, icon: Target },
                    { label: 'BTTS Probability', value: `${(prediction.btts_probability || 0 * 100).toFixed(0)}%`, icon: Zap },
                    { label: 'Over 2.5 Index', value: `${(prediction.over_2_5_probability || 0 * 100).toFixed(0)}%`, icon: TrendingUp },
                 ].map((stat, i) => (
                    <div key={i} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl">
                       <div className="flex items-center gap-2 mb-2">
                          <stat.icon className="w-3 h-3 text-zinc-500" />
                          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{stat.label}</span>
                       </div>
                       <p className="text-xl font-black text-zinc-100">{stat.value}</p>
                    </div>
                 ))}
              </div>

              <div className="bg-zinc-900/40 p-6 rounded-[32px] border border-zinc-800/50 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                    <Dna className="w-24 h-24 text-white" />
                 </div>
                 <div className="relative z-10">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Activity className="w-3 h-3 text-yellow-500" />
                       Intelligence Narrative
                    </p>
                    <p className="text-sm text-zinc-400 font-medium leading-relaxed italic">
                       "{reasoning_summary}"
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                       {micro_events.map((e, idx) => (
                          <Badge key={idx} variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-zinc-800 text-zinc-500 py-1 px-3">
                             {e.type}
                          </Badge>
                       ))}
                    </div>
                 </div>
              </div>
           </TabsContent>

           <TabsContent value="risk" className="space-y-6">
              <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[32px] relative overflow-hidden">
                 <div className="flex items-center justify-between mb-6">
                    <div>
                       <h4 className="text-md font-black uppercase tracking-tighter">Threat Exposure Analysis</h4>
                       <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Real-time risk distribution across variables</p>
                    </div>
                    <div className={cn("p-2 rounded-xl border", getRiskColor(risk_assessment.level))}>
                       {risk_assessment.level === 'Low' && <ShieldCheck className="w-5 h-5" />}
                       {risk_assessment.level === 'Medium' && <AlertCircle className="w-5 h-5" />}
                       {risk_assessment.level === 'High' && <AlertTriangle className="w-5 h-5" />}
                    </div>
                 </div>

                 <div className="flex items-center gap-1.5 h-3 w-full mb-8">
                    {[
                       { level: 'Low', color: 'bg-emerald-500' },
                       { level: 'Medium', color: 'bg-yellow-500' },
                       { level: 'High', color: 'bg-red-500' }
                    ].map((segment, i) => (
                       <div key={i} className="flex-1 h-full relative">
                          <div className={cn(
                             "w-full h-full rounded-sm transition-all duration-700",
                             segment.level === risk_assessment.level ? segment.color : "bg-zinc-800/50"
                          )} />
                          {segment.level === risk_assessment.level && (
                             <>
                                <div className={cn("absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full", segment.color)} />
                                <div className={cn("absolute inset-0 blur-md opacity-20", segment.color)} />
                             </>
                          )}
                       </div>
                    ))}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-950/50 border border-zinc-900/50 p-5 rounded-2xl group/vector hover:border-red-500/20 transition-all">
                       <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-3.5 h-3.5 text-red-500/70" />
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Primary Vector</span>
                       </div>
                       <p className="text-sm font-bold text-zinc-200 leading-tight">{risk_assessment.primary_risk}</p>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-900/50 p-5 rounded-2xl group/buffer hover:border-emerald-500/20 transition-all">
                       <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-3.5 h-3.5 text-emerald-500/70" />
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Safety Buffer</span>
                       </div>
                       <p className="text-sm font-bold text-zinc-200 leading-tight">{risk_assessment.safety_buffer}</p>
                    </div>
                 </div>
              </div>
              
              {prediction.trap_game_warning && (
                 <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-[32px] flex items-start gap-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                       <AlertCircle className="w-16 h-16 text-red-500" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                       <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="relative z-10">
                       <h4 className="text-lg font-black uppercase tracking-tighter text-red-500 mb-1">Trap Engagement Protocol</h4>
                       <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                          {prediction.trap_game_reason}
                       </p>
                    </div>
                 </div>
              )}
           </TabsContent>

           <TabsContent value="modeling" className="space-y-6">
              <div className="bg-zinc-900/50 p-8 rounded-[38px] border border-zinc-800">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h4 className="text-md font-black uppercase tracking-tighter">Poisson Score Matrix</h4>
                       <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Quantative scoreline probability distribution</p>
                    </div>
                    <BarChart3 className="w-5 h-5 text-zinc-700" />
                 </div>
                 
                 <div className="h-[200px] w-full">
                    {prediction.poisson_scorelines ? (
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={prediction.poisson_scorelines}>
                             <XAxis dataKey="score" fontSize={10} fontFamily="JetBrains Mono" axisLine={false} tickLine={false} stroke="#52525b" />
                             <Tooltip 
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '8px' }}
                                labelStyle={{ display: 'none' }}
                             />
                             <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
                                {prediction.poisson_scorelines.map((_, index) => (
                                   <Cell 
                                      key={`cell-${index}`} 
                                      fill={index === 0 ? '#eab308' : '#27272a'} 
                                      opacity={1 - (index * 0.1)}
                                   />
                                ))}
                             </Bar>
                          </BarChart>
                       </ResponsiveContainer>
                    ) : (
                       <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl opacity-30">
                          <p className="text-xs font-black uppercase tracking-[0.2em]">Quant Node Offline</p>
                       </div>
                    )}
                 </div>
              </div>

              {prediction.value_bet && (
                 <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[32px]">
                    <div className="flex items-center gap-3 mb-3">
                       <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                          <TrendingUp className="w-4 h-4" />
                       </div>
                       <h4 className="text-xl font-black uppercase tracking-tighter text-emerald-400">Inefficiency Found</h4>
                    </div>
                    <p className="text-sm font-medium text-emerald-500/80 leading-relaxed mb-4">
                       Model detects a significant probability divergence: {prediction.value_explanation}
                    </p>
                    <div className="flex items-center gap-4">
                       <div className="text-center">
                          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Recommended Stake</p>
                          <p className="text-lg font-black text-zinc-100">{prediction.kelly_stake_percent}%</p>
                       </div>
                       <div className="h-8 w-px bg-emerald-500/20" />
                       <div className="text-center">
                          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Kelly Factor</p>
                          <p className="text-lg font-black text-zinc-100">0.25x</p>
                       </div>
                    </div>
                 </div>
              )}
           </TabsContent>

           <TabsContent value="history">
              {h2hLoading ? (
                 <div className="space-y-4">
                    <Skeleton className="h-10 w-full bg-zinc-900 rounded-xl" />
                    <Skeleton className="h-40 w-full bg-zinc-900 rounded-3xl" />
                 </div>
              ) : h2hData ? (
                 <div className="space-y-8">
                    {/* Visual Win Distribution Bar */}
                    <div className="bg-zinc-900/40 p-6 rounded-[32px] border border-zinc-900/50">
                       <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Global Interaction Ratio</p>
                          <span className="text-[10px] font-mono text-zinc-600 italic">n={h2hData.aggregates.numberOfMatches}</span>
                       </div>
                       
                       <div className="h-4 w-full flex rounded-full overflow-hidden bg-zinc-950 mb-6">
                          <div 
                             className="h-full bg-zinc-100 transition-all duration-1000 ease-out" 
                             style={{ width: `${(h2hData.aggregates.homeTeam.wins / h2hData.aggregates.numberOfMatches) * 100}%` }} 
                          />
                          <div 
                             className="h-full bg-zinc-700 transition-all duration-1000 ease-out" 
                             style={{ width: `${(h2hData.aggregates.homeTeam.draws / h2hData.aggregates.numberOfMatches) * 100}%` }} 
                          />
                          <div 
                             className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                             style={{ width: `${(h2hData.aggregates.awayTeam.wins / h2hData.aggregates.numberOfMatches) * 100}%` }} 
                          />
                       </div>

                       <div className="grid grid-cols-3 gap-3">
                          {[
                             { label: 'Host Dominance', value: h2hData.aggregates.homeTeam.wins, color: 'bg-zinc-100' },
                             { label: 'Stalemate', value: h2hData.aggregates.homeTeam.draws || 0, color: 'bg-zinc-700' },
                             { label: 'Assailant Superiority', value: h2hData.aggregates.awayTeam.wins, color: 'bg-blue-500' },
                          ].map((s, i) => (
                             <div key={i} className="flex flex-col">
                                <div className="flex items-center gap-1.5 mb-1">
                                   <div className={cn("w-1.5 h-1.5 rounded-full", s.color)} />
                                   <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">{s.label}</span>
                                </div>
                                <p className="text-xl font-black text-zinc-100 leading-none">{s.value}</p>
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex items-center gap-2 px-1">
                          <History className="w-3 h-3 text-zinc-600" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Archival Log History</h4>
                       </div>
                       
                       <div className="space-y-2">
                          {h2hData.matches.slice(0, 5).map((m: any, i: number) => {
                             const isHomeWin = m.score.winner === 'HOME_TEAM';
                             const isAwayWin = m.score.winner === 'AWAY_TEAM';
                             const isDraw = m.score.winner === 'DRAW';

                             return (
                                <div key={i} className="flex items-center gap-4 bg-zinc-950/50 border border-zinc-900/50 p-4 rounded-2xl group/log hover:border-zinc-800 transition-all">
                                   <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black",
                                      isHomeWin ? "bg-zinc-100 text-black shadow-[0_0_10px_rgba(255,255,255,0.1)]" : 
                                      isAwayWin ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.2)]" : 
                                      "bg-zinc-900 text-zinc-500"
                                   )}>
                                      {isHomeWin ? 'W' : isAwayWin ? 'L' : 'D'}
                                   </div>
                                   
                                   <div className="flex-1 flex items-center justify-between min-w-0">
                                      <div className="flex flex-col">
                                         <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-zinc-100 uppercase tracking-tighter truncate max-w-[80px]">
                                               {m.homeTeam.name.split(' ').slice(-1)}
                                            </span>
                                            <span className="text-[10px] font-mono text-zinc-700">VS</span>
                                            <span className="text-xs font-black text-zinc-100 uppercase tracking-tighter truncate max-w-[80px]">
                                               {m.awayTeam.name.split(' ').slice(-1)}
                                            </span>
                                         </div>
                                         <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mt-0.5">
                                            {m.competition.name}
                                         </span>
                                      </div>

                                      <div className="flex flex-col items-end">
                                         <div className="bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800 font-mono text-xs font-black text-zinc-300">
                                            {m.score.fullTime.home}-{m.score.fullTime.away}
                                         </div>
                                         <span className="text-[8px] font-mono text-zinc-700 mt-1 uppercase">
                                            {new Date(m.utcDate).getFullYear()} SERIES
                                         </span>
                                      </div>
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 </div>
              ) : (
                 <div className="p-24 text-center border-2 border-dashed border-zinc-900 rounded-[32px] opacity-30">
                    <History className="w-12 h-12 mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest text-xs">Engagement History Void</p>
                 </div>
              )}
           </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="bg-black/40 py-6 px-10 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="flex flex-col gap-1.5 order-2 md:order-1 items-center md:items-start text-[9px] font-black uppercase tracking-[0.2em] text-zinc-700">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Analytic Matrix Verified</span>
            </div>
            <div className="flex items-center gap-2">
               <Info className="w-3 h-3" />
               <span>Internal ID: Fixture-{match.id}</span>
            </div>
         </div>
         
         <div className="flex items-center gap-3 order-1 md:order-2 w-full md:w-auto">
            <button 
              onClick={onViewDetails}
              className="flex-1 md:flex-none h-12 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-black uppercase text-[10px] tracking-widest px-8 rounded-2xl border border-zinc-800 transition-all"
            >
              Tactical Roster
            </button>
            <button 
              onClick={onQueryAgent}
              className="flex-1 md:flex-none h-12 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[10px] tracking-widest px-8 rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all flex items-center justify-center gap-2"
            >
              <BrainCircuit className="w-4 h-4" />
              Intelligence Node
            </button>
         </div>
      </CardFooter>
    </Card>
  );
};
