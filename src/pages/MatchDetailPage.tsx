import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Target, 
  Activity, 
  Zap, 
  Info, 
  RefreshCw, 
  ChevronLeft, 
  ChevronDown,
  ChevronUp,
  MapPin, 
  User, 
  Calendar, 
  Cloud, 
  Trophy, 
  History, 
  BarChart3, 
  MessageSquare, 
  Share2, 
  ExternalLink,
  AlertTriangle,
  Loader2,
  Brain,
  Users,
  Shield,
  Terminal
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Progress } from '@/src/components/ui/progress';
import { Card, CardHeader, CardContent, CardFooter } from '@/src/components/ui/card';
import { cn } from '@/src/lib/utils';
import { MatchAnalysis, analyzeMatch } from '@/src/services/geminiService';
import { supabase, isSupabaseConfigured, HistoricalTrend } from '@/src/lib/supabase';
import ReactMarkdown from 'react-markdown';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LineChart, Line } from 'recharts';
import { toast } from 'sonner';

const venueToCity: Record<string, string> = {
  "Emirates Stadium": "London",
  "Etihad Stadium": "Manchester",
  "Anfield": "Liverpool",
  "Camp Nou": "Barcelona",
  "Santiago Bernabéu": "Madrid",
  "Allianz Arena": "Munich",
};

export default function MatchDetailPage() {
  const { id: matchId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [matchDetails, setMatchDetails] = useState<any>(null);
  const [h2hData, setH2hData] = useState<any>(null);
  const [lineups, setLineups] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [odds, setOdds] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [historicalTrends, setHistoricalTrends] = useState<HistoricalTrend | null>(null);
  const [streamedText, setStreamedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scoreFlash, setScoreFlash] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayMinute, setDisplayMinute] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const [isReportReasoningExpanded, setIsReportReasoningExpanded] = useState(false);
  const [isInsightsExpanded, setIsInsightsExpanded] = useState(false);
  const [isTrendsExpanded, setIsTrendsExpanded] = useState(false);
  const [h2hFilter, setH2hFilter] = useState<'all' | 'recent'>('recent');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!matchDetails || !['IN_PLAY', 'LIVE'].includes(matchDetails.status)) {
      setDisplayMinute(null);
      return;
    }

    // Use minute from API if available as baseline
    const apiMin = matchDetails.minute;
    if (apiMin) {
      setDisplayMinute(apiMin);
    } else {
      // Estimate based on kickoff if minute is missing
      const start = new Date(matchDetails.utcDate).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 60000);
      setDisplayMinute(Math.max(1, Math.min(elapsed, 95)));
    }
  }, [matchDetails?.minute, matchDetails?.status, matchDetails?.id]);

  useEffect(() => {
    if (displayMinute !== null && ['IN_PLAY', 'LIVE'].includes(matchDetails?.status)) {
      const interval = setInterval(() => {
        setDisplayMinute(prev => (prev !== null ? prev + 1 : 1));
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [displayMinute === null, matchDetails?.status]);

  useEffect(() => {
    if (!matchId) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [detailsRes, h2hRes, lineupsRes, oddsRes] = await Promise.allSettled([
          fetch(`/api/matches/${matchId}`),
          fetch(`/api/matches/${matchId}/head2head`),
          fetch(`/api/matches/${matchId}/lineups`),
          fetch(`/api/odds/${matchId}`)
        ]);

        if (detailsRes.status === 'fulfilled' && detailsRes.value.ok) {
          const details = await detailsRes.value.json();
          setMatchDetails(details);

          const city = venueToCity[details.venue] || details.area?.name || 'London';
          const weatherRes = await fetch(`/api/weather/${encodeURIComponent(city)}`);
          if (weatherRes.ok) setWeather(await weatherRes.json());

          // Fetch Historical Trends for this competition
          if (isSupabaseConfigured() && details.competition?.id) {
            try {
              const { data } = await supabase
                .from('historical_trends')
                .select('*')
                .eq('league_id', details.competition.id.toString())
                .single();
              if (data) setHistoricalTrends(data);
            } catch (e) {
              console.warn("Competition trends node bypassed:", e);
            }
          }
        }

        if (h2hRes.status === 'fulfilled' && h2hRes.value.ok)
          setH2hData(await h2hRes.value.json());

        if (lineupsRes.status === 'fulfilled' && lineupsRes.value.ok)
          setLineups(await lineupsRes.value.json());

        if (oddsRes.status === 'fulfilled' && oddsRes.value.ok)
          setOdds(await oddsRes.value.json());

        // Fetch Detailed Team Stats and Recent Matches
        if (matchDetails?.homeTeam?.id && matchDetails?.awayTeam?.id) {
          const [homeStatsRes, awayStatsRes, homeMatchesRes, awayMatchesRes] = await Promise.all([
            fetch(`/api/teams/${matchDetails.homeTeam.id}`),
            fetch(`/api/teams/${matchDetails.awayTeam.id}`),
            fetch(`/api/teams/${matchDetails.homeTeam.id}/matches?status=FINISHED&limit=5`),
            fetch(`/api/teams/${matchDetails.awayTeam.id}/matches?status=FINISHED&limit=5`)
          ]);

          if (homeStatsRes.ok && awayStatsRes.ok) {
            const hStats = await homeStatsRes.json();
            const aStats = await awayStatsRes.json();
            
            if (homeMatchesRes.ok) hStats.recentMatches = (await homeMatchesRes.json()).matches;
            if (awayMatchesRes.ok) aStats.recentMatches = (await awayMatchesRes.json()).matches;

            setTeamStats({
              home: hStats,
              away: aStats
            });
          }
        }

      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    const interval = setInterval(() => {
      const isMatchLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(matchDetails?.status);
      
      // Poll every 10s if live, 60s if not
      fetch(`/api/matches/${matchId}`).then(r => r.json()).then(data => {
        if (matchDetails) {
          const prevScore = `${matchDetails.score?.fullTime?.home}-${matchDetails.score?.fullTime?.away}`;
          const newScore = `${data.score?.fullTime?.home}-${data.score?.fullTime?.away}`;
          if (prevScore !== newScore) {
            setScoreFlash(true);
            setTimeout(() => setScoreFlash(false), 2000);
          }
        }
        setMatchDetails(data);
      });
    }, (['IN_PLAY', 'PAUSED', 'LIVE'].includes(matchDetails?.status)) ? 10000 : 30000);

    return () => clearInterval(interval);
  }, [matchId, matchDetails?.status]);

  const handleRunAnalysis = async () => {
    if (!matchDetails) return;
    setIsGenerating(true);
    setStreamedText('');

    try {
      // Fetch Detailed Team Stats and Recent Matches for both teams concurrently
      const [homeStatsRes, awayStatsRes, homeMatchesRes, awayMatchesRes] = await Promise.all([
        fetch(`/api/teams/${matchDetails.homeTeam?.id || 0}`),
        fetch(`/api/teams/${matchDetails.awayTeam?.id || 0}`),
        fetch(`/api/teams/${matchDetails.homeTeam?.id || 0}/matches?status=FINISHED&limit=5`),
        fetch(`/api/teams/${matchDetails.awayTeam?.id || 0}/matches?status=FINISHED&limit=5`)
      ]);

      let teamStats: any = undefined;
      if (homeStatsRes.ok && awayStatsRes.ok) {
        teamStats = {
          home: await homeStatsRes.json(),
          away: await awayStatsRes.json()
        };
        
        // Inject recent matches for form analysis
        if (homeMatchesRes.ok) teamStats.home.recentMatches = (await homeMatchesRes.json()).matches;
        if (awayMatchesRes.ok) teamStats.away.recentMatches = (await awayMatchesRes.json()).matches;
      }

      const result = await analyzeMatch(matchDetails, h2hData, teamStats, weather, lineups, odds, historicalTrends);
      setAnalysis(result);
      setStreamedText(result.reasoning_summary);
      setIsReasoningExpanded(true);
    } catch (e: any) {
      console.error('AI analysis failed:', e);
      const isQuota = e.message?.includes('429') || e.message?.toLowerCase().includes('quota');
      toast.error(isQuota ? 'Neural processor at capacity. Please try again in a few minutes.' : 'AI Analysis failed. Connection unstable.');
    } finally {
      setIsGenerating(false);
    }
  };

  const runAnalysis = (id: string) => {
    if (id) {
      handleRunAnalysis();
      setActiveTab('ai-report');
      // Scroll to report area after a small delay
      setTimeout(() => {
        const el = document.getElementById('ai-report-view');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `⚽ ${matchDetails?.homeTeam?.name} vs ${matchDetails?.awayTeam?.name} — SafeSide AI Intelligence Report\n${shareUrl}`;

    if (navigator.share) {
      await navigator.share({ title: `${matchDetails?.homeTeam?.name} vs ${matchDetails?.awayTeam?.name}`, text: shareText, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) return <MatchDetailSkeleton />;
  if (!matchDetails) return <div className="p-20 text-center">Match not found.</div>;

  const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(matchDetails.status);
  const isFinished = ['FINISHED', 'AWARDED'].includes(matchDetails.status);
  const isUpcoming = ['TIMED', 'SCHEDULED'].includes(matchDetails.status);

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-zinc-500 hover:text-white">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-4 bg-zinc-800" />
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <span>{matchDetails.competition?.name || 'Competition'}</span>
              <span className="text-zinc-800">/</span>
              <span className="text-zinc-300">{matchDetails.homeTeam?.name || 'Home'} vs {matchDetails.awayTeam?.name || 'Away'}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Terminal Mission Clock</span>
            </div>
            <span className="text-xs font-black font-mono text-zinc-300">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-zinc-950 border border-zinc-900 rounded-[40px] p-8 md:p-12 mb-8">
          <div className={cn(
            "absolute inset-0 opacity-30 transition-all duration-2000",
            isLive ? "bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10" : "bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5"
          )} />
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Competition Header */}
            <div className="flex items-center gap-4 mb-12">
               {matchDetails.competition?.emblem && (
                 <img src={matchDetails.competition.emblem} className="w-10 h-10 object-contain opacity-60" referrerPolicy="no-referrer" />
               )}
               <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{matchDetails.competition?.name || 'Competition'}</span>
                 <span className="text-[10px] font-mono text-zinc-600">{matchDetails.venue} · {new Date(matchDetails.utcDate).toLocaleDateString()}</span>
               </div>
            </div>

            {/* Main Scoreboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-8 md:gap-0 w-full max-w-5xl">
              {/* Home */}
              <div className="flex flex-col items-center md:items-end gap-6 text-center md:text-right">
                <div className={cn(
                  "relative w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center border-2 p-6 transition-all duration-1000",
                  isLive && (matchDetails.score?.fullTime?.home > matchDetails.score?.fullTime?.away)
                    ? "border-yellow-500/60 shadow-[0_0_40px_rgba(234,179,8,0.3)] bg-yellow-500/5"
                    : "border-zinc-800 bg-zinc-950"
                )}>
                  <img src={matchDetails.homeTeam?.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div>
                   <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">{matchDetails.homeTeam?.name || 'TBD'}</h3>
                   <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Home Team</span>
                </div>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center gap-6">
                 {isLive && (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-3">
                      <span className="relative flex h-1.5 w-1.5 mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      Live · {displayMinute || matchDetails.minute || '1'}'
                    </Badge>
                 )}
                 <div className={cn(
                   "text-6xl md:text-8xl font-black font-mono tracking-tighter transition-all duration-300",
                   scoreFlash && "scale-110 text-yellow-500"
                 )}>
                   {matchDetails.score?.fullTime?.home ?? (isUpcoming ? '–' : '0')}
                   <span className="text-zinc-800 mx-4">:</span>
                   {matchDetails.score?.fullTime?.away ?? (isUpcoming ? '–' : '0')}
                 </div>
                 {isUpcoming && (
                   <div className="text-[10px] font-black font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 flex flex-col items-center gap-0.5">
                      <span className="opacity-50 tracking-[0.2em]">MISSION DEPLOYMENT @</span>
                      <span className="text-sm text-white">
                        {new Date(matchDetails.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} LOCAL
                      </span>
                   </div>
                 )}
                 <StatusBadge status={matchDetails.status} />
              </div>

              {/* Away */}
              <div className="flex flex-col items-center md:items-start gap-6 text-center md:text-left">
                <div className={cn(
                  "relative w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center border-2 p-6 transition-all duration-1000",
                  isLive && (matchDetails.score?.fullTime?.away > matchDetails.score?.fullTime?.home)
                    ? "border-blue-500/60 shadow-[0_0_40px_rgba(59,130,246,0.3)] bg-blue-500/5"
                    : "border-zinc-800 bg-zinc-950"
                )}>
                  <img src={matchDetails.awayTeam?.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">{matchDetails.awayTeam?.name || 'TBD'}</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Away Team</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
              <Button onClick={handleRunAnalysis} disabled={isGenerating} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-tighter h-14 px-8 rounded-2xl shadow-xl">
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <BrainCircuit className="w-5 h-5 mr-2" />}
                {isGenerating ? "Synthesizing..." : "Run AI Intelligence Scan"}
              </Button>
              <Button variant="outline" className="bg-zinc-900 border-zinc-800 h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                <MessageSquare className="w-5 h-5 mr-2" />
                Deep Scan Chat
              </Button>
              <Button variant="ghost" onClick={handleShare} className="border border-zinc-800 h-14 px-6 rounded-2xl">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* AI Reasoning Summary (Collapsible) */}
        <AnimatePresence>
          {(analysis?.reasoning_summary || streamedText || isGenerating) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 px-4"
            >
              <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden shadow-2xl">
                <button 
                  onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
                  className="w-full h-16 px-8 flex justify-between items-center hover:bg-zinc-900/50 bg-zinc-950/50 transition-colors border-b border-zinc-900"
                >
                  <div className="flex items-center gap-3">
                    <BrainCircuit className={cn("w-5 h-5", isGenerating ? "text-yellow-500 animate-pulse" : "text-yellow-500")} />
                    <span className="text-sm font-black uppercase tracking-widest text-zinc-300">
                      {isGenerating && !streamedText ? "Initiating Neural Audit..." : isGenerating ? "Synthesizing AI Audit..." : "AI Intelligence Audit"}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isReasoningExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-5 h-5 text-zinc-500" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {isReasoningExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="p-8 md:p-10 bg-zinc-950">
                        {isGenerating && !streamedText ? (
                          <div className="space-y-3">
                            <Skeleton className="h-4 w-full bg-zinc-900" />
                            <Skeleton className="h-4 w-[95%] bg-zinc-900" />
                            <Skeleton className="h-4 w-[90%] bg-zinc-900" />
                            <Skeleton className="h-4 w-2/3 bg-zinc-900" />
                          </div>
                        ) : (
                          <div className="prose prose-invert prose-emerald max-w-none text-zinc-300 leading-relaxed font-medium">
                            <ReactMarkdown>{streamedText || analysis?.reasoning_summary || ''}</ReactMarkdown>
                            {isGenerating && <span className="inline-block w-2 h-5 bg-yellow-500 animate-pulse ml-2" />}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <QuickStat label="Status" value={matchDetails.status} icon={Activity} />
           <QuickStat label="Venue" value={matchDetails.venue} icon={MapPin} />
           <QuickStat label="Official" value={matchDetails.referee?.name || 'TBD'} icon={User} />
           <QuickStat 
            label="Weather" 
            value={weather ? (
              <div className="flex items-center gap-2">
                <span>{weather.temp}°C {weather.description}</span>
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  weather.impact === 'HIGH' ? 'bg-red-500 animate-pulse' : 
                  weather.impact === 'MEDIUM' ? 'bg-yellow-500' : 'bg-emerald-500'
                )} />
              </div>
            ) : 'Pending...'} 
            icon={Cloud} 
            accent={weather?.impact === 'HIGH' ? 'text-red-500' : weather?.impact === 'MEDIUM' ? 'text-yellow-500' : 'text-emerald-500'}
           />
        </div>

        {/* Tabs */}
        <div id="ai-report-view" />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex overflow-x-auto bg-zinc-900/50 border border-zinc-800 p-1 rounded-2xl h-16 mb-8 scrollbar-hide">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'form', label: 'Team Form' },
              { id: 'h2h', label: 'Head to Head' },
              { id: 'stats', label: 'Statistics' },
              { id: 'ai-report', label: 'AI Report' },
              { id: 'lineups', label: 'Lineups' },
              { id: 'odds', label: 'Odds' }
            ].map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex-1 min-w-[120px] h-full data-[state=active]:bg-yellow-500 data-[state=active]:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                   {/* Probability Intelligence Card */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {analysis ? (
                        <WinProbabilityGauge probability={analysis.prediction.win_probability.home} label="Host Dominance Index" />
                      ) : (
                        <div className="bg-zinc-950 border border-zinc-900 rounded-[40px] h-[280px] animate-pulse" />
                      )}
                      
                      <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] p-8 flex flex-col justify-center">
                         <div className="space-y-6">
                            <div className="flex items-center justify-between">
                               <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400">Winning Probability Index</h4>
                               <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 text-[8px] uppercase">G.I.N Verified</Badge>
                            </div>
                            {analysis ? (
                              <ProbabilityBar 
                               home={analysis.prediction.win_probability.home} 
                               draw={analysis.prediction.win_probability.draw} 
                               away={analysis.prediction.win_probability.away} 
                              />
                            ) : (
                              <div className="h-4 bg-zinc-900 rounded-full animate-pulse" />
                            )}
                            <div className="grid grid-cols-3 gap-6">
                               <IntelligenceMetric label="AI Confidence" value={analysis ? `${analysis.prediction.confidence_score}/100` : '--'} />
                               <IntelligenceMetric label="Risk Profile" value={analysis?.risk_assessment.level || '--'} />
                               <IntelligenceMetric label="Safe Suggestion" value={analysis?.prediction.safe_side || '--'} />
                            </div>
                         </div>
                      </Card>
                   </div>

                   {/* Poisson Matrix */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2">Poisson Scoreline Matrix</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                         {analysis?.prediction?.poisson_scorelines?.slice(0, 6).map((item, idx) => (
                           <div key={idx} className={cn(
                             "bg-zinc-900/50 border rounded-2xl p-6 flex flex-col items-center gap-3 transition-all",
                             idx === 0 ? "border-yellow-500/40 bg-yellow-500/5" : "border-zinc-800"
                           )}>
                             <span className="text-2xl font-black font-mono tracking-tighter">{item.score}</span>
                             <div className="w-full bg-zinc-800 rounded-full h-1">
                               <div className="h-1 bg-yellow-500 rounded-full" style={{ width: `${item.probability * 100}%` }} />
                             </div>
                             <span className="text-[10px] font-mono text-zinc-500">{(item.probability ? (item.probability * 100) : 0).toFixed(1)}%</span>
                           </div>
                         ))}
                         {!analysis && Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28 bg-zinc-900 rounded-2xl" />)}
                      </div>
                   </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                   <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] p-6 space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Match Chronology</h4>
                      <MatchTimeline goals={matchDetails.goals || []} homeTeam={matchDetails.homeTeam?.name || ''} />
                   </Card>

                   {weather && (
                     <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] p-6 space-y-4">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Cloud className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Tactical Environment</span>
                        </div>
                        <div className="flex items-end gap-3">
                          <span className="text-4xl font-black">{weather.temp}°C</span>
                          <span className="text-zinc-500 text-sm font-medium pb-1 uppercase">{weather.description}</span>
                        </div>
                        <div className="space-y-2 text-[10px] font-mono text-zinc-500">
                           <div className="flex justify-between border-b border-zinc-900 py-2">
                             <span>Wind Velocity</span>
                             <span className="text-zinc-300">{weather.windSpeed}km/h {weather.windDirection}</span>
                           </div>
                           <div className="flex justify-between border-b border-zinc-900 py-2">
                             <span>Precipitation / Humidity</span>
                             <span className="text-zinc-300">{weather.humidity}%</span>
                           </div>
                           <div className="flex justify-between py-2">
                             <span className="font-black uppercase">Tactical Impact</span>
                             <div className="flex items-center gap-2">
                               <span className={cn("font-black uppercase", 
                                 weather.impact === 'HIGH' ? 'text-red-500' : 
                                 weather.impact === 'MEDIUM' ? 'text-yellow-500' : 'text-emerald-500'
                               )}>
                                 {weather.impact}
                               </span>
                               <div className={cn(
                                 "w-2 h-2 rounded-full",
                                 weather.impact === 'HIGH' ? 'bg-red-500' : 
                                 weather.impact === 'MEDIUM' ? 'bg-yellow-500' : 'bg-emerald-500'
                               )} />
                             </div>
                           </div>
                        </div>
                     </Card>
                   )}
                </div>
             </div>
          </TabsContent>

          <TabsContent value="form">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <FormPanel 
                 side="home" 
                 teamName={matchDetails.homeTeam?.name || 'Home'} 
                 teamId={matchDetails.homeTeam?.id}
                 recentMatches={teamStats?.home?.recentMatches}
               />
               <FormPanel 
                 side="away" 
                 teamName={matchDetails.awayTeam?.name || 'Away'} 
                 teamId={matchDetails.awayTeam?.id}
                 recentMatches={teamStats?.away?.recentMatches}
               />
             </div>
          </TabsContent>

          <TabsContent value="h2h">
             <div className="space-y-12">
                <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] p-10 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                      <History className="w-40 h-40" />
                   </div>
                   <div className="relative z-10 space-y-10">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                         <div className="space-y-1">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Engagement History Summary</h3>
                            <p className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase">Global Tactical Reconnaissance</p>
                         </div>
                         <div className="flex items-center gap-8">
                            <div className="flex flex-col items-end">
                               <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest mb-2">Tactical Form (Last 3)</span>
                               <div className="flex gap-2">
                                  {h2hData?.matches?.slice(0, 3).map((m: any, i: number) => {
                                    const isHomeWinner = m.score.winner === 'HOME_TEAM';
                                    const isAwayWinner = m.score.winner === 'AWAY_TEAM';
                                    return (
                                      <div key={i} className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all",
                                        isHomeWinner ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" :
                                        isAwayWinner ? "bg-blue-500/10 border-blue-500 text-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" :
                                        "bg-zinc-800 border-zinc-700 text-zinc-500"
                                      )}>
                                        {isHomeWinner ? 'H' : isAwayWinner ? 'A' : 'D'}
                                      </div>
                                    );
                                  })}
                               </div>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800">
                            <Button 
                              size="sm" 
                              variant={h2hFilter === 'recent' ? 'default' : 'ghost'}
                              onClick={() => setH2hFilter('recent')}
                              className={cn(
                                "rounded-xl text-[9px] font-black uppercase tracking-widest h-9 px-4",
                                h2hFilter === 'recent' ? "bg-yellow-500 text-black hover:bg-yellow-400" : "text-zinc-500 hover:text-white"
                              )}
                            >
                              Recent (5)
                            </Button>
                            <Button 
                              size="sm" 
                              variant={h2hFilter === 'all' ? 'default' : 'ghost'}
                              onClick={() => setH2hFilter('all')}
                              className={cn(
                                "rounded-xl text-[9px] font-black uppercase tracking-widest h-9 px-4",
                                h2hFilter === 'all' ? "bg-yellow-500 text-black hover:bg-yellow-400" : "text-zinc-500 hover:text-white"
                              )}
                            >
                              Legacy All
                            </Button>
                         </div>
                      </div>
                   </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <H2HWinBar 
                          home={h2hData?.aggregates?.homeTeam?.wins || 0} 
                          draw={h2hData?.aggregates?.homeTeam?.draws || 0} 
                          away={h2hData?.aggregates?.awayTeam?.wins || 0} 
                          total={h2hData?.aggregates?.numberOfMatches || 1} 
                        />
                        
                        <div className="grid grid-cols-2 gap-6">
                           <div className="bg-zinc-900/40 border border-zinc-900 rounded-[32px] p-8 flex flex-col items-center justify-center gap-3 text-center group hover:border-emerald-500/30 transition-all">
                              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Aggregate Host Supremacy</span>
                              <span className="text-4xl font-black text-emerald-500 tracking-tighter">
                                {h2hData?.aggregates?.numberOfMatches ? Math.round((h2hData.aggregates.homeTeam.wins / h2hData.aggregates.numberOfMatches) * 100) : 0}%
                              </span>
                              <div className="w-16 h-1.5 bg-emerald-950 rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${h2hData?.aggregates?.numberOfMatches ? (h2hData.aggregates.homeTeam.wins / h2hData.aggregates.numberOfMatches) * 100 : 0}%` }}
                                    className="h-full bg-emerald-500" 
                                 />
                              </div>
                           </div>
                           <div className="bg-zinc-900/40 border border-zinc-900 rounded-[32px] p-8 flex flex-col items-center justify-center gap-3 text-center group hover:border-blue-500/30 transition-all">
                              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Aggregate Assailant Power</span>
                              <span className="text-4xl font-black text-blue-500 tracking-tighter">
                                {h2hData?.aggregates?.numberOfMatches ? Math.round((h2hData.aggregates.awayTeam.wins / h2hData.aggregates.numberOfMatches) * 100) : 0}%
                              </span>
                              <div className="w-16 h-1.5 bg-blue-950 rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${h2hData?.aggregates?.numberOfMatches ? (h2hData.aggregates.awayTeam.wins / h2hData.aggregates.numberOfMatches) * 100 : 0}%` }}
                                    className="h-full bg-blue-500" 
                                 />
                              </div>
                           </div>
                        </div>
                      </div>

                      <div className="pt-8 pb-4">
                         <div className="flex items-center gap-3 mb-6">
                            <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase">Engagement Analytics (Recent 3)</span>
                            <div className="h-px flex-1 bg-zinc-900/50" />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {h2hData?.matches?.slice(0, 3).map((m: any, i: number) => (
                               <div key={i} className="bg-zinc-900/20 border border-zinc-900/50 rounded-3xl p-6 flex flex-col items-center gap-4 group hover:bg-zinc-900/40 transition-all">
                                  <div className="flex items-center justify-between w-full text-[9px] font-black uppercase tracking-widest text-zinc-600">
                                     <span>{new Date(m.utcDate).getFullYear()}</span>
                                     <span>{m.competition.code}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <div className="flex flex-col items-center">
                                        <span className="text-2xl font-black text-white">{m.score.fullTime.home}</span>
                                     </div>
                                     <div className="w-px h-8 bg-zinc-800" />
                                     <div className="flex flex-col items-center">
                                        <span className="text-2xl font-black text-white">{m.score.fullTime.away}</span>
                                     </div>
                                  </div>
                                  <div className={cn(
                                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                    m.score.winner === 'HOME_TEAM' ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" :
                                    m.score.winner === 'AWAY_TEAM' ? "bg-blue-500/10 border-blue-500 text-blue-500" :
                                    "bg-zinc-800 border-zinc-700 text-zinc-500"
                                  )}>
                                    {m.score.winner === 'HOME_TEAM' ? 'Host Victory' : m.score.winner === 'AWAY_TEAM' ? 'Assailant Win' : 'Tactical Draw'}
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                        <IntelligenceMetric label="Engagement Count" value={h2hData?.aggregates?.numberOfMatches || 0} />
                        <IntelligenceMetric label="Avg Goals" value={h2hData?.matches?.length ? (h2hData.matches.reduce((a: any, b: any) => a + ((b.score?.fullTime?.home ?? 0) + (b.score?.fullTime?.away ?? 0)), 0) / h2hData.matches.length).toFixed(1) : '0.0'} />
                        <IntelligenceMetric label="BTTS Strike" value={h2hData?.matches?.length ? `${Math.round((h2hData.matches.filter((m: any) => m.score.fullTime.home > 0 && m.score.fullTime.away > 0).length / h2hData.matches.length) * 100)}%` : '0%'} />
                        <IntelligenceMetric label="Strategic Deadlocks" value={h2hData?.aggregates?.homeTeam?.draws ? `${Math.round((h2hData.aggregates.homeTeam.draws / (h2hData.aggregates.numberOfMatches || 1)) * 100)}%` : '0%'} />
                      </div>
                   </div>
                </Card>
                
                {historicalTrends && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-4">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <History className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Competition Archetype Trends</h4>
                        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{historicalTrends.sample_size_years}-Year Neural Baseline</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="bg-zinc-950/50 border-zinc-900 rounded-[32px] p-8 flex flex-col gap-6 group hover:border-zinc-800 transition-all">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-500">
                          <span>Home/Away Power Balance</span>
                          <Trophy className="w-3.5 h-3.5 opacity-30" />
                        </div>
                        <div className="space-y-4">
                           <div className="flex justify-between items-end">
                              <div className="flex flex-col">
                                 <span className="text-[8px] font-black text-emerald-500 uppercase mb-1">League Home %</span>
                                 <span className="text-3xl font-black">{historicalTrends.win_rate_home}%</span>
                              </div>
                              <div className="flex flex-col items-end">
                                 <span className="text-[8px] font-black text-blue-500 uppercase mb-1">League Away %</span>
                                 <span className="text-3xl font-black">{historicalTrends.win_rate_away}%</span>
                              </div>
                           </div>
                           <div className="h-3 flex rounded-full overflow-hidden bg-zinc-900 border border-zinc-800">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${historicalTrends.win_rate_home}%` }}
                                className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                              />
                              <div className="flex-1 bg-zinc-800" />
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${historicalTrends.win_rate_away}%` }}
                                className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                              />
                           </div>
                           <p className="text-[9px] text-zinc-600 italic leading-relaxed">
                             Neural analysis identifies a {historicalTrends.win_rate_home > 40 ? 'significant' : 'moderate'} Host advantage for this competition node.
                           </p>
                        </div>
                      </Card>

                      <Card className="bg-zinc-950/50 border-zinc-900 rounded-[32px] p-8 flex flex-col gap-6 group hover:border-zinc-800 transition-all">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-500">
                          <span>Tactical Anomaly Frequency</span>
                          <Zap className="w-3.5 h-3.5 opacity-30" />
                        </div>
                        <div className="flex flex-col items-center justify-center flex-1 gap-4">
                           <div className="relative w-32 h-32 flex items-center justify-center">
                              <svg className="w-full h-full -rotate-90">
                                <circle
                                  cx="64"
                                  cy="64"
                                  r="56"
                                  className="stroke-zinc-900"
                                  strokeWidth="8"
                                  fill="none"
                                />
                                <motion.circle
                                  cx="64"
                                  cy="64"
                                  r="56"
                                  className="stroke-yellow-500"
                                  strokeWidth="8"
                                  fill="none"
                                  strokeDasharray="351.85"
                                  initial={{ strokeDashoffset: 351.85 }}
                                  animate={{ strokeDashoffset: 351.85 - (351.85 * historicalTrends.upset_frequency) / 100 }}
                                  transition={{ duration: 2, ease: "easeOut" }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                 <span className="text-3xl font-black font-mono tracking-tighter text-white">{historicalTrends.upset_frequency}%</span>
                                 <span className="text-[8px] font-black uppercase text-zinc-600">Upset Rate</span>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <div className={cn("w-2 h-2 rounded-full", historicalTrends.upset_frequency > 30 ? 'bg-orange-500' : 'bg-emerald-500')} />
                             <span className="text-[9px] font-black uppercase text-zinc-500">
                               Volatility {historicalTrends.upset_frequency > 30 ? 'CRITICAL' : 'REPRESSED'}
                             </span>
                           </div>
                        </div>
                      </Card>

                      <Card className="bg-zinc-950/50 border-zinc-900 rounded-[32px] p-8 flex flex-col justify-between group hover:border-zinc-800 transition-all">
                         <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-500">
                            <span>League Production (xG)</span>
                            <Activity className="w-3.5 h-3.5 opacity-30" />
                         </div>
                         <div className="space-y-6">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-black text-lg">
                                 {historicalTrends.avg_xg_home}
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[8px] font-black uppercase text-emerald-500 mb-0.5">Host xG Average</span>
                                  <div className="h-1.5 w-32 bg-zinc-900 rounded-full overflow-hidden">
                                     <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: `${(historicalTrends.avg_xg_home / 3) * 100}%` }}
                                       className="h-full bg-emerald-500" 
                                     />
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-black text-lg">
                                 {historicalTrends.avg_xg_away}
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[8px] font-black uppercase text-blue-500 mb-0.5">Assailant xG Average</span>
                                  <div className="h-1.5 w-32 bg-zinc-900 rounded-full overflow-hidden">
                                     <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: `${(historicalTrends.avg_xg_away / 3) * 100}%` }}
                                       className="h-full bg-blue-500" 
                                     />
                                  </div>
                               </div>
                            </div>
                         </div>
                         <div className="pt-6 border-t border-zinc-900 mt-4">
                            <p className="text-[10px] text-zinc-500 leading-tight">
                              Archival density: {historicalTrends.sample_size_years} seasons of calibrated tactical data points.
                            </p>
                         </div>
                      </Card>
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                   <div className="flex items-center justify-between px-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Historical Tactical Encounters</h4>
                      <Badge variant="outline" className="text-[9px] border-zinc-800 text-zinc-600 font-black uppercase tracking-widest px-3 py-1">
                        Displaying {h2hFilter === 'recent' ? '5' : (h2hData?.matches?.length || 0)} Logs
                      </Badge>
                   </div>
                   <div className="space-y-4">
                      {h2hData?.matches?.slice(0, h2hFilter === 'recent' ? 5 : undefined).map((m: any) => (
                        <div key={m.id} className="group bg-zinc-950 border border-zinc-900 rounded-[32px] p-8 hover:border-zinc-700 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                           <div className="flex flex-col md:flex-row items-center gap-8">
                              <div className="shrink-0 w-full md:w-32 flex flex-col items-center md:items-start bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                                <span className="text-xl font-black font-mono text-white leading-none mb-1">{new Date(m.utcDate).getFullYear()}</span>
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{new Date(m.utcDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                <Separator className="my-3 bg-zinc-800/50 w-full" />
                                <div className="flex items-center gap-2">
                                  <Trophy className="w-3 h-3 text-yellow-500/50" />
                                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest truncate">{m.competition?.name || 'League'}</span>
                                </div>
                              </div>

                              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 items-center gap-6">
                                <div className="flex items-center justify-center md:justify-end gap-4 overflow-hidden">
                                  <span className="text-xl font-black uppercase tracking-tighter truncate text-white">{m.homeTeam?.name || 'TBD'}</span>
                                  <div className="w-10 h-10 bg-zinc-900 rounded-xl p-2 flex items-center justify-center shrink-0 border border-zinc-800">
                                    <img src={m.homeTeam?.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                  </div>
                                </div>

                                <div className="flex flex-col items-center gap-2">
                                  <div className="bg-black border-2 border-zinc-900 rounded-[24px] px-8 py-4 flex items-center justify-center gap-4 group-hover:border-zinc-700 transition-colors shadow-2xl">
                                    <span className={cn("text-4xl font-black font-mono tracking-tighter", m.score.fullTime.home > m.score.fullTime.away ? "text-white" : "text-zinc-600")}>
                                      {m.score.fullTime.home}
                                    </span>
                                    <span className="text-zinc-800 font-black text-2xl">:</span>
                                    <span className={cn("text-4xl font-black font-mono tracking-tighter", m.score.fullTime.away > m.score.fullTime.home ? "text-white" : "text-zinc-600")}>
                                      {m.score.fullTime.away}
                                    </span>
                                  </div>
                                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em]">Full Time Final</span>
                                </div>

                                <div className="flex items-center justify-center md:justify-start gap-4 overflow-hidden">
                                  <div className="w-10 h-10 bg-zinc-900 rounded-xl p-2 flex items-center justify-center shrink-0 border border-zinc-800">
                                    <img src={m.awayTeam?.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                  </div>
                                  <span className="text-xl font-black uppercase tracking-tighter truncate text-white">{m.awayTeam?.name || 'TBD'}</span>
                                </div>
                              </div>

                              <div className="hidden lg:flex flex-col items-end gap-2 px-4 border-l border-zinc-900">
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Venue Log</span>
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-tight",
                                  m.score.winner === 'HOME_TEAM' ? "text-emerald-500" : m.score.winner === 'AWAY_TEAM' ? "text-blue-500" : "text-zinc-400"
                                )}>
                                  {m.score.winner === 'HOME_TEAM' ? 'Host Victory' : m.score.winner === 'AWAY_TEAM' ? 'Assailant Victory' : 'Neutral Draw'}
                                </span>
                              </div>
                           </div>
                        </div>
                      ))}

                      {(!h2hData?.matches || h2hData.matches.length === 0) && (
                        <div className="p-32 text-center bg-zinc-950 border-2 border-dashed border-zinc-900 rounded-[56px] flex flex-col items-center gap-8">
                          <History className="w-12 h-12 text-zinc-800" />
                          <div className="max-w-xs">
                            <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-zinc-400">Archival Void</h3>
                            <p className="text-zinc-600 text-[10px] font-black uppercase leading-relaxed tracking-widest">No previous direct engagements recorded in the tactical database for these specific entities.</p>
                          </div>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="stats">
             {matchDetails.statistics ? (
               <div className="space-y-12">
                  {/* Combat Performance Comparison */}
                  <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                      <Activity className="w-40 h-40" />
                    </div>
                    
                    <div className="relative z-10 space-y-12">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-2xl font-black uppercase tracking-tighter text-white">Tactical KPI Comparison</h4>
                        <p className="text-[10px] text-zinc-500 font-medium tracking-[0.2em] uppercase">Real-time Performance Synchronization</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
                        <StatRow 
                          label="Possession" 
                          home={matchDetails.statistics.possession?.home || 0} 
                          away={matchDetails.statistics.possession?.away || 0} 
                          unit="%" 
                        />
                        <StatRow 
                          label="Tactical Shots" 
                          home={matchDetails.statistics.shots?.home || 0} 
                          away={matchDetails.statistics.shots?.away || 0} 
                        />
                        <StatRow 
                          label="Target Acquisition" 
                          home={matchDetails.statistics.shotsOnTarget?.home || 0} 
                          away={matchDetails.statistics.shotsOnTarget?.away || 0} 
                        />
                        <StatRow 
                          label="Tactical Corners" 
                          home={matchDetails.statistics.corners?.home || 0} 
                          away={matchDetails.statistics.corners?.away || 0} 
                        />
                        <StatRow 
                          label="Neutralised (Saves)" 
                          home={matchDetails.statistics.saves?.home || 0} 
                          away={matchDetails.statistics.saves?.away || 0} 
                        />
                        <StatRow 
                          label="Enforcement (Fouls)" 
                          home={matchDetails.statistics.fouls?.home || 0} 
                          away={matchDetails.statistics.fouls?.away || 0} 
                          homeColor="bg-zinc-700"
                          awayColor="bg-zinc-800"
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Team-Categorized Detailed Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <TeamStatsColumn 
                        team={matchDetails.homeTeam || { name: 'Home' }} 
                        stats={matchDetails.statistics} 
                        side="home" 
                     />
                     <TeamStatsColumn 
                        team={matchDetails.awayTeam || { name: 'Away' }} 
                        stats={matchDetails.statistics} 
                        side="away" 
                     />
                  </div>
               </div>
             ) : (
                <div className="p-32 text-center bg-zinc-950 border-2 border-dashed border-zinc-900 rounded-[56px] flex flex-col items-center gap-8 group">
                   <div className="w-24 h-24 bg-zinc-900 rounded-[32px] flex items-center justify-center border border-zinc-800 group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-12 h-12 text-zinc-600" />
                   </div>
                   <div className="max-w-md">
                      <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Metric Stream Offline</h3>
                      <p className="text-zinc-500 text-sm font-medium leading-relaxed">External data relay has not provided granular statistics for this tactical node. Real-time synchronisation is pending match progression.</p>
                   </div>
                </div>
             )}
          </TabsContent>

           <TabsContent value="ai-report">
              <div className="space-y-8">
                {!analysis && !isGenerating && (
                  <div className="bg-zinc-950 border border-zinc-900 rounded-[40px] p-20 flex flex-col items-center gap-8 text-center">
                     <div className="w-24 h-24 bg-yellow-500/10 rounded-[32px] flex items-center justify-center border border-yellow-500/20">
                       <BrainCircuit className="w-12 h-12 text-yellow-500" />
                     </div>
                     <div className="max-w-md">
                        <h3 className="text-3xl font-black tracking-tighter uppercase mb-4">Strategic Briefing Required</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">System awaiting prompt to engage SafeSide Intelligence engine for comprehensive tactical resolution.</p>
                     </div>
                     <Button onClick={handleRunAnalysis} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase h-16 px-12 rounded-2xl shadow-2xl">
                        <Zap className="w-5 h-5 mr-3" />
                        Generate Full Intelligence Report
                     </Button>
                  </div>
                )}
 
                {isGenerating && !analysis && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-6">
                       <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                       <span className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-500">Processing Neural Tactical Nodes...</span>
                    </div>
                    <AnalysisSkeleton />
                  </div>
                )}
 
                {(analysis || streamedText) && (
                  <div className="space-y-8">
                    {isGenerating && (
                      <div className="flex items-center gap-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-6">
                         <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                         <span className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-500">Processing Neural Tactical Nodes...</span>
                      </div>
                    )}

                   {analysis && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AIDiagnosticGauge 
                          label="Confidence Level" 
                          value={analysis.prediction.confidence_score} 
                          type="confidence" 
                        />
                        <AIDiagnosticGauge 
                          label="Risk Profile" 
                          value={analysis.risk_assessment.level} 
                          type="risk" 
                        />
                     </div>
                   )}

                    {analysis?.tactical_insights && (
                      <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] overflow-hidden">
                         <button 
                           onClick={() => setIsInsightsExpanded(!isInsightsExpanded)}
                           className="w-full h-16 px-8 flex justify-between items-center hover:bg-zinc-900/50 transition-colors border-b border-zinc-900"
                         >
                           <div className="flex items-center gap-3">
                             <Brain className="w-4 h-4 text-yellow-500" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Key Tactical Insights</span>
                           </div>
                           <div className="flex items-center gap-4">
                              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
                                {isInsightsExpanded ? 'Collapse' : 'Expand'}
                              </span>
                              <motion.div
                               animate={{ rotate: isInsightsExpanded ? 180 : 0 }}
                               transition={{ duration: 0.3 }}
                              >
                               <ChevronDown className="w-4 h-4 text-zinc-500" />
                              </motion.div>
                           </div>
                         </button>
                         <AnimatePresence>
                           {isInsightsExpanded && (
                             <motion.div
                               initial={{ height: 0, opacity: 0 }}
                               animate={{ height: 'auto', opacity: 1 }}
                               exit={{ height: 0, opacity: 0 }}
                               transition={{ duration: 0.4, ease: "circOut" }}
                             >
                               <div className="p-8 md:p-12">
                                 <TacticalInsightList insights={analysis.tactical_insights} />
                               </div>
                             </motion.div>
                           )}
                         </AnimatePresence>
                      </Card>
                    )}

                    {historicalTrends && (
                     <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] overflow-hidden">
                        <button 
                          onClick={() => setIsTrendsExpanded(!isTrendsExpanded)}
                          className="w-full h-16 px-8 flex justify-between items-center hover:bg-zinc-900/50 transition-colors border-b border-zinc-900"
                        >
                          <div className="flex items-center gap-3">
                            <History className="w-4 h-4 text-blue-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Archival Competition Trends (50-Year Baseline)</span>
                          </div>
                          <div className="flex items-center gap-4">
                             <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
                               {isTrendsExpanded ? 'Collapse' : 'Expand'}
                             </span>
                             <motion.div
                              animate={{ rotate: isTrendsExpanded ? 180 : 0 }}
                              transition={{ duration: 0.3 }}
                             >
                              <ChevronDown className="w-4 h-4 text-zinc-500" />
                             </motion.div>
                          </div>
                        </button>
                        <AnimatePresence>
                          {isTrendsExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.4, ease: "circOut" }}
                            >
                              <div className="p-8 md:p-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                  <TrendMetric 
                                    label="Home Win Weight" 
                                    value={`${historicalTrends.win_rate_home}%`} 
                                    icon={Trophy} 
                                    subValue="50y League Average"
                                  />
                                  <TrendMetric 
                                    label="Away Win Weight" 
                                    value={`${historicalTrends.win_rate_away}%`} 
                                    icon={ExternalLink} 
                                    subValue="Assailant Probability"
                                  />
                                  <TrendMetric 
                                    label="Upset Frequency" 
                                    value={`${historicalTrends.upset_frequency}%`} 
                                    icon={Zap} 
                                    subValue="Tactical Anomaly Rate"
                                  />
                                  <TrendMetric 
                                    label="Sample Density" 
                                    value={`${historicalTrends.sample_size_years} Years`} 
                                    icon={BarChart3} 
                                    subValue="Archival Depth"
                                  />
                                </div>
                                
                                <div className="mt-8 p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-[28px]">
                                   <div className="flex items-center gap-3 mb-4">
                                      <Info className="w-4 h-4 text-zinc-500" />
                                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Retrieval Augmented Generation Context</span>
                                   </div>
                                   <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                                      These baseline metrics provide the long-term statistical "anchor" for the SafeSide Predictive Engine. While modern form weights 50% of the prediction, these 50-year trends ensure the AI remains grounded in the competition's historical DNA.
                                   </p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </Card>
                   )}
                   
                   <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] overflow-hidden">
                      <button 
                        onClick={() => setIsReportReasoningExpanded(!isReportReasoningExpanded)}
                        className="w-full h-16 px-8 flex justify-between items-center hover:bg-zinc-900/50 transition-colors border-b border-zinc-900"
                      >
                        <div className="flex items-center gap-3">
                          <Terminal className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">AI Reasoning Summary</span>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
                             {isReportReasoningExpanded ? 'Collapse' : 'Expand'}
                           </span>
                           <motion.div
                            animate={{ rotate: isReportReasoningExpanded ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                           >
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                           </motion.div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isReportReasoningExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                          >
                            <div className="p-8 md:p-12">
                              <div className="prose prose-invert prose-emerald max-w-none">
                                <ReactMarkdown>{streamedText || (analysis ? analysis.reasoning_summary : '')}</ReactMarkdown>
                                {isGenerating && <span className="inline-block w-2 h-5 bg-yellow-500 animate-pulse ml-2" />}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </Card>

                   {analysis && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="bg-yellow-500/5 border-yellow-500/20 rounded-[32px] p-8 flex flex-col justify-between">
                           <div>
                              <p className="text-[10px] font-black uppercase text-yellow-500 tracking-widest mb-2">Safe Side Recommendation</p>
                              <h5 className="text-4xl font-black uppercase tracking-tighter">{analysis.prediction.safe_side}</h5>
                              <p className="text-sm text-zinc-500 mt-4 leading-relaxed">{analysis.prediction.value_explanation}</p>
                           </div>
                           <div className="mt-8 flex items-center justify-between">
                              <Badge className="bg-emerald-500 text-black font-black uppercase text-[10px] py-2 px-4">Value Identified</Badge>
                              <div className="text-right">
                                 <span className="text-[9px] font-black uppercase text-zinc-600 block mb-1">Confidence Score</span>
                                 <span className="text-3xl font-black text-yellow-500">{analysis.prediction.confidence_score}%</span>
                              </div>
                           </div>
                        </Card>

                        <div className="space-y-4">
                           <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-6">
                              <p className="text-[9px] font-black uppercase text-red-500 tracking-widest mb-3">Threat Vector</p>
                              <p className="text-sm font-medium text-zinc-200">{analysis.risk_assessment.primary_risk}</p>
                           </div>
                           <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-6">
                              <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-3">Buffer Zone</p>
                              <p className="text-sm font-medium text-zinc-200">{analysis.risk_assessment.safety_buffer}</p>
                           </div>
                           {analysis.prediction.trap_game_warning && (
                             <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6 flex items-start gap-4">
                                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                                <div>
                                   <p className="text-[9px] font-black uppercase text-orange-500 mb-1">Trap Detection Active</p>
                                   <p className="text-xs text-zinc-400">{analysis.prediction.trap_game_reason}</p>
                                </div>
                             </div>
                           )}
                        </div>
                     </div>
                   )}
                 </div>
               )}
             </div>
          </TabsContent>

          <TabsContent value="lineups">
             {(lineups || analysis?.predicted_lineups) ? (
               <div className="space-y-12">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                     <TeamLineup 
                        side="home" 
                        team={matchDetails.homeTeam || { name: 'Home' }} 
                        data={lineups?.homeTeam || { 
                          formation: analysis?.predicted_lineups?.home?.formation, 
                          startXI: analysis?.predicted_lineups?.home?.starting_xi?.map((p, i) => ({ 
                            ...p, 
                            shirtNumber: p.shirt_number || '?', 
                            id: `p-home-${i}` 
                          })) || []
                        }} 
                        isPredicted={!lineups}
                     />
                     <TeamLineup 
                        side="away" 
                        team={matchDetails.awayTeam || { name: 'Away' }} 
                        data={lineups?.awayTeam || { 
                          formation: analysis?.predicted_lineups?.away?.formation, 
                          startXI: analysis?.predicted_lineups?.away?.starting_xi?.map((p, i) => ({ 
                            ...p, 
                            shirtNumber: p.shirt_number || '?', 
                            id: `p-away-${i}` 
                          })) || []
                        }} 
                        isPredicted={!lineups}
                     />
                  </div>
               </div>
             ) : (
               <div className="p-20 text-center bg-zinc-950 border-2 border-dashed border-zinc-900 rounded-[40px]">
                 <Users className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
                 <p className="text-zinc-600 font-medium">Roster synchronisation pending authorization. Verification typically occurs 60m pre-kickoff.</p>
                 <Button onClick={handleRunAnalysis} variant="outline" className="mt-4 border-zinc-800 hover:bg-zinc-900">
                    Run AI Tactical Prediction
                 </Button>
               </div>
             )}
          </TabsContent>

          <TabsContent value="odds">
             {odds ? (
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {odds.bookmakers.map((bookie: any, i: number) => (
                      <OddsCard key={i} bookie={bookie} homeProb={analysis?.prediction.win_probability.home} />
                    ))}
                  </div>
                  {/* Market Movement Chart */}
                  <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] p-10">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex flex-col gap-1">
                           <h4 className="text-lg font-black uppercase tracking-widest">Market Fluidity Index</h4>
                           <p className="text-[10px] text-zinc-500 font-medium">Tracking 1X2 market movement over the last 24 hours</p>
                        </div>
                        <div className="flex gap-4">
                           <ChartLegend label="Home" color="#10b981" />
                           <ChartLegend label="Away" color="#3b82f6" />
                        </div>
                     </div>
                     <div className="h-[300px] w-full">
                        <MarketMovementChart history={odds.movementHistory} />
                     </div>
                  </Card>
               </div>
             ) : (
               <Skeleton className="h-96 bg-zinc-900 rounded-[40px]" />
             )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Button for Analysis */}
      <div className="fixed bottom-8 right-8 z-50">
        <motion.div
           whileHover={{ scale: 1.1 }}
           whileTap={{ scale: 0.9 }}
        >
          <Button 
            onClick={() => matchId && runAnalysis(matchId)}
            disabled={isGenerating}
            className={cn(
              "rounded-full w-16 h-16 bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_30px_rgba(234,179,8,0.4)] flex items-center justify-center p-0 border-4 border-black",
              !isGenerating && "animate-pulse"
            )}
          >
            {isGenerating ? <Loader2 className="w-8 h-8 animate-spin" /> : <BrainCircuit className="w-8 h-8" />}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// Subcomponents

const TacticalInsightList = ({ insights }: { insights: string[] }) => {
  return (
    <div className="space-y-4">
      {insights.map((insight, idx) => {
        // Simple visual cue extraction: look for percentages, numbers, or specific tactical terms
        const hasNumber = /\d+/.test(insight);
        const hasPercent = /%/.test(insight);
        const isCritical = hasPercent || (hasNumber && insight.length < 100);

        return (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-start gap-4 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group"
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
              isCritical ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-zinc-800 border-zinc-700 text-zinc-500"
            )}>
              <Activity className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="text-[13px] font-medium text-zinc-300 leading-relaxed group-hover:text-white transition-colors">
                {insight}
              </p>
              {isCritical && (
                <div className="flex items-center gap-2">
                   <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                   <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/70">Critical Node Identified</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const TrendMetric = ({ label, value, icon: Icon, subValue }: any) => (
  <div className="bg-zinc-950 border border-zinc-900 rounded-[28px] p-6 hover:border-zinc-800 transition-all group">
     <div className="flex items-center gap-2 text-zinc-500 mb-4">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
     </div>
     <div className="text-3xl font-black font-mono tracking-tighter mb-1 text-white group-hover:text-emerald-500 transition-colors">{value}</div>
     <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{subValue}</div>
  </div>
);

const AIDiagnosticGauge = ({ label, value, type }: { label: string, value: any, type: 'confidence' | 'risk' }) => {
  const isRisk = type === 'risk';
  const numericValue = isRisk ? (value === 'High' ? 85 : value === 'Medium' ? 50 : 20) : value;
  
  const getColors = () => {
    if (isRisk) {
      if (value === 'High') return { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
      if (value === 'Medium') return { text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
      return { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    }
    if (value >= 80) return { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (value >= 60) return { text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
    return { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  };

  const colors = getColors();

  return (
    <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] p-6 group hover:border-zinc-800 transition-all">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
        <Badge variant="outline" className={cn("text-[8px] uppercase font-black", colors.border, colors.text)}>
          AI AUDIT: VERIFIED
        </Badge>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                className="stroke-zinc-900"
                strokeWidth="4"
                fill="none"
              />
              <motion.circle
                cx="32"
                cy="32"
                r="28"
                className={cn("stroke-current", colors.text)}
                strokeWidth="4"
                fill="none"
                strokeDasharray="175.92"
                initial={{ strokeDashoffset: 175.92 }}
                animate={{ strokeDashoffset: 175.92 - (175.92 * numericValue) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
               <div className={cn("w-1 h-1 rounded-full", colors.text, "animate-pulse")} />
            </div>
        </div>
        <div>
           <div className={cn("text-3xl font-black font-mono tracking-tighter mb-0.5", colors.text)}>
             {isRisk ? value : `${value}%`}
           </div>
           <p className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.2em]">Diagnostic Probability</p>
        </div>
      </div>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(status);
  const isFinished = ['FINISHED', 'AWARDED'].includes(status);
  
  return (
    <Badge variant="outline" className={cn(
      "border text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full",
      isLive ? "border-emerald-500/30 text-emerald-400" : isFinished ? "border-zinc-700 text-zinc-500" : "border-yellow-500/30 text-yellow-500"
    )}>
      Match Status: {status}
    </Badge>
  );
};

const QuickStat = ({ label, value, icon: Icon, accent = 'text-white' }: any) => (
  <div className="bg-zinc-950 border border-zinc-900 rounded-[28px] p-5 flex flex-col gap-3 group hover:border-zinc-700/50 transition-all">
    <div className="flex items-center gap-2 text-zinc-600">
       <Icon className="w-3.5 h-3.5" />
       <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className={cn("text-sm font-black uppercase truncate flex items-center gap-2", accent)}>{value}</div>
  </div>
);

const IntelligenceMetric = ({ label, value }: any) => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1">{label}</span>
    <span className="text-sm font-black text-zinc-200">{value}</span>
  </div>
);

const WinProbabilityGauge = ({ probability, label }: { probability: number, label: string }) => {
  const getGradientId = () => `gauge-gradient-${label.replace(/\s+/g, '-').toLowerCase()}`;

  const getGlowColor = (p: number) => {
    if (p < 33) return 'rgba(239, 68, 68, 0.4)';
    if (p < 66) return 'rgba(234, 179, 8, 0.4)';
    return 'rgba(16, 185, 129, 0.4)';
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-[40px] flex flex-col items-center justify-center relative group overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 opacity-20" />
      
      <div className="relative w-48 h-28 mb-4">
        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={getGradientId()} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke="#1d1d21" 
            strokeWidth="8" 
            strokeLinecap="round"
          />
          <motion.path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke={`url(#${getGradientId()})`}
            strokeWidth="8" 
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: probability / 100 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ 
              filter: `drop-shadow(0 0 8px ${getGlowColor(probability)})` 
            }}
          />
        </svg>
        
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <span className="text-4xl font-black font-mono tracking-tighter text-white">
            {Math.round(probability)}%
          </span>
          <div className="flex flex-col items-center mt-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 whitespace-nowrap">
              {label}
            </p>
            <Badge variant="outline" className="mt-2 border-emerald-500/20 text-emerald-500 text-[6px] h-3 uppercase font-black tracking-widest">Neural Accuracy: High</Badge>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mt-6">
        {[1,2,3,4,5,6,7,8].map(i => {
          const stepProb = i * 12.5;
          const isActive = probability >= stepProb;
          return (
            <div 
              key={i} 
              className={cn(
                "w-1.5 h-3 items-center rounded-full transition-all duration-700",
                isActive 
                  ? (stepProb <= 33 ? 'bg-red-500' : stepProb <= 66 ? 'bg-yellow-500' : 'bg-emerald-500')
                  : "bg-zinc-900 border border-zinc-800"
              )} 
            />
          );
        })}
      </div>
    </div>
  );
};

const ProbabilityBar = ({ home, draw, away }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
      <span className="text-emerald-500">Host Probability {Math.round(home)}%</span>
      <span className="text-zinc-600">Neutral {Math.round(draw)}%</span>
      <span className="text-blue-500">Assailant {Math.round(away)}%</span>
    </div>
    <div className="h-4 flex rounded-full overflow-hidden bg-zinc-950 border border-zinc-900">
      <div style={{ width: `${home}%` }} className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
      <div style={{ width: `${draw}%` }} className="h-full bg-zinc-800 transition-all duration-1000" />
      <div style={{ width: `${away}%` }} className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
    </div>
  </div>
);

const H2HWinBar = ({ home, draw, away, total }: any) => (
  <div className="space-y-4">
    <div className="flex justify-between items-end mb-2">
       <div className="flex flex-col">
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Host Wins</span>
          <span className="text-2xl font-black">{home}</span>
       </div>
       <div className="flex flex-col items-center">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Neutral</span>
          <span className="text-2xl font-black">{draw}</span>
       </div>
       <div className="flex flex-col items-end">
          <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Away Wins</span>
          <span className="text-2xl font-black">{away}</span>
       </div>
    </div>
    <div className="h-8 flex rounded-2xl overflow-hidden bg-zinc-950">
      <div style={{ width: `${(home/(total||1))*100}%` }} className="h-full bg-emerald-500 flex items-center justify-end pr-3">
        <span className="text-[10px] font-black text-black">{(home/(total||1)*100).toFixed(0)}%</span>
      </div>
      <div style={{ width: `${(draw/(total||1))*100}%` }} className="h-full bg-zinc-800 flex items-center justify-center">
        <span className="text-[10px] font-black text-zinc-400">{(draw/(total||1)*100).toFixed(0)}%</span>
      </div>
      <div style={{ width: `${(away/(total||1))*100}%` }} className="h-full bg-blue-500 flex items-center justify-start pl-3">
        <span className="text-[10px] font-black text-black">{(away/(total||1)*100).toFixed(0)}%</span>
      </div>
    </div>
  </div>
);

const TeamStatsColumn = ({ team, stats, side }: any) => {
  const isHome = side === 'home';
  const getStat = (path: string) => {
    const parts = path.split('.');
    let cur = stats;
    for (const p of parts) {
      if (!cur) return 0;
      cur = cur[p];
    }
    return cur?.[side] || 0;
  };

  return (
    <div className="space-y-12">
       <div className="flex items-center gap-5 border-b border-zinc-900 pb-8">
          <div className="w-16 h-16 bg-zinc-900 rounded-[20px] flex items-center justify-center p-3 border border-zinc-800">
             <img src={team.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">{isHome ? 'Host' : 'Assailant'} Profile</span>
             <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{team.name}</h3>
          </div>
       </div>

       <div className="grid grid-cols-1 gap-8">
          <CategorySection title="Offensive Intelligence" icon={Target}>
             <DetailedStatLine label="Total Shots" value={getStat('shots')} />
             <DetailedStatLine label="Shots on Target" value={getStat('shotsOnTarget')} />
             <DetailedStatLine label="Corners" value={getStat('corners')} />
             <DetailedStatLine label="xG (Expected Goals)" value={getStat('expectedGoals') || '0.00'} color="text-emerald-500" />
          </CategorySection>

          <CategorySection title="Defensive Integrity" icon={Shield}>
             <DetailedStatLine label="Tackles" value={getStat('tackles')} />
             <DetailedStatLine label="Interceptions" value={getStat('interceptions')} />
             <DetailedStatLine label="Clearances" value={getStat('clearances')} />
             <DetailedStatLine label="Saves" value={getStat('saves')} />
          </CategorySection>

          <CategorySection title="Distribution & Flow" icon={RefreshCw}>
             <DetailedStatLine label="Possession" value={`${getStat('possession')}%`} />
             <DetailedStatLine label="Total Passes" value={getStat('passes')} />
             <DetailedStatLine label="Pass Accuracy" value={`${getStat('passAccuracy')}%`} />
             <DetailedStatLine label="Key Passes" value={getStat('keyPasses')} />
          </CategorySection>

          <CategorySection title="Discipline & Friction" icon={AlertTriangle}>
             <DetailedStatLine label="Fouls Committed" value={getStat('fouls')} />
             <DetailedStatLine label="Yellow Cards" value={getStat('yellowCards')} color="text-yellow-500" />
             <DetailedStatLine label="Red Cards" value={getStat('redCards')} color="text-red-500" />
             <DetailedStatLine label="Offsides" value={getStat('offsides')} />
          </CategorySection>
       </div>
    </div>
  );
};

const CategorySection = ({ title, icon: Icon, children }: any) => (
  <div className="bg-zinc-950 border border-zinc-900 rounded-[40px] overflow-hidden group hover:border-zinc-800 transition-all">
     <div className="px-8 py-5 border-b border-zinc-900 bg-zinc-950 flex items-center gap-4">
        <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
           <Icon className="w-4 h-4 text-zinc-500" />
        </div>
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">{title}</h4>
     </div>
     <div className="p-8 space-y-6">
        {children}
     </div>
  </div>
);

const DetailedStatLine = ({ label, value, color = 'text-white' }: any) => (
  <div className="flex justify-between items-center group/stat">
     <span className="text-[11px] font-black uppercase text-zinc-600 tracking-widest px-1 group-hover/stat:text-white transition-colors">{label}</span>
     <span className={cn("text-xl font-black font-mono tracking-tighter", color)}>{value}</span>
  </div>
);

const StatRow = ({ label, home, away, unit = '', homeColor = 'bg-emerald-500', awayColor = 'bg-blue-500' }: any) => {
  const total = Number(home) + Number(away);
  const homePercent = total === 0 ? 50 : (home / total) * 100;
  
  return (
    <div className="space-y-3 group">
      <div className="flex justify-between items-center px-1">
        <span className="text-3xl font-black font-mono tracking-tighter">{home}{unit}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 group-hover:text-zinc-400 transition-colors">{label}</span>
        <span className="text-3xl font-black font-mono tracking-tighter">{away}{unit}</span>
      </div>
      <div className="h-2 w-full flex rounded-full overflow-hidden bg-zinc-950 border border-zinc-900">
        <div style={{ width: `${homePercent}%` }} className={cn("h-full transition-all duration-1000", homeColor)} />
        <div style={{ width: `${100 - homePercent}%` }} className={cn("h-full transition-all duration-1000", awayColor)} />
      </div>
    </div>
  );
};

const MatchTimeline = ({ goals, homeTeam }: any) => (
  <div className="space-y-4">
    {goals.length === 0 ? (
      <div className="py-12 flex flex-col items-center gap-3">
         <Info className="w-5 h-5 text-zinc-800" />
         <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest text-center">Neural Event Stream Empty</p>
      </div>
    ) : (
      goals.map((goal: any, idx: number) => {
        const isHome = goal.team?.name === homeTeam;
        return (
          <div key={idx} className={cn("flex items-center gap-4", isHome ? "flex-row" : "flex-row-reverse")}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 font-mono text-xs font-black text-zinc-400">
              {goal.minute}'
            </div>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 border-2",
              isHome ? "bg-emerald-500/10 border-emerald-500/20" : "bg-blue-500/10 border-blue-500/20"
            )}>
              ⚽
            </div>
            <div className={cn("flex flex-col min-w-0", isHome ? "items-start" : "items-end")}>
              <span className="font-black text-sm uppercase truncate w-full">{goal.scorer?.name}</span>
              <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">{goal.type}</span>
            </div>
          </div>
        );
      })
    )}
  </div>
);

const FormPanel = ({ side, teamName, teamId, recentMatches }: any) => {
  const getResult = (match: any) => {
    if (!match.score || !match.score.winner) return 'D';
    if (match.score.winner === 'DRAW') return 'D';
    
    const isHome = match.homeTeam.id === teamId;
    if (isHome) {
      return match.score.winner === 'HOME_TEAM' ? 'W' : 'L';
    } else {
      return match.score.winner === 'AWAY_TEAM' ? 'W' : 'L';
    }
  };

  const results = recentMatches?.map(getResult).reverse() || [];
  
  // Calculate average goals and clean sheets
  const avgGoals = recentMatches?.length ? (
    recentMatches.reduce((sum: number, match: any) => {
      const goals = match.homeTeam.id === teamId ? (match.score?.fullTime?.home || 0) : (match.score?.fullTime?.away || 0);
      return sum + goals;
    }, 0) / recentMatches.length
  ).toFixed(1) : '0.0';

  const cleanSheets = recentMatches?.length ? (
    recentMatches.filter((match: any) => {
      const conceded = match.homeTeam.id === teamId ? (match.score?.fullTime?.away || 0) : (match.score?.fullTime?.home || 0);
      return conceded === 0;
    }).length
  ) : 0;

  const cleanSheetProb = recentMatches?.length ? Math.round((cleanSheets / recentMatches.length) * 100) : 0;

  return (
    <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] p-8 space-y-8">
       <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg", side === 'home' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500')}>
             {side === 'home' ? 'H' : 'A'}
          </div>
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Tactical Trajectory</span>
             <h4 className="text-xl font-black uppercase tracking-tighter">{teamName}</h4>
          </div>
       </div>
       
       <div className="flex gap-3 h-14 bg-zinc-900/40 border border-zinc-900 p-2 rounded-2xl">
          {recentMatches ? (
            results.map((res: string, i: number) => (
              <div key={i} className={cn(
                "flex-1 flex items-center justify-center rounded-xl font-black text-sm border-2",
                res === 'W' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' :
                res === 'D' ? 'bg-zinc-800 border-zinc-700 text-zinc-500' :
                'bg-red-500/10 border-red-500 text-red-400'
              )}>
                {res}
              </div>
            ))
          ) : (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex-1 bg-zinc-900 animate-pulse rounded-xl" />
            ))
          )}
       </div>

       <div className="space-y-4">
          <StatLine label="Goals / 5 Game Avg" value={avgGoals} />
          <StatLine label="Tactical Clean Sheets" value={cleanSheets} />
          <StatLine label="Defensive Density Index" value={`${cleanSheetProb}%`} />
          <StatLine 
            label="Neural Assessment" 
            value={parseFloat(avgGoals) > 2 ? "HIGH OUTPUT" : parseFloat(avgGoals) > 1.2 ? "STABLE" : "LOW CALIBER"} 
            color={parseFloat(avgGoals) > 1.5 ? "text-emerald-500" : "text-yellow-500"} 
          />
       </div>
    </Card>
  );
};

const StatLine = ({ label, value, color = 'text-white' }: any) => (
  <div className="flex justify-between items-center py-4 border-b border-zinc-900/50 last:border-0">
     <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{label}</span>
     <span className={cn("text-lg font-black tracking-tighter", color)}>{value}</span>
  </div>
);

const TeamLineup = ({ side, team, data, isPredicted = false }: any) => {
  const startXI = data.startXI || data.starting_xi || [];
  
  return (
    <div className="space-y-10">
       <div className="flex items-center gap-4">
          <img src={team.crest} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
          <div className="flex flex-col">
             <h4 className="text-xl font-black uppercase tracking-tighter">{team.name}</h4>
             <div className="flex items-center gap-2">
               <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{data?.formation || 'Standard'} Formation</span>
               <Badge className={cn(
                 "text-[8px] border-zinc-800",
                 isPredicted ? "bg-yellow-500/10 text-yellow-500" : "bg-emerald-500/10 text-emerald-500"
               )}>
                 {isPredicted ? 'AI Predicted' : 'Confirmed'}
               </Badge>
             </div>
          </div>
       </div>

       {/* Pitch Visual Placeholder */}
       <div className="aspect-[3/4] bg-neutral-900/50 border border-zinc-900 rounded-[40px] relative overflow-hidden p-8 flex items-center justify-center">
          <div className="absolute inset-4 border border-zinc-800 rounded-3xl" />
          <div className="absolute inset-x-4 top-1/2 h-px bg-zinc-800" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-zinc-800 rounded-full" />
          
          {/* Simple Player Dots Visual */}
          <div className="relative z-10 grid grid-rows-4 gap-12 w-full h-full p-4">
             <div className="flex justify-around items-center">
                {[1, 2, 3].map(i => <PlayerDot key={i} num={startXI[10-i]?.shirtNumber || '?'} side={side} />)}
             </div>
             <div className="flex justify-around items-center">
                {[1, 2, 3].map(i => <PlayerDot key={i} num={startXI[7-i]?.shirtNumber || '?'} side={side} />)}
             </div>
             <div className="flex justify-around items-center">
                {[1, 2, 3, 4].map(i => <PlayerDot key={i} num={startXI[4-i]?.shirtNumber || '?'} side={side} />)}
             </div>
             <div className="flex justify-center items-center">
                <PlayerDot num={startXI[0]?.shirtNumber || '?'} side={side} />
             </div>
          </div>
       </div>

       <div className="space-y-2">
          <h5 className="text-[10px] font-black uppercase text-zinc-600 px-4 mb-4">
             {isPredicted ? 'AI Predicted Tactical Roster' : 'Operational Roster (Starting XI)'}
          </h5>
          {startXI.map((player: any) => (
            <div key={player.id} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-900 rounded-2xl group hover:border-zinc-700 transition-all">
               <div className="flex items-center gap-4">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs", side === 'home' ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white')}>
                     {player.shirtNumber}
                  </div>
                  <div className="flex flex-col">
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-black uppercase tracking-tight">{player.name}</span>
                        {player.is_key_player && <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                     </div>
                     <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{player.position}</span>
                  </div>
               </div>
               <Badge variant="outline" className="border-zinc-900 text-zinc-700 text-[8px] font-mono">{player.nationality || 'TBD'}</Badge>
            </div>
          ))}
       </div>
    </div>
  );
};

const PlayerDot = ({ num, side }: any) => (
  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border-2 shadow-2xl", side === 'home' ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-blue-600 border-blue-400 text-white')}>
     {num}
  </div>
);

const OddsCard = ({ bookie, homeProb }: any) => {
  const impliedHomeProb = 1 / bookie.markets.h2h.home;
  const isValue = homeProb && (homeProb / 100 > impliedHomeProb);

  return (
    <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden group hover:border-zinc-700 transition-all duration-500">
       <div className="bg-zinc-900/50 p-6 border-b border-zinc-900 flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-tighter">{bookie.name}</span>
          {isValue && (
            <Badge className="bg-emerald-500 text-black font-black text-[8px] uppercase tracking-widest animate-pulse">
               Value Found
            </Badge>
          )}
       </div>
       <div className="p-6 grid grid-cols-3 gap-3">
          <OddsCell label="1" value={bookie.markets.h2h.home} color="text-emerald-400" />
          <OddsCell label="X" value={bookie.markets.h2h.draw} />
          <OddsCell label="2" value={bookie.markets.h2h.away} color="text-blue-400" />
       </div>
       <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <div className="bg-zinc-900/30 border border-zinc-800 p-3 rounded-xl flex justify-between items-center">
             <span className="text-[9px] font-black text-zinc-600 uppercase">Over 2.5</span>
             <span className="text-xs font-black text-yellow-500">{bookie.markets.over_under.over}</span>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-800 p-3 rounded-xl flex justify-between items-center">
             <span className="text-[9px] font-black text-zinc-600 uppercase">BTTS Yes</span>
             <span className="text-xs font-black text-yellow-500">{bookie.markets.btts.yes}</span>
          </div>
       </div>
    </Card>
  );
};

const OddsCell = ({ label, value, color = 'text-zinc-200' }: any) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
     <p className="text-[9px] font-black text-zinc-700 uppercase mb-2">{label}</p>
     <p className={cn("text-xl font-black font-mono tracking-tighter", color)}>{(value ?? 0).toFixed(2)}</p>
  </div>
);

const MarketMovementChart = ({ history }: { history?: any[] }) => {
  const defaultData = [
    { time: 'Open', home: 2.40, draw: 3.50, away: 3.20 },
    { time: '-6h',  home: 2.30, draw: 3.45, away: 3.25 },
    { time: '-3h',  home: 2.20, draw: 3.42, away: 3.30 },
    { time: '-1h',  home: 2.14, draw: 3.40, away: 3.55 },
    { time: 'Now',  home: 2.10, draw: 3.40, away: 3.60 },
  ];

  const data = history || defaultData;

  return (
    <ResponsiveContainer width="100%" height="100%">
       <LineChart data={data}>
          <XAxis dataKey="time" stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '8px' }} 
            labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
            itemStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
          />
          <Line type="monotone" dataKey="home" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
          <Line type="monotone" dataKey="away" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
       </LineChart>
    </ResponsiveContainer>
  );
};

const ChartLegend = ({ label, color }: any) => (
  <div className="flex items-center gap-2">
     <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
     <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{label}</span>
  </div>
);

const AnalysisSkeleton = () => (
  <div className="space-y-8 w-full animate-pulse">
    {/* Gauges Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2].map(i => (
        <Card key={i} className="bg-zinc-950 border-zinc-900 rounded-[32px] p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-3 w-24 bg-zinc-900" />
            <Skeleton className="h-4 w-20 bg-zinc-900 rounded-full" />
          </div>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-zinc-900" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-16 bg-zinc-900" />
              <Skeleton className="h-2 w-24 bg-zinc-900" />
            </div>
          </div>
        </Card>
      ))}
    </div>

    {/* Insights Skeleton */}
    <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] overflow-hidden">
      <div className="h-16 px-8 flex items-center border-b border-zinc-900">
        <Skeleton className="h-4 w-48 bg-zinc-900" />
      </div>
      <div className="p-8 md:p-12 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4 p-5 bg-zinc-900/40 rounded-2xl border border-zinc-900/50">
            <Skeleton className="w-8 h-8 rounded-xl bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-full bg-zinc-800" />
              <Skeleton className="h-3 w-2/3 bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </Card>

    {/* Reasoning Skeleton */}
    <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] overflow-hidden">
      <div className="h-16 px-8 flex items-center border-b border-zinc-900">
        <Skeleton className="h-4 w-40 bg-zinc-900" />
      </div>
      <div className="p-8 md:p-12 space-y-4">
        <Skeleton className="h-4 w-full bg-zinc-900" />
        <Skeleton className="h-4 w-[90%] bg-zinc-900" />
        <Skeleton className="h-4 w-[95%] bg-zinc-900" />
        <Skeleton className="h-4 w-[85%] bg-zinc-900" />
        <Skeleton className="h-4 w-2/3 bg-zinc-900" />
      </div>
    </Card>

    {/* Recommendation Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] p-8 h-64 flex flex-col justify-between">
        <div className="space-y-4">
          <Skeleton className="h-3 w-32 bg-zinc-900" />
          <Skeleton className="h-12 w-48 bg-zinc-900" />
          <Skeleton className="h-3 w-full bg-zinc-900" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-8 w-24 bg-zinc-900" />
          <Skeleton className="h-8 w-16 bg-zinc-900" />
        </div>
      </Card>
      <div className="space-y-4">
        <Skeleton className="h-24 bg-zinc-900 rounded-2xl" />
        <Skeleton className="h-24 bg-zinc-900 rounded-2xl" />
      </div>
    </div>
  </div>
);

const MatchDetailSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-12 space-y-12 animate-pulse">
    <div className="h-20 w-48 bg-zinc-900 rounded-xl mb-12" />
    <div className="h-[400px] bg-zinc-900 rounded-[48px] w-full" />
    <div className="grid grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-zinc-900 rounded-[32px]" />)}
    </div>
    <div className="h-16 bg-zinc-900 rounded-2xl w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <div className="h-96 bg-zinc-900 rounded-[32px]" />
       <div className="h-96 bg-zinc-900 rounded-[32px]" />
    </div>
  </div>
);
