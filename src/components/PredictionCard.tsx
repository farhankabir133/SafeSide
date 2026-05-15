import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
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
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MatchAnalysis } from '@/src/services/geminiService';
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
  isFlashing?: boolean;
  highlighted?: boolean;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ match, analysis, onQueryAgent, onViewDetails, isFlashing, highlighted }) => {
  const navigate = useNavigate();
  const { prediction, risk_assessment } = analysis;
  const [predictedScore, setPredictedScore] = useState<{ home: number | null, away: number | null }>({ home: null, away: null });
  const [isExpanded, setIsExpanded] = useState(false);

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
  const isPending = prediction.safe_side === 'PENDING SCAN';

  return (
    <Card className={cn(
      "bg-[#1a1a1a] border border-zinc-900 shadow-2xl text-zinc-100 overflow-hidden rounded-[32px] group/card transition-all duration-500 relative",
      highlighted && "ring-2 ring-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.3)] scale-[1.03] z-50",
      highlighted && "animate-pulse-subtle",
      isPending && "opacity-80"
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

      {isPending && (
        <div className="absolute inset-0 z-30 bg-zinc-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
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
        </div>
      )}

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
                  <span className="text-3xl font-black font-mono tracking-tighter text-white">
                    {match.score?.fullTime?.home ?? 0}
                  </span>
                  <span className="text-zinc-600 font-bold text-sm">:</span>
                  <span className="text-3xl font-black font-mono tracking-tighter text-white">
                    {match.score?.fullTime?.away ?? 0}
                  </span>
                </div>
                <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                   <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest animate-pulse">
                     {match.minute}'
                   </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => adjustScore('home', 1)}
                    className="w-10 h-8 flex items-center justify-center bg-[#2a2a2a] rounded-t-md hover:bg-[#333] text-zinc-400"
                  >
                    <span className="text-lg font-bold">+</span>
                  </button>
                  <div className="w-10 h-10 flex items-center justify-center bg-[#333] text-zinc-100 font-bold text-xl">
                    {predictedScore.home !== null ? predictedScore.home : '?'}
                  </div>
                  <button 
                    onClick={() => adjustScore('home', -1)}
                    className="w-10 h-8 flex items-center justify-center bg-[#2a2a2a] rounded-b-md hover:bg-[#333] text-zinc-400"
                  >
                    <span className="text-lg font-bold">−</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => adjustScore('away', 1)}
                    className="w-10 h-8 flex items-center justify-center bg-[#2a2a2a] rounded-t-md hover:bg-[#333] text-zinc-400"
                  >
                    <span className="text-lg font-bold">+</span>
                  </button>
                  <div className="w-10 h-10 flex items-center justify-center bg-[#333] text-zinc-100 font-bold text-xl">
                    {predictedScore.away !== null ? predictedScore.away : '?'}
                  </div>
                  <button 
                    onClick={() => adjustScore('away', -1)}
                    className="w-10 h-8 flex items-center justify-center bg-[#2a2a2a] rounded-b-md hover:bg-[#333] text-zinc-400"
                  >
                    <span className="text-lg font-bold">−</span>
                  </button>
                </div>
              </div>
            )}
            {!isLive && (predictedScore.home !== null && predictedScore.away !== null ? (
               <button 
                 className="bg-emerald-500 text-black text-[9px] font-black uppercase px-3 py-1 rounded shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-in fade-in zoom-in"
                 onClick={(e) => {
                   e.stopPropagation();
                   // TODO: Implement save logic
                 }}
               >
                 Lock Prediction
               </button>
            ) : (
               <span className="text-[10px] text-zinc-500 font-medium tracking-tight">Win probability</span>
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
            <span className="text-white text-[11px] font-bold">{prediction.win_probability.home}%</span>
          </div>
          
          <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden flex shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${prediction.win_probability.home}%` }}
              className="h-full bg-emerald-500" 
            />
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${prediction.win_probability.draw}%` }}
              className="h-full bg-zinc-700" 
            />
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${prediction.win_probability.away}%` }}
              className="h-full bg-yellow-500" 
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white text-[11px] font-bold">{prediction.win_probability.away}%</span>
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
              <div className="px-6 pb-6 pt-2 space-y-4">
                 <div className="p-4 bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-800/50 group-hover:border-yellow-500/20 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                       <Shield className="w-8 h-8" />
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-medium relative z-10">
                      <span className="text-yellow-500 font-black uppercase mr-2 tracking-widest text-[9px]">Decision Summary:</span>
                      {analysis.reasoning_summary}
                    </p>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#111] p-3 rounded-xl border border-zinc-900">
                       <p className="text-[9px] uppercase font-black text-zinc-600 mb-1">Expected xG</p>
                       <p className="text-sm font-bold">{prediction.expected_goals.home} - {prediction.expected_goals.away}</p>
                    </div>
                    <div className="bg-[#111] p-3 rounded-xl border border-zinc-900">
                       <p className="text-[9px] uppercase font-black text-zinc-600 mb-1">AI Scoreline</p>
                       <p className="text-sm font-bold text-yellow-500">{prediction.scoreline}</p>
                    </div>
                 </div>
                 <div className="flex items-center justify-center gap-3">
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
