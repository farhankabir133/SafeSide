import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  BrainCircuit,
  ExternalLink,
  Flame,
  ChevronDown,
  Plus,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MatchAnalysis, formatAIError } from '@/src/services/geminiService';
import { Skeleton } from '@/components/ui/skeleton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { VolatilityGauge } from '@/src/components/CommandCenter/VolatilityGauge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PredictionCardProps {
  match: any;
  analysis: MatchAnalysis;
  onQueryAgent?: () => void;
  onViewDetails?: () => void;
  onRetry?: () => void;
  highlighted?: boolean;
  isAnalyzing?: boolean;
  error?: string | null;
  globalCooldown?: number | null;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ 
  match, 
  analysis, 
  onQueryAgent, 
  onViewDetails, 
  onRetry,
  highlighted,
  isAnalyzing,
  error,
  globalCooldown
}) => {
  const navigate = useNavigate();
  const prediction = analysis?.prediction;
  const risk_assessment = analysis?.risk_assessment || { level: 'Low', primary_risk: 'System calibration', safety_buffer: 'Minimal' };
  const [predictedScore, setPredictedScore] = useState<{ home: number | null, away: number | null }>({ home: null, away: null });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOddsExpanded, setIsOddsExpanded] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!globalCooldown) {
      setRetryCountdown(null);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.ceil((globalCooldown - Date.now()) / 1000);
      setRetryCountdown(remaining > 0 ? remaining : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [globalCooldown]);

  // Sync predicted score from analysis on mount/change
  useEffect(() => {
    if (analysis?.prediction?.scoreline) {
      const parts = analysis.prediction.scoreline.split('-');
      if (parts.length === 2) {
        const h = parseInt(parts[0]);
        const a = parseInt(parts[1]);
        if (!isNaN(h) && !isNaN(a)) {
          setPredictedScore({ home: h, away: a });
        }
      }
    }
  }, [analysis]);

  const homeTeam = match.homeTeam.name;
  const awayTeam = match.awayTeam.name;
  const matchTime = new Date(match.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const adjustScore = (team: 'home' | 'away', delta: number) => {
    setPredictedScore(prev => ({
      ...prev,
      [team]: Math.max(0, (prev[team] ?? 0) + delta)
    }));
  };

  const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(match.status);

  // Track previous scores to animate changes separately
  const prevHomeScore = React.useRef(match.score?.fullTime?.home);
  const prevAwayScore = React.useRef(match.score?.fullTime?.away);
  const [homeChanged, setHomeChanged] = useState(false);
  const [awayChanged, setAwayChanged] = useState(false);

  useEffect(() => {
    if (match.score?.fullTime?.home !== prevHomeScore.current) {
      setHomeChanged(true);
      const timer = setTimeout(() => setHomeChanged(false), 2000);
      prevHomeScore.current = match.score?.fullTime?.home;
      return () => clearTimeout(timer);
    }
  }, [match.score?.fullTime?.home]);

  useEffect(() => {
    if (match.score?.fullTime?.away !== prevAwayScore.current) {
      setAwayChanged(true);
      const timer = setTimeout(() => setAwayChanged(false), 2000);
      prevAwayScore.current = match.score?.fullTime?.away;
      return () => clearTimeout(timer);
    }
  }, [match.score?.fullTime?.away]);

  return (
    <Card className={cn(
      "bg-[#1a1a1a] border border-zinc-900 shadow-2xl text-zinc-100 overflow-hidden rounded-[32px] group/card transition-all duration-500 relative",
      highlighted && "ring-2 ring-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.3)] scale-[1.03] z-50",
      highlighted && "animate-pulse-subtle",
      isAnalyzing && "opacity-80"
    )}>
      {/* Tactical Telemetry Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center overflow-hidden">
        <div className="grid grid-cols-10 gap-4 w-full h-full rotate-12">
          {Array(100).fill(0).map((_, i) => (
            <div key={i} className="text-[6px] font-mono whitespace-nowrap">
              {Math.random().toString(16).substring(2, 10).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-zinc-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative mb-4">
              <BrainCircuit className="w-10 h-10 text-yellow-500 animate-pulse" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-t border-yellow-500/40 rounded-full scale-150"
              />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-1">Tactical Scan In Progress</p>
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce" />
            </div>
          </motion.div>
        )}

        {error && !isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 bg-red-950/20 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center border border-red-500/30 rounded-[32px]"
          >
            <div className="bg-red-500/20 p-3 rounded-full mb-3">
               <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-2">Neural Link Interrupted</p>
            <p className="text-[10px] text-zinc-400 font-medium mb-4 line-clamp-2 px-4">{formatAIError(error)}</p>
            <Button 
              size="sm" 
              variant="outline" 
              disabled={retryCountdown !== null}
              className="h-8 text-[9px] font-black uppercase tracking-widest border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                onRetry?.();
              }}
            >
              {retryCountdown ? `Retry in ${retryCountdown}s` : "Retry Sync"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {highlighted && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-yellow-500/10 pointer-events-none z-0"
          />
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20"
          >
            <Badge className={cn(
              "text-black border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest shadow-lg",
              isLive ? "bg-red-500 animate-pulse" : "bg-yellow-500"
            )}>
              {isLive ? "Live Signal Active" : "Match Detected"}
            </Badge>
          </motion.div>
        </>
      )}
      <div className="p-4 md:p-6">
        {/* Top Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (match.competition?.slug) {
                  navigate(`/leagues/${match.competition.slug}`);
                }
              }}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-yellow-500 transition-colors"
            >
              {match.competition?.name || 'Unknown Zone'}
            </button>
            <span className="text-zinc-800 text-[10px]">•</span>
            <span className="text-zinc-500 text-[10px] font-mono tracking-tighter">{matchTime}</span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.();
            }}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Match Center */}
        <div className="flex items-center justify-between gap-4 mb-8">
          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#111] flex items-center justify-center p-3">
              <img src={match.homeTeam.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-sm font-semibold text-center leading-tight max-w-[100px] truncate">{homeTeam}</span>
              <Badge variant="outline" className={cn(
                "text-[7px] px-1.5 py-0 h-3.5 font-black uppercase tracking-widest border-none",
                risk_assessment.level.toLowerCase() === 'high' ? "bg-red-500/20 text-red-400" :
                risk_assessment.level.toLowerCase() === 'medium' ? "bg-yellow-500/20 text-yellow-400" :
                "bg-emerald-500/20 text-emerald-400"
              )}>
                {risk_assessment.level}
              </Badge>
            </div>
          </div>

          {/* Predictor Widget or Live Score */}
          <div className="flex flex-col items-center gap-4">
            {isLive ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-3">
                  <motion.span 
                    animate={homeChanged ? { 
                      scale: [1, 1.15, 1],
                      y: [0, -4, 0],
                      color: ["#ffffff", "#eab308", "#ffffff"],
                    } : { scale: 1, y: 0 }}
                    transition={{ duration: 1, ease: "circOut" }}
                    className="text-3xl font-black font-mono tracking-tighter text-white"
                  >
                    {match.score?.fullTime?.home ?? 0}
                  </motion.span>
                  <span className="text-zinc-600 font-bold text-sm">:</span>
                  <motion.span 
                    animate={awayChanged ? { 
                      scale: [1, 1.15, 1],
                      y: [0, -4, 0],
                      color: ["#ffffff", "#eab308", "#ffffff"],
                    } : { scale: 1, y: 0 }}
                    transition={{ duration: 1, ease: "circOut" }}
                    className="text-3xl font-black font-mono tracking-tighter text-white"
                  >
                    {match.score?.fullTime?.away ?? 0}
                  </motion.span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </div>
                  <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                     <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest">
                       {match.minute}'
                     </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-6">
                  {/* Home Score Adjustment */}
                  <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                    <button 
                      onClick={(e) => { e.stopPropagation(); adjustScore('home', -1); }}
                      className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 hover:text-white text-zinc-400 transition-all active:scale-95"
                      title="Decrease Home Score"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-8 text-center font-black font-mono text-xl text-yellow-500">
                      {predictedScore.home !== null ? predictedScore.home : '?'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); adjustScore('home', 1); }}
                      className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 hover:text-white text-zinc-400 transition-all active:scale-95"
                      title="Increase Home Score"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-zinc-700 font-black text-xl">:</span>

                  {/* Away Score Adjustment */}
                  <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                    <button 
                      onClick={(e) => { e.stopPropagation(); adjustScore('away', -1); }}
                      className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 hover:text-white text-zinc-400 transition-all active:scale-95"
                      title="Decrease Away Score"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-8 text-center font-black font-mono text-xl text-yellow-500">
                      {predictedScore.away !== null ? predictedScore.away : '?'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); adjustScore('away', 1); }}
                      className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 hover:text-white text-zinc-400 transition-all active:scale-95"
                      title="Increase Away Score"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                   <div className="text-[10px] text-emerald-500/80 font-black uppercase tracking-widest flex items-center gap-1.5">
                      <Target className="w-3 h-3" />
                      Tactical Override Active
                   </div>
                </div>
              </div>
            )}
            {!isLive && (predictedScore.home !== null && predictedScore.away !== null ? (
               <button 
                 className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-[9px] font-black uppercase px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:bg-emerald-500 hover:text-black transition-all animate-in fade-in zoom-in"
                 onClick={(e) => {
                   e.stopPropagation();
                   // TODO: Implement persistent locking if needed
                 }}
               >
                 Lock Prediction
               </button>
            ) : (
               <span className="text-[10px] text-zinc-500 font-medium tracking-tight">Manual scoring unavailable</span>
            ))}
          </div>

          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#111] flex items-center justify-center p-3">
              <img src={match.awayTeam.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-sm font-semibold text-center leading-tight max-w-[100px] truncate">{awayTeam}</span>
              <Badge variant="outline" className={cn(
                "text-[7px] px-1.5 py-0 h-3.5 font-black uppercase tracking-widest border-none",
                risk_assessment.level.toLowerCase() === 'high' ? "bg-red-500/20 text-red-400" :
                risk_assessment.level.toLowerCase() === 'medium' ? "bg-yellow-500/20 text-yellow-400" :
                "bg-emerald-500/20 text-emerald-400"
              )}>
                {risk_assessment.level}
              </Badge>
            </div>
          </div>
        </div>

        {/* Probabilities Section */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#999] text-[10px] font-bold">W</span>
            <span className="text-white text-[11px] font-bold">{prediction?.win_probability?.home ?? 0}%</span>
          </div>
          
          <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden flex shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${prediction?.win_probability?.home ?? 0}%` }}
              className="h-full bg-emerald-500" 
            />
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${prediction?.win_probability?.draw ?? 0}%` }}
              className="h-full bg-zinc-700" 
            />
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${prediction?.win_probability?.away ?? 0}%` }}
              className="h-full bg-yellow-500" 
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white text-[11px] font-bold">{prediction?.win_probability?.away ?? 0}%</span>
            <span className="text-[#999] text-[10px] font-bold">W</span>
          </div>
        </div>
      </div>

      {/* Expandable Analysis */}
      <div className="border-t border-[#2a2a2a]">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-3 px-6 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-3.5 h-3.5" />
            AI Intelligence Audit
          </div>
          <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 pt-2">
                <Tabs defaultValue="analysis" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 h-8 bg-black/40 border border-zinc-900 rounded-lg mb-4 p-1">
                    <TabsTrigger value="analysis" className="text-[7.5px] font-black uppercase tracking-tight data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-500">Audit</TabsTrigger>
                    <TabsTrigger value="tactical_insights" className="text-[7.5px] font-black uppercase tracking-tight data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-500">Insights</TabsTrigger>
                    <TabsTrigger value="tactical" className="text-[7.5px] font-black uppercase tracking-tight data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-500">Tactics</TabsTrigger>
                    <TabsTrigger value="lineups" className="text-[7.5px] font-black uppercase tracking-tight data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-500">Lineups</TabsTrigger>
                  </TabsList>

                  <TabsContent value="analysis" className="space-y-4 mt-0">
                    <div className="p-4 bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-800/50 group-hover:border-yellow-500/20 transition-colors relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-5">
                         <Shield className="w-8 h-8" />
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-medium relative z-10">
                        <span className="text-yellow-500 font-black uppercase mr-2 tracking-widest text-[9px]">Decision Summary:</span>
                        {analysis.reasoning_summary}
                      </p>
                    </div>

                    <div className="bg-[#111] p-4 rounded-2xl border border-zinc-900 overflow-hidden relative group/conf transition-all hover:border-zinc-800">
                      <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full animate-pulse",
                              (prediction?.confidence_score ?? 0) > 70 ? "bg-emerald-500" :
                              (prediction?.confidence_score ?? 0) > 40 ? "bg-yellow-500" : "bg-red-500"
                            )} />
                            <p className="text-[9px] uppercase font-black text-zinc-500 tracking-widest">Model Confidence Index</p>
                         </div>
                         <span className={cn(
                           "text-[11px] font-black font-mono",
                           (prediction?.confidence_score ?? 0) > 70 ? "text-emerald-500" :
                           (prediction?.confidence_score ?? 0) > 40 ? "text-yellow-500" : "text-red-500"
                         )}>
                           {(prediction?.confidence_score ?? 0).toFixed(1)}%
                         </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${prediction?.confidence_score ?? 0}%` }}
                           transition={{ duration: 1.5, ease: "circOut" }}
                           className={cn(
                             "h-full rounded-full relative transition-colors duration-700",
                             (prediction?.confidence_score ?? 0) > 70 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" :
                             (prediction?.confidence_score ?? 0) > 40 ? "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : 
                             "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                           )}
                         >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                         </motion.div>
                      </div>
                      <div className="mt-2 flex justify-between">
                         <span className="text-[7px] font-black text-zinc-700 uppercase">Speculative</span>
                         <span className="text-[7px] font-black text-zinc-700 uppercase">Authoritative</span>
                      </div>
                    </div>

                       <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#111] p-3 rounded-xl border border-zinc-900">
                           <p className="text-[9px] uppercase font-black text-zinc-600 mb-1">Expected xG</p>
                           <p className="text-sm font-bold">{prediction?.expected_goals?.home ?? '?'} - {prediction?.expected_goals?.away ?? '?'}</p>
                        </div>
                        <div className="bg-[#111] p-3 rounded-xl border border-zinc-900">
                           <p className="text-[9px] uppercase font-black text-zinc-600 mb-1">AI Scoreline</p>
                           <p className="text-sm font-bold text-yellow-500">{prediction?.scoreline ?? 'N/A'}</p>
                        </div>
                     </div>

                    <div className="p-5 bg-black/40 rounded-3xl border border-zinc-800/50 relative overflow-hidden group/risk transition-all hover:border-yellow-500/30">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/risk:opacity-30 group-hover/risk:scale-110 transition-all duration-500">
                        <AlertTriangle className={cn(
                          "w-6 h-6",
                          risk_assessment.level.toLowerCase() === 'high' ? "text-red-500" :
                          risk_assessment.level.toLowerCase() === 'medium' ? "text-yellow-500" :
                          "text-emerald-500"
                        )} />
                      </div>
                      
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-6 h-6 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                          <ShieldCheck className="w-3.5 h-3.5 text-yellow-500" />
                        </div>
                        <h5 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Tactical Risk Audit</h5>
                      </div>

                      <div className="space-y-5">
                        <div className="relative pl-4 border-l-2 border-red-500/20 group-hover/risk:border-red-500/40 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                            <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Primary Operational Risk</p>
                          </div>
                          <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                            <p className="text-[12px] text-zinc-300 font-medium leading-relaxed italic font-mono uppercase tracking-tight">
                              {"> "} {risk_assessment.primary_risk}
                            </p>
                          </div>
                        </div>

                        <div className="relative pl-4 border-l-2 border-emerald-500/20 group-hover/risk:border-emerald-500/40 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Tactical Safety Buffer</p>
                          </div>
                          <div className="inline-flex items-center gap-3 bg-emerald-500/5 px-4 py-2 rounded-full border border-emerald-500/20">
                            <Activity className="w-3 h-3 text-emerald-500" />
                            <p className="text-[13px] text-emerald-400 font-black font-mono tracking-tighter">
                              {risk_assessment.safety_buffer}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Decoded background noise */}
                      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-yellow-500/5 blur-3xl rounded-full" />
                    </div>
                  </TabsContent>

                  <TabsContent value="tactical_insights" className="mt-0">
                    <div className="p-5 bg-black/40 rounded-3xl border border-zinc-800/50 relative overflow-hidden group/insights transition-all hover:border-yellow-500/30">
                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/insights:opacity-30 group-hover/insights:scale-110 transition-all duration-500">
                          <Target className="w-6 h-6 text-yellow-500" />
                       </div>
                       
                       <div className="flex items-center gap-2 mb-5">
                          <div className="w-6 h-6 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                             <Target className="w-3.5 h-3.5 text-yellow-500" />
                          </div>
                          <h5 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Tactical Insights</h5>
                       </div>

                       {analysis.tactical_insights && analysis.tactical_insights.length > 0 ? (
                         <ul className="space-y-4">
                            {analysis.tactical_insights.map((insight, idx) => (
                               <motion.li 
                                 key={idx}
                                 initial={{ opacity: 0, x: -10 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 transition={{ delay: idx * 0.1 }}
                                 className="flex items-start gap-3 group/item border-l border-zinc-800 pl-4"
                               >
                                  <span className="text-yellow-500 font-bold shrink-0 mt-0.5">•</span>
                                  <p className="text-[11px] text-zinc-400 font-medium leading-relaxed group-hover/item:text-zinc-200 transition-colors">
                                     {insight}
                                  </p>
                               </motion.li>
                            ))}
                         </ul>
                       ) : (
                         <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 opacity-50">
                            <Target className="w-8 h-8 text-zinc-700" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Insights Node Offline</p>
                         </div>
                       )}
                    </div>
                  </TabsContent>

                  <TabsContent value="tactical" className="mt-0">
                    <div className="p-5 bg-black/40 rounded-3xl border border-zinc-800/50 relative overflow-hidden group/tactical transition-all hover:border-yellow-500/30">
                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/tactical:opacity-30 group-hover/tactical:scale-110 transition-all duration-500">
                          <Zap className="w-6 h-6 text-yellow-500" />
                       </div>
                       
                       <div className="flex items-center gap-2 mb-5">
                          <div className="w-6 h-6 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                             <BrainCircuit className="w-3.5 h-3.5 text-yellow-500" />
                          </div>
                          <h5 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Tactical Directives</h5>
                       </div>

                       {analysis.micro_events && analysis.micro_events.length > 0 ? (
                         <div className="space-y-3">
                            {analysis.micro_events.map((event, idx) => (
                               <motion.div 
                                 key={idx}
                                 initial={{ opacity: 0, y: 5 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ delay: idx * 0.1 }}
                                 className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800 group-hover/tactical:border-zinc-700/50 transition-all"
                               >
                                  <div className="flex flex-col gap-0.5">
                                     <span className="text-[10px] font-black text-white uppercase tracking-tight">{event.type}</span>
                                     <span className="text-[9px] text-zinc-500 leading-tight line-clamp-1">{event.reason}</span>
                                  </div>
                                  <Badge className={cn(
                                    "text-[7px] font-black uppercase px-2 h-4",
                                    event.likelihood === 'High' ? "bg-emerald-500/20 text-emerald-500" :
                                    event.likelihood === 'Med' ? "bg-yellow-500/20 text-yellow-400" :
                                    "bg-red-500/20 text-red-400"
                                  )}>
                                    {event.likelihood}
                                  </Badge>
                               </motion.div>
                            ))}
                         </div>
                       ) : (
                         <div className="text-center py-8 opacity-50">
                            <p className="text-[10px]">No micro-directives available.</p>
                         </div>
                       )}
                       
                       <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-yellow-500/5 blur-3xl rounded-full" />
                    </div>
                  </TabsContent>

                  <TabsContent value="lineups" className="mt-0">
                    {analysis.predicted_lineups ? (
                      <div className="grid grid-cols-2 gap-4">
                        {/* Home Lineup */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                            <span className="text-[9px] font-black uppercase text-zinc-500">HOME</span>
                            <Badge variant="outline" className="text-[8px] border-zinc-800 text-zinc-400">{analysis.predicted_lineups.home.formation}</Badge>
                          </div>
                          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {analysis.predicted_lineups.home.starting_xi.map((player, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[10px] bg-zinc-900/30 p-1.5 rounded border border-transparent hover:border-zinc-800 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-mono text-zinc-600 w-4 uppercase">{player.position}</span>
                                  <span className={cn("font-medium", player.is_key_player && "text-yellow-500")}>{player.name}</span>
                                </div>
                                {player.is_key_player && <Zap className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Away Lineup */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                            <span className="text-[9px] font-black uppercase text-zinc-500">AWAY</span>
                            <Badge variant="outline" className="text-[8px] border-zinc-800 text-zinc-400">{analysis.predicted_lineups.away.formation}</Badge>
                          </div>
                          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {analysis.predicted_lineups.away.starting_xi.map((player, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[10px] bg-zinc-900/30 p-1.5 rounded border border-transparent hover:border-zinc-800 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-mono text-zinc-600 w-4 uppercase">{player.position}</span>
                                  <span className={cn("font-medium", player.is_key_player && "text-yellow-500")}>{player.name}</span>
                                </div>
                                {player.is_key_player && <Zap className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 opacity-50">
                        <Shield className="w-8 h-8 text-zinc-700" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Lineup data unavailable</p>
                        <p className="text-[9px] text-zinc-700 max-w-[180px]">Re-run tactical analysis to fetch predicted starting XI insights.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Collapsible Bookmaker Odds Section */}
                <div className="mt-4 border-t border-zinc-900 pt-4">
                  <button 
                    onClick={() => setIsOddsExpanded(!isOddsExpanded)}
                    className="w-full flex items-center justify-between group/odds-btn"
                  >
                    <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover/odds-btn:text-yellow-500 transition-colors">
                          <BarChart3 className="w-3 h-3" />
                       </div>
                       <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover/odds-btn:text-zinc-300">Live Market Aggregator</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 transition-all",
                      isOddsExpanded && "rotate-180 text-yellow-500"
                    )}>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOddsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-4">
                          {analysis.odds_data && analysis.odds_data.length > 0 ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-5 gap-2 px-2 pb-1 border-b border-zinc-900/50">
                                 <div className="col-span-2 text-[7px] font-black uppercase text-zinc-700">Counterparty</div>
                                 <div className="text-[7px] font-black uppercase text-zinc-700 text-center">H</div>
                                 <div className="text-[7px] font-black uppercase text-zinc-700 text-center">D</div>
                                 <div className="text-[7px] font-black uppercase text-zinc-700 text-center">A</div>
                              </div>
                              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                 {analysis.odds_data.map((odd, idx) => (
                                   <motion.div 
                                     key={idx}
                                     initial={{ opacity: 0, y: 5 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     transition={{ delay: idx * 0.05 }}
                                     className="grid grid-cols-5 gap-2 items-center p-2.5 bg-zinc-950/40 rounded-xl border border-zinc-900/50 hover:bg-zinc-900/40 hover:border-zinc-800 transition-all group/odd"
                                   >
                                      <div className="col-span-2 flex items-center gap-2">
                                         <div className="w-1 h-4 bg-zinc-800 rounded-full group-hover/odd:bg-yellow-500/30 transition-colors" />
                                         <span className="text-[10px] font-bold text-zinc-400 group-hover/odd:text-zinc-200 transition-colors">{odd.bookmaker}</span>
                                      </div>
                                      <div className="text-[10px] font-mono font-black text-center text-white tabular-nums">{(odd.home_win ?? 0).toFixed(2)}</div>
                                      <div className="text-[10px] font-mono font-bold text-center text-zinc-600 tabular-nums">{(odd.draw ?? 0).toFixed(2)}</div>
                                      <div className="text-[10px] font-mono font-black text-center text-white tabular-nums">{(odd.away_win ?? 0).toFixed(2)}</div>
                                      
                                      {/* Market Sentiment Pulse */}
                                      <div className="col-span-5 flex justify-between items-center mt-1 pt-1 border-t border-zinc-900/30 opacity-0 group-hover/odd:opacity-100 transition-opacity">
                                         <span className="text-[7px] font-black uppercase text-zinc-700">Sentiment Gauge</span>
                                         <div className="flex items-center gap-1.5">
                                            {odd.market_movement === 'up' ? (
                                              <div className="flex items-center gap-1">
                                                <TrendingUp className="w-2 h-2 text-emerald-500" />
                                                <span className="text-[7px] font-black text-emerald-500 uppercase">Inflating</span>
                                              </div>
                                            ) : odd.market_movement === 'down' ? (
                                              <div className="flex items-center gap-1">
                                                <TrendingUp className="w-2 h-2 text-red-500 rotate-180" />
                                                <span className="text-[7px] font-black text-red-500 uppercase">Deflating</span>
                                              </div>
                                            ) : (
                                              <span className="text-[7px] font-black text-zinc-700 uppercase">Stationary</span>
                                            )}
                                         </div>
                                      </div>
                                   </motion.div>
                                 ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-zinc-950/30 border border-zinc-900 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3">
                              <BarChart3 className="w-8 h-8 text-zinc-800" />
                              <div className="text-center">
                                 <p className="text-[9px] font-black uppercase text-zinc-700 tracking-widest mb-1">Zero Market Depth</p>
                                 <p className="text-[8px] text-zinc-800 max-w-[150px]">Market liquidity has not reached the minimum threshold for neural aggregation.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-center gap-3 mt-6">
                    <button 
                      onClick={onQueryAgent}
                      className="text-[10px] font-black uppercase text-zinc-500 hover:text-yellow-500 flex items-center gap-2 transition-colors"
                    >
                       <MessageSquare className="w-3.5 h-3.5" />
                       Ask Agent
                    </button>
                    <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                    <button 
                      onClick={onViewDetails}
                      className="text-[10px] font-black uppercase text-zinc-500 hover:text-white flex items-center gap-2 transition-colors"
                    >
                       <BarChart3 className="w-3.5 h-3.5" />
                       Full Matrix
                    </button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};
