import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeagueBySlug } from '@/src/constants';
import { usePredictions } from '@/src/hooks/usePredictions';
import { PredictionCard } from '@/src/components/PredictionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Activity, Target, BrainCircuit, Globe, ArrowLeft, Users, Zap, ShieldAlert, TrendingUp, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { ai, MODEL_ID } from '@/src/services/geminiService';
import { useAgent } from '@/src/contexts/AgentContext';

export default function LeaguePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const league = getLeagueBySlug(slug || '');
  const { matches, loading, predictions, runAnalysis, fetchMatches } = usePredictions();
  const { openAgentWithMatch } = useAgent();
  
  const [standings, setStandings] = useState<any>(null);
  const [scorers, setScorers] = useState<any[]>([]);
  const [aiReport, setAiReport] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [loadingScorers, setLoadingScorers] = useState(false);
  const [activeTab, setActiveTab] = useState('fixtures');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (['fixtures', 'standings', 'scorers', 'intelligence'].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  useEffect(() => {
    if (league) {
      fetchStandings();
      fetchScorers();
    }
  }, [league]);

  const openStandingsInNewTab = () => {
    window.open(`${window.location.origin}${window.location.pathname}#standings`, '_blank');
  };

  const fetchStandings = async () => {
    if (!league) return;
    setLoadingStandings(true);
    try {
      const res = await fetch(`/api/leagues/${league.id}/standings`);
      const data = await res.json();
      setStandings(data.standings?.[0]?.table || []);
    } catch (e) {
      console.error("Failed to fetch standings");
    } finally {
      setLoadingStandings(false);
    }
  };

  const fetchScorers = async () => {
    if (!league) return;
    setLoadingScorers(true);
    try {
      const res = await fetch(`/api/leagues/${league.id}/scorers`);
      const data = await res.json();
      setScorers(data.scorers || []);
    } catch (e) {
      console.error("Failed to fetch scorers");
    } finally {
      setLoadingScorers(false);
    }
  };

  const generateLeagueReport = async () => {
    if (!league || !standings || isGeneratingReport) return;
    setIsGeneratingReport(true);
    setAiReport('');

    const prompt = `Role: Senior League Strategist. 
Analyze the current ${league.name} standings. 
Top teams: ${standings.slice(0, 5).map((t: any) => t.team.name).join(', ')}.
Bottom teams: ${standings.slice(-3).map((t: any) => t.team.name).join(', ')}.

Identify:
1. Overperforming/Underperforming teams.
2. Relegation risk analysis.
3. Fatigue risks for top-4 teams.
Keep it professional, data-centric, and use the 'Safe Side' intelligence tone.`;

    try {
      const result = await ai.generateContent(prompt);
      setAiReport(result.response.text());
    } catch (e) {
      setAiReport("Analysis failed to initialize. Node connection unstable.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const leagueMatches = matches.filter(m => m.competition?.name === league?.name);

  if (!league) return <div className="p-24 text-center font-black text-4xl uppercase tracking-tighter">Coordinate Error</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <button 
        onClick={() => navigate('/leagues')}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest">Abort to Command Map</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 font-mono text-[10px] py-1 px-3 border border-zinc-800 uppercase tracking-[0.2em]">
              Zone: {league.code}
            </Badge>
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 bg-emerald-500/5 font-mono text-[10px] py-1 px-3 uppercase tracking-[0.2em]">
              Active Signal
            </Badge>
          </div>
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none">
            {league.name.split(' ').map((word, i) => i === 0 ? word : <span key={i} className="text-zinc-800 block md:inline"> {word}</span>)}
          </h2>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-3xl flex items-center gap-6">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center border border-zinc-800">
             <Globe className="w-8 h-8 text-yellow-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Operational Area</p>
            <p className="text-xl font-black uppercase tracking-tight">{league.area}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={openStandingsInNewTab}
            className="ml-4 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Standings (New Tab)
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val);
        window.location.hash = val;
      }} className="space-y-12">
        <TabsList className="bg-zinc-950/50 border border-zinc-900 p-1 h-14 rounded-2xl w-full md:w-auto overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="fixtures" className="h-full rounded-xl data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest px-8">Fixtures</TabsTrigger>
          <TabsTrigger value="standings" className="h-full rounded-xl data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest px-8">Standings</TabsTrigger>
          <TabsTrigger value="scorers" className="h-full rounded-xl data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest px-8">Top Scorers</TabsTrigger>
          <TabsTrigger value="intelligence" className="h-full rounded-xl data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest px-8">AI Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="fixtures" className="space-y-12">
          {loading ? (
             <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full bg-zinc-900 rounded-3xl" />)}
             </div>
          ) : leagueMatches.length === 0 ? (
            <div className="p-24 text-center border-2 border-dashed border-zinc-900 rounded-[40px] bg-zinc-950/50">
              <Activity className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">No Active Engagement Found</h3>
              <p className="text-zinc-500 text-sm">Check back within 24-48 hours for updated signal scans.</p>
            </div>
          ) : (
            Object.entries(
              leagueMatches.reduce((acc, match) => {
                const date = new Date(match.utcDate).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
                if (!acc[date]) acc[date] = [];
                acc[date].push(match);
                return acc;
              }, {} as Record<string, any[]>)
            ).map(([date, matches]: [string, any[]]) => (
              <div key={date} className="space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-zinc-200 flex items-center gap-3">
                  {date}
                  <div className="h-[1px] flex-1 bg-zinc-900" />
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.map((match: any) => (
                    <PredictionCard 
                      key={match.id}
                      match={match}
                      analysis={predictions[match.id] as any || {
                        prediction: { 
                          win_probability: { home: 45, draw: 25, away: 30 }, 
                          scoreline: 'H-A', 
                          safe_side: 'PENDING SCAN', 
                          expected_goals: { home: 0, away: 0 } 
                        },
                        risk_assessment: { level: 'Medium', primary_risk: 'Quantum Variance', safety_buffer: 'Awaiting AI Input' },
                        reasoning_summary: 'Neural node awaiting tactical initialization.'
                      }}
                      onQueryAgent={() => openAgentWithMatch(match)}
                      onViewDetails={() => navigate(`/matches/${match.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="standings" className="mt-8">
          {loadingStandings ? (
            <div className="space-y-4">
              <Skeleton className="h-96 w-full bg-zinc-900 rounded-[48px]" />
            </div>
          ) : (
            <Card className="bg-zinc-950 border-zinc-900 rounded-[48px] overflow-hidden border p-1 opacity-90 shadow-2xl">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-black/20">
                    <TableRow className="border-zinc-900 hover:bg-transparent h-16">
                      <TableHead className="w-20 text-[10px] font-black uppercase text-zinc-600 text-center tracking-widest px-6">Rank</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Node Identity</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase text-zinc-600 tracking-widest px-4">GP</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase text-zinc-600 tracking-widest px-4 text-emerald-500/60">W</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase text-zinc-600 tracking-widest px-4">D</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase text-zinc-600 tracking-widest px-4 text-red-500/60">L</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase text-zinc-600 tracking-widest px-4">G-D</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase text-zinc-600 tracking-widest px-8 bg-zinc-900/40">Total Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings && standings.length > 0 ? standings.map((item: any) => {
                      const isUCL = item.position <= 4;
                      const isUEL = item.position > 4 && item.position <= 6;
                      const isRelegation = item.position >= (standings.length - 2);

                      return (
                        <TableRow 
                          key={item.team.id} 
                          className={cn(
                            "border-zinc-900/50 hover:bg-zinc-900/30 transition-all cursor-pointer group h-16 relative",
                            isUCL && "bg-emerald-500/[0.04]",
                            isUEL && "bg-blue-500/[0.04]",
                            isRelegation && "bg-red-500/[0.04]"
                          )}
                          onClick={() => navigate(`/teams/${item.team.id}`)}
                        >
                          <TableCell className="text-center px-6 relative">
                            <span className={cn(
                              "text-sm font-black transition-colors font-mono",
                              isUCL ? "text-emerald-500" : isUEL ? "text-blue-500" : isRelegation ? "text-red-500" : "text-zinc-500"
                            )}>
                              {item.position.toString().padStart(2, '0')}
                            </span>
                            {isUCL && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-emerald-500 rounded-r shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                            {isUEL && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                            {isRelegation && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-red-500 rounded-r shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-900 group-hover:border-zinc-700 transition-colors overflow-hidden p-2 shadow-inner">
                                <img src={item.team.crest} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              </div>
                              <div>
                                 <span className="font-black text-sm uppercase tracking-tight group-hover:text-yellow-500 transition-colors block">
                                   {item.team.name}
                                 </span>
                                 {isUCL && <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.2em] flex items-center gap-1"><TrendingUp className="w-2 h-2"/> UCL Qualification</span>}
                                 {isRelegation && <span className="text-[8px] font-black text-red-500/60 uppercase tracking-[0.2em] flex items-center gap-1"><ShieldAlert className="w-2 h-2"/> Demotion Threat</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-zinc-500 font-bold">{item.playedGames}</TableCell>
                          <TableCell className="text-center font-mono text-emerald-500/80 font-bold">{item.won}</TableCell>
                          <TableCell className="text-center font-mono text-zinc-500 font-bold">{item.draw}</TableCell>
                          <TableCell className="text-center font-mono text-red-500/80 font-bold">{item.lost}</TableCell>
                          <TableCell className="text-center font-mono text-zinc-400 font-bold">
                            {item.goalDifference > 0 ? `+${item.goalDifference}` : item.goalDifference}
                          </TableCell>
                          <TableCell className="text-center px-8 bg-zinc-900/30">
                            <span className="text-2xl font-black text-white group-hover:text-yellow-500 transition-colors">{item.points}</span>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      Array(12).fill(0).map((_, i) => (
                        <TableRow key={i} className="h-16 border-zinc-900">
                          <TableCell colSpan={8} className="px-6"><Skeleton className="h-8 w-full bg-zinc-900 rounded-xl" /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scorers">
          {loadingScorers ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40 w-full bg-zinc-900 rounded-3xl" />)}
            </div>
          ) : scorers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scorers.map((s, i) => (
                <motion.div
                  key={s.player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card 
                    className="bg-zinc-950 border-zinc-900 p-6 rounded-[32px] hover:border-yellow-500/30 transition-all flex flex-col gap-6 relative group cursor-pointer shadow-xl overflow-hidden"
                    onClick={() => navigate(`/teams/${s.team.id}`)}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Target className="w-24 h-24" />
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 text-3xl font-black text-zinc-400 group-hover:text-yellow-500 transition-colors relative">
                          <span className="relative z-10">{s.player.name.charAt(0)}</span>
                          <div className="absolute -top-2 -left-2 w-8 h-8 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center text-[10px] font-black text-zinc-500 group-hover:text-yellow-500">
                            {(i + 1).toString().padStart(2, '0')}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-black uppercase tracking-tight text-xl leading-[1.1] mb-1 group-hover:text-white transition-colors">
                            {s.player.name.split(' ').map((n: string, idx: number) => idx === s.player.name.split(' ').length - 1 ? <span key={idx} className="text-zinc-500 block">{n}</span> : n + ' ')}
                          </h4>
                          <div className="flex items-center gap-2">
                             <img src={s.team.crest} className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                             <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">{s.team.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-auto">
                      <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center">
                        <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1">Goals</p>
                        <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-2xl font-black font-mono text-yellow-500">{s.goals}</span>
                        </div>
                      </div>
                      <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center">
                        <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1">Impact</p>
                        <span className="text-2xl font-black font-mono text-white">{(s.goals * 0.85).toFixed(1)}</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-24 text-center border-2 border-dashed border-zinc-900 rounded-[40px] bg-zinc-950/50">
              <Target className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">No Strike Data Encrypted</h3>
              <p className="text-zinc-500 text-sm">Target acquisition in progress. Check back shortly.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="intelligence">
          <Card className="bg-zinc-950 border-zinc-900 p-12 rounded-[40px] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5">
              <BrainCircuit className="w-64 h-64 text-yellow-500" />
            </div>

            <div className="relative z-10">
              {!aiReport && !isGeneratingReport ? (
                <div className="text-center py-12">
                   <BrainCircuit className="w-16 h-16 text-zinc-800 mx-auto mb-8 animate-pulse" />
                   <h3 className="text-4xl font-black uppercase tracking-tighter mb-4">Deep Zone Intelligence Scan</h3>
                   <p className="text-zinc-500 max-w-lg mx-auto mb-10 text-sm">Deploy SafeSide Oracle to perform a full league-wide risk audit on standings, momentum shifts, and upcoming fatigue bottlenecks.</p>
                   <button 
                    onClick={generateLeagueReport}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-tighter h-14 px-12 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.2)] transition-all"
                   >
                     Initiate Deep Scan
                   </button>
                </div>
              ) : isGeneratingReport ? (
                <div className="space-y-8 py-12">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-2xl font-black uppercase tracking-tighter">Analyzing Theater Coordinates...</span>
                   </div>
                   <div className="space-y-4">
                      <Skeleton className="h-6 w-3/4 bg-zinc-900 rounded-lg" />
                      <Skeleton className="h-6 w-full bg-zinc-900 rounded-lg" />
                      <Skeleton className="h-6 w-2/3 bg-zinc-900 rounded-lg" />
                      <Skeleton className="h-32 w-full bg-zinc-900 rounded-3xl" />
                   </div>
                </div>
              ) : (
                <div className="prose prose-invert prose-zinc max-w-none">
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-500 p-2 rounded-xl">
                        <BrainCircuit className="w-5 h-5 text-black" />
                      </div>
                      <h3 className="text-3xl font-black uppercase tracking-tighter m-0">Intelligence Output: {league.code}</h3>
                    </div>
                    <button 
                      onClick={generateLeagueReport}
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
                    >
                      Re-Scan Matrix
                    </button>
                  </div>
                  <div className="bg-black/40 border border-zinc-900 p-8 md:p-12 rounded-[32px] font-medium leading-relaxed text-zinc-400">
                    <ReactMarkdown>{aiReport}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
