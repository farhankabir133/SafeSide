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
  Brain
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Progress } from '@/src/components/ui/progress';
import { cn } from '@/src/lib/utils';
import { MatchAnalysis, ai, MODEL_ID, buildMatchAnalysisPrompt } from '@/src/services/geminiService';
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
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [streamedText, setStreamedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scoreFlash, setScoreFlash] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

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
        }

        if (h2hRes.status === 'fulfilled' && h2hRes.value.ok)
          setH2hData(await h2hRes.value.json());

        if (lineupsRes.status === 'fulfilled' && lineupsRes.value.ok)
          setLineups(await lineupsRes.value.json());

        if (oddsRes.status === 'fulfilled' && oddsRes.value.ok)
          setOdds(await oddsRes.value.json());

      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    const interval = setInterval(() => {
      if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(matchDetails?.status)) {
        fetch(`/api/matches/${matchId}`).then(r => r.json()).then(data => {
          const prevScore = `${matchDetails.score?.fullTime?.home}-${matchDetails.score?.fullTime?.away}`;
          const newScore = `${data.score?.fullTime?.home}-${data.score?.fullTime?.away}`;
          if (prevScore !== newScore) {
            setScoreFlash(true);
            setTimeout(() => setScoreFlash(false), 2000);
          }
          setMatchDetails(data);
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [matchId, matchDetails?.status]);

  const handleRunAnalysis = async () => {
    if (!matchDetails) return;
    setIsGenerating(true);
    setStreamedText('');

    const prompt = buildMatchAnalysisPrompt(matchDetails, h2hData);

    try {
      const result = await ai.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      let fullText = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        setStreamedText(fullText);
      }

      try {
        const parsed = JSON.parse(fullText);
        setAnalysis(parsed);
      } catch (parseError) {
        // Find JSON block if there's markdown wrap
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          setAnalysis(JSON.parse(jsonMatch[0]));
        }
      }
    } catch (e) {
      console.error('AI analysis failed:', e);
      toast.error('AI Analysis failed. Please try again.');
    } finally {
      setIsGenerating(false);
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
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-zinc-500 hover:text-white">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-4 bg-zinc-800" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <span>{matchDetails.competition?.name}</span>
            <span className="text-zinc-800">/</span>
            <span className="text-zinc-300">{matchDetails.homeTeam?.name} vs {matchDetails.awayTeam?.name}</span>
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
                 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{matchDetails.competition?.name}</span>
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
                   <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">{matchDetails.homeTeam?.name}</h3>
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
                      Live · {matchDetails.minute || '1'}'
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
                   <div className="text-sm font-black font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
                     KICK-OFF @ {new Date(matchDetails.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">{matchDetails.awayTeam?.name}</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Away Team</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
              <Button onClick={handleRunAnalysis} loading={isGenerating} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-tighter h-14 px-8 rounded-2xl shadow-xl">
                <BrainCircuit className="w-5 h-5 mr-2" />
                Run AI Intelligence Scan
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

        {/* Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <QuickStat label="Status" value={matchDetails.status} icon={Activity} />
           <QuickStat label="Venue" value={matchDetails.venue} icon={MapPin} />
           <QuickStat label="Official" value={matchDetails.referee?.name || 'TBD'} icon={User} />
           <QuickStat 
            label="Weather" 
            value={weather ? `${weather.temp}°C ${weather.description}` : 'Pending...'} 
            icon={Cloud} 
            accent={weather?.impact === 'HIGH' ? 'text-red-500' : 'text-emerald-500'}
           />
        </div>

        {/* Tabs */}
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
                   {/* Probability Bar */}
                   <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] p-8">
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
                             <span className="text-[10px] font-mono text-zinc-500">{(item.probability * 100).toFixed(1)}%</span>
                           </div>
                         ))}
                         {!analysis && Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28 bg-zinc-900 rounded-2xl" />)}
                      </div>
                   </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                   <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] p-6 space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Match Chronology</h4>
                      <MatchTimeline goals={matchDetails.goals || []} homeTeam={matchDetails.homeTeam.name} />
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
                             <span className={cn("font-black uppercase", weather.impact === 'HIGH' ? 'text-red-500' : 'text-emerald-500')}>
                               {weather.impact}
                             </span>
                           </div>
                        </div>
                     </Card>
                   )}
                </div>
             </div>
          </TabsContent>

          <TabsContent value="form">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <FormPanel side="home" teamName={matchDetails.homeTeam.name} />
               <FormPanel side="away" teamName={matchDetails.awayTeam.name} />
             </div>
          </TabsContent>

          <TabsContent value="h2h">
             <div className="space-y-12">
                <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] p-10">
                   <div className="space-y-8">
                      <div className="flex items-center justify-between">
                         <h3 className="text-2xl font-black uppercase tracking-tighter">Engagement History Summary</h3>
                         <Badge variant="outline" className="border-zinc-800 text-zinc-500 text-[10px] font-black">
                           {h2hData?.aggregates?.numberOfMatches || 0} TOTAL OPERATIONS
                         </Badge>
                      </div>
                      <H2HWinBar 
                        home={h2hData?.aggregates?.homeTeam?.wins || 0} 
                        draw={h2hData?.aggregates?.homeTeam?.draws || 0} 
                        away={h2hData?.aggregates?.awayTeam?.wins || 0} 
                        total={h2hData?.aggregates?.numberOfMatches || 1} 
                      />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <IntelligenceMetric label="Avg Goals" value={(h2hData?.matches?.reduce((a: any, b: any) => a + (b.score.fullTime.home + b.score.fullTime.away), 0) / h2hData?.matches?.length || 0).toFixed(1)} />
                        <IntelligenceMetric label="BTTS Rate" value={`${Math.round((h2hData?.matches?.filter((m: any) => m.score.fullTime.home > 0 && m.score.fullTime.away > 0).length / h2hData?.matches?.length || 0) * 100)}%`} />
                        <IntelligenceMetric label="Over 2.5" value={`${Math.round((h2hData?.matches?.filter((m: any) => (m.score.fullTime.home + m.score.fullTime.away) > 2.5).length / h2hData?.matches?.length || 0) * 100)}%`} />
                        <IntelligenceMetric label="Latest Winner" value={h2hData?.matches?.[0]?.score?.winner === 'HOME_TEAM' ? 'Home' : h2hData?.matches?.[0]?.score?.winner === 'AWAY_TEAM' ? 'Away' : 'Draw'} />
                      </div>
                   </div>
                </Card>

                <div className="space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-4">Tactical Engagement Logs</h4>
                   <div className="space-y-4">
                      {h2hData?.matches?.map((m: any) => (
                        <div key={m.id} className="group bg-zinc-950 border border-zinc-900 rounded-3xl p-6 hover:border-zinc-700 transition-all">
                           <div className="flex items-center gap-6">
                              <div className="shrink-0 w-24 flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl py-3">
                                <span className="text-[11px] font-mono text-zinc-400">{new Date(m.utcDate).getFullYear()}</span>
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{new Date(m.utcDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                              </div>
                              <div className="flex-1 grid grid-cols-3 items-center gap-4">
                                <span className="text-right font-black uppercase tracking-tight truncate text-lg">{m.homeTeam.name}</span>
                                <div className="flex items-center justify-center bg-zinc-950 border border-zinc-900 rounded-2xl px-6 py-3 font-mono text-2xl font-black group-hover:scale-105 transition-transform">
                                  {m.score.fullTime.home} <span className="text-zinc-800 mx-3">–</span> {m.score.fullTime.away}
                                </div>
                                <span className="text-left font-black uppercase tracking-tight truncate text-lg">{m.awayTeam.name}</span>
                              </div>
                              <Badge variant="outline" className="hidden lg:flex border-zinc-800 text-zinc-500 py-1 px-4">{m.competition?.name}</Badge>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="stats">
             <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                   <StatRow label="Possession %" home={parseInt(matchDetails.statistics?.possession?.home || '50')} away={parseInt(matchDetails.statistics?.possession?.away || '50')} unit="%" />
                   <StatRow label="Total Shots" home={matchDetails.statistics?.shots?.home || 0} away={matchDetails.statistics?.shots?.away || 0} />
                   <StatRow label="Shots on Target" home={matchDetails.statistics?.shotsOnTarget?.home || 0} away={matchDetails.statistics?.shotsOnTarget?.away || 0} />
                   <StatRow label="Corner Kicks" home={matchDetails.statistics?.corners?.home || 0} away={matchDetails.statistics?.corners?.away || 0} />
                   <StatRow label="Disciplinary Node (Fouls)" home={matchDetails.statistics?.fouls?.home || 0} away={matchDetails.statistics?.fouls?.away || 0} homeColor="bg-red-500/70" awayColor="bg-red-500/70" />
                   <StatRow label="Yellow Cards" home={matchDetails.statistics?.yellowCards?.home || 0} away={matchDetails.statistics?.yellowCards?.away || 0} homeColor="bg-yellow-500" awayColor="bg-yellow-500" />
                   <StatRow label="Offsides" home={matchDetails.statistics?.offsides?.home || 0} away={matchDetails.statistics?.offsides?.away || 0} />
                   <StatRow label="Free Kicks" home={matchDetails.statistics?.freeKicks?.home || 0} away={matchDetails.statistics?.freeKicks?.away || 0} />
                </div>
             </Card>
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

               {(isGenerating || streamedText) && (
                 <div className="space-y-8">
                   {isGenerating && (
                     <div className="flex items-center gap-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-6">
                        <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-500">Processing Neural Tactical Nodes...</span>
                     </div>
                   )}
                   
                   <Card className="bg-zinc-950 border-zinc-900 rounded-[40px] p-8 md:p-12">
                      <div className="prose prose-invert prose-emerald max-w-none">
                        <ReactMarkdown>{streamedText || (analysis ? analysis.reasoning_summary : '')}</ReactMarkdown>
                        {isGenerating && <span className="inline-block w-2 h-5 bg-yellow-500 animate-pulse ml-2" />}
                      </div>
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
             {lineups ? (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <TeamLineup side="home" team={matchDetails.homeTeam} data={lineups.homeTeam} />
                  <TeamLineup side="away" team={matchDetails.awayTeam} data={lineups.awayTeam} />
               </div>
             ) : (
               <div className="p-20 text-center bg-zinc-950 border-2 border-dashed border-zinc-900 rounded-[40px]">
                 <Users className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
                 <p className="text-zinc-600 font-medium">Roster synchronisation pending authorization. Verification typically occurs 60m pre-kickoff.</p>
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
                        <h4 className="text-lg font-black uppercase tracking-widest">Market Fluidity Index</h4>
                        <div className="flex gap-4">
                           <ChartLegend label="Home" color="#10b981" />
                           <ChartLegend label="Away" color="#3b82f6" />
                        </div>
                     </div>
                     <div className="h-[300px] w-full">
                        <MarketMovementChart />
                     </div>
                  </Card>
               </div>
             ) : (
               <Skeleton className="h-96 bg-zinc-900 rounded-[40px]" />
             )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Subcomponents

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
    <span className={cn("text-sm font-black uppercase truncate", accent)}>{value}</span>
  </div>
);

const IntelligenceMetric = ({ label, value }: any) => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1">{label}</span>
    <span className="text-sm font-black text-zinc-200">{value}</span>
  </div>
);

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
      <div style={{ width: `${(home/total)*100}%` }} className="h-full bg-emerald-500 flex items-center justify-end pr-3">
        <span className="text-[10px] font-black text-black">{(home/total*100).toFixed(0)}%</span>
      </div>
      <div style={{ width: `${(draw/total)*100}%` }} className="h-full bg-zinc-800 flex items-center justify-center">
        <span className="text-[10px] font-black text-zinc-400">{(draw/total*100).toFixed(0)}%</span>
      </div>
      <div style={{ width: `${(away/total)*100}%` }} className="h-full bg-blue-500 flex items-center justify-start pl-3">
        <span className="text-[10px] font-black text-black">{(away/total*100).toFixed(0)}%</span>
      </div>
    </div>
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

const FormPanel = ({ side, teamName }: any) => (
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
        {['W', 'W', 'D', 'L', 'W'].map((res, i) => (
          <div key={i} className={cn(
            "flex-1 flex items-center justify-center rounded-xl font-black text-sm border-2",
            res === 'W' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' :
            res === 'D' ? 'bg-zinc-800 border-zinc-700 text-zinc-500' :
            'bg-red-500/10 border-red-500 text-red-400'
          )}>
            {res}
          </div>
        ))}
     </div>

     <div className="space-y-4">
        <StatLine label="Goals / 5 Game Avg" value={side === 'home' ? '2.4' : '1.8'} />
        <StatLine label="Expected Conversion" value="78%" />
        <StatLine label="Clean Sheet Probability" value="32%" />
        <StatLine label="Offensive Efficiency" value="HIGH" color="text-emerald-500" />
     </div>
  </Card>
);

const StatLine = ({ label, value, color = 'text-white' }: any) => (
  <div className="flex justify-between items-center py-4 border-b border-zinc-900/50 last:border-0">
     <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{label}</span>
     <span className={cn("text-lg font-black tracking-tighter", color)}>{value}</span>
  </div>
);

const TeamLineup = ({ side, team, data }: any) => (
  <div className="space-y-10">
     <div className="flex items-center gap-4">
        <img src={team.crest} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
        <div className="flex flex-col">
           <h4 className="text-xl font-black uppercase tracking-tighter">{team.name}</h4>
           <div className="flex items-center gap-2">
             <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{data.formation} Formation</span>
             <Badge className="bg-zinc-900 text-zinc-500 text-[8px] border-zinc-800">Operational</Badge>
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
              {[1, 2, 3].map(i => <PlayerDot key={i} num={9 + i} side={side} />)}
           </div>
           <div className="flex justify-around items-center">
              {[1, 2, 3].map(i => <PlayerDot key={i} num={6 + i} side={side} />)}
           </div>
           <div className="flex justify-around items-center">
              {[1, 2, 3, 4].map(i => <PlayerDot key={i} num={1 + i} side={side} />)}
           </div>
           <div className="flex justify-center items-center">
              <PlayerDot num={1} side={side} />
           </div>
        </div>
     </div>

     <div className="space-y-2">
        <h5 className="text-[10px] font-black uppercase text-zinc-600 px-4 mb-4">Operational Roster (Starting XI)</h5>
        {data.startXI.map((player: any) => (
          <div key={player.id} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-900 rounded-2xl group hover:border-zinc-700 transition-all">
             <div className="flex items-center gap-4">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs", side === 'home' ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white')}>
                   {player.shirtNumber}
                </div>
                <div className="flex flex-col">
                   <span className="text-sm font-black uppercase tracking-tight">{player.name}</span>
                   <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{player.position}</span>
                </div>
             </div>
             <Badge variant="outline" className="border-zinc-900 text-zinc-700 text-[8px] font-mono">{player.nationality}</Badge>
          </div>
        ))}
     </div>
  </div>
);

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
     <p className={cn("text-xl font-black font-mono tracking-tighter", color)}>{value.toFixed(2)}</p>
  </div>
);

const MarketMovementChart = () => {
  const data = [
    { time: 'Open', home: 2.40, draw: 3.50, away: 3.20 },
    { time: '-6h',  home: 2.30, draw: 3.45, away: 3.25 },
    { time: '-3h',  home: 2.20, draw: 3.42, away: 3.30 },
    { time: '-1h',  home: 2.14, draw: 3.40, away: 3.55 },
    { time: 'Now',  home: 2.10, draw: 3.40, away: 3.60 },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
       <LineChart data={data}>
          <XAxis dataKey="time" stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '8px' }} labelStyle={{ display: 'none' }} />
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
