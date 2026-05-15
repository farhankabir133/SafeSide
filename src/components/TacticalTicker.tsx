import React from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface TickerItemProps {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

const TickerItem: React.FC<TickerItemProps> = ({ label, value, trend, color }) => (
  <div className="inline-flex items-center gap-2 px-6 border-r border-zinc-800/50 h-full group cursor-default">
    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-zinc-400 transition-colors">{label}</span>
    <span className={cn("text-[10px] font-mono font-bold font-black", color || "text-zinc-300")}>{value}</span>
    {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
    {trend === 'down' && <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />}
  </div>
);

export const TacticalTicker: React.FC<{ matches: any[] }> = ({ matches }) => {
  const liveMatches = matches.filter(m => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status));
  
  return (
    <div className="w-full bg-black border-b border-zinc-900 h-10 overflow-hidden relative z-[60] flex items-center">
      <div className="absolute left-0 top-0 bottom-0 px-4 bg-black flex items-center gap-2 z-10 border-r border-zinc-900">
        <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Live Telemetry</span>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ 
            duration: 30, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="flex whitespace-nowrap items-center h-full pl-[150px]"
        >
          {liveMatches.length > 0 ? (
            liveMatches.map(match => (
              <TickerItem 
                key={match.id}
                label={`${match.homeTeam.name} v ${match.awayTeam.name}`}
                value={`${match.score.fullTime.home}-${match.score.fullTime.away}`}
                color="text-emerald-500"
              />
            ))
          ) : (
             <>
               <TickerItem label="Network Node" value="Stable 14.2ms" trend="up" />
               <TickerItem label="Poisson Alpha" value="0.941" trend="neutral" />
               <TickerItem label="Global Volatility" value="Low" color="text-sky-500" />
               <TickerItem label="Market Entropy" value="-0.04" trend="down" />
               <TickerItem label="Tactical Sync" value="Verified" color="text-emerald-500" />
               {/* Repeat for continuous loop effect */}
               <TickerItem label="Network Node" value="Stable 14.2ms" trend="up" />
               <TickerItem label="Poisson Alpha" value="0.941" trend="neutral" />
               <TickerItem label="Global Volatility" value="Low" color="text-sky-500" />
               <TickerItem label="Market Entropy" value="-0.04" trend="down" />
             </>
          )}
        </motion.div>
      </div>

      <div className="absolute right-0 top-0 bottom-0 px-4 bg-black flex items-center gap-2 z-10 border-l border-zinc-900">
        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Active</span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    </div>
  );
};
