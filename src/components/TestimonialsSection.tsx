import React from 'react';
import { motion } from 'motion/react';
import { Star, Quote, TrendingUp, Shield, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    name: 'Marcus L.',
    role: 'Professional Analyst',
    quote: 'Safe Side\'s Poisson-Kelly pipeline identified a +12% EV edge on a Champions League draw that every other model missed. The trap match filter alone saves me from 2-3 bad plays per week.',
    metric: '+18.3%',
    metricLabel: 'ROI Since Joining',
    avatar: 'M',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  {
    name: 'Sarah K.',
    role: 'Data Strategist',
    quote: 'The live telemetry recalibration is genuinely impressive. During the Clasico last month, it flagged a momentum shift 8 minutes before the equalizer. I\'ve never seen anything this responsive.',
    metric: '94.1%',
    metricLabel: 'Hit Rate This Season',
    avatar: 'S',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  {
    name: 'David R.',
    role: 'Quantitative Researcher',
    quote: 'As someone who builds pricing models, I can confirm the Kelly fractional staking implementation is mathematically sound. The 0.2x fraction keeps drawdowns manageable while still compounding.',
    metric: '340+',
    metricLabel: 'Matches Analyzed',
    avatar: 'D',
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20'
  }
];

const performanceCards = [
  { icon: TrendingUp, label: 'Avg. Monthly Return', value: '+4.2%', color: 'text-emerald-500' },
  { icon: Shield, label: 'Max Drawdown', value: '-3.1%', color: 'text-yellow-500' },
  { icon: Target, label: 'Sharpe Ratio', value: '2.41', color: 'text-sky-500' },
];

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.02),transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 mb-6">
            <Star className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Verified Performance</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-4">
            Trusted by <span className="text-emerald-500">Analysts</span>
          </h2>
          <p className="text-zinc-500 text-sm max-w-xl mx-auto font-medium">
            Hear from professional analysts and quantitative researchers who rely on Safe Side for data-driven match intelligence.
          </p>
        </motion.div>

        {/* Performance Summary Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-3 gap-4 mb-12"
        >
          {performanceCards.map((card) => (
            <div
              key={card.label}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-center hover:border-zinc-700 transition-all"
            >
              <card.icon className={cn("w-5 h-5 mx-auto mb-2", card.color)} />
              <div className={cn("text-2xl font-black font-mono mb-1", card.color)}>
                {card.value}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                {card.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                "bg-zinc-950 border rounded-2xl p-6 relative group hover:scale-[1.02] transition-all duration-300",
                testimonial.borderColor
              )}
            >
              {/* Quote Icon */}
              <Quote className="w-8 h-8 text-zinc-900 mb-4" />

              {/* Quote Text */}
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-6 italic">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-black",
                    testimonial.bgColor,
                    testimonial.color
                  )}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">{testimonial.name}</div>
                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{testimonial.role}</div>
                  </div>
                </div>

                {/* Metric Badge */}
                <div className="text-right">
                  <div className={cn("text-base font-black font-mono", testimonial.color)}>
                    {testimonial.metric}
                  </div>
                  <div className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest">
                    {testimonial.metricLabel}
                  </div>
                </div>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/[0.02] to-transparent" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
