import React from 'react';
import { motion } from 'motion/react';
import { Terminal, Shield, Crosshair, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/badge';

interface TacticalBriefingProps {
  analysis: any;
}

export const TacticalBriefing: React.FC<TacticalBriefingProps> = ({ analysis }) => {
  if (!analysis) return null;

  const weights = [
    { label: 'Historical Context', weight: 30, icon: Shield, color: 'text-blue-500' },
    { label: 'Modern Form', weight: 50, icon: Crosshair, color: 'text-emerald-500' },
    { label: 'Human Intelligence', weight: 20, icon: Zap, color: 'text-yellow-500' },
  ];

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-[40px] overflow-hidden">
      <div className="p-8 border-b border-zinc-900 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-black uppercase tracking-widest">Tactical Briefing</h3>
        </div>
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[9px] font-mono text-emerald-500 uppercase font-black uppercase tracking-widest">RAG Engine Stream: ACTIVE</span>
        </div>
      </div>

      <div className="p-10 space-y-10">
        {/* Predictive Weights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {weights.map((w, i) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <w.icon className={cn("w-4 h-4", w.color)} />
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{w.label}</span>
                </div>
                <span className="text-xs font-black font-mono">{w.weight}%</span>
              </div>
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${w.weight}%` }}
                  transition={{ delay: 0.5 + (i * 0.2), duration: 1 }}
                  className={cn("h-full", w.color.replace('text-', 'bg-'))} 
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Reasoning Grid */}
          <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-[32px] space-y-6">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                   <AlertCircle className="w-4 h-4 text-zinc-400" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Node Reason Analysis</p>
             </div>
             <p className="text-sm text-zinc-300 leading-relaxed font-medium">
               {analysis.reasoning_summary}
             </p>
          </div>

          <div className="space-y-6">
             {/* Micro Events */}
             <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest px-2">Micro-Event Anomalies</p>
                {analysis.micro_events?.map((event: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">
                     <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          event.likelihood === 'High' ? 'bg-red-500' : event.likelihood === 'Med' ? 'bg-yellow-500' : 'bg-emerald-500'
                        )} />
                        <span className="text-xs font-black uppercase tracking-tight">{event.type}</span>
                     </div>
                     <Badge variant="outline" className="text-[8px] border-zinc-800 uppercase text-zinc-500">Likelihood: {event.likelihood}</Badge>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Global Warnings */}
        {analysis.prediction?.trap_game_warning && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[32px] flex items-center gap-6">
             <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-black" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-1">Intelligence Alert: Trap Scenario</p>
                <p className="text-sm font-bold text-red-200">{analysis.prediction.trap_game_reason}</p>
             </div>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-zinc-900/50 border-t border-zinc-900 flex items-center justify-center gap-4">
         <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.4em]">Proprietary SafeSide Calculation Engine V4.2.0</span>
      </div>
    </div>
  );
};
