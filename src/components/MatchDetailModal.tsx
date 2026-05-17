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
import { supabase } from '@/src/lib/supabase';

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
import { TacticalBriefing } from '@/src/components/CommandCenter/TacticalBriefing';

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ isOpen, onClose, matchId }) => {
  const [matchDetails, setMatchDetails] = useState<any>(null);
  const [h2hData, setH2hData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOpen && matchId) {
      fetchDetails();
      
      interval = setInterval(() => {
        if (matchDetails && ['IN_PLAY', 'PAUSED', 'LIVE'].includes(matchDetails.status)) {
          fetchDetails(true);
        }
      }, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, matchId, matchDetails?.status]);

  const fetchDetails = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [detailsRes, h2hRes] = await Promise.all([
        fetch(`/api/matches/${matchId}`),
        fetch(`/api/matches/${matchId}/head2head`)
      ]);

      if (detailsRes.ok) setMatchDetails(await detailsRes.json());
      if (h2hRes.ok) setH2hData(await h2hRes.json());
      
      // Attempt to load cached analysis if available
      const { data: cached } = await supabase
        .from('predictions')
        .select('analysis')
        .eq('match_id', matchId)
        .limit(1)
        .single();
      
      if (cached?.analysis) {
        setAnalysis(JSON.parse(cached.analysis));
      }
    } catch (error) {
      console.error("Failed to fetch match details:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           onClick={onClose}
           className="absolute inset-0 bg-black/95 backdrop-blur-xl"
        />

        {/* Modal Content */}
        <motion.div
           initial={{ opacity: 0, scale: 0.95, y: 40 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 40 }}
           className="relative w-full max-w-6xl bg-zinc-950 border border-zinc-900 rounded-[56px] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-yellow-500/10 rounded-[22px] flex items-center justify-center border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                <BrainCircuit className="w-7 h-7 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">Tactical Command Node</h2>
                <div className="flex items-center gap-3">
                   <Badge variant="outline" className="bg-zinc-900/50 border-zinc-800 text-[9px] font-mono tracking-[0.2em] text-zinc-500 px-3">
                      ID: {matchId}
                   </Badge>
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active Intelligence Feed</span>
                   </div>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-900 w-12 h-12 border border-transparent hover:border-zinc-800 transition-all">
              <X className="w-6 h-6" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-12 space-y-16">
              {loading ? (
                <div className="space-y-10 animate-pulse">
                  <div className="h-64 bg-zinc-900 rounded-[48px]" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                     <div className="h-96 bg-zinc-900 rounded-[48px]" />
                     <div className="h-96 bg-zinc-900 rounded-[48px]" />
                  </div>
                </div>
              ) : matchDetails ? (
                <>
                  {/* Tactical Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8 space-y-12">
                      {/* Match HUD */}
                      <div className="relative bg-zinc-900/10 border border-zinc-800/50 p-12 rounded-[56px] overflow-hidden group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,179,8,0.05),transparent)]" />
                        <div className="relative z-10">
                          <div className="flex items-center justify-between gap-10">
                             <div className="flex-1 flex flex-col items-center gap-6 group/home">
                                <div className="w-28 h-28 bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-800 shadow-2xl group-hover/home:scale-105 transition-all duration-500 p-5 relative">
                                   <div className="absolute inset-0 bg-yellow-500/5 rounded-full opacity-0 group-hover/home:opacity-100 transition-opacity" />
                                   <img src={matchDetails.homeTeam.crest} className="w-full h-full object-contain relative z-10" referrerPolicy="no-referrer" />
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-center">{matchDetails.homeTeam.name}</h3>
                             </div>

                             <div className="flex flex-col items-center gap-8">
                                <div className="flex items-center gap-4">
                                   <div className="text-7xl font-black font-mono tracking-tighter bg-zinc-950 border border-zinc-900 px-10 py-6 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                      {matchDetails.score?.fullTime?.home ?? 0}<span className="text-zinc-800 mx-2">:</span>{matchDetails.score?.fullTime?.away ?? 0}
                                   </div>
                                </div>
                                <Badge className="bg-zinc-900/80 text-zinc-500 font-black border-zinc-800 py-2 px-6 h-auto rounded-full uppercase tracking-[0.3em] text-[10px] backdrop-blur-sm">
                                   {matchDetails.status}
                                </Badge>
                             </div>

                             <div className="flex-1 flex flex-col items-center gap-6 group/away">
                                <div className="w-28 h-28 bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-800 shadow-2xl group-hover/away:scale-105 transition-all duration-500 p-5 relative">
                                   <div className="absolute inset-0 bg-blue-500/5 rounded-full opacity-0 group-hover/away:opacity-100 transition-opacity" />
                                   <img src={matchDetails.awayTeam.crest} className="w-full h-full object-contain relative z-10" referrerPolicy="no-referrer" />
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-center">{matchDetails.awayTeam.name}</h3>
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Tactical Briefing Deployment */}
                      {analysis && <TacticalBriefing analysis={analysis} />}
                      
                      {/* Metric HUD */}
                      <div className="space-y-8">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
                             <BarChart3 className="w-5 h-5 text-zinc-100" />
                           </div>
                           <h3 className="text-xl font-black uppercase tracking-widest leading-none">Operational Metrics</h3>
                        </div>
                        {matchDetails.statistics ? (
                           <div className="grid grid-cols-1 gap-8 bg-zinc-900/10 border border-zinc-900/50 p-12 rounded-[48px]">
                              <StatRow label="Possession" home={parseInt(matchDetails.statistics.possession?.home || "0")} away={parseInt(matchDetails.statistics.possession?.away || "0")} unit="%" />
                              <StatRow label="Tactical Shots" home={matchDetails.statistics.shots?.home ?? 0} away={matchDetails.statistics.shots?.away ?? 0} />
                              <StatRow label="Precision Strikes" home={matchDetails.statistics.shotsOnTarget?.home ?? 0} away={matchDetails.statistics.shotsOnTarget?.away ?? 0} />
                              <StatRow label="Strategic Corners" home={matchDetails.statistics.corners?.home ?? 0} away={matchDetails.statistics.corners?.away ?? 0} />
                           </div>
                        ) : (
                           <div className="p-24 text-center bg-zinc-950 border-2 border-zinc-900 border-dashed rounded-[48px]">
                              <Target className="w-12 h-12 text-zinc-800 mx-auto mb-8 opacity-50" />
                              <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600">Metric stream pending fixture initialization.</p>
                           </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-4 space-y-12">
                      {/* Stability Monitor */}
                      <VolatilityGauge 
                        confidence={analysis?.prediction?.confidence_score || 0} 
                        marketVolatility={analysis?.prediction?.volatility_index || 40} 
                      />

                      {/* Legacy Access Logs */}
                      <div className="bg-zinc-950 border border-zinc-900 p-10 rounded-[48px] space-y-10 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                            <History className="w-32 h-32" />
                         </div>
                         
                         <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
                                  <History className="w-5 h-5 text-zinc-400" />
                               </div>
                               <h3 className="text-xl font-black uppercase tracking-tighter">Legacy Archive</h3>
                            </div>
                            <Badge variant="outline" className="border-zinc-800 text-[10px] uppercase font-black tracking-widest text-zinc-600 py-1.5 px-4 rounded-full">
                               n={h2hData?.aggregates?.numberOfMatches || 0}
                            </Badge>
                         </div>

                         {h2hData ? (
                            <div className="space-y-10 relative z-10">
                               <div className="flex h-3 w-full rounded-full overflow-hidden bg-zinc-900/50">
                                  <div className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)]" style={{ width: `${(h2hData.aggregates?.homeTeam?.wins / h2hData.aggregates?.numberOfMatches) * 100}%` }} />
                                  <div className="h-full bg-zinc-700" style={{ width: `${(h2hData.aggregates?.homeTeam?.draws / h2hData.aggregates?.numberOfMatches) * 100}%` }} />
                                  <div className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.2)]" style={{ width: `${(h2hData.aggregates?.awayTeam?.wins / h2hData.aggregates?.numberOfMatches) * 100}%` }} />
                                </div>
                               
                               <div className="grid grid-cols-3 text-center gap-6">
                                  <div className="space-y-1">
                                     <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Home DOM</p>
                                     <p className="text-3xl font-black text-white leading-none">{h2hData.aggregates?.homeTeam?.wins || 0}</p>
                                  </div>
                                  <div className="space-y-1">
                                     <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Neutral</p>
                                     <p className="text-3xl font-black text-white leading-none">{h2hData.aggregates?.homeTeam?.draws || 0}</p>
                                  </div>
                                  <div className="space-y-1">
                                     <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Away DOM</p>
                                     <p className="text-3xl font-black text-white leading-none">{h2hData.aggregates?.awayTeam?.wins || 0}</p>
                                  </div>
                               </div>

                               <div className="space-y-4">
                                  {h2hData.matches?.slice(0, 4).map((m: any, idx: number) => (
                                     <div key={idx} className="bg-zinc-900/30 p-5 rounded-3xl flex items-center justify-between border border-transparent hover:border-zinc-800 transition-all group/match">
                                        <div className="flex flex-col">
                                           <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{new Date(m.utcDate).getFullYear()} Archive</span>
                                           <span className="text-xs font-bold text-zinc-400">{m.competition.name.split(' ')[0]}</span>
                                        </div>
                                        <div className="flex items-center gap-5">
                                           <div className="text-center">
                                              <p className="text-[10px] font-mono font-black border border-zinc-800 bg-black px-4 py-2 rounded-xl">
                                                 {m.score.fullTime.home} : {m.score.fullTime.away}
                                              </p>
                                           </div>
                                        </div>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         ) : (
                            <div className="p-16 text-center border-2 border-dashed border-zinc-900 rounded-[48px] opacity-20">
                               <p className="text-xs font-black uppercase tracking-widest">Sync Error: History Purged</p>
                            </div>
                         )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-32 text-center">
                  <p className="text-zinc-500 font-black uppercase tracking-widest text-xl opacity-20">Communication relay failure. Segment not reachable.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-10 border-t border-zinc-900 bg-black/60 flex flex-col md:flex-row justify-between items-center gap-8 backdrop-blur-md">
            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => { onClose(); navigate(`/matches/${matchId}`); }}>
               <div className="w-12 h-12 rounded-[18px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all duration-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <Activity className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">Access Tactical Roster</span>
                  <span className="text-[9px] font-mono text-zinc-700">Verification sequence recommended</span>
               </div>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
               <Button onClick={onClose} variant="outline" className="flex-1 md:flex-none h-16 bg-zinc-900 border-zinc-800 text-zinc-100 font-black uppercase text-[10px] tracking-[0.3em] px-12 rounded-2xl hover:bg-zinc-800 transition-all">
                 Terminate Log
               </Button>
               <Button 
                 onClick={() => { onClose(); navigate(`/matches/${matchId}`); }}
                 className="flex-1 md:flex-none h-16 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[10px] tracking-[0.3em] px-12 rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.3)] transition-all transform hover:-translate-y-1 active:translate-y-0"
               >
                 Initialize Node Sequence
               </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
