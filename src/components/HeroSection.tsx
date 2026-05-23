import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Zap, 
  Target, 
  Activity, 
  Shield, 
  TrendingUp, 
  Info, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Cpu, 
  Check, 
  Shuffle, 
  AlertTriangle, 
  Play, 
  RefreshCw 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const HeroSection: React.FC = () => {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  // States for Phase 1 Simulator (Poisson distribution)
  const [selectedPoissonFixture, setSelectedPoissonFixture] = useState<'high_vol' | 'balanced' | 'defensive'>('high_vol');
  
  // States for Phase 2 (Neural Risk Scan)
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // States for Phase 3 (Kelly Staking Calculator)
  const [kellyProbability, setKellyProbability] = useState<number>(65); // 65%
  const [kellyOdds, setKellyOdds] = useState<number>(1.85); // 1.85 odds
  const [kellyBankroll, setKellyBankroll] = useState<number>(10000); // $10,000

  // States for Phase 4 (Live Telemetry Simulator)
  const [liveMinute, setLiveMinute] = useState(45);
  const [liveHomeScore, setLiveHomeScore] = useState(0);
  const [liveAwayScore, setLiveAwayScore] = useState(0);
  const [hasHomeRedCard, setHasHomeRedCard] = useState(false);
  const [hasAwayRedCard, setHasAwayRedCard] = useState(false);
  const [liveHomeMomentum, setLiveHomeMomentum] = useState(55); // 55%

  const scrollToMatches = () => {
    const main = document.querySelector('main');
    if (main) {
      main.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Phase 1 Poisson Probability Matrix Calculator
  const getPoissonMatrix = () => {
    switch (selectedPoissonFixture) {
      case 'high_vol': // e.g. Barca vs Bayern - High Scoring expectation
        return [
          [0.05, 0.08, 0.09, 0.06], // Home 0 goals: [Away 0, Away 1, Away 2, Away 3+]
          [0.09, 0.12, 0.11, 0.07], // Home 1 goal
          [0.10, 0.14, 0.12, 0.08], // Home 2 goals
          [0.08, 0.11, 0.09, 0.06], // Home 3+ goals
        ];
      case 'defensive': // e.g. Atletico vs Juventus - Low Scoring expectation
        return [
          [0.18, 0.14, 0.06, 0.02],
          [0.16, 0.19, 0.08, 0.03],
          [0.08, 0.10, 0.05, 0.01],
          [0.02, 0.03, 0.01, 0.01],
        ];
      case 'balanced': // Moderate action
      default:
        return [
          [0.09, 0.11, 0.07, 0.03],
          [0.12, 0.15, 0.10, 0.04],
          [0.09, 0.11, 0.08, 0.03],
          [0.04, 0.05, 0.03, 0.01],
        ];
    }
  };

  // Run Phase 2 Simulator Scan
  const triggerNeuralScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    setScanResult(null);
    setScanLogs(["[SYSTEM] Initializing Neural Filter Audit Sequence...", "Connecting to primary global database nodes... Done."]);

    const steps = [
      { p: 20, log: "Scrutinizing team travel indices and rest cycles..." },
      { p: 40, log: "Analyzing line-up disruption vectors (injury telemetry logged)..." },
      { p: 60, log: "Modeling multi-market odds movements (detecting early volume surges)..." },
      { p: 80, log: "Evaluating draw momentum correlation and historical trap sequences..." },
      { p: 100, log: "Applying Poisson density deviations relative to real-time variables..." }
    ];

    steps.forEach((s) => {
      setTimeout(() => {
        setScanProgress(s.p);
        setScanLogs(prev => [...prev, `[AUDIT] ${s.log}`]);
        if (s.p === 100) {
          setIsScanning(false);
          setScanResult("TRAP STATE DEVIATION: WARNING flag raised on high favorite! Positive edge found in standard draw index (+11.4%). Deploy caution parameter standard.");
        }
      }, s.p * 20);
    });
  };

  // Phase 3 Calculator Logic (Fractional Kelly)
  const calcKellyMetric = () => {
    const p = kellyProbability / 100;
    const b = kellyOdds - 1; // Decimal odds to fractional
    
    if (b <= 0) return { ev: 0, rawKelly: 0, safeKelly: 0, stakeCash: 0, hasEdge: false };
    
    const ev = (p * kellyOdds) - 1;
    const hasEdge = ev > 0;
    
    // Raw Kelly = (p * (b + 1) - 1) / b
    const rawKelly = (p * (b + 1) - 1) / b;
    
    // We utilize a standard 0.2 Fraction to keep drawdowns safe!
    const multiplier = 0.2;
    const safeKelly = Math.max(0, rawKelly * multiplier);
    const stakeCash = kellyBankroll * safeKelly;

    return {
      ev: Math.round(ev * 100),
      rawKelly: Math.round(Math.max(0, rawKelly) * 100),
      safeKelly: Number((safeKelly * 100).toFixed(1)),
      stakeCash: Math.round(stakeCash),
      hasEdge
    };
  };

  // Phase 4 Live Calibration Probabilities Calculations
  const getLiveProbabilities = () => {
    // Basic dynamic weights
    let homeWeight = 45 + (liveHomeMomentum - 50) * 0.5 + (liveHomeScore - liveAwayScore) * 20;
    let awayWeight = 30 + (50 - liveHomeMomentum) * 0.5 + (liveAwayScore - liveHomeScore) * 20;
    
    if (hasHomeRedCard) {
      homeWeight -= 18;
      awayWeight += 10;
    }
    if (hasAwayRedCard) {
      awayWeight -= 18;
      homeWeight += 10;
    }

    // Dampen at high/low minutes
    const minutesLeft = Math.max(0, 90 - liveMinute);
    const drawWeight = Math.max(10, 25 + (15 - Math.abs(liveHomeScore - liveAwayScore) * 15) * (minutesLeft / 90));

    // Normalize
    const total = Math.max(1, homeWeight + awayWeight + drawWeight);
    const homePercent = Math.round((Math.max(2, homeWeight) / total) * 100);
    const awayPercent = Math.round((Math.max(2, awayWeight) / total) * 100);
    const drawPercent = 100 - homePercent - awayPercent;

    return { home: homePercent, draw: drawPercent, away: awayPercent };
  };

  const kellyResult = calcKellyMetric();
  const liveProbs = getLiveProbabilities();

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
        {Array.from({ length: 20 }).map((_, i) => (
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

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85] text-white overflow-hidden animate-pulse-intensity">
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
              className="mt-8 text-zinc-400 text-lg md:text-xl font-medium max-w-lg leading-snug font-sans"
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
                id="btn-initialize-scan"
                onClick={scrollToMatches}
                className="bg-white text-black px-8 py-4 rounded-full font-black uppercase text-sm flex items-center gap-3 hover:bg-yellow-500 transition-all hover:scale-105 active:scale-95 group cursor-pointer"
              >
                Initialize Scan
                <Zap className="w-4 h-4 group-hover:fill-current" />
              </button>
              <button 
                id="btn-how-it-works"
                onClick={() => {
                  setActiveStep(1);
                  setIsHowItWorksOpen(true);
                }}
                className="border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm text-white px-8 py-4 rounded-full font-black uppercase text-sm flex items-center gap-3 hover:bg-zinc-800 transition-colors uppercase cursor-pointer"
              >
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
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-zinc-900 rounded-lg flex items-center justify-center">
                       <div className="w-1 h-1 rounded-full bg-zinc-800" />
                    </div>
                  ))}
                </div>
                
                {/* Tactical Stats Matrix */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                  <div className="w-24 h-24 rounded-full bg-yellow-500 flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.3)] mb-6">
                    <BrainCircuit className="w-12 h-12 text-black animate-pulse" />
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

      {/* STUNNING INTERACTIVE MULTI-PHASE INTELLIGENCE EXPLAINER MODAL */}
      <AnimatePresence>
        {isHowItWorksOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden my-8"
            >
              {/* Close Button */}
              <button 
                id="btn-close-explain-modal"
                onClick={() => setIsHowItWorksOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors z-[100] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Grid Header & Roadmap Steps */}
              <div className="p-8 border-b border-zinc-900 bg-zinc-950/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-yellow-500 p-2 rounded-xl">
                    <BrainCircuit className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white font-sans">Safe Side Intelligence Protocol</h2>
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mt-0.5">Algorithm pipeline verification unit</p>
                  </div>
                </div>

                {/* Micro Steps Slider */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 1, num: "01", name: "Poisson Formula", desc: "Goal Probabilities" },
                    { id: 2, num: "02", name: "Neural Risk Filter", desc: "Trap Match Audit" },
                    { id: 3, num: "03", name: "Kelly Alignment", desc: "Staking Optimization" },
                    { id: 4, num: "04", name: "Live Telemetry", desc: "Dynamic Recalibration" }
                  ].map((step) => (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(step.id)}
                      className={cn(
                        "text-left p-4 rounded-2xl border transition-all relative text-ellipsis overflow-hidden duration-300 cursor-pointer",
                        activeStep === step.id 
                          ? "bg-zinc-900 border-yellow-500/30 shadow-lg text-white" 
                          : "bg-zinc-950/40 border-zinc-900/60 text-zinc-400 hover:border-zinc-800"
                      )}
                    >
                      <div className="flex items-center justify-between pointer-events-none mb-1">
                        <span className={cn(
                          "font-mono text-xs font-black",
                          activeStep === step.id ? "text-yellow-500" : "text-zinc-700"
                        )}>
                          {step.num}
                        </span>
                        {activeStep > step.id && (
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-emerald-500" />
                          </div>
                        )}
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-white truncate pointer-events-none">{step.name}</h4>
                      <p className="text-[9.5px] font-medium text-zinc-500 pointer-events-none truncate">{step.desc}</p>
                      
                      {activeStep === step.id && (
                        <motion.div 
                          layoutId="active-step-bar"
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-yellow-500" 
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Explainer Component Content */}
              <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-h-[460px]">
                
                {/* Left Side: Explanatory text and technical highlights */}
                <div className="lg:col-span-5 space-y-6">
                  {activeStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <span className="text-[9.5px] font-black font-mono uppercase bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-full border border-yellow-500/20">Phase 01: Multi-Point Poisson Probability</span>
                      <h3 className="text-2xl font-black uppercase text-white leading-tight font-sans">Calculating Expected Goal Overlaps</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                        Poisson distributions estimate the joint probability of football scores based on individual offensive (Attack Strength Index) and defensive ratings (Defense Index). By calculating goal distribution curves for domestic leagues, Safe Side determines exact score density targets.
                      </p>
                      <div className="space-y-3 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-900">
                        <div className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-zinc-300 font-medium">Maps attack power coefficients dynamically based on rolling 10-match home/away trends.</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-zinc-300 font-medium">Generates continuous density grids displaying statistical value deviations versus public bookmaker pricing.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <span className="text-[9.5px] font-black font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">Phase 02: Neural Risk Dampening Shield</span>
                      <h3 className="text-2xl font-black uppercase text-white leading-tight font-sans">Detecting High-Volatility "Trap Matches"</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                        Raw stats overlook underlying momentum anomalies. The Neural Shield audits real-world friction indices: severe head-to-head bias, tactical mismatch factors (e.g. low blocks squeezing dominant width), travel strains and squad fatigue indicators to suppress false signals.
                      </p>
                      <div className="space-y-3 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-900">
                        <div className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-zinc-300 font-medium">Automatic quarantine for high-risk low-volume market traps.</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-zinc-300 font-medium">Weighs mental friction index (derbies, qualification priorities).</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <span className="text-[9.5px] font-black font-mono uppercase bg-sky-500/10 text-sky-450 px-2.5 py-1 rounded-full border border-sky-500/20">Phase 03: Kelly Criterion Capital Staking</span>
                      <h3 className="text-2xl font-black uppercase text-white leading-tight font-sans">Dynamic Staking Over Long Sequences</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                        Staking size is the ultimate weapon against gambler's ruin. Standard Kelly calculates: <code className="text-yellow-500 font-mono text-[10.5px]">f* = (b*p - q) / b</code>. Safe Side implements a strict <strong>0.2 Fraction Staking limit</strong>, protecting your capital.
                      </p>
                      <div className="space-y-3 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-900">
                        <div className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-zinc-300 font-medium">Checks for positive EP edge first; completely blocks allocation for negative EV matches.</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-zinc-300 font-medium">Reduces staking sizes dynamically during periods of macro-market noise.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeStep === 4 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <span className="text-[9.5px] font-black font-mono uppercase bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-full border border-purple-500/20">Phase 04: Real-time Live Signal Calibration</span>
                      <h3 className="text-2xl font-black uppercase text-white leading-tight font-sans">Adapting to Match Telemetry Spikes</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                        When the referee blows the whistle, assumptions are discarded. Our system processes real-time feeds (momentum fluctuations, cards, tempo, dynamic goals), recalibrating probability maps on-the-fly to pinpoint live valuation shifts.
                      </p>
                      <div className="space-y-3 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-900">
                        <div className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-zinc-300 font-medium">Calculates in-play pressure curves based on target attack frequency.</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-zinc-300 font-medium">Provides instant exit hedges if match parameters deviate severely.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* General Summary Footnote */}
                  <div className="p-4 border border-zinc-900 bg-black/40 rounded-2xl flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <p className="text-[10.5px] text-zinc-500 leading-snug">
                      Each phase runs in parallel across secure distributed GPU channels to ensure insights are delivered with negligible latency.
                    </p>
                  </div>
                </div>

                {/* Right Side: THE INTERACTIVE SIMULATION ZONE */}
                <div className="lg:col-span-7 bg-zinc-950 border border-zinc-900 rounded-[24px] p-6 relative overflow-hidden min-h-[440px] flex flex-col justify-between">
                  
                  {/* Step 1 Interactive Matrix Simulator */}
                  {activeStep === 1 && (
                    <div className="space-y-4 h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase font-black">Interactive Goal Prob Matrix</span>
                          <span className="text-[10px] font-mono text-yellow-500 uppercase font-black">Live Computed Weights</span>
                        </div>
                        <p className="text-zinc-400 text-xs mb-4">Toggle target fixture parameters to see how Poisson goal matrices shift based on computed squad properties:</p>
                        
                        {/* Interactive Selection */}
                        <div className="grid grid-cols-3 gap-2 mb-6">
                          {[
                            { id: 'high_vol', name: 'High Volatility', sub: 'e.g. Real Madrid/PSG' },
                            { id: 'balanced', name: 'Standard Balanced', sub: 'e.g. Manchester Utd' },
                            { id: 'defensive', name: 'Defensive Squeeze', sub: 'e.g. Atletico Madrid' }
                          ].map((fix) => (
                            <button
                              key={fix.id}
                              onClick={() => setSelectedPoissonFixture(fix.id as any)}
                              className={cn(
                                "p-3 rounded-xl border text-center transition-all cursor-pointer",
                                selectedPoissonFixture === fix.id 
                                  ? "bg-zinc-900 border-yellow-500 text-yellow-500 shadow" 
                                  : "bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800"
                              )}
                            >
                              <div className="text-[11px] font-black uppercase tracking-tight truncate pointer-events-none">{fix.name}</div>
                              <div className="text-[8.5px] font-mono opacity-50 truncate pointer-events-none">{fix.sub}</div>
                            </button>
                          ))}
                        </div>

                        {/* Visual 4x4 Grid representation */}
                        <div className="space-y-1">
                          {/* Grid Labels */}
                          <div className="grid grid-cols-5 text-center gap-1 mb-1">
                            <span className="text-[8px] font-mono text-zinc-600 uppercase font-bold">H \ A</span>
                            <span className="text-[9px] font-mono text-zinc-500 font-bold">0 Goals</span>
                            <span className="text-[9px] font-mono text-zinc-500 font-bold">1 Goal</span>
                            <span className="text-[9px] font-mono text-zinc-500 font-bold">2 Goals</span>
                            <span className="text-[9px] font-mono text-zinc-500 font-bold">3+ Goals</span>
                          </div>

                          {getPoissonMatrix().map((row, rIdx) => (
                            <div key={rIdx} className="grid grid-cols-5 gap-1">
                              <span className="text-[9px] font-mono text-zinc-500 flex items-center justify-center font-bold bg-[#111] rounded-lg">
                                {rIdx} {rIdx === 3 ? "Goals+" : "Goal"}
                              </span>
                              {row.map((val, cIdx) => {
                                const roundedVal = Math.round(val * 100);
                                return (
                                  <div 
                                    key={cIdx} 
                                    className="p-2.5 rounded-lg text-center flex flex-col items-center justify-center font-mono transition-all duration-300"
                                    style={{
                                      backgroundColor: `rgba(234, 179, 8, ${val * 1.8})`,
                                      borderColor: val > 0.12 ? 'rgba(234, 179, 8, 0.4)' : 'rgba(255,255,255,0.03)',
                                      borderWidth: '1px'
                                    }}
                                  >
                                    <span className={cn(
                                      "text-xs font-black",
                                      val > 0.11 ? "text-zinc-950" : "text-white"
                                    )}>
                                      {roundedVal}%
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-[10px] font-mono text-zinc-600 bg-zinc-900/30 p-3 rounded-xl border border-zinc-900 mt-4">
                        Matrix sums score probability vectors. Warm intensity grids show the most probable mathematical models for deployment.
                      </div>
                    </div>
                  )}

                  {/* Step 2 Interactive Neural Scan */}
                  {activeStep === 2 && (
                    <div className="space-y-4 h-full flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase font-black">Neural Anomaly Detection</span>
                          <span className="text-[10px] font-mono text-emerald-400 uppercase font-black">Diagnostic Core ready</span>
                        </div>
                        <p className="text-zinc-400 text-xs">Run a customized intelligence audit sequence to scan historical and structural friction vectors:</p>
                        
                        {/* Start Scan Button */}
                        <div className="flex justify-center py-2">
                          <button
                            onClick={triggerNeuralScan}
                            disabled={isScanning}
                            className={cn(
                              "px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer",
                              isScanning
                                ? "bg-zinc-800 text-zinc-500"
                                : "bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-105"
                            )}
                          >
                            {isScanning ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                SCANNING ENVIRONMENT...
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                RUN ANOMALY AUDIT
                              </>
                            )}
                          </button>
                        </div>

                        {/* Progress Bar */}
                        {isScanning && (
                          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                            <motion.div 
                              className="bg-emerald-500 h-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${scanProgress}%` }}
                              transition={{ duration: 0.1 }}
                            />
                          </div>
                        )}

                        {/* Scanner Terminal Log */}
                        <div className="bg-black border border-zinc-900 p-4 rounded-xl h-44 overflow-y-auto font-mono text-[10px] space-y-2 text-zinc-400 scrollbar-thin">
                          {scanLogs.map((log, lIdx) => (
                            <div key={lIdx} className="leading-relaxed">
                              <span className="text-zinc-600">[{12 + lIdx}:{(34 + lIdx * 2).toString().padStart(2, '0')}]</span> {log}
                            </div>
                          ))}
                          {!isScanning && scanLogs.length === 0 && (
                            <div className="text-center py-10 text-zinc-600 uppercase font-black tracking-wider">
                              Anomalies system idle. Click standard run to scan.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Diagnostic Outcome Overlay */}
                      {scanResult && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex gap-3 text-xs leading-relaxed"
                        >
                          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                          <span>{scanResult}</span>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Step 3 Staking Slider Calculator */}
                  {activeStep === 3 && (
                    <div className="space-y-4 h-full flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase font-black">Capital Allocation Staker</span>
                          <span className="text-[10px] font-mono text-sky-400 uppercase font-black">Fractional Factor 0.2x</span>
                        </div>
                        <p className="text-zinc-400 text-xs">Simulate expected parameters to check the risk-guarded fractional staking outcomes:</p>
                        
                        {/* Target Sliders */}
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-zinc-400 font-bold uppercase">Estimated Win Probability</span>
                              <span className="text-white font-black">{kellyProbability}%</span>
                            </div>
                            <input 
                              type="range"
                              min="20"
                              max="90"
                              value={kellyProbability}
                              onChange={(e) => setKellyProbability(Number(e.target.value))}
                              className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-zinc-400 font-bold uppercase">Market Available Odds</span>
                              <span className="text-white font-black">{kellyOdds.toFixed(2)} decimal</span>
                            </div>
                            <input 
                              type="range"
                              min="1.20"
                              max="5.00"
                              step="0.05"
                              value={kellyOdds}
                              onChange={(e) => setKellyOdds(Number(e.target.value))}
                              className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-sky-450"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-zinc-400 font-bold uppercase">Total User Vault Capital</span>
                              <span className="text-white font-black">${kellyBankroll.toLocaleString()}</span>
                            </div>
                            <input 
                              type="range"
                              min="1000"
                              max="50000"
                              step="1000"
                              value={kellyBankroll}
                              onChange={(e) => setKellyBankroll(Number(e.target.value))}
                              className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-sky-450"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Display Safe Stats Outputs */}
                      <div className="grid grid-cols-3 gap-2 py-4">
                        <div className="bg-zinc-900/60 border border-zinc-900 p-3 rounded-xl text-center">
                          <span className="text-[8px] font-black uppercase text-zinc-500 font-mono">Computed Edge</span>
                          <div className={cn(
                            "text-base font-black font-mono mt-1",
                            kellyResult.hasEdge ? "text-emerald-400" : "text-red-400"
                          )}>
                            {kellyResult.ev > 0 ? `+${kellyResult.ev}` : kellyResult.ev}%
                          </div>
                        </div>

                        <div className="bg-zinc-900/60 border border-zinc-900 p-3 rounded-xl text-center">
                          <span className="text-[8px] font-black uppercase text-zinc-500 font-mono font-bold">Suggested %</span>
                          <div className="text-base font-black font-mono text-white mt-1">
                            {kellyResult.safeKelly}%
                          </div>
                        </div>

                        <div className="bg-zinc-900/60 border border-zinc-900 p-3 rounded-xl text-center">
                          <span className="text-[8px] font-black uppercase text-zinc-500 font-mono font-bold">Deploy Amount</span>
                          <div className="text-base font-black font-mono text-yellow-500 mt-1">
                            ${kellyResult.stakeCash.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {kellyResult.hasEdge ? (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex gap-2 justify-center font-bold">
                          ✓ Positive Expected Edge: Dynamic Staking Allowed
                        </div>
                      ) : (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 justify-center font-bold">
                          ⚠️ Negative Expected Value Edge: Algorithmic Halt Applied!
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4 Live Calibration simulator */}
                  {activeStep === 4 && (
                    <div className="space-y-4 h-full flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase font-black">Live Telemetry Calibrator</span>
                          <span className="text-[10px] font-mono text-purple-400 uppercase font-black">In-Play Tracking</span>
                        </div>
                        <p className="text-zinc-400 text-xs">Simulate sudden live events relative to match telemetry coordinates:</p>

                        {/* Telemetry Live HUD */}
                        <div className="bg-[#111] border border-zinc-900 p-4 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex flex-col items-center flex-1">
                            <span className="text-[10px] font-mono font-black text-zinc-500 uppercase">HOME POWER</span>
                            <span className="text-sm font-black text-white mt-1">H. FC</span>
                          </div>
                          
                          <div className="flex flex-col items-center gap-1">
                            <span className="bg-red-500/20 text-red-500 border border-red-500/20 font-mono text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">live {liveMinute}'</span>
                            <span className="text-3xl font-black font-mono text-yellow-500">{liveHomeScore} - {liveAwayScore}</span>
                          </div>

                          <div className="flex flex-col items-center flex-1">
                            <span className="text-[10px] font-mono font-black text-zinc-500 uppercase">AWAY POWER</span>
                            <span className="text-sm font-black text-white mt-1">A. ATHLETIC</span>
                          </div>
                        </div>

                        {/* Simulation Interactive Triggers */}
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <button
                            onClick={() => setLiveHomeScore(prev => prev + 1)}
                            className="bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-white p-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 justify-center cursor-pointer"
                          >
                            + Home Goal
                          </button>
                          <button
                            onClick={() => setLiveAwayScore(prev => prev + 1)}
                            className="bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-white p-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 justify-center cursor-pointer"
                          >
                            + Away Goal
                          </button>
                          <button
                            onClick={() => setHasHomeRedCard(prev => !prev)}
                            className={cn(
                              "p-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 justify-center border cursor-pointer",
                              hasHomeRedCard
                                ? "bg-red-500/20 text-red-500 border-red-500/30"
                                : "bg-zinc-900 border-zinc-900 hover:border-zinc-800 text-zinc-400"
                            )}
                          >
                            Home Red Card: {hasHomeRedCard ? "ON" : "OFF"}
                          </button>
                          <button
                            onClick={() => setHasAwayRedCard(prev => !prev)}
                            className={cn(
                              "p-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 justify-center border cursor-pointer",
                              hasAwayRedCard
                                ? "bg-red-500/20 text-red-500 border-red-500/30"
                                : "bg-zinc-900 border-zinc-900 hover:border-zinc-800 text-zinc-400"
                            )}
                          >
                            Away Red Card: {hasAwayRedCard ? "ON" : "OFF"}
                          </button>
                        </div>

                        {/* Momentum Slider */}
                        <div className="flex flex-col gap-1.5 mt-3">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-zinc-400 font-bold uppercase">Attack Momentum Split</span>
                            <span className="text-purple-400 font-black">Home {liveHomeMomentum}% / Away {100 - liveHomeMomentum}%</span>
                          </div>
                          <input 
                            type="range"
                            min="20"
                            max="80"
                            value={liveHomeMomentum}
                            onChange={(e) => setLiveHomeMomentum(Number(e.target.value))}
                            className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                        </div>
                      </div>

                      {/* Display Computed Outcomes bar chart display */}
                      <div className="space-y-2 mt-4">
                        <span className="text-[9px] font-mono text-zinc-600 uppercase font-black">Computed Win/Draw/Away Probabilities:</span>
                        <div className="w-full h-7 bg-zinc-900 rounded-full overflow-hidden flex font-mono text-[9px] font-black text-center text-zinc-950">
                          <div 
                            style={{ width: `${liveProbs.home}%` }} 
                            className="bg-yellow-500 flex items-center justify-center transition-all duration-300"
                          >
                            {liveProbs.home > 15 && `HOME ${liveProbs.home}%`}
                          </div>
                          <div 
                            style={{ width: `${liveProbs.draw}%` }} 
                            className="bg-zinc-450 text-white flex items-center justify-center transition-all duration-300"
                          >
                            {liveProbs.draw > 15 && `DRAW ${liveProbs.draw}%`}
                          </div>
                          <div 
                            style={{ width: `${liveProbs.away}%` }} 
                            className="bg-purple-500 text-white flex items-center justify-center transition-all duration-300"
                          >
                            {liveProbs.away > 15 && `AWAY ${liveProbs.away}%`}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Navigation Buttons for Modal Step */}
                  <div className="flex items-center justify-between border-t border-zinc-900 pt-4 mt-6">
                    <button
                      onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                      disabled={activeStep === 1}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1 cursor-pointer",
                        activeStep === 1 
                          ? "text-zinc-700 bg-transparent" 
                          : "text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800"
                      )}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      PREV PHASE
                    </button>

                    <button
                      onClick={() => {
                        if (activeStep < 4) {
                          setActiveStep(prev => prev + 1);
                        } else {
                          setIsHowItWorksOpen(false);
                          scrollToMatches();
                        }
                      }}
                      className="bg-white text-black text-xs font-black uppercase px-5 py-2.5 rounded-xl hover:bg-yellow-500 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {activeStep === 4 ? "APPLY INSIGHTS" : "NEXT PHASE"}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
