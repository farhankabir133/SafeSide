import { useNavigate } from "react-router-dom";
import { usePredictions } from "@/src/hooks/usePredictions";
import { PredictionCard } from "@/src/components/PredictionCard";
import { ChatInterface } from "@/src/components/ChatInterface";
import { HistoricalAnalysis } from "@/src/components/HistoricalAnalysis";
import { MatchDetailModal } from "@/src/components/MatchDetailModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, Trophy, Target, Activity, Zap, Info, RefreshCw, Globe, ChevronDown, AlertTriangle, MessageSquare, X, User, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { HeroSection } from "@/src/components/HeroSection";
import { TacticalTicker } from "@/src/components/TacticalTicker";
import { CommandConsole } from "@/src/components/CommandCenter/CommandConsole";
import { useAgent } from "@/src/contexts/AgentContext";
import React, { useMemo, useState, useEffect } from "react";

const QuotaBanner = ({ cooldownTime }: { cooldownTime: number }) => {
  const [timeLeft, setTimeLeft] = useState(Math.ceil((cooldownTime - Date.now()) / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.ceil((cooldownTime - Date.now()) / 1000);
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-red-500/10 border-b border-red-500/20 backdrop-blur-md overflow-hidden relative z-[60]"
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/20 p-1.5 rounded-md">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
            Intelligence Nodes Saturated: Global Throttling Active
          </span>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-[9px] font-mono text-zinc-400 uppercase">
             Neural state recalibrating...
           </div>
           <div className="text-[10px] font-mono text-red-400 font-bold bg-red-500/20 px-4 py-1 rounded-full border border-red-500/30 min-w-[70px] text-center">
             {formatTime(timeLeft)}
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const navigate = useNavigate();
  const { matches, loading, error, predictions, runAnalysis, stats, fetchMatches, isDemo, rateLimit, lastSyncedAt, historicalData, analyzingIds, analysisErrors, globalCooldown } = usePredictions();
  const { openAgentWithMatch } = useAgent();
  const [expandedLeagues, setExpandedLeagues] = useState<Record<string, boolean>>({});
  const [scoreFlash, setScoreFlash] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailMatchId, setDetailMatchId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [detectedMatchId, setDetectedMatchId] = useState<string | null>(null);
  const [isCommandConsoleOpen, setIsCommandConsoleOpen] = useState(false);
  
  // Global shortcut for command console
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandConsoleOpen(true);
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsCommandConsoleOpen(true);
      }
    };
    const handleOpenConsole = () => setIsCommandConsoleOpen(true);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('openConsole', handleOpenConsole);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('openConsole', handleOpenConsole);
    };
  }, []);

  // Detect score changes for live matches
  const prevScores = React.useRef<Record<string, string>>({});

  useEffect(() => {
    const freshScores: Record<string, string> = {};
    const flashes: Record<string, boolean> = {};

    matches.forEach(m => {
      if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status)) {
        const scoreStr = `${m.score?.fullTime?.home}-${m.score?.fullTime?.away}`;
        freshScores[m.id] = scoreStr;
        
        if (prevScores.current[m.id] && prevScores.current[m.id] !== scoreStr) {
          flashes[m.id] = true;
        }
      }
    });

    if (Object.keys(flashes).length > 0) {
      setScoreFlash(prev => ({ ...prev, ...flashes }));
      setTimeout(() => {
        setScoreFlash(prev => {
          const newState = { ...prev };
          Object.keys(flashes).forEach(id => delete newState[id]);
          return newState;
        });
      }, 2000);
    }

    prevScores.current = freshScores;
  }, [matches]);

  useEffect(() => {
    if (loading || isInitializing || !matches.length) return;
    
    // Check if we already have a highlight active
    if (detectedMatchId) return;

    // Find the first live match to highlight by default
    const liveMatch = matches.find(m => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status));
    
    if (liveMatch) {
      // Trigger the same logic as manual detection for the first live match
      const event = new CustomEvent('matchDetected', { detail: liveMatch });
      window.dispatchEvent(event);
    }
  }, [matches, loading, isInitializing]);

  useEffect(() => {
    const handleDetection = (e: any) => {
      const match = e.detail;
      setDetectedMatchId(match.id.toString());
      openAgentWithMatch(match);
      
      if (match.competition?.name) {
        setExpandedLeagues(prev => ({ ...prev, [match.competition.name]: true }));
      }

      // Scroll into view
      setTimeout(() => {
        const element = document.getElementById(`match-${match.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      // Clear highlight after 5 seconds
      setTimeout(() => {
        setDetectedMatchId(null);
      }, 5000);
    };
    window.addEventListener('matchDetected', handleDetection);
    return () => window.removeEventListener('matchDetected', handleDetection);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleInspectMatch = (matchId: string) => {
    navigate(`/matches/${matchId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PLAY':
      case 'LIVE':
      case 'PAUSED':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 px-2 py-0 text-[9px] font-black uppercase tracking-widest">
            <span className="relative flex h-1.5 w-1.5 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Live
          </Badge>
        );
      case 'FINISHED':
      case 'AWARDED':
        return (
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 px-2 py-0 text-[10px] font-black uppercase tracking-widest">
            FT
          </Badge>
        );
      case 'POSTPONED':
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 px-2 py-0 text-[10px] font-black uppercase tracking-widest">
            {status}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-zinc-500 border-zinc-800 px-2 py-0 text-[10px] font-black uppercase tracking-widest">
            Upcoming
          </Badge>
        );
    }
  };

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const searchMatch = 
        match.homeTeam.name.toLowerCase().includes(searchLower) || 
        match.awayTeam.name.toLowerCase().includes(searchLower) ||
        (match.competition?.name?.toLowerCase().includes(searchLower)) ||
        (match.area?.name?.toLowerCase().includes(searchLower)) ||
        (match.competition?.area?.name?.toLowerCase().includes(searchLower));
      
      if (!searchMatch) return false;

      // Status filter
      if (statusFilter !== "all") {
        const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(match.status);
        const isUpcoming = ['TIMED', 'SCHEDULED'].includes(match.status);
        const isFinished = ['FINISHED', 'AWARDED'].includes(match.status);

        if (statusFilter === "live" && !isLive) return false;
        if (statusFilter === "upcoming" && !isUpcoming) return false;
        if (statusFilter === "finished" && !isFinished) return false;
      }

      // League filter
      if (leagueFilter !== "all" && match.competition?.name !== leagueFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== "all") {
        const matchDate = new Date(match.utcDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        if (dateFilter === "today") {
          const matchDay = new Date(matchDate);
          matchDay.setHours(0, 0, 0, 0);
          if (matchDay.getTime() !== today.getTime()) return false;
        } else if (dateFilter === "tomorrow") {
          const matchDay = new Date(matchDate);
          matchDay.setHours(0, 0, 0, 0);
          if (matchDay.getTime() !== tomorrow.getTime()) return false;
        } else if (dateFilter === "week") {
          if (matchDate > nextWeek) return false;
        }
      }

      return true;
    });
  }, [matches, searchQuery, statusFilter, leagueFilter, dateFilter]);

  const uniqueLeagues = useMemo(() => {
    const leagues = new Set<string>();
    matches.forEach(m => {
      if (m.competition?.name) leagues.add(m.competition.name);
    });
    return Array.from(leagues).sort();
  }, [matches]);

  const groupedMatches = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredMatches.forEach(match => {
      const date = new Date(match.utcDate);
      const dateKey = date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(match);
    });
    return groups;
  }, [filteredMatches]);

  return (
    <div className="bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-yellow-500 selection:text-black min-h-screen">
      <TacticalTicker matches={matches} />
      {/* Global Quota Alert */}
      <AnimatePresence>
        {globalCooldown && Date.now() < globalCooldown && (
          <QuotaBanner cooldownTime={globalCooldown} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isInitializing && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <BrainCircuit className="w-20 h-20 text-yellow-500 animate-pulse" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-t-2 border-yellow-500 rounded-full"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-center"
            >
              <h2 className="text-xl font-black uppercase tracking-[0.5em] text-white">Initializing Nodes</h2>
              <div className="mt-4 w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="h-full bg-yellow-500"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <HeroSection />

      {/* Strategic Blueprint Bar */}
      <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-20 mb-12">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <StrategicCard 
            icon={BrainCircuit} 
            title="Poisson Logic" 
            desc="Probabilistic distribution modelling for score variance." 
            color="bg-zinc-900 border-yellow-500/30 shadow-[0_10px_30px_rgba(234,179,8,0.05)]" 
          />
          <StrategicCard 
            icon={Target} 
            title="Neural Nodes" 
            desc="Cross-verified pattern recognition across 40+ leagues." 
            color="bg-zinc-900 border-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.05)]" 
          />
          <StrategicCard 
            icon={Shield} 
            title="Risk Shield" 
            desc="Automated volatility dampening for high-stakes fixtures." 
            color="bg-zinc-900 border-sky-500/30 shadow-[0_10px_30px_rgba(14,165,233,0.05)]" 
          />
        </motion.div>
      </div>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Live Match Focus Section */}
        {matches.some(m => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status)) && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <h3 className="text-xl font-black uppercase tracking-tight text-white">Live Signal Intercepted</h3>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-red-500/30 to-transparent" />
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {matches.filter(m => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status)).slice(0, 1).map(match => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative group"
                >
                   <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-yellow-500 rounded-[32px] blur opacity-20 group-hover:opacity-40 transition-opacity" />
                   <PredictionCard 
                      match={match}
                      analysis={predictions[match.id] as any || {
                        prediction: { 
                          win_probability: { home: 45, draw: 25, away: 30 }, 
                          scoreline: 'LIVE', 
                          safe_side: 'ESTIMATING', 
                          expected_goals: { home: 0, away: 0 } 
                        },
                        risk_assessment: { level: 'High', primary_risk: 'Live Multi-Variance', safety_buffer: 'Real-time Recalculation' },
                        reasoning_summary: 'Engine syncing with live telemetry. Intelligent audit active.'
                      }}
                      onQueryAgent={() => openAgentWithMatch(match)}
                      onViewDetails={() => handleInspectMatch(match.id.toString())}
                      onRetry={() => runAnalysis(match.id.toString())}
                      isFlashing={scoreFlash[match.id]}
                      highlighted={true}
                      isAnalyzing={analyzingIds.has(match.id.toString())}
                      error={analysisErrors[match.id]}
                      globalCooldown={globalCooldown}
                    />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content: Match List Grouped by Date */}
          <div className="lg:col-span-8 space-y-12">
            <AnimatePresence mode="wait">
              {loading || isInitializing ? (
                <motion.div 
                  key="loading-skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-12 mt-8"
                >
                  {Array(2).fill(0).map((_, g) => (
                    <div key={g} className="space-y-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-48 bg-zinc-900/50 rounded-lg" />
                        <div className="h-[1px] flex-1 bg-zinc-900/30" />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array(2).fill(0).map((_, i) => (
                          <div key={i}>
                            <Card className="bg-[#1a1a1a] border-none overflow-hidden rounded-2xl h-[280px] p-6 relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/10 to-transparent -translate-x-full animate-shimmer" />
                              <div className="flex justify-between items-center mb-10">
                                <Skeleton className="h-4 w-24 bg-zinc-800 rounded-full" />
                                <Skeleton className="h-4 w-16 bg-zinc-800 rounded-full" />
                              </div>
                              <div className="flex items-center justify-between gap-4 mb-10">
                                <div className="flex flex-col items-center gap-2 flex-1">
                                  <Skeleton className="w-12 h-12 bg-zinc-800 rounded-full" />
                                  <Skeleton className="h-3 w-16 bg-zinc-800 rounded" />
                                </div>
                                <Skeleton className="h-8 w-12 bg-zinc-800 rounded-lg" />
                                <div className="flex flex-col items-center gap-2 flex-1">
                                  <Skeleton className="w-12 h-12 bg-zinc-800 rounded-full" />
                                  <Skeleton className="h-3 w-16 bg-zinc-800 rounded" />
                                </div>
                              </div>
                              <div className="space-y-3">
                                <Skeleton className="h-2 w-full bg-zinc-800 rounded-full" />
                                <div className="flex justify-between">
                                  <Skeleton className="h-2 w-1/3 bg-zinc-800 rounded-full" />
                                  <Skeleton className="h-2 w-1/4 bg-zinc-800 rounded-full" />
                                </div>
                              </div>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : Object.keys(groupedMatches).length === 0 ? (
                <motion.div 
                  key="no-signals"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-24 text-center"
                >
                   <Activity className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
                   <h3 className="text-2xl font-black uppercase tracking-tighter text-zinc-500">No active signals detected</h3>
                   <p className="text-zinc-600 text-sm mt-2">Adjust filters or check back during match hours.</p>
                </motion.div>
              ) : (
                <motion.div
                  key="match-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {Object.entries(groupedMatches).map(([date, dateMatches]) => (
                    <div key={date} className="space-y-6 mb-12 last:mb-0">
                      <h3 className="text-xl font-black uppercase tracking-tight text-zinc-200 flex items-center gap-3">
                        {date}
                        <div className="h-[1px] flex-1 bg-zinc-900" />
                      </h3>
                      
                      <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={{
                          hidden: { opacity: 0 },
                          visible: {
                            opacity: 1,
                            transition: {
                              staggerChildren: 0.05
                            }
                          }
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        {dateMatches.map((match: any) => (
                        <motion.div
                            key={match.id}
                            id={`match-${match.id}`}
                            variants={{
                              hidden: { opacity: 0, y: 20 },
                              visible: { opacity: 1, y: 0 }
                            }}
                          >
                            <PredictionCard 
                              match={match}
                              analysis={predictions[match.id] as any || {
                                prediction: { 
                                  win_probability: { home: 45, draw: 25, away: 30 }, 
                                  scoreline: 'H-A', 
                                  safe_side: 'ESTIMATING', 
                                  expected_goals: { home: 0, away: 0 } 
                                },
                                risk_assessment: { level: 'Medium', primary_risk: 'Quantum Variance', safety_buffer: 'Awaiting AI Input' },
                                reasoning_summary: 'Neural node awaiting tactical initialization.'
                              }}
                              onQueryAgent={() => openAgentWithMatch(match)}
                              onViewDetails={() => handleInspectMatch(match.id.toString())}
                              onRetry={() => runAnalysis(match.id.toString())}
                              isFlashing={scoreFlash[match.id]}
                              highlighted={detectedMatchId === match.id.toString()}
                              isAnalyzing={analyzingIds.has(match.id.toString())}
                              error={analysisErrors[match.id]}
                              globalCooldown={globalCooldown}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="sticky top-24 space-y-4">
              
              {/* My Leagues Section */}
              <div 
                onClick={() => navigate('/leagues')}
                className="bg-[#ccff00] p-6 rounded-2xl relative overflow-hidden group cursor-pointer hover:brightness-110 transition-all"
              >
                <div className="relative z-10">
                  <h4 className="text-black font-black text-xl uppercase tracking-tighter mb-4">My leagues</h4>
                  <p className="text-black/60 text-xs font-bold leading-tight max-w-[150px]">
                    Signing in is required to create and join leagues.
                  </p>
                </div>
                <div className="absolute bottom-0 right-0 p-2 opacity-40 group-hover:scale-110 transition-transform">
                   <Trophy className="w-20 h-20 text-black" />
                </div>
              </div>

              {/* Create League Section */}
              <div className="bg-emerald-400 p-6 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-emerald-300 transition-all">
                <div>
                   <h4 className="text-black font-black text-lg uppercase tracking-tight mb-1">Create a new league</h4>
                   <p className="text-black/60 text-[10px] font-bold leading-tight max-w-[200px]">
                      Create a league to compete against others.
                   </p>
                </div>
                <button className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-all">
                   <span className="text-black font-bold text-2xl">+</span>
                </button>
              </div>

              {/* Join League Section */}
              <div className="bg-emerald-300 p-6 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-emerald-200 transition-all">
                <div>
                   <h4 className="text-black font-black text-lg uppercase tracking-tight mb-1">Join a league</h4>
                   <p className="text-black/60 text-[10px] font-bold leading-tight max-w-[200px]">
                      Join an existing league by entering a code.
                   </p>
                </div>
                <button className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-all">
                   <span className="text-black font-bold text-2xl">+</span>
                </button>
              </div>

              {/* How to Play Accordion */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 cursor-pointer flex items-center justify-between hover:bg-zinc-900 transition-all">
                <span className="text-sm font-bold uppercase tracking-tight text-zinc-400">How to Play</span>
                <ChevronDown className="w-4 h-4 text-zinc-600" />
              </div>

              <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-900 p-8 rounded-[32px] hidden lg:block relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Activity className="w-20 h-20 text-yellow-500" />
                </div>
                
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-3 text-zinc-600">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" />
                  Live Sync Protocol
                </h4>
                
                <div className="space-y-8">
                  {analyzingIds.size > 0 ? (
                    <FeedItem 
                      code="SCAN.ACTIVE" 
                      msg={`Deep scanning ${analyzingIds.size} fixtures for tactical anomalies.`} 
                      time={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                      urgent
                    />
                  ) : (
                    <FeedItem 
                      code="SCAN.IDLE" 
                      msg="Baseline surveillance active. All nodes operational." 
                      time={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                    />
                  )}
                  <FeedItem 
                    code="PRL.NODE" 
                    msg="POISSON node cross-referencers initialized." 
                    time="09:14"
                  />
                  <FeedItem 
                    code="STV.SCAN" 
                    msg="Volatility spike detected in Primera Division markets." 
                    time="10:22"
                    urgent={Object.keys(analysisErrors).length > 0}
                  />
                </div>

                <div className="mt-12 flex justify-between items-center text-[8px] font-mono font-black text-zinc-800 uppercase tracking-widest">
                   <span>SECURE CHANNEL L-94</span>
                   <span className="animate-pulse">RECEIVING...</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Floating Sign In Pill */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]">
         <div className="bg-[#444]/80 backdrop-blur-md border border-zinc-700/50 rounded-full px-6 py-2 flex items-center gap-4 shadow-2xl">
            <div className="flex items-center gap-2">
               <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-500" />
               </div>
               <span className="text-[11px] font-black uppercase tracking-tight text-zinc-100">Sign in to play</span>
            </div>
            <button className="bg-white text-black text-[11px] font-black uppercase px-6 py-1.5 rounded-full hover:bg-zinc-200 transition-colors">
               Sign in
            </button>
         </div>
      </div>

      {/* Match Detail Modal */}
      <MatchDetailModal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        matchId={detailMatchId} 
      />

      <CommandConsole 
        isOpen={isCommandConsoleOpen} 
        onClose={() => setIsCommandConsoleOpen(false)} 
        matches={matches}
      />
    </div>
  );
}

const StrategicCard = ({ icon: Icon, title, desc, color }: any) => (
  <motion.div 
    variants={{
      hidden: { opacity: 0, scale: 0.9 },
      visible: { opacity: 1, scale: 1 }
    }}
    whileHover={{ y: -5 }}
    className={cn("p-6 rounded-3xl border backdrop-blur-xl group cursor-default transition-all", color)}
  >
    <div className="flex items-center gap-4 mb-3">
      <div className="p-2 rounded-xl bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h5 className="font-black uppercase tracking-tight text-white font-sans text-sm">{title}</h5>
    </div>
    <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">{desc}</p>
  </motion.div>
);

const FeedItem = ({ code, msg, time, urgent }: { code: string, msg: string, time: string, urgent?: boolean }) => (
  <div className="group/item cursor-default">
    <div className="flex items-center justify-between mb-2">
      <span className={cn("text-[9px] font-black tracking-widest uppercase", urgent ? "text-yellow-500" : "text-zinc-600")}>{code}</span>
      <span className="text-[8px] font-mono text-zinc-800">{time}</span>
    </div>
    <p className="text-[11px] text-zinc-400 font-medium leading-relaxed group-hover/item:text-zinc-200 transition-colors">{msg}</p>
  </div>
);
