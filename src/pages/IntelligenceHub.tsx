import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PopItem } from '@/src/components/motion/Stagger';
import { staggerContainerExit } from '@/src/lib/motion';
import {
  BrainCircuit,
  Trophy,
  Target,
  Activity,
  Zap,
  RefreshCw,
  Globe,
  ChevronDown,
  MessageSquare,
  X,
  Shield,
  Radar,
  Crosshair,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Flame,
  Newspaper,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { MatchDetailModal } from '@/src/components/MatchDetailModal';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { cn } from '@/src/lib/utils';
import { usePredictions } from '@/src/hooks/usePredictions';
import { MultiModelPrediction } from '@/src/types/prediction';

const LiveIndicator = () => (
  <span className="flex items-center gap-1.5">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
    </span>
    <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Live</span>
  </span>
);

export default function App() {
  const navigate = useNavigate();
  const {
    matches,
    loading,
    error,
    predictions,
    runAnalysis,
    stats,
    fetchMatches,
    isDemo,
    rateLimit,
    lastSyncedAt,
    historicalData,
    analyzingIds,
    analysisErrors,
    globalCooldown,
  } = usePredictions();
  const [expandedLeagues, setExpandedLeagues] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailMatchId, setDetailMatchId] = useState<string | null>(null);
  const [isCommandConsoleOpen, setIsCommandConsoleOpen] = useState(false);

  const filteredMatches = matches.filter((m: any) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (leagueFilter !== "all" && m.competition?.id?.toString() !== leagueFilter) return false;
    if (searchQuery && !`${m.homeTeam?.name} ${m.awayTeam?.name}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const grouped = filteredMatches.reduce<Record<string, any[]>>((acc, m: any) => {
    const key = m.competition?.name || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const liveMatches = matches.filter((m: any) => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status));

  // Filter signature — changing it restarts the staggered choreography.
  const filterKey = `${statusFilter}|${leagueFilter}|${dateFilter}|${searchQuery}`;
  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-white/20">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-900">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-black text-sm">SS</div>
              <div className="leading-none">
                <div className="text-sm font-black uppercase tracking-tight">SafeSide</div>
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Tactical Intelligence</div>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <button onClick={() => navigate('/leagues')} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors">Leagues</button>
              <button onClick={() => navigate('/live-analysis')} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors flex items-center gap-2">Live <LiveIndicator /></button>
              <button onClick={() => navigate('/tools/bankroll')} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors">Bankroll</button>
              <button onClick={() => navigate('/pricing')} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors">Pricing</button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-zinc-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString()}` : 'Offline'}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCommandConsoleOpen(true)}
              className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-[11px] font-black uppercase tracking-wider"
            >
              <Crosshair className="w-3 h-3 mr-2" /> Console
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 space-y-8">
        {error && (
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-400 font-mono">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">Football Intelligence Hub</h1>
                <p className="text-xs text-zinc-500 font-mono mt-1">Real-time tactical analysis across {matches.length} tracked matches</p>
              </div>
              <Button
                onClick={() => fetchMatches()}
                disabled={loading}
                variant="outline"
                size="sm"
                className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading && matches.length === 0 ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="bg-zinc-950 border-zinc-900">
                    <CardContent className="p-6">
                      <Skeleton className="h-24 w-full bg-zinc-900" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredMatches.length === 0 ? (
              <Card className="bg-zinc-950 border-zinc-900">
                <CardContent className="p-12 text-center">
                  <Radar className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-500 font-mono text-sm">No matches match current filters</p>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={filterKey}
                  variants={staggerContainerExit(0.04)}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                {Object.entries(grouped).map(([competition, compMatches]: [string, any[]]) => (
                  <div key={competition} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">{competition}</h2>
                        <Badge variant="outline" className="text-[10px] font-mono">{compMatches.length}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {compMatches.map((m: any) => {
                        const prediction = predictions[m.id.toString()] as MultiModelPrediction | undefined;
                        const isAnalyzing = analyzingIds.has(m.id.toString());
                        const analysisError = analysisErrors[m.id.toString()];

                        return (
                          <PopItem key={m.id} className="will-change-transform">
                            <Card className="bg-zinc-950 border-zinc-900 hover:border-zinc-700 transition-colors group">
                              <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-mono text-zinc-600">{m.utcDate ? new Date(m.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</span>
                                    {m.status === 'IN_PLAY' && <LiveIndicator />}
                                  </div>
                                   <div className="flex items-center gap-3">
                                     <div className="flex items-center gap-2 flex-1 min-w-0">
                                       {m.homeTeam.crest && <motion.img src={m.homeTeam.crest} alt="" layoutId={`hub-crest-home-${m.id}`} className="w-5 h-5 rounded-full" />}
                                       <span className="text-sm font-bold truncate">{m.homeTeam.name}</span>
                                     </div>
                                     <motion.div className="px-3 py-1 bg-zinc-900 rounded-lg" layoutId={`hub-score-${m.id}`}>
                                       <span className="text-sm font-black font-mono">
                                         {m.score?.fullTime?.home ?? '-'}-{m.score?.fullTime?.away ?? '-'}
                                       </span>
                                     </motion.div>
                                     <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                       <span className="text-sm font-bold truncate">{m.awayTeam.name}</span>
                                       {m.awayTeam.crest && <motion.img src={m.awayTeam.crest} alt="" layoutId={`hub-crest-away-${m.id}`} className="w-5 h-5 rounded-full" />}
                                     </div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {prediction && (
                                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500">
                                      Analyzed
                                    </Badge>
                                  )}
                                  {analysisError && (
                                    <Badge variant="destructive" className="text-[10px] font-mono">Error</Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (!prediction && !isAnalyzing) {
                                        runAnalysis(m.id.toString());
                                      }
                                    }}
                                    disabled={isAnalyzing || !!prediction}
                                    className={cn(
                                      "text-[11px] font-black uppercase tracking-wider",
                                      prediction ? 'bg-zinc-800 text-zinc-400 cursor-default' : 'bg-white text-black hover:bg-zinc-200'
                                    )}
                                  >
                                    {isAnalyzing ? 'Analyzing...' : prediction ? 'Done' : 'Analyze'}
                                  </Button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => setDetailMatchId(m.id)}
                                     className="text-zinc-500 hover:text-white"
                                   >
                                    <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                                  </Button>
                                </div>
                              </div>
                              {analysisError && (
                                <p className="text-[10px] text-red-500 font-mono mt-2">{analysisError}</p>
                              )}
                            </CardContent>
                          </Card>
                          </PopItem>
                        );
                      })}
                    </div>
                  </div>
                ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <Card className="bg-zinc-950 border-zinc-900 sticky top-20">
              <CardHeader className="pb-4 border-b border-zinc-900">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">Command Center</CardTitle>
                  <Activity className="w-4 h-4 text-zinc-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Matches" value={matches.length} icon={<Globe className="w-3 h-3" />} />
                  <StatBox label="Live" value={liveMatches.length} icon={<Flame className="w-3 h-3" />} highlight />
                  <StatBox label="Analyzed" value={Object.keys(predictions).length} icon={<BrainCircuit className="w-3 h-3" />} />
                  <StatBox label="Accuracy" value={`${stats.accuracy.toFixed(0)}%`} icon={<Target className="w-3 h-3" />} />
                </div>
                <Separator className="bg-zinc-900" />
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Model Status</div>
                  <div className="space-y-1.5">
                    <ModelStatusItem name="Poisson" status="active" />
                    <ModelStatusItem name="Dixon-Coles" status="active" />
                    <ModelStatusItem name="Elo Engine" status="active" />
                    <ModelStatusItem name="Calibration" status="active" />
                  </div>
                </div>
                <Separator className="bg-zinc-900" />
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Quota</div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500">Rate Limit</span>
                    <span className="text-zinc-300">{rateLimit ? `${rateLimit.remaining} req` : 'N/A'}</span>
                  </div>
                  {globalCooldown && (
                    <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-[10px] text-red-400 font-mono">Cooling down...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {historicalData.length > 0 && (
              <Card className="bg-zinc-950 border-zinc-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">Prediction Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={historicalData.slice(-14)}>
                      <defs>
                        <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fff" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#e4e4e7' }}
                        formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Accuracy']}
                      />
                      <Area type="monotone" dataKey="accuracy" stroke="#fff" fill="url(#accuracyGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </aside>
        </section>
      </main>

      <MatchDetailModal
        isOpen={!!detailMatchId}
        matchId={detailMatchId}
        onClose={() => setDetailMatchId(null)}
      />
    </div>
  );
}

function StatBox({ label, value, icon, highlight = false }: { label: string; value: string | number; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn('p-3 border rounded-xl', highlight ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-950 border-zinc-900')}>
      <div className="flex items-center gap-2 text-zinc-500 mb-1">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className={cn('text-lg font-black font-mono', highlight && 'text-white')}>{value}</div>
    </div>
  );
}

function ModelStatusItem({ name, status }: { name: string; status: 'active' | 'degraded' | 'offline' }) {
  const colors = { active: 'bg-emerald-500', degraded: 'bg-yellow-500', offline: 'bg-red-500' };
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-mono text-zinc-400">{name}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status]}`} />
    </div>
  );
}
