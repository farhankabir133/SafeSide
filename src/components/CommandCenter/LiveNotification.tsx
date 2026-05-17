import React from 'react';
import { Target, Zap, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface LiveNotificationProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute?: number;
  isGoal?: boolean;
}

export const LiveNotification: React.FC<LiveNotificationProps> = ({ 
  homeTeam, 
  awayTeam, 
  homeScore, 
  awayScore, 
  minute,
  isGoal 
}) => {
  return (
    <div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-900 rounded-[32px] p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] min-w-[320px] relative overflow-hidden group">
      {/* Glitch Effect Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent animate-shimmer" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isGoal ? "bg-red-500 animate-ping" : "bg-emerald-500 animate-pulse"
          )} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            {isGoal ? "GOAL DETECTED" : "SCORE UPDATE"}
          </span>
        </div>
        {minute && (
          <span className="text-[9px] font-mono font-black text-zinc-700 bg-zinc-900 px-2 py-0.5 rounded">
            {minute}'
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-6 relative z-10">
        <div className="flex-1 text-right">
          <p className="text-sm font-black uppercase tracking-tighter truncate">{homeTeam}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-900/50 px-5 py-2 rounded-2xl border border-zinc-800">
          <span className={cn("text-2xl font-black font-mono", isGoal ? "text-yellow-500" : "text-white")}>
            {homeScore}
          </span>
          <span className="text-zinc-700 font-bold">:</span>
          <span className={cn("text-2xl font-black font-mono", isGoal ? "text-yellow-500" : "text-white")}>
            {awayScore}
          </span>
        </div>

        <div className="flex-1 text-left">
          <p className="text-sm font-black uppercase tracking-tighter truncate">{awayTeam}</p>
        </div>
      </div>

      {isGoal && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500">Node Syncing New Expected Result</span>
        </motion.div>
      )}

      {/* Decorative background scanline */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-4 animate-scanline pointer-events-none opacity-20" />
    </div>
  );
};
