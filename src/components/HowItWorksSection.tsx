import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, Shield, Crosshair, Radio, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    num: '01',
    title: 'Poisson Distribution',
    subtitle: 'Goal Probability Mapping',
    description: 'We model expected goals using Poisson distributions calibrated against 10-match rolling averages for home/away attack and defense indices across 40+ leagues.',
    icon: BarChart3,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    glowColor: 'rgba(234,179,8,0.15)',
    details: ['Joint probability matrices', 'Score density curves', 'Over/Under thresholds']
  },
  {
    num: '02',
    title: 'Neural Risk Filter',
    subtitle: 'Trap Match Detection',
    description: 'Our neural risk shield audits real-world friction: travel fatigue, squad rotation, tactical mismatches, derby tension, and motivation anomalies to suppress false positive signals.',
    icon: Shield,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    glowColor: 'rgba(16,185,129,0.15)',
    details: ['Fatigue indices', 'H2H bias analysis', 'Market trap quarantine']
  },
  {
    num: '03',
    title: 'Kelly Criterion',
    subtitle: 'Optimal Capital Staking',
    description: 'After computing expected value edges, we apply a fractional Kelly (0.2x) staking algorithm that maximizes long-term growth while minimizing drawdown and gambler\'s ruin risk.',
    icon: Crosshair,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    glowColor: 'rgba(14,165,233,0.15)',
    details: ['EV edge computation', '0.2x fraction staking', 'Bankroll protection']
  },
  {
    num: '04',
    title: 'Live Telemetry',
    subtitle: 'Real-Time Recalibration',
    description: 'During live matches, our system processes real-time feeds — momentum shifts, goals, cards, substitutions — recalibrating probability maps on-the-fly to identify live value windows.',
    icon: Radio,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    glowColor: 'rgba(168,85,247,0.15)',
    details: ['SSE live streams', 'Dynamic odds shift', 'Exit hedge signals']
  }
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(234,179,8,0.02),transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Intelligence Protocol</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-4">
            How Safe Side <span className="text-yellow-500">Works</span>
          </h2>
          <p className="text-zinc-500 text-sm md:text-base max-w-2xl mx-auto font-medium leading-relaxed">
            A four-phase intelligence pipeline that transforms raw match data into high-probability tactical insights, verified across multiple independent data sources.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="relative group"
            >
              {/* Connecting Line (hidden on last card) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 -right-3 w-6 z-20">
                  <ChevronRight className="w-5 h-5 text-zinc-800" />
                </div>
              )}

              <div className={cn(
                "relative bg-zinc-950 border rounded-2xl p-6 h-full transition-all duration-300 hover:scale-[1.02]",
                step.borderColor,
                "hover:shadow-[0_0_40px_" + step.glowColor + "]"
              )}>
                {/* Step Number */}
                <div className="flex items-center justify-between mb-5">
                  <span className={cn("font-mono text-xs font-black", step.color)}>{step.num}</span>
                  <div className={cn(step.bgColor, "w-9 h-9 rounded-xl flex items-center justify-center")}>
                    <step.icon className={cn("w-4.5 h-4.5", step.color)} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-black uppercase tracking-tight text-white mb-1">
                  {step.title}
                </h3>
                <p className={cn("text-[10px] font-black uppercase tracking-widest mb-3", step.color)}>
                  {step.subtitle}
                </p>

                {/* Description */}
                <p className="text-[11px] text-zinc-500 leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Details */}
                <div className="space-y-2">
                  {step.details.map((detail, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={cn("w-1 h-1 rounded-full", step.color.replace('text-', 'bg-'))} />
                      <span className="text-[10px] text-zinc-400 font-medium">{detail}</span>
                    </div>
                  ))}
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/[0.02] to-transparent" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
