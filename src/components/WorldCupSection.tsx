import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Globe, Calendar, Activity, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { flag, getTimeCategory, WorldCupMatch } from '@/src/services/worldCupData';

export const WorldCupSection: React.FC = () => {
  const [matches, setMatches] = useState<WorldCupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("upcoming");

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const res = await fetch('/api/world-cup-fixtures');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (data.matches && Array.isArray(data.matches)) {
          setMatches(data.matches);
        }
      } catch (e) {
        console.warn("World Cup fixtures unavailable", e);
      } finally {
        setLoading(false);
      }
    };
    fetchFixtures();
  }, []);

  const filtered = useMemo(() => {
    return matches.filter(m => {
      const cat = getTimeCategory(m);
      if (statusFilter === "all") return true;
      if (statusFilter === "live") return cat === 'live';
      if (statusFilter === "upcoming") return cat === 'upcoming';
      if (statusFilter === "completed") return cat === 'past';
      return true;
    });
  }, [matches, statusFilter]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, WorldCupMatch[]> = {};
    filtered.forEach(m => {
      const d = new Date(m.utcDate);
      const key = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [filtered]);

  const uniqueGroups = useMemo(() => {
    const groups = new Set(matches.map(m => m.group).filter(Boolean) as string[]);
    return Array.from(groups).sort();
  }, [matches]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4">
            <Globe className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-[9px] font-black uppercase text-yellow-500 tracking-[0.25em] font-mono">
              FIFA World Cup 2026
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none">
            Tactical <span className="text-zinc-600">Combat</span> Matrix
          </h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-xl">
            Full tournament fixture intelligence filtered by current timeline. Live probability, historical results, and upcoming engagements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl focus:outline-none focus:border-yellow-500/50"
          >
            <option value="upcoming">Upcoming / Live</option>
            <option value="live">Live Now</option>
            <option value="completed">Completed</option>
            <option value="all">All Fixtures</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="bg-zinc-950 border-zinc-900 rounded-[32px] p-6 h-32 animate-pulse">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-zinc-800 rounded" />
                  <div className="h-3 w-32 bg-zinc-900 rounded" />
                </div>
                <div className="h-8 w-24 bg-zinc-800 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedByDate).map(([date, dateMatches]) => (
            <div key={date} className="space-y-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-yellow-500" />
                <h3 className="text-lg font-black uppercase tracking-tight text-white">{date}</h3>
                <div className="h-[1px] flex-1 bg-zinc-900" />
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  {dateMatches.length} {dateMatches[0] && getTimeCategory(dateMatches[0]) === 'past' ? 'Completed' : 'Engagements'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dateMatches.map((match) => {
                  const isPast = getTimeCategory(match) === 'past';
                  const isLive = ["IN_PLAY", "PAUSED", "LIVE"].includes(match.status);
                  
                  return (
                    <Card
                      key={match.id}
                      className={cn(
                        "bg-zinc-950 border rounded-[32px] p-6 relative overflow-hidden transition-all group",
                        isLive && "border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]",
                        isPast && "border-zinc-800 opacity-75",
                        !isPast && !isLive && "border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            "font-mono text-[8px] uppercase tracking-widest",
                            isPast ? "border-zinc-800 text-zinc-600" : "border-zinc-800 text-zinc-500"
                          )}>
                            {match.group || match.stage}
                          </Badge>
                          {isLive && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                          )}
                          {isPast && (
                            <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">FT</span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-zinc-600 uppercase">
                          {isPast ? "FT" : match.minute ? `${match.minute}'` : new Date(match.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl shrink-0">{flag(match.homeTeam.name)}</span>
                            <span className={cn(
                              "text-sm font-black uppercase tracking-tight truncate",
                              isPast ? "text-zinc-500" : "text-white"
                            )}>
                              {match.homeTeam.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl shrink-0">{flag(match.awayTeam.name)}</span>
                            <span className={cn(
                              "text-sm font-black uppercase tracking-tight truncate",
                              isPast ? "text-zinc-500" : "text-white"
                            )}>
                              {match.awayTeam.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {match.score && (
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "text-2xl font-black font-mono tracking-tighter",
                                isPast ? "text-zinc-600" : "text-white"
                              )}>
                                {match.score.fullTime.home}
                              </span>
                              <span className="text-zinc-800 text-lg">:</span>
                              <span className={cn(
                                "text-2xl font-black font-mono tracking-tighter",
                                isPast ? "text-zinc-600" : "text-white"
                              )}>
                                {match.score.fullTime.away}
                              </span>
                            </div>
                          )}
                          {!match.score && (
                            <span className="text-zinc-700 text-lg font-black">VS</span>
                          )}

                          {match.winProbability && (
                            <div className="w-24 space-y-1">
                              <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-zinc-900">
                                <div className="h-full bg-emerald-500/80 transition-all duration-700" style={{ width: `${match.winProbability.home}%` }} />
                                <div className="h-full bg-zinc-700 transition-all duration-700" style={{ width: `${match.winProbability.draw}%` }} />
                                <div className="h-full bg-blue-500/80 transition-all duration-700" style={{ width: `${match.winProbability.away}%` }} />
                              </div>
                              <div className="flex justify-between text-[7px] font-mono font-black text-zinc-600">
                                <span>{match.winProbability.home}%</span>
                                <span>{match.winProbability.away}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {match.venue && (
                        <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
                            {match.venue}
                          </span>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-24 text-center border-2 border-dashed border-zinc-900 rounded-[40px]">
          <Trophy className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
          <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">No Fixtures Found</h3>
          <p className="text-zinc-500 text-sm">Adjust filters to explore World Cup engagements.</p>
        </div>
      )}
    </div>
  );
};
