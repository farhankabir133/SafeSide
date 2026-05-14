import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, Zap, Target, Activity, Shield, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const HeroSection: React.FC = () => {
  const scrollToMatches = () => {
    const main = document.querySelector('main');
    if (main) {
      main.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-black py-20 lg:py-32 border-b border-zinc-900 rounded-b-[40px] md:rounded-b-[80px] mb-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      {/* Neural Network Background Animation */}
      <div className="absolute inset-0 z-0 opacity-40">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Animated Connecting Lines */}
          <motion.path
            d="M 100 100 L 300 400 L 600 200 L 900 500"
            stroke="rgba(234,179,8,0.1)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 1200 100 L 1000 600 L 700 300 L 400 700"
            stroke="rgba(16,185,129,0.1)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          />
        </svg>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(204,255,0,0.05),transparent_70%)]" />
        
        {/* Animated Particles/Nodes */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-yellow-500/20"
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: 0 
            }}
            animate={{ 
              y: ["-10%", "110%"],
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: Math.random() * 10 + 5, 
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Node Engine V4.2 Active</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85] text-white overflow-hidden">
              <motion.span 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="block"
              >
                Tactical
              </motion.span>
              <motion.span 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="block text-yellow-500"
              >
                Intelligence
              </motion.span>
            </h1>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-8 text-zinc-400 text-lg md:text-xl font-medium max-w-lg leading-snug"
            >
              Transform raw match data into high-probability tactical insights using our cross-verified POISSON and Neural Node prediction engine.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <button 
                onClick={scrollToMatches}
                className="bg-white text-black px-8 py-4 rounded-full font-black uppercase text-sm flex items-center gap-3 hover:bg-yellow-500 transition-all hover:scale-105 active:scale-95 group"
              >
                Initialize Scan
                <Zap className="w-4 h-4 group-hover:fill-current" />
              </button>
              <button className="border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm text-white px-8 py-4 rounded-full font-black uppercase text-sm flex items-center gap-3 hover:bg-zinc-800 transition-all">
                How it works
                <Info className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            className="relative hidden lg:block"
          >
            {/* Visual Tactical HUD */}
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Outer Ring */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-zinc-800 rounded-full"
              />
              {/* Inner Hexagon Grid */}
              <div className="absolute inset-4 border border-yellow-500/20 rounded-[40px] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm shadow-2xl overflow-hidden">
                <div className="grid grid-cols-3 gap-4 p-8 w-full h-full opacity-60">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-zinc-900 rounded-lg flex items-center justify-center">
                       <div className="w-1 h-1 rounded-full bg-zinc-800" />
                    </div>
                  ))}
                </div>
                
                {/* Tactical Stats Matrix */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                  <div className="w-24 h-24 rounded-full bg-yellow-500 flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.3)] mb-6">
                    <BrainCircuit className="w-12 h-12 text-black" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full">
                    <StatItem icon={Target} label="Accuracy" value="94.2%" color="text-yellow-500" />
                    <StatItem icon={Activity} label="Live Nodes" value="2,841" color="text-emerald-500" />
                    <StatItem icon={Shield} label="Safe Zone" value="82.1%" color="text-sky-500" />
                    <StatItem icon={TrendingUp} label="Yield" value="+14.5" color="text-purple-500" />
                  </div>
                </div>

                {/* Scanning Line */}
                <motion.div 
                  animate={{ y: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 left-0 right-0 h-1 bg-yellow-500/30 blur-sm z-20"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
  <div className="flex flex-col items-center">
    <Icon className={cn("w-4 h-4 mb-1", color)} />
    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
    <span className="text-lg font-black text-white">{value}</span>
  </div>
);
