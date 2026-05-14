import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface VolatilityGaugeProps {
  confidence: number;
  marketVolatility: number; // 0-100
  label?: string;
}

export const VolatilityGauge: React.FC<VolatilityGaugeProps> = ({ confidence, marketVolatility, label = "AI Confidence vs Market Volatility" }) => {
  const diff = confidence - marketVolatility;
  const isHighValue = diff > 15;
  const isTrap = diff < -15;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[32px] relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">{label}</h4>
           <p className="text-lg font-black text-white uppercase tracking-tighter">Stability Index</p>
        </div>
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border",
          isHighValue ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" :
          isTrap ? "border-red-500/20 text-red-500 bg-red-500/5" :
          "border-zinc-800 text-zinc-400"
        )}>
          {Math.round(confidence)}
        </div>
      </div>

      <div className="relative h-2 bg-zinc-950 rounded-full overflow-hidden mb-6">
        {/* Market Base */}
        <div 
          className="absolute inset-y-0 left-0 bg-zinc-800 transition-all duration-1000" 
          style={{ width: `${marketVolatility}%` }}
        />
        {/* AI Overlay */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          className={cn(
            "absolute inset-y-0 left-0 h-full transition-all duration-1000 opacity-60",
            isHighValue ? "bg-emerald-500" : isTrap ? "bg-red-500" : "bg-yellow-500"
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Dynamic Confidence</p>
          <p className="text-md font-black text-zinc-100">{confidence}%</p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Market Friction</p>
          <p className="text-md font-black text-zinc-100">{marketVolatility}%</p>
        </div>
      </div>

      {isHighValue && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
            Optimal Edge Detected: Model confidence exceeds market stability.
          </p>
        </div>
      )}
    </div>
  );
};
