import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  X, 
  Zap, 
  ShieldCheck, 
  Lock, 
  HelpCircle, 
  ArrowRight, 
  TrendingUp, 
  Globe, 
  Calculator, 
  Cpu, 
  FileCheck 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { cn } from '@/src/lib/utils';

interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  popular: boolean;
  features: string[];
  omittedFeatures: string[];
  badgeText?: string;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [startingCapital, setStartingCapital] = useState<number>(5000);
  const [placementsPerMonth, setPlacementsPerMonth] = useState<number>(30);

  // Subscription tiers configuration
  const tiers: PricingTier[] = [
    {
      id: "recon",
      name: "Recon Unit",
      tagline: "Basic signal tracking and initial threat audits.",
      monthlyPrice: 0,
      annualMonthlyPrice: 0,
      popular: false,
      features: [
        "Standard match odds tracking",
        "EPL and La Liga basic fixtures",
        "Limited win/draw/loss probability",
        "Basic live scores stream (delayed 5 min)",
        "Static bankroll staking (flat layout limit)"
      ],
      omittedFeatures: [
        "Advanced AI decision explanations",
        "Tactical 'Trap Game' warnings & reasonings",
        "All active global operational zones",
        "SafeSide custom AI agent prompt queries",
        "Direct trade RPC stream / API feeds",
        "Prioritized model re-computations"
      ]
    },
    {
      id: "tactical",
      name: "Tactical Division",
      tagline: "The core intelligence system for professional edge analysis.",
      monthlyPrice: 49,
      annualMonthlyPrice: 34,
      popular: true,
      badgeText: "STATION STANDARD",
      features: [
        "All active global operational zones unlocked",
        "Full AI decision & tactical reasoning chains",
        "Instant 'Trap Game' real-time anomaly alerts",
        "Direct real-time score flash with scale-up overlays",
        "Complete Kelly Criterion allocation simulator",
        "Premium dashboard access with historical backtests",
        "Direct SafeSide ChatGPT-style AI agent (unlimited)",
        "Priority queue processing node allocation"
      ],
      omittedFeatures: [
        "Raw database dump access (CSV / JSON)",
        "Dedicated model tuning feedback integration",
        "SLA guaranteed Webhook triggers",
        "Direct C++ High-Frequency RPC API keys"
      ]
    },
    {
      id: "strategic",
      name: "Strategic Command",
      tagline: "Unrestricted database keys and dedicated AI hardware threads.",
      monthlyPrice: 199,
      annualMonthlyPrice: 139,
      popular: false,
      badgeText: "ELITE OPERATIONS",
      features: [
        "Complete Tactical Division features",
        "SLA guaranteed Webhook triggers for match highlights",
        "Private API access (JSON endpoints / WebSockets)",
        "Raw historical performance database dump",
        "Custom odds backTester sandbox environment",
        "Dedicated Gemini AI reasoning agent nodes",
        "24/7 technical operator account manager",
        "Beta access to neural weight adjustments"
      ],
      omittedFeatures: []
    }
  ];

  // Live Subscription ROI Multipliers
  // Safe Side has a modeled average ROI of 8.5% on matches with edge
  const roiMetrics = useMemo(() => {
    const avgRoiPercent = 8.5; 
    const isProBill = billingCycle === 'annual' ? 34 : 49;
    const isEliteBill = billingCycle === 'annual' ? 139 : 199;
    
    // Monthly gain = capital * avgRoi * placements
    // To make it simple and realistic, we suggest a conservative average bet size of 2% of bankroll per trade
    const defaultBetSizeFraction = 0.02; 
    const averageBetSize = startingCapital * defaultBetSizeFraction;
    const estimatedMonthlyYield = averageBetSize * (avgRoiPercent / 100) * placementsPerMonth;
    
    // Net profit after subscription fees
    const proNetMonthly = estimatedMonthlyYield - isProBill;
    const eliteNetMonthly = estimatedMonthlyYield - isEliteBill;

    // Days to break even
    const proBreakEvenPlacements = Math.ceil(isProBill / (averageBetSize * (avgRoiPercent / 100)));
    const eliteBreakEvenPlacements = Math.ceil(isEliteBill / (averageBetSize * (avgRoiPercent / 100)));

    return {
      averageBetSize: Math.round(averageBetSize),
      estimatedMonthlyYield: Math.round(estimatedMonthlyYield),
      proNetMonthly: Math.round(proNetMonthly),
      eliteNetMonthly: Math.round(eliteNetMonthly),
      proBreakEvenPlacements: Math.max(1, proBreakEvenPlacements),
      eliteBreakEvenPlacements: Math.max(1, eliteBreakEvenPlacements)
    };
  }, [startingCapital, placementsPerMonth, billingCycle]);

  const faqs = [
    {
      q: "How does the Tactical Division subscription protect against cold-streaks?",
      a: "Our advanced algorithm embeds standard risk mitigators, including historical fatigue audits, goalie-specific defensive variance, and trap game warning models. When statistical anomalies are flagged, our Kelly staking tool automatically triggers warnings, suppressing allocation size dynamically to prevent large drawdowns."
    },
    {
      q: "Can I cancel my tactical subscription tier or check out first?",
      a: "Yes. All procurement plans are self-service. You may upgrade, downgrade, or pause your node configuration instantly directly inside the user dashboard settings. A free Recon Unit tier is always available to test the live feeds."
    },
    {
      q: "What API formats are included in the Strategic Command tier?",
      a: "Strategic Command includes fully-documented REST endpoints and ultra-low latency WebSocket feeds. Real-time updates push match predictions, squad anomalies, and confidence weights directly to your backtesting terminal."
    },
    {
      q: "Are the win probabilities guaranteed?",
      a: "No system can guarantee soccer outcomes due to physical variance. Our global accuracy (modeled dynamically relative to market pricing discrepancies) tracks at approximately 65-74% on top signals. Bankroll management remains vital."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 space-y-20">
      
      {/* Narrative Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
          <Cpu className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-[9px] font-black uppercase text-yellow-500 tracking-[0.25em] font-mono">INTELLIGENCE PROCUREMENT GRID</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase leading-none text-white">
          Secure Your <span className="text-zinc-800">Analytical Edge</span>
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
          Upgrade from standard delayed signals to pure, low-latency tactical feeds. Equipping your station with custom Kelly simulators, real-time anomalies and deep AI reasoning paths.
        </p>

        {/* Custom Billing Cycle Toggle */}
        <div className="flex justify-center items-center pt-6">
          <div className="bg-zinc-950/70 border border-zinc-900 rounded-2xl p-1.5 flex h-14 relative w-72">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                billingCycle === 'monthly' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Monthly Cycle
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={cn(
                "flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center justify-center gap-1",
                billingCycle === 'annual' ? "bg-yellow-500 text-black" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Annual Saver
              <span className={cn(
                "absolute -top-3 -right-3 text-[7.5px] font-black uppercase bg-emerald-500 text-emerald-950 px-1.5 py-0.5 rounded-full ring-2 ring-black",
                billingCycle === 'annual' ? "animate-bounce" : ""
              )}>
                -30%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tiers.map((tier) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className={cn(
              "bg-zinc-950 border-zinc-900 rounded-[36px] p-8 space-y-8 relative overflow-hidden flex flex-col h-full hover:border-zinc-850 transition-all shadow-xl",
              tier.popular && "border-yellow-500/40 ring-1 ring-yellow-500/20 shadow-yellow-500/[0.03]"
            )}>
              {/* Highlight background elements for popular tier */}
              {tier.popular && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full" />
              )}

              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Tier Group</span>
                  {tier.badgeText && (
                    <Badge variant="outline" className={cn(
                      "font-mono text-[9px] font-black uppercase px-2.5 py-0.5 tracking-[0.15em] border-zinc-800",
                      tier.popular ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" : "text-zinc-500"
                    )}>
                      {tier.badgeText}
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white group-hover:text-yellow-500 transition-colors">
                    {tier.name}
                  </h3>
                  <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed font-semibold">
                    {tier.tagline}
                  </p>
                </div>

                <div className="pt-4 flex items-baseline gap-1.5 border-b border-zinc-900/40 pb-6">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tighter text-white">
                    ${billingCycle === 'annual' ? tier.annualMonthlyPrice : tier.monthlyPrice}
                  </span>
                  <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest font-mono">/ Month</span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-4 flex-1">
                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block font-mono">Included Specs</span>
                <ul className="space-y-3">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3.5 text-xs text-zinc-300 font-medium">
                      <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25 shrink-0">
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                  {tier.omittedFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3.5 text-xs text-zinc-650 font-medium opacity-50">
                      <div className="mt-0.5 w-4 h-4 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-900 shrink-0">
                        <Lock className="w-2 h-2 text-zinc-700" />
                      </div>
                      <span className="line-through">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Proceed Button */}
              <div className="relative z-10 pt-4">
                <Button 
                  className={cn(
                    "w-full h-12 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all",
                    tier.popular 
                      ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                      : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                  )}
                >
                  {tier.monthlyPrice === 0 ? "Deploy Free Uplink" : "Authorize Procurement"}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform hover:translate-x-1" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Interactive Staking Value & Return Calculator */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-[48px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Calculator className="w-80 h-80" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase text-yellow-500 tracking-widest font-mono">VALUE CALCULATOR</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">Project Your Yield Edge</h3>
              <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed font-medium">
                Drag the sliders to estimate how the SafeSide Tactical Division subscription break-even point and projected monthly returns align with your liquid bankroll.
              </p>
            </div>

            <div className="space-y-4">
              {/* Slider 1: Capital */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
                  <span>Liquid Playbook Capital</span>
                  <span className="text-zinc-300 font-mono text-xs">${startingCapital.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="100000" 
                  step="500"
                  value={startingCapital}
                  onChange={(e) => setStartingCapital(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400"
                />
                <div className="flex justify-between text-[7px] text-zinc-650 uppercase font-black tracking-widest">
                  <span>$500 Limit</span>
                  <span>$100,000 Portfolio</span>
                </div>
              </div>

              {/* Slider 2: Placements */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
                  <span>Average Trade Placements/Mo</span>
                  <span className="text-zinc-300 font-mono text-xs">{placementsPerMonth} trades</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="120" 
                  step="5"
                  value={placementsPerMonth}
                  onChange={(e) => setPlacementsPerMonth(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400"
                />
                <div className="flex justify-between text-[7px] text-zinc-650 uppercase font-black tracking-widest">
                  <span>5 matches</span>
                  <span>120 high frequency</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results Grid display */}
          <div className="lg:col-span-7 bg-black/45 border border-zinc-900/60 p-8 rounded-[32px] grid grid-cols-1 md:grid-cols-2 gap-8 relative overflow-hidden backdrop-blur-sm">
            
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono block">Estimated Size Per Unit (2%)</span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-white block">
                ${roiMetrics.averageBetSize}
              </span>
              <p className="text-[10px] text-zinc-650 leading-relaxed pt-1">Safe staking layout representing consistent Flat layout sizing ratios.</p>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono block">Projected Monthly Yield</span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 block pb-0.5">
                +${roiMetrics.estimatedMonthlyYield}
              </span>
              <p className="text-[10px] text-zinc-650 leading-relaxed pt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500"/> Aligns with 8.5% average model signal yield edge.
              </p>
            </div>

            <div className="border-t border-zinc-900 pt-6 space-y-1">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono block">Tactical Net Yield</span>
              <span className="text-lg sm:text-xl font-black font-mono text-zinc-300 block">
                ${roiMetrics.proNetMonthly > 0 ? `+$${roiMetrics.proNetMonthly.toLocaleString()}` : `-$${Math.abs(roiMetrics.proNetMonthly).toLocaleString()}`}
              </span>
              <p className="text-[9.5px] font-medium text-zinc-500 uppercase font-mono mt-2">
                Break-even in {roiMetrics.proBreakEvenPlacements} target plays
              </p>
            </div>

            <div className="border-t border-zinc-900 pt-6 space-y-1">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-mono block">Strategic Net Yield</span>
              <span className="text-lg sm:text-xl font-black font-mono text-zinc-300 block">
                ${roiMetrics.eliteNetMonthly > 0 ? `+$${roiMetrics.eliteNetMonthly.toLocaleString()}` : `-$${Math.abs(roiMetrics.eliteNetMonthly).toLocaleString()}`}
              </span>
              <p className="text-[9.5px] font-medium text-zinc-500 uppercase font-mono mt-2">
                Break-even in {roiMetrics.eliteBreakEvenPlacements} target plays
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Feature Matrix side-by-side Table comparison */}
      <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] overflow-hidden p-1 shadow-2xl relative">
        <div className="p-8 border-b border-zinc-900">
          <CardTitle className="text-xl font-black uppercase text-zinc-200">Capabilities Audit Matrix</CardTitle>
          <p className="text-zinc-500 text-xs font-medium font-mono">Detailed side-by-side node comparisons across tactical capabilities</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black/20">
              <TableRow className="border-zinc-900 hover:bg-transparent h-14">
                <TableHead className="w-1/3 text-[10px] font-black uppercase text-zinc-600 tracking-widest pl-8">Specification Node</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase text-zinc-500 tracking-widest">Recon</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase text-yellow-500 tracking-widest">Tactical</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase text-zinc-300 tracking-widest">Strategic</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "Active Leagues & Zones", recon: "EPL & La Liga Core", tactical: "All Global (24+ Leagues)", strategic: "All Global (24+ Leagues)" },
                { name: "Prediction Delay", recon: "5-Minute Lag", tactical: "0ms Real-Time Stream", strategic: "0ms Real-Time Stream" },
                { name: "AI Narrative Reasoning", recon: "Omitted", tactical: "Full Detailed Audit", strategic: "Full Detailed Audit" },
                { name: "Anomaly 'Trap Game' Flag", recon: "Omitted", tactical: "Instant Card Banner", strategic: "Instant Card Banner" },
                { name: "Kelly Staking Slider", recon: "Static Core Limit", tactical: "Unlimited Interactive Simulator", strategic: "Unlimited Interactive Simulator" },
                { name: "Interactive Agent Custom Queries", recon: "Omitted / Limited", tactical: "Unlimited Queries", strategic: "Unlimited Queries + Dedicated Nodes" },
                { name: "Raw Database JSON export", recon: "Omitted", tactical: "Omitted", strategic: "Daily Batch Pulls" },
                { name: "WebSocket API Keys", recon: "Omitted", tactical: "Omitted", strategic: "Sub-10ms Dedicated Host" }
              ].map((row, idx) => (
                 <TableRow key={idx} className="border-zinc-900/50 hover:bg-zinc-900/50 hover:border-zinc-800 transition-all font-semibold text-xs text-zinc-400">
                  <TableCell className="pl-8 text-white font-bold">{row.name}</TableCell>
                  <TableCell className="text-center text-zinc-500 font-mono text-[11px]">{row.recon}</TableCell>
                  <TableCell className="text-center text-yellow-500/90 font-mono text-[11px] bg-yellow-500/[0.02]">{row.tactical}</TableCell>
                  <TableCell className="text-center text-zinc-300 font-mono text-[11px]">{row.strategic}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Cyber/Military Trust Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left border-t border-zinc-950 pt-12">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase text-white tracking-tight">SLA Guarded Feeds</h4>
            <p className="text-zinc-500 text-xs leading-relaxed font-semibold">Our infrastructure monitors underlying football feeds via redundant sub-sockets to deliver uninterrupted prediction loads.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase text-white tracking-tight">Dynamic Neural Weights</h4>
            <p className="text-zinc-550 text-xs leading-relaxed font-semibold font-sans">Signals re-calculate every 15 minutes in response to line shifts, goalie fatigue mechanics, and critical match indicators.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase text-white tracking-tight">Precision Backtesting</h4>
            <p className="text-zinc-500 text-xs leading-relaxed font-semibold">Every prediction is archived on-chain and tested against multiple staking models to maintain transparency and proof-of-edge.</p>
          </div>
        </div>
      </div>

      {/* FAQ Grid */}
      <div className="space-y-10">
        <div className="text-center">
          <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tighter">Tactical Deployment FAQ</h3>
          <p className="text-zinc-500 text-xs mt-1.5 font-mono">Answers from the Engineering Command Unit</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {faqs.map((faq, idx) => (
            <Card key={idx} className="bg-zinc-950 border-zinc-900 p-6 rounded-3xl space-y-3">
              <h4 className="font-bold text-sm text-white uppercase tracking-tight flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h4>
              <p className="text-zinc-405 text-xs font-semibold leading-relaxed pl-6 text-zinc-400">
                {faq.a}
              </p>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
