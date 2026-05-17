import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/badge';

interface VolatilityGaugeProps {
  confidence: number;
  marketVolatility: number; // 0-100
  label?: string;
}

export const VolatilityGauge: React.FC<VolatilityGaugeProps> = ({ confidence, marketVolatility, label = "AI Stability Index" }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  return (
    <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-[48px] relative overflow-hidden group">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(234,179,8,0.1),transparent)]" />
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-full flex justify-between items-start mb-8">
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-1">{label}</p>
              <h4 className="text-xl font-black uppercase tracking-tighter">Tactical Stability</h4>
           </div>
           <Badge className="bg-zinc-900 text-zinc-500 border-zinc-800 font-mono text-[9px] py-1 px-3">
              NODE: STABLE
           </Badge>
        </div>

        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform">
            {/* Background Track */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-zinc-900"
            />
            {/* Market Volatility Pulse */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${(marketVolatility / 100) * circumference} ${circumference}`}
              fill="transparent"
              className="text-zinc-700 opacity-40"
            />
            {/* Primary Confidence Gauge */}
            <motion.circle
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 2, ease: "easeOut" }}
              cx="96"
              cy="96"
              r={radius}
              stroke="url(#gaugeGradient)"
              strokeWidth="12"
              strokeLinecap="round"
              fill="transparent"
              style={{ 
                strokeDasharray: circumference,
                filter: 'drop-shadow(0 0 8px rgba(234,179,8,0.5))'
              }}
            />
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
             <motion.span 
               initial={{ opacity: 0, scale: 0.5 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-5xl font-black tracking-tighter"
             >
               {Math.round(confidence)}
             </motion.span>
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Conf. Index</span>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-4 mt-10 pt-8 border-t border-zinc-900">
           <div className="space-y-1">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                 <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Confidence</p>
              </div>
              <p className="text-lg font-black text-white font-mono">{confidence}%</p>
           </div>
           <div className="space-y-1 text-right">
              <div className="flex items-center justify-end gap-2">
                 <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Market Friction</p>
                 <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              </div>
              <p className="text-lg font-black text-white font-mono">{marketVolatility}%</p>
           </div>
        </div>
      </div>
    </div>
  );
};
