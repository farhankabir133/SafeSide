import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Target, Activity, Shield, TrendingUp, Globe, Zap, BarChart3, Users } from 'lucide-react';

interface CounterProps {
  end: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  isInView: boolean;
}

const AnimatedCounter: React.FC<CounterProps> = ({ end, suffix = '', prefix = '', decimals = 0, duration = 2, isInView }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(eased * end);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, end, duration]);

  return (
    <span className="tabular-nums">
      {prefix}{decimals > 0 ? count.toFixed(decimals) : Math.round(count)}{suffix}
    </span>
  );
};

const stats = [
  {
    icon: Target,
    label: 'Model Accuracy',
    value: 94.2,
    suffix: '%',
    decimals: 1,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    glowColor: 'shadow-[0_0_40px_rgba(234,179,8,0.08)]',
    description: 'Cross-verified prediction hit rate'
  },
  {
    icon: Globe,
    label: 'Leagues Tracked',
    value: 42,
    suffix: '+',
    decimals: 0,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    glowColor: 'shadow-[0_0_40px_rgba(16,185,129,0.08)]',
    description: 'International football coverage'
  },
  {
    icon: Activity,
    label: 'Neural Nodes',
    value: 2841,
    suffix: '',
    prefix: '',
    decimals: 0,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    glowColor: 'shadow-[0_0_40px_rgba(14,165,233,0.08)]',
    description: 'Active data processing endpoints'
  },
  {
    icon: TrendingUp,
    label: 'Avg. Yield',
    value: 14.5,
    suffix: '%',
    prefix: '+',
    decimals: 1,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    glowColor: 'shadow-[0_0_40px_rgba(168,85,247,0.08)]',
    description: 'Rolling 90-day portfolio return'
  }
];

export const StatsCounters: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section ref={ref} className="py-16 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.03),transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
              className={`relative bg-zinc-950 border ${stat.borderColor} rounded-2xl p-6 group hover:scale-[1.02] transition-all duration-300 ${stat.glowColor}`}
            >
              {/* Icon */}
              <div className={`${stat.bgColor} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>

              {/* Counter */}
              <div className={`text-3xl lg:text-4xl font-black font-mono ${stat.color} mb-1`}>
                <AnimatedCounter
                  end={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix || ''}
                  decimals={stat.decimals}
                  isInView={isInView}
                />
              </div>

              {/* Label */}
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
                {stat.label}
              </div>

              {/* Description */}
              <p className="text-[10px] text-zinc-600 font-medium leading-tight">
                {stat.description}
              </p>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/[0.02] to-transparent" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
