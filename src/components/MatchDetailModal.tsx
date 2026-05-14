import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { X, MapPin, User, Trophy, Calendar, Info, Users, History, Activity, BarChart3, Target, ShieldAlert, ExternalLink } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { Separator } from '@/src/components/ui/separator';
import { Progress } from '@/src/components/ui/progress';
import { cn } from '@/src/lib/utils';

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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter">Strategic Intelligence Report</h2>
                <p className="text-xs text-zinc-500 font-mono">MATCH_ID: {matchId}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-900">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 space-y-12">
              {loading ? (
                <div className="space-y-8 animate-pulse">
                  <div className="h-40 bg-zinc-900 rounded-3xl w-full" />
                  <div className="grid grid-cols-2 gap-8">
                     <div className="h-32 bg-zinc-900 rounded-3xl" />
                     <div className="h-32 bg-zinc-900 rounded-3xl" />
                  </div>
                  <div className="h-64 bg-zinc-900 rounded-3xl w-full" />
                </div>
              ) : matchDetails ? (
                <>
                  {/* Match Banner */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-emerald-500/10 blur-3xl opacity-50 transition-opacity" />
                    <div className="relative bg-zinc-900/50 border border-zinc-800 p-8 rounded-[40px] flex flex-col items-center">
                      <div className="flex items-center justify-between w-full max-w-2xl">
                        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-800 shadow-xl group-hover:scale-110 transition-transform overflow-hidden p-3 shrink-0">
                            {matchDetails.homeTeam?.crest ? (
                              <img 
                                src={matchDetails.homeTeam.crest} 
                                alt={matchDetails.homeTeam.name} 
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Users className="w-10 h-10 text-zinc-400" />
                            )}
                          </div>
                          <span className="text-xl font-black uppercase tracking-tighter max-w-[150px] leading-tight">{matchDetails.homeTeam?.name}</span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2">
                           <Badge variant="outline" className="bg-zinc-950 border-zinc-800 text-[10px] uppercase tracking-widest font-black">VS</Badge>
                           <div className="text-4xl font-black font-mono tracking-tighter">
                             {matchDetails.score?.fullTime?.home ?? 0} : {matchDetails.score?.fullTime?.away ?? 0}
                           </div>
                           <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest bg-zinc-950 px-3 py-1 rounded-full border border-zinc-900">
                             {matchDetails.status}
                           </span>
                        </div>

                        <div className="flex flex-col md:flex-row-reverse items-center gap-4 text-center md:text-right">
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-800 shadow-xl group-hover:scale-110 transition-transform overflow-hidden p-3 shrink-0">
                            {matchDetails.awayTeam?.crest ? (
                              <img 
                                src={matchDetails.awayTeam.crest} 
                                alt={matchDetails.awayTeam.name} 
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Users className="w-10 h-10 text-zinc-400" />
                            )}
                          </div>
                          <span className="text-xl font-black uppercase tracking-tighter max-w-[150px] leading-tight">{matchDetails.awayTeam?.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Venue & Referee Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <MapPin className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Theater of Operations</span>
                        </div>
                        <p className="text-lg font-black uppercase tracking-tight">{matchDetails.venue || "Undisclosed Venue"}</p>
                        <div className="flex items-center gap-2 text-zinc-600">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px] font-mono">{new Date(matchDetails.utcDate).toLocaleString()}</span>
                        </div>
                     </div>

                     <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <User className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Lead Arbiter</span>
                        </div>
                        <p className="text-lg font-black uppercase tracking-tight">{matchDetails.referee?.name || "Official TBD"}</p>
                        <div className="flex items-center gap-2 text-zinc-600">
                          <Activity className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-mono">Disciplinary Node Verified</span>
                        </div>
                     </div>
                  </div>

                  <Separator className="bg-zinc-900" />

                  {/* Tactical Statistics */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-emerald-500" />
                      <h3 className="text-lg font-black uppercase tracking-widest">Tactical Operation Metrics</h3>
                    </div>

                    {matchDetails.statistics ? (
                      <div className="space-y-6 bg-zinc-950 border border-zinc-900 p-8 rounded-[40px]">
                        <StatRow 
                          label="Ball Possession" 
                          home={parseInt(matchDetails.statistics.possession?.home || "0")} 
                          away={parseInt(matchDetails.statistics.possession?.away || "0")} 
                          unit="%"
                        />
                        <StatRow 
                          label="Total Shots" 
                          home={matchDetails.statistics.shots?.home ?? 0} 
                          away={matchDetails.statistics.shots?.away ?? 0} 
                        />
                        <StatRow 
                          label="Shots on Target" 
                          home={matchDetails.statistics.shotsOnTarget?.home ?? 0} 
                          away={matchDetails.statistics.shotsOnTarget?.away ?? 0} 
                        />
                        <StatRow 
                          label="Corner Kicks" 
                          home={matchDetails.statistics.corners?.home ?? 0} 
                          away={matchDetails.statistics.corners?.away ?? 0} 
                        />
                        <StatRow 
                          label="Disciplinary (Fouls)" 
                          home={matchDetails.statistics.fouls?.home ?? 0} 
                          away={matchDetails.statistics.fouls?.away ?? 0} 
                        />
                      </div>
                    ) : (
                      <div className="p-12 text-center border-2 border-dashed border-zinc-900 rounded-3xl bg-zinc-950/50">
                        <Target className="w-8 h-8 text-zinc-800 mx-auto mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-zinc-600">Statistics Feed Offline</h4>
                        <p className="text-[10px] text-zinc-700 font-medium mt-2 uppercase tracking-tight">
                          Real-time tactical metrics are only available for live engagements and verified completed operations in specific theatre commands.
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-zinc-900" />

                  {/* H2H Statistics */}
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <History className="w-5 h-5 text-zinc-400" />
                         <h3 className="text-lg font-black uppercase tracking-widest">Legacy Interaction Feed</h3>
                      </div>
                      <Badge variant="outline" className="border-zinc-800 text-[10px] uppercase font-black tracking-widest text-zinc-500">
                        Total: {h2hData?.aggregates?.numberOfMatches ?? 0} Engagements
                      </Badge>
                    </div>

                    {h2hData ? (
                      <div className="space-y-6">
                        {/* Win Distribution */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-3xl text-center group hover:bg-emerald-500/10 transition-all">
                            <span className="text-4xl font-black text-emerald-500 leading-none">{h2hData.aggregates?.homeTeam?.wins ?? 0}</span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">{matchDetails.homeTeam?.name} VICTORIES</p>
                          </div>
                          <div className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-3xl text-center">
                            <span className="text-4xl font-black text-zinc-400 leading-none">{h2hData.aggregates?.homeTeam?.draws ?? 0}</span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">STALEMATES</p>
                          </div>
                          <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-3xl text-center group hover:bg-blue-500/10 transition-all">
                            <span className="text-4xl font-black text-blue-500 leading-none">{h2hData.aggregates?.awayTeam?.wins ?? 0}</span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">{matchDetails.awayTeam?.name} VICTORIES</p>
                          </div>
                        </div>

                        {/* Highlighted Most Recent Encounter */}
                        {h2hData.matches && h2hData.matches.length > 0 && (
                          <div className="relative overflow-hidden bg-zinc-900/30 border border-zinc-800 p-8 rounded-[40px] group">
                            <div className="absolute top-0 right-0 p-4">
                              <Badge className="bg-yellow-500 text-black font-black uppercase text-[8px] tracking-widest">Latest Engagement</Badge>
                            </div>
                            <div className="flex flex-col items-center gap-6">
                              <div className="flex items-center gap-2 text-zinc-600">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                  {new Date(h2hData.matches[0].utcDate).toLocaleDateString(undefined, { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-center gap-8 w-full">
                                <div className="flex-1 text-right">
                                  <span className="text-lg font-black uppercase tracking-tighter truncate block">{h2hData.matches[0].homeTeam.name}</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <div className="text-3xl font-black font-mono tracking-tighter bg-zinc-950 px-6 py-3 rounded-2xl border border-zinc-800 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                    {h2hData.matches[0].score?.fullTime?.home} - {h2hData.matches[0].score?.fullTime?.away}
                                  </div>
                                </div>
                                <div className="flex-1 text-left">
                                  <span className="text-lg font-black uppercase tracking-tighter truncate block">{h2hData.matches[0].awayTeam.name}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Trophy className="w-3 h-3 text-zinc-500" />
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                  {h2hData.matches[0].competition?.name || "Official Competition"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-12 text-center border-2 border-dashed border-zinc-900 rounded-3xl">
                        <p className="text-zinc-600 font-medium">Historical head-to-head data not currently accessible in the grid.</p>
                      </div>
                    )}
                  </div>

                  {/* Recent History List */}
                  {h2hData?.matches?.length > 1 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-zinc-500" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Historical Engagement Logs</h4>
                      </div>
                      <div className="space-y-2">
                        {h2hData.matches.slice(1, 6).map((m: any) => (
                          <div key={m.id} className="bg-zinc-950 border border-zinc-900/50 p-4 rounded-2xl flex items-center justify-between group hover:border-zinc-800 transition-all">
                            <div className="flex items-center gap-3 w-28">
                              <Calendar className="w-3 h-3 text-zinc-700" />
                              <span className="text-[10px] font-mono text-zinc-600">
                                {new Date(m.utcDate).toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 flex-1 justify-center px-4">
                              <span className="text-xs font-bold uppercase tracking-tight text-right flex-1 truncate">{m.homeTeam.name}</span>
                              <div className="bg-zinc-900 px-4 py-2 rounded-xl text-xs font-black font-mono border border-zinc-800 shadow-inner min-w-[70px] text-center">
                                {m.score?.fullTime?.home ?? '?'} - {m.score?.fullTime?.away ?? '?'}
                              </div>
                              <span className="text-xs font-bold uppercase tracking-tight text-left flex-1 truncate">{m.awayTeam.name}</span>
                            </div>
                            <div className="w-24 hidden md:flex justify-end">
                              <Badge variant="outline" className="text-[8px] uppercase tracking-widest font-black border-zinc-800 opacity-50">
                                {m.competition?.name || "LEAGUE"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-[40px] space-y-4">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-yellow-500" />
                      <h3 className="text-lg font-black uppercase tracking-widest">Squad Status Update</h3>
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed font-medium italic">
                      "Real-time squad news is currently aggregated from verified scout networks. Full roster breakdowns are available 60 minutes prior to tactical initiation (Kick-off)."
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-20 text-center">
                  <p className="text-zinc-500">Could not retrieve match intelligence. Connection error.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-zinc-900 bg-zinc-950 flex justify-end gap-3">
            <Button
              onClick={() => { onClose(); navigate(`/matches/${matchId}`); }}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-tighter h-12 px-8 rounded-2xl"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Full Intelligence Report
            </Button>
            <Button onClick={onClose} className="bg-zinc-900 border-zinc-800 text-[10px] uppercase font-black tracking-widest hover:bg-zinc-800 text-white h-12 px-8 rounded-2xl">
              Deactivate Briefing
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
