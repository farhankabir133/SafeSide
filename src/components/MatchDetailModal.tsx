import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { X, MapPin, User, Trophy, Calendar, Info, Users, History, Activity, BarChart3, Target, ShieldAlert, ExternalLink, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface MatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string | null;
}

const StatRow: React.FC<{ label: string; home: number; away: number; unit?: string }> = ({ label, home, away, unit = "" }) => {
  const total = home + away;
  const homePercent = total === 0 ? 50 : (home / total) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end px-1">
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{label}</span>
          <span className="text-lg font-black font-mono">{home}{unit}</span>
        </div>
        <span className="text-lg font-black font-mono">{away}{unit}</span>
      </div>
      <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-zinc-900">
        <div 
          style={{ width: `${homePercent}%` }} 
          className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000"
        />
        <div 
          style={{ width: `${100 - homePercent}%` }} 
          className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-1000"
        />
      </div>
    </div>
  );
};

import { VolatilityGauge } from '@/src/components/CommandCenter/VolatilityGauge';

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ isOpen, onClose, matchId }) => {
  const [matchDetails, setMatchDetails] = useState<any>(null);
  const [h2hData, setH2hData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && matchId) {
      fetchDetails();
    }
  }, [isOpen, matchId]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const [detailsRes, h2hRes] = await Promise.all([
        fetch(`/api/matches/${matchId}`),
        fetch(`/api/matches/${matchId}/head2head`)
      ]);

      if (detailsRes.ok) setMatchDetails(await detailsRes.json());
      if (h2hRes.ok) setH2hData(await h2hRes.json());
    } catch (error) {
      console.error("Failed to fetch match details:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  if (!isOpen) return null;

  // Mocked AI analytical data for the modal's gauge
  const aiStats = {
    confidence: 72,
    volatility: 42
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-900 rounded-[48px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 border-b border-zinc-900 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20">
                <BrainCircuit className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Strategic Intelligence Node</h2>
                <div className="flex items-center gap-3">
                   <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Target: INFRA-{matchId}</p>
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Connection Stable</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-900 w-12 h-12">
              <X className="w-6 h-6" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-10 space-y-12">
              {loading ? (
                <div className="space-y-8 animate-pulse">
                  <div className="h-48 bg-zinc-900 rounded-[40px] w-full" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="h-40 bg-zinc-900 rounded-[40px]" />
                     <div className="h-40 bg-zinc-900 rounded-[40px]" />
                  </div>
                  <div className="h-80 bg-zinc-900 rounded-[40px] w-full" />
                </div>
              ) : matchDetails ? (
                <>
                  {/* Tactical Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7 space-y-10">
                      {/* Match HUD */}
                      <div className="relative bg-zinc-900/30 border border-zinc-800 p-10 rounded-[48px] overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-emerald-500/5 opacity-50" />
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="flex items-center justify-between w-full mb-10">
                             <div className="text-center group/home">
                                <div className="w-24 h-24 bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-800 shadow-2xl mb-4 group-hover/home:scale-110 transition-transform overflow-hidden p-4">
                                   <img src={matchDetails.homeTeam.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tighter">{matchDetails.homeTeam.name}</h3>
                             </div>

                             <div className="flex flex-col items-center gap-4">
                                <div className="text-5xl font-black font-mono tracking-tighter bg-zinc-950/80 backdrop-blur px-8 py-5 rounded-3xl border border-zinc-800 shadow-2xl">
                                   {matchDetails.score?.fullTime?.home ?? 0} : {matchDetails.score?.fullTime?.away ?? 0}
                                </div>
                                <Badge className="bg-zinc-900 text-zinc-500 font-black border-zinc-800 py-1.5 px-4 h-auto rounded-full uppercase tracking-[0.2em] text-[10px]">
                                   {matchDetails.status}
                                </Badge>
                             </div>

                             <div className="text-center group/away">
                                <div className="w-24 h-24 bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-800 shadow-2xl mb-4 group-hover/away:scale-110 transition-transform overflow-hidden p-4">
                                   <img src={matchDetails.awayTeam.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tighter">{matchDetails.awayTeam.name}</h3>
                             </div>
                          </div>

                          <div className="grid grid-cols-3 w-full gap-4 pt-10 border-t border-zinc-800/50">
                             <div className="text-center space-y-1">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Venue</p>
                                <p className="text-xs font-bold text-zinc-300 truncate">{matchDetails.venue || "TBD"}</p>
                             </div>
                             <div className="text-center space-y-1">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Arbiter</p>
                                <p className="text-xs font-bold text-zinc-300 truncate">{matchDetails.referee?.name || "Official"}</p>
                             </div>
                             <div className="text-center space-y-1">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Temporal</p>
                                <p className="text-xs font-bold text-zinc-300 truncate">{new Date(matchDetails.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Statistics HUD */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                           <BarChart3 className="w-5 h-5 text-emerald-500" />
                           <h3 className="text-lg font-black uppercase tracking-widest">Operational Metrics</h3>
                        </div>
                        {matchDetails.statistics ? (
                           <div className="grid grid-cols-1 gap-6 bg-zinc-900/20 border border-zinc-800/50 p-10 rounded-[40px]">
                              <StatRow label="Possession" home={parseInt(matchDetails.statistics.possession?.home || "0")} away={parseInt(matchDetails.statistics.possession?.away || "0")} unit="%" />
                              <StatRow label="Tactical Shots" home={matchDetails.statistics.shots?.home ?? 0} away={matchDetails.statistics.shots?.away ?? 0} />
                              <StatRow label="Precision Strikes" home={matchDetails.statistics.shotsOnTarget?.home ?? 0} away={matchDetails.statistics.shotsOnTarget?.away ?? 0} />
                              <StatRow label="Disciplinary Events" home={matchDetails.statistics.fouls?.home ?? 0} away={matchDetails.statistics.fouls?.away ?? 0} />
                           </div>
                        ) : (
                           <div className="p-20 text-center bg-zinc-950 border border-zinc-900 border-dashed rounded-[40px]">
                              <Target className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Metric stream not initialized for this fixture node.</p>
                           </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-5 space-y-10">
                      {/* AI Stability Component */}
                      <VolatilityGauge confidence={aiStats.confidence} marketVolatility={aiStats.volatility} label="AI Node Stability Index" />

                      {/* Head-to-Head HUD */}
                      <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-[48px] space-y-8">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <History className="w-5 h-5 text-zinc-500" />
                               <h3 className="text-lg font-black uppercase tracking-widest">Legacy Logs</h3>
                            </div>
                            <Badge variant="outline" className="border-zinc-800 text-[10px] uppercase font-black tracking-widest text-zinc-600">
                               n={h2hData?.aggregates?.numberOfMatches || 0}
                            </Badge>
                         </div>

                         {h2hData ? (
                            <div className="space-y-6">
                               <div className="flex items-center gap-3 h-4 w-full rounded-full overflow-hidden bg-zinc-900">
                                  <div className="h-full bg-white opacity-90" style={{ width: `${(h2hData.aggregates?.homeTeam?.wins / h2hData.aggregates?.numberOfMatches) * 100}%` }} />
                                  <div className="h-full bg-zinc-700" style={{ width: `${(h2hData.aggregates?.homeTeam?.draws / h2hData.aggregates?.numberOfMatches) * 100}%` }} />
                                  <div className="h-full bg-blue-600" style={{ width: `${(h2hData.aggregates?.awayTeam?.wins / h2hData.aggregates?.numberOfMatches) * 100}%` }} />
                               </div>
                               
                               <div className="grid grid-cols-3 text-center gap-4">
                                  <div>
                                     <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Host wins</p>
                                     <p className="text-2xl font-black text-white">{h2hData.aggregates?.homeTeam?.wins || 0}</p>
                                  </div>
                                  <div>
                                     <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Stalemates</p>
                                     <p className="text-2xl font-black text-white">{h2hData.aggregates?.homeTeam?.draws || 0}</p>
                                  </div>
                                  <div>
                                     <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Assailant wins</p>
                                     <p className="text-2xl font-black text-white">{h2hData.aggregates?.awayTeam?.wins || 0}</p>
                                  </div>
                               </div>

                               <Separator className="bg-zinc-900" />

                               <div className="space-y-3">
                                  {h2hData.matches?.slice(0, 3).map((m: any, idx: number) => (
                                     <div key={idx} className="bg-zinc-900/40 p-4 rounded-2xl flex items-center justify-between group/h2h hover:border-zinc-700 border border-transparent transition-all">
                                        <span className="text-[10px] font-mono text-zinc-600">{new Date(m.utcDate).getFullYear()}</span>
                                        <div className="flex items-center gap-3">
                                           <span className="text-xs font-black uppercase text-zinc-100">{m.homeTeam.name.split(' ').pop()}</span>
                                           <div className="bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800 text-[10px] font-black font-mono">
                                              {m.score.fullTime.home}-{m.score.fullTime.away}
                                           </div>
                                           <span className="text-xs font-black uppercase text-zinc-100">{m.awayTeam.name.split(' ').pop()}</span>
                                        </div>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         ) : (
                            <div className="p-10 text-center border-2 border-dashed border-zinc-900 rounded-[32px] opacity-30">
                               <p className="text-xs font-black uppercase tracking-widest">No Archival Logs</p>
                            </div>
                         )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-20 text-center">
                  <p className="text-zinc-500 font-black uppercase tracking-widest">Fixtured node not found in current sector.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-zinc-900 bg-black/40 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { onClose(); navigate(`/matches/${matchId}`); }}>
               <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                  <ExternalLink className="w-4 h-4" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">Access Full Tactical Roster</span>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
               <Button onClick={onClose} variant="outline" className="flex-1 md:flex-none h-14 bg-zinc-900 border-zinc-800 text-zinc-100 font-black uppercase text-[10px] tracking-widest px-10 rounded-2xl hover:bg-zinc-800">
                 Dismiss HUD
               </Button>
               <Button 
                 onClick={() => { onClose(); navigate(`/matches/${matchId}`); }}
                 className="flex-1 md:flex-none h-14 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[10px] tracking-widest px-10 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all"
               >
                 Initialize Full Analysis
               </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
