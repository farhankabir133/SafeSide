import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ChevronRight, Radio, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LiveMatchStripProps {
  matches: any[];
  predictions: Record<string, any>;
  onSelectMatch?: (match: any) => void;
}

export const LiveMatchStrip: React.FC<LiveMatchStripProps> = ({ matches, predictions, onSelectMatch }) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveMatches = matches.filter(m => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status));

  if (liveMatches.length === 0) return null;

  return (
    <section className="relative py-8 overflow-hidden">
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">
              Live Matches
            </h2>
            <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              {liveMatches.length} Active
            </span>
          </div>
          <button
            onClick={() => navigate('/live-analysis')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-yellow-500 hover:text-yellow-400 transition-colors group cursor-pointer"
          >
            View All Live
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Scrolling Strip */}
      <div className="max-w-7xl mx-auto px-4">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x snap-mandatory"
        >
          {liveMatches.map((match) => (
            <LiveMatchMiniCard
              key={match.id}
              match={match}
              prediction={predictions[match.id]}
              onClick={() => {
                if (onSelectMatch) onSelectMatch(match);
                navigate(`/matches/${match.id}`);
              }}
            />
          ))}
        </div>
      </div>

      {/* Gradient fades */}
      <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none z-10" />
    </section>
  );
};

const LiveMatchMiniCard: React.FC<{
  match: any;
  prediction?: any;
  onClick: () => void;
}> = ({ match, prediction, onClick }) => {
  const [prevHome, setPrevHome] = useState(match.score?.fullTime?.home ?? 0);
  const [prevAway, setPrevAway] = useState(match.score?.fullTime?.away ?? 0);
  const [homeFlash, setHomeFlash] = useState(false);
  const [awayFlash, setAwayFlash] = useState(false);

  const currentHome = match.score?.fullTime?.home ?? 0;
  const currentAway = match.score?.fullTime?.away ?? 0;

  useEffect(() => {
    if (currentHome !== prevHome) {
      setHomeFlash(true);
      setPrevHome(currentHome);
      setTimeout(() => setHomeFlash(false), 2000);
    }
  }, [currentHome]);

  useEffect(() => {
    if (currentAway !== prevAway) {
      setAwayFlash(true);
      setPrevAway(currentAway);
      setTimeout(() => setAwayFlash(false), 2000);
    }
  }, [currentAway]);

  const homeProb = prediction?.prediction?.win_probability?.home ?? 45;
  const drawProb = prediction?.prediction?.win_probability?.draw ?? 25;
  const awayProb = prediction?.prediction?.win_probability?.away ?? 30;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="min-w-[320px] snap-start bg-zinc-950 border border-zinc-800 rounded-2xl p-5 cursor-pointer group relative overflow-hidden hover:border-red-500/30 transition-all duration-300"
    >
      {/* Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-red-500/10 via-transparent to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl blur-xl" />

      {/* Live Badge */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-red-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Live</span>
          <span className="text-[9px] font-mono text-zinc-500">{match.minute}'</span>
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
          {match.competition?.name || 'Match'}
        </span>
      </div>

      {/* Teams & Score */}
      <div className="flex items-center justify-between gap-4 relative z-10 mb-4">
        {/* Home */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center p-1.5 flex-shrink-0">
            <img src={match.homeTeam.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" alt="" />
          </div>
          <span className="text-xs font-bold text-zinc-200 truncate">{match.homeTeam.name}</span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn(
            "text-xl font-black font-mono transition-colors duration-300",
            homeFlash ? "text-emerald-400 scale-125" : "text-white"
          )}>
            {currentHome}
          </span>
          <span className="text-zinc-700 font-bold">:</span>
          <span className={cn(
            "text-xl font-black font-mono transition-colors duration-300",
            awayFlash ? "text-emerald-400 scale-125" : "text-white"
          )}>
            {currentAway}
          </span>
        </div>

        {/* Away */}
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
          <span className="text-xs font-bold text-zinc-200 truncate text-right">{match.awayTeam.name}</span>
          <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center p-1.5 flex-shrink-0">
            <img src={match.awayTeam.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" alt="" />
          </div>
        </div>
      </div>

      {/* Mini Probability Bar */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[8px] font-mono font-bold text-zinc-500">{homeProb}%</span>
          <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden flex">
            <div style={{ width: `${homeProb}%` }} className="h-full bg-emerald-500 transition-all duration-500" />
            <div style={{ width: `${drawProb}%` }} className="h-full bg-zinc-700 transition-all duration-500" />
            <div style={{ width: `${awayProb}%` }} className="h-full bg-yellow-500 transition-all duration-500" />
          </div>
          <span className="text-[8px] font-mono font-bold text-zinc-500">{awayProb}%</span>
        </div>
      </div>

      {/* Hover CTA */}
      <div className="flex items-center justify-center gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
        <Zap className="w-3 h-3 text-yellow-500" />
        <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500">Deep Analysis</span>
      </div>
    </motion.div>
  );
};
