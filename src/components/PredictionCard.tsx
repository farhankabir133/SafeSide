import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, AlertTriangle, ShieldCheck, Target, Shield, Info, Activity, History, MessageSquare } from 'lucide-react';
import { MatchAnalysis } from '@/src/services/geminiService';
import { Skeleton } from '@/components/ui/skeleton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  const { prediction, risk_assessment, micro_events, reasoning_summary } = analysis;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PLAY':
      case 'LIVE':
      case 'PAUSED':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 px-2 py-0 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
            <span className="relative flex h-1.5 w-1.5 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Live
          </Badge>
        );
      case 'FINISHED':
      case 'AWARDED':
        return (
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 px-2 py-0 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
            Full Time
          </Badge>
        );
      case 'POSTPONED':
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 px-2 py-0 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
            {status}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-zinc-500 border-zinc-800 px-2 py-0 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
            Upcoming
          </Badge>
        );
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

    // Shift probabilities based on score
    // This is a simplified heuristic for visual representation
    let homeShift = diff * 15;
    let awayShift = -diff * 15;
    
    let home = Math.max(5, Math.min(95, base.home + homeShift));
    let away = Math.max(5, Math.min(95, base.away + awayShift));
    let draw = Math.max(5, 100 - (home + away));

    return { home, away, draw: Math.round(draw) };
  }, [match.score?.fullTime, match.status, prediction.win_probability, isLive]);

  return (
    <Card className="bg-zinc-950 border-zinc-900 text-zinc-100 overflow-hidden rounded-3xl">
      <CardHeader className="pb-4 border-b border-zinc-900">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full mb-2 w-fit", getRiskColor(risk_assessment.level))}>
              {risk_assessment.level} Risk Profile
            </Badge>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">
              <span>{competition}</span>
              <span className="opacity-30">•</span>
              <div className="flex items-center gap-2">
                {getStatusBadge(match.status)}
                {!isLive && (
                  <span>{matchDate} @ {matchTime}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <div className={cn(
                "px-3 py-1 rounded-lg border mr-4 transition-all duration-300",
                isFlashing 
                  ? "bg-emerald-500 border-transparent scale-110 shadow-[0_0_20px_rgba(16,185,129,0.5)]" 
                  : "bg-emerald-500/10 border-emerald-500/20"
              )}>
                 <span className={cn(
                   "text-xl font-black tracking-wider transition-colors",
                   isFlashing ? "text-black" : "text-emerald-500"
                 )}>
                  {match.score?.fullTime?.home ?? 0} <span className={cn("mx-1", isFlashing ? "text-black/50" : "text-zinc-700")}>—</span> {match.score?.fullTime?.away ?? 0}
                 </span>
              </div>
            )}
            <div className="flex -space-x-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-5 h-5 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                </div>
              ))}
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Analyzed by SafeSide AI</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
          <div className="text-center md:text-right">
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Home</p>
            <h3 className="text-2xl font-black tracking-tighter truncate uppercase">{homeTeam}</h3>
            <p className={cn("font-mono font-bold text-xs mt-1 transition-colors", isLive ? "text-yellow-500" : "text-emerald-500")}>
              {isLive ? liveProbabilities.home : prediction.win_probability.home}% {isLive ? "Live" : "Prob."}
            </p>
          </div>
          
          <div className="relative">
             <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <Target className="w-16 h-16 text-yellow-500" />
             </div>
             <div className="relative flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-2xl py-6">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Safe Side</span>
                <span className="text-3xl font-black text-yellow-500 animate-pulse uppercase italic">{prediction.safe_side}</span>
                <div className="mt-4 bg-black/50 px-4 py-1 rounded-full border border-zinc-800">
                   <span className="text-lg font-black tracking-widest">{prediction.scoreline}</span>
                </div>
             </div>
          </div>

          <div className="text-center md:text-left">
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Away</p>
            <h3 className="text-2xl font-black tracking-tighter truncate uppercase">{awayTeam}</h3>
            <p className={cn("font-mono font-bold text-xs mt-1 transition-colors", isLive ? "text-yellow-500" : "text-emerald-500")}>
              {isLive ? liveProbabilities.away : prediction.win_probability.away}% {isLive ? "Live" : "Prob."}
            </p>
          </div>
        </div>

        {/* Probability Distribution Bar */}
        <div className="mt-8 space-y-2">
          <div className="flex justify-between items-end px-1">
            <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", isLive ? "text-yellow-500 animate-pulse" : "text-emerald-500")}>
              Home {isLive ? liveProbabilities.home : prediction.win_probability.home}%
            </span>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Draw {isLive ? liveProbabilities.draw : prediction.win_probability.draw}%
            </span>
            <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", isLive ? "text-blue-400" : "text-blue-500")}>
              Away {isLive ? liveProbabilities.away : prediction.win_probability.away}%
            </span>
          </div>
          <div className={cn(
            "h-2 w-full flex rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 shadow-inner",
            isLive && "ring-1 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          )}>
            <div 
              style={{ width: `${isLive ? liveProbabilities.home : prediction.win_probability.home}%` }} 
              className={cn("h-full transition-all duration-1000", isLive ? "bg-yellow-500" : "bg-emerald-500", !isLive && "shadow-[0_0_10px_rgba(16,185,129,0.3)]")}
            />
            <div 
              style={{ width: `${isLive ? liveProbabilities.draw : prediction.win_probability.draw}%` }} 
              className="h-full bg-zinc-700 transition-all duration-1000"
            />
            <div 
              style={{ width: `${isLive ? liveProbabilities.away : prediction.win_probability.away}%` }} 
              className={cn("h-full transition-all duration-1000", isLive ? "bg-blue-400" : "bg-blue-500", !isLive && "shadow-[0_0_10px_rgba(59,130,246,0.3)]")}
            />
          </div>
          {isLive && (
             <div className="flex items-center justify-center gap-2 pt-1">
                <div className="w-1 h-1 rounded-full bg-yellow-500 animate-ping" />
                <span className="text-[8px] font-black uppercase text-yellow-500 tracking-[0.2em] italic">Live Intelligence Shift Detected</span>
             </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-8 space-y-8">
        {/* Intelligence Brief */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 space-y-3">
             <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Intelligence Confidence</span>
             </div>
             <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-yellow-400 leading-none">{prediction.confidence_score}<span className="text-sm text-zinc-600">/10</span></span>
                <div className="w-24">
                   <Progress value={prediction.confidence_score * 10} className="h-1.5 bg-black" />
                </div>
             </div>
          </div>
          
          <div className={cn("p-4 rounded-2xl border flex flex-col justify-between", 
            risk_assessment.level === 'Low' ? 'bg-emerald-500/5 border-emerald-500/20' :
            risk_assessment.level === 'Medium' ? 'bg-yellow-500/5 border-yellow-500/20' :
            'bg-red-500/5 border-red-500/20'
          )}>
             <div className="flex items-center gap-2">
                <ShieldCheck className={cn("w-4 h-4", 
                  risk_assessment.level === 'Low' ? 'text-emerald-500' :
                  risk_assessment.level === 'Medium' ? 'text-yellow-500' :
                  'text-red-500'
                )} />
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Risk Classification</span>
             </div>
             <span className={cn("text-xl font-black uppercase tracking-tighter",
               risk_assessment.level === 'Low' ? 'text-emerald-400' :
               risk_assessment.level === 'Medium' ? 'text-yellow-400' :
               'text-red-400'
             )}>{risk_assessment.level} Exposure</span>
          </div>
        </div>

        <Tabs defaultValue="reasoning" className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-zinc-900/50 p-1 rounded-xl h-12">
            <TabsTrigger value="reasoning" className="data-[state=active]:bg-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest">Strategy</TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:bg-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest">Risk Mgmt</TabsTrigger>
            <TabsTrigger value="micro" className="data-[state=active]:bg-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest">Micro</TabsTrigger>
            <TabsTrigger value="h2h" className="data-[state=active]:bg-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest">H2H</TabsTrigger>
          </TabsList>

          <TabsContent value="reasoning" className="pt-6">
             <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800 border-dashed">
                <p className="text-sm text-zinc-300 leading-relaxed italic font-medium">"{reasoning_summary}"</p>
             </div>
          </TabsContent>

          <TabsContent value="risk" className="pt-6 space-y-4">
             <div className="flex items-start gap-3 bg-red-950/10 p-4 rounded-xl border border-red-900/20">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                   <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Primary Threat Vector</p>
                   <p className="text-sm text-zinc-300 font-medium">{risk_assessment.primary_risk}</p>
                </div>
             </div>
             <div className="flex items-start gap-3 bg-emerald-950/10 p-4 rounded-xl border border-emerald-900/20">
                <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                   <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Safety Buffer ($EV$)</p>
                   <p className="text-sm text-zinc-300 font-medium">{risk_assessment.safety_buffer}</p>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="micro" className="pt-6">
             <div className="grid grid-cols-1 gap-3">
                {micro_events.map((event, idx) => (
                   <div key={idx} className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                      <div className="flex items-center gap-3">
                         <div className={cn(
                            "w-2 h-2 rounded-full",
                            event.likelihood === 'High' ? 'bg-orange-500' : 'bg-zinc-700'
                         )} />
                         <span className="text-xs font-bold text-zinc-200">{event.type}</span>
                      </div>
                      <Badge variant="secondary" className="text-[9px] uppercase bg-zinc-800 text-zinc-400">{event.likelihood}</Badge>
                   </div>
                ))}
             </div>
          </TabsContent>

          <TabsContent value="h2h" className="pt-6">
             {h2hLoading ? (
                <div className="space-y-4">
                   <Skeleton className="h-10 w-full bg-zinc-900" />
                   <div className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-20 bg-zinc-900" />
                      <Skeleton className="h-20 bg-zinc-900" />
                      <Skeleton className="h-20 bg-zinc-900" />
                   </div>
                </div>
             ) : h2hData ? (
                <div className="space-y-6">
                   <div className="grid grid-cols-3 gap-4">
                      <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-center">
                         <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{homeTeam} Wins</p>
                         <p className="text-2xl font-black text-yellow-500">{h2hData.aggregates.homeTeam.wins}</p>
                      </div>
                      <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-center">
                         <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Draws</p>
                         <p className="text-2xl font-black text-zinc-100">{h2hData.aggregates.homeTeam.draws || 0}</p>
                      </div>
                      <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-center">
                         <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{awayTeam} Wins</p>
                         <p className="text-2xl font-black text-blue-500">{h2hData.aggregates.awayTeam.wins}</p>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Recent Encounters</p>
                      <div className="space-y-2">
                         {h2hData.matches.slice(0, 3).map((m: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50">
                               <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                  <span className="text-[10px] font-mono text-zinc-600 shrink-0">
                                     {new Date(m.utcDate).getFullYear()}
                                  </span>
                                  <span className="text-xs font-bold text-zinc-400 truncate uppercase tracking-tighter">
                                     {m.homeTeam.name === homeTeam ? 'Home' : m.homeTeam.name} vs {m.awayTeam.name === awayTeam ? 'Away' : m.awayTeam.name}
                                  </span>
                               </div>
                               <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs border-zinc-800 text-yellow-500">
                                     {m.score.fullTime.home} - {m.score.fullTime.away}
                                  </Badge>
                               </div>
                            </div>
                         ))}
                         {h2hData.matches.length === 0 && (
                            <div className="text-center py-4 text-zinc-600 bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800">
                               <p className="text-xs italic">No historical encounter data available.</p>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
             ) : (
                <div className="text-center py-8 bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800">
                   <p className="text-xs text-zinc-500 italic">Head-to-Head intelligence unavailable for this fixture.</p>
                </div>
             )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="bg-zinc-900/20 py-4 px-6 border-t border-zinc-900 flex justify-between items-center">
         <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600">
               <Activity className="w-3 h-3" />
               <span>Volatility Engine: ACTIVE</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600">
               <Info className="w-3 h-3" />
               <span>Model: PRO-V2-BETA</span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <button 
              onClick={onViewDetails}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-2"
            >
              <Info className="w-3 h-3" />
              Inspect Fixture
            </button>
            <button 
              onClick={onQueryAgent}
              className="bg-zinc-800 hover:bg-yellow-500 hover:text-black text-zinc-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-zinc-700 hover:border-yellow-500 transition-all flex items-center gap-2 shadow-sm"
            >
              <MessageSquare className="w-3 h-3" />
              Deep Scan
            </button>
         </div>
      </CardFooter>
    </Card>
  );
};
