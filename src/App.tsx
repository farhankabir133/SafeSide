import { usePredictions } from "@/src/hooks/usePredictions";
import { PredictionCard } from "@/src/components/PredictionCard";
import { ChatInterface } from "@/src/components/ChatInterface";
import { HistoricalAnalysis } from "@/src/components/HistoricalAnalysis";
import { MatchDetailModal } from "@/src/components/MatchDetailModal";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Separator } from "@/src/components/ui/separator";
import { Skeleton } from "@/src/components/ui/skeleton";
import { BrainCircuit, Trophy, Target, Activity, Zap, Info, RefreshCw, Globe, ChevronDown, AlertTriangle, MessageSquare, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { Card } from "@/src/components/ui/card";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import React, { useMemo, useState, useEffect } from "react";

export default function App() {
  const { matches, loading, error, predictions, runAnalysis, stats, fetchMatches, isDemo, rateLimit, lastSyncedAt, historicalData } = usePredictions();
  const [expandedLeagues, setExpandedLeagues] = useState<Record<string, boolean>>({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [scoreFlash, setScoreFlash] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailMatchId, setDetailMatchId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
    const handleDetection = (e: any) => {
      const match = e.detail;
      setSelectedMatch(match);
      if (match.competition?.name) {
        setExpandedLeagues(prev => ({ ...prev, [match.competition.name]: true }));
      }
    };
    window.addEventListener('matchDetected', handleDetection);
    return () => window.removeEventListener('matchDetected', handleDetection);
  }, []);

  const handleQueryAgent = (match: any) => {
    setSelectedMatch(match);
    setIsChatOpen(true);
  };

  const handleInspectMatch = (matchId: string) => {
    setDetailMatchId(matchId);
    setIsDetailModalOpen(true);
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
      const competition = match.competition?.name || "Other Competitions";
      if (!groups[competition]) groups[competition] = [];
      groups[competition].push(match);
    });
    return groups;
  }, [filteredMatches]);

  const toggleLeague = (league: string) => {
    setExpandedLeagues(prev => ({ ...prev, [league]: !prev[league] }));
  };

  return (
    <div className="text-zinc-100 font-sans selection:bg-yellow-500 selection:text-black">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-start">
          <div className="lg:col-span-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-8">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/5 font-mono text-[9px] py-1.5 px-4 rounded-lg uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  G.I.N (Global Intelligence Network) Active
                </Badge>
                {isDemo && (
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 bg-yellow-500/5 font-mono text-[9px] py-1.5 px-4 rounded-lg uppercase tracking-[0.2em] animate-pulse">
                    Simulation Overlay
                  </Badge>
                )}
              </div>
              <h2 className="text-[clamp(3.5rem,8vw,6rem)] font-black tracking-tighter leading-[0.85] mb-6 uppercase">
                Tactical <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 animate-gradient">Superiority.</span>
              </h2>
              <p className="text-lg md:text-xl text-zinc-500 font-medium max-w-2xl leading-relaxed">
                SafeSide Intelligence integrates deep-learning POISSON modeling with real-time tactical drift analysis to identify value gaps in the May 2026 fixtures market.
              </p>
              
              <div className="flex flex-wrap gap-4 mt-10">
                 <Button className="h-14 px-8 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs tracking-widest rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                   Initialize Full Scan
                 </Button>
                 <Button variant="outline" className="h-14 px-8 border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white font-black uppercase text-xs tracking-widest rounded-2xl">
                   Access Archives
                 </Button>
              </div>
            </motion.div>
          </div>
          <div className="lg:col-span-4 space-y-4">
             <div className="p-8 bg-zinc-950/50 backdrop-blur-sm border border-zinc-900 rounded-[32px] relative overflow-hidden group hover:border-zinc-700 transition-all duration-500">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                   <Target className="w-24 h-24 text-white" />
                </div>
                <div className="relative z-10">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">
                     <div className="w-1 h-1 rounded-full bg-zinc-600" />
                     Mission Directives
                   </h4>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between group/line">
                         <span className="text-[10px] font-black uppercase text-zinc-700 tracking-widest group-hover/line:text-zinc-500 transition-colors">Success Rate</span>
                         <span className="text-lg font-black text-emerald-500">78.4%</span>
                      </div>
                      <div className="h-px bg-zinc-900" />
                      <div className="flex items-center justify-between group/line">
                         <span className="text-[10px] font-black uppercase text-zinc-700 tracking-widest group-hover/line:text-zinc-500 transition-colors">Value Yield</span>
                         <span className="text-lg font-black text-yellow-500">+12.4u</span>
                      </div>
                      <div className="h-px bg-zinc-900" />
                      <div className="flex items-center justify-between group/line">
                         <span className="text-[10px] font-black uppercase text-zinc-700 tracking-widest group-hover/line:text-zinc-500 transition-colors">Risk Index</span>
                         <span className="text-lg font-black text-red-500">MODERATE</span>
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="p-4 bg-zinc-900/50 rounded-2xl flex items-center gap-4 border border-zinc-800/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 leading-tight">
                   Terminal Sync: {lastSyncedAt?.toLocaleTimeString() || "AWAITING HANDSHAKE"}
                </p>
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { label: 'Predictions Tracked', value: stats.total, icon: Target, color: 'text-blue-500' },
            { label: 'System Accuracy', value: `${stats.accuracy.toFixed(1)}%`, icon: Trophy, color: 'text-emerald-500' },
            { label: 'Market Volatility', value: 'High', icon: Activity, color: 'text-red-500' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl flex items-center justify-between group hover:border-zinc-700 transition-colors"
            >
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">{stat.label}</p>
                <p className={`text-4xl font-black leading-none ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon className={`w-10 h-10 ${stat.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
            </motion.div>
          ))}
        </div>

        {/* Historical Trends Section */}
        <section className="mb-24">
          <HistoricalAnalysis data={historicalData} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Feed */}
          <div className="lg:col-span-8 space-y-12">
            <div>
              <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-yellow-500" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Live Market Feed</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {["Premier League", "Primera Division", "Champions League"].map(league => (
                      <Button
                        key={league}
                        variant="ghost"
                        size="sm"
                        onClick={() => setLeagueFilter(league)}
                        className={cn(
                          "hidden md:flex text-[9px] font-black uppercase tracking-widest h-8 px-3 rounded-lg border",
                          leagueFilter === league 
                            ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500" 
                            : "border-zinc-900 text-zinc-500 hover:border-zinc-700"
                        )}
                      >
                        {league === "Primera Division" ? "LA LIGA" : league}
                      </Button>
                    ))}
                    <Separator orientation="vertical" className="h-6 bg-zinc-800 mx-2 hidden md:block" />
                    {lastSyncedAt && (
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest leading-none mb-1">Frequency Sync</span>
                        <span className="text-[10px] font-mono text-zinc-500">{lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fetchMatches()}
                      disabled={loading}
                      className="bg-zinc-900 border-zinc-800 text-[10px] uppercase font-bold tracking-widest hover:bg-zinc-800 h-10 px-4"
                    >
                      <RefreshCw className={cn("w-3 h-3 mr-2", loading && "animate-spin")} />
                      Sync
                    </Button>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 relative group">
                    <BrainCircuit className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="SCAN TEAMS..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-3 pl-10 pr-4 text-[10px] font-black tracking-widest uppercase focus:outline-none focus:border-yellow-500/50 transition-all placeholder:text-zinc-700"
                    />
                  </div>
                  
                  <div className="md:col-span-8 flex flex-wrap items-center gap-2">
                    <div className="flex bg-zinc-950 border border-zinc-900 p-1 rounded-xl">
                      {["all", "live", "upcoming", "finished"].map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={cn(
                            "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                            statusFilter === status 
                              ? "bg-yellow-500 text-black" 
                              : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex-1 min-w-[200px]">
                      <select 
                        value={leagueFilter}
                        onChange={(e) => setLeagueFilter(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-2 px-4 text-[10px] font-black tracking-widest uppercase focus:outline-none focus:border-yellow-500/50 transition-all text-zinc-400 appearance-none cursor-pointer"
                      >
                        <option value="all">ALL COMPETITIONS</option>
                        {uniqueLeagues.map(league => (
                          <option key={league} value={league}>
                            {league === "Primera Division" ? "LA LIGA (PRIMERA)" : league.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                      <select 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-2 px-4 text-[10px] font-black tracking-widest uppercase focus:outline-none focus:border-yellow-500/50 transition-all text-zinc-400 appearance-none cursor-pointer"
                      >
                        <option value="all">ANY DATE</option>
                        <option value="today">TODAY</option>
                        <option value="tomorrow">TOMORROW</option>
                        <option value="week">NEXT 7 DAYS</option>
                      </select>
                    </div>

                    {(leagueFilter !== "all" || statusFilter !== "all" || searchQuery !== "" || dateFilter !== "all") && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setStatusFilter("all");
                          setLeagueFilter("all");
                          setDateFilter("all");
                          setSearchQuery("");
                        }}
                        className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-red-400"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Clear Grid
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <Alert className="bg-red-950/20 border-red-900 text-red-400 mb-8">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Network Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-12">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full bg-zinc-900 rounded-2xl" />
                  ))
                ) : filteredMatches.length === 0 ? (
                  <div className="bg-zinc-950 border border-zinc-900 border-dashed rounded-3xl p-12 text-center">
                    <p className="text-zinc-500 font-medium mb-4">
                      {matches.length === 0 
                        ? "No matches detected on the current frequency." 
                        : "No matches match your current filters."}
                    </p>
                    {(statusFilter !== "all" || leagueFilter !== "all" || searchQuery !== "" || dateFilter !== "all") && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setStatusFilter("all");
                          setLeagueFilter("all");
                          setDateFilter("all");
                          setSearchQuery("");
                        }}
                        className="bg-zinc-900 border-zinc-800 text-[10px] uppercase font-bold tracking-widest hover:bg-zinc-800"
                      >
                        Reset Grid Configuration
                      </Button>
                    )}
                  </div>
                ) : (
                  Object.entries(groupedMatches).map(([leagueName, leagueMatches]) => (
                    <div key={leagueName} className="space-y-4">
                      <button 
                        onClick={() => toggleLeague(leagueName)}
                        className="flex items-center gap-4 w-full p-2 hover:bg-zinc-950 transition-colors rounded-xl group"
                      >
                        <Badge variant="outline" className="border-zinc-800 text-zinc-500 font-black text-[10px] tracking-tighter py-1 px-3 group-hover:border-yellow-500/50 group-hover:text-yellow-500 transition-all">
                          {leagueMatches.length} FIXTURES
                        </Badge>
                        <h4 className="text-3xl font-black tracking-tighter uppercase text-zinc-400 group-hover:text-white transition-colors">{leagueName}</h4>
                        <div className="h-[1px] flex-1 bg-zinc-900" />
                        <ChevronDown className={cn("w-6 h-6 text-zinc-700 group-hover:text-white transition-all transform", expandedLeagues[leagueName] ? "rotate-0" : "-rotate-90")} />
                      </button>

                      <AnimatePresence>
                        {expandedLeagues[leagueName] !== false && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-4"
                          >
                            {leagueMatches.map((match: any) => {
                              const prediction = predictions[match.id];
                              const isSelected = selectedMatch?.id === match.id;
                              return (
                                <div key={match.id} className={cn("pt-2 transition-all duration-500", isSelected && "scale-[1.02]")}>
                                  {prediction ? (
                                    <motion.div 
                                      initial={{ scale: 0.95, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      className={cn(isSelected && "ring-2 ring-yellow-500/50 rounded-3xl shadow-[0_0_30px_rgba(234,179,8,0.15)]")}
                                    >
                                      <PredictionCard 
                                        match={match}
                                        analysis={prediction as any}
                                        onQueryAgent={() => handleQueryAgent(match)}
                                        onViewDetails={() => handleInspectMatch(match.id.toString())}
                                        isFlashing={scoreFlash[match.id]}
                                      />
                                    </motion.div>
                                  ) : (
                                    <Card className={cn(
                                      "bg-zinc-950 border-zinc-900 overflow-hidden group hover:border-zinc-700 transition-all rounded-3xl",
                                      isSelected && "border-yellow-500/50 ring-1 ring-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.1)]"
                                    )}>
                                      <div className="p-8 flex items-center justify-between">
                                        <div className="flex-1 grid grid-cols-3 items-center gap-4">
                                          <span className="text-right font-black text-xl tracking-tighter uppercase truncate">{match.homeTeam.name}</span>
                                          <div className="flex flex-col items-center">
                                            <div className="mb-2">
                                              {getStatusBadge(match.status)}
                                            </div>
                                            <span className={cn(
                                              "text-xs font-mono px-3 py-1 rounded-full border whitespace-nowrap flex items-center gap-2 transition-all duration-300",
                                              ['IN_PLAY', 'PAUSED', 'LIVE'].includes(match.status) 
                                                ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" 
                                                : "bg-yellow-500/5 text-yellow-500/80 border-yellow-500/10",
                                              scoreFlash[match.id] && "bg-emerald-500 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.5)] text-black border-transparent"
                                            )}>
                                              {['IN_PLAY', 'PAUSED', 'LIVE'].includes(match.status) ? (
                                                <span className="text-sm font-black">
                                                  {match.score?.fullTime?.home ?? 0} — {match.score?.fullTime?.away ?? 0}
                                                </span>
                                              ) : (
                                                <>
                                                  {new Date(match.utcDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} — {new Date(match.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </>
                                              )}
                                            </span>
                                          </div>
                                          <span className="text-left font-black text-xl tracking-tighter uppercase truncate">{match.awayTeam.name}</span>
                                        </div>
                                        <Button 
                                          onClick={() => runAnalysis(match.id.toString())}
                                          className="ml-8 bg-zinc-900 hover:bg-yellow-500 hover:text-black transition-all border border-zinc-800 group h-14 px-8"
                                          size="lg"
                                        >
                                          <BrainCircuit className="w-5 h-5 mr-3" />
                                          <span className="font-black uppercase tracking-tighter">Analyze</span>
                                        </Button>
                                        <Button 
                                          onClick={() => handleQueryAgent(match)}
                                          variant="ghost"
                                          className="ml-2 bg-transparent hover:bg-zinc-900 text-zinc-500 hover:text-zinc-100 border border-transparent hover:border-zinc-800 transition-all h-14 w-14 p-0 rounded-2xl"
                                        >
                                          <MessageSquare className="w-5 h-5" />
                                        </Button>
                                      </div>
                                    </Card>
                                  )}
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - AI Interface (Hidden on mobile if desired, but we'll show it as a desktop option) */}
          <div className="lg:col-span-4 space-y-8 hidden lg:block">
            <div className="sticky top-24">
               <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                  <div className="flex items-center gap-2 text-yellow-500 mb-1">
                     <BrainCircuit className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Agent Status: Active</span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium">Professional scanning engine initialized.</p>
               </div>
               <ChatInterface 
                 matches={matches} 
                 selectedMatch={selectedMatch} 
                 onClearSelected={() => setSelectedMatch(null)}
               />
               
               <div className="mt-8 bg-zinc-950 border border-zinc-900 p-8 rounded-3xl">
                <h4 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                  <Info className="w-5 h-5 text-zinc-500" />
                  Methodology
                </h4>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-emerald-500/10 p-2 h-fit rounded border border-emerald-500/20">
                      <Activity className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest mb-1 text-zinc-300">Fatigue Factor</p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">Calculates remaining energy reserves based on season minutes played.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-yellow-500/10 p-2 h-fit rounded border border-yellow-500/20">
                      <Zap className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest mb-1 text-zinc-300">Tactical Drift</p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">Models coach-specific adaptations for end-of-season pressure points.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Chat Interface for Mobile & Global Access */}
      <div className="fixed bottom-6 right-6 z-[100]">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 right-0 w-[calc(100vw-3rem)] sm:w-[400px] shadow-2xl"
            >
              <ChatInterface 
                matches={matches} 
                selectedMatch={selectedMatch}
                onClearSelected={() => setSelectedMatch(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        <Button
          onClick={() => setIsChatOpen(!isChatOpen)}
          size="lg"
          className={cn(
            "w-16 h-16 rounded-full shadow-2xl transition-all duration-300",
            isChatOpen ? "bg-zinc-900 border-zinc-800 text-white" : "bg-yellow-500 hover:bg-yellow-400 text-black px-0"
          )}
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          {!isChatOpen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          )}
        </Button>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-4 mt-24">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 grayscale opacity-30">
             <BrainCircuit className="w-6 h-6" />
             <span className="font-black text-xl tracking-tighter uppercase">Safe Side</span>
          </div>
          <div className="flex gap-8 text-[10px] uppercase font-bold tracking-widest text-zinc-600 font-mono">
            <span>© 2026 INTERNAL USE ONLY</span>
            <button className="hover:text-white transition-colors">Documentation</button>
            <button className="hover:text-white transition-colors">Privacy</button>
          </div>
        </div>
      </footer>

      {/* Match Detail Modal */}
      <MatchDetailModal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        matchId={detailMatchId} 
      />
    </div>
  );
}
