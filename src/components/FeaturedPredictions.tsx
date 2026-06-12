import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, Target, ChevronRight, Zap, Shield, ExternalLink, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FeaturedPredictionsProps {
  matches: any[];
  predictions: Record<string, any>;
  onRunAnalysis?: (id: string) => void;
}

export const FeaturedPredictions: React.FC<FeaturedPredictionsProps> = ({ matches, predictions, onRunAnalysis }) => {
  const navigate = useNavigate();

  // Pick up to 3 upcoming matches that either have predictions or are from top leagues
  const topLeagues = ['Premier League', 'Champions League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'];

  const featured = matches
    .filter(m => ['TIMED', 'SCHEDULED'].includes(m.status))
    .sort((a, b) => {
      // Prioritize matches with predictions
      const aPred = predictions[a.id] ? 1 : 0;
      const bPred = predictions[b.id] ? 1 : 0;
      if (aPred !== bPred) return bPred - aPred;
      // Then prioritize top leagues
      const aLeague = topLeagues.includes(a.competition?.name) ? 1 : 0;
      const bLeague = topLeagues.includes(b.competition?.name) ? 1 : 0;
      return bLeague - aLeague;
    })
    .slice(0, 3);

  if (featured.length === 0) return null;

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-5 h-5 text-yellow-500" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                Featured Intelligence
              </h2>
            </div>
            <p className="text-zinc-500 text-xs font-medium">
              Top upcoming fixtures with AI prediction previews
            </p>
          </div>
          <button
            onClick={() => {
              const main = document.querySelector('main');
              main?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors group cursor-pointer"
          >
            View All Matches
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Featured Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((match, index) => {
            const pred = predictions[match.id];
            const hasPrediction = !!pred?.prediction;
            const homeProb = pred?.prediction?.win_probability?.home ?? '—';
            const drawProb = pred?.prediction?.win_probability?.draw ?? '—';
            const awayProb = pred?.prediction?.win_probability?.away ?? '—';
            const confidence = pred?.prediction?.confidence_score;
            const safeSide = pred?.prediction?.safe_side;
            const riskLevel = pred?.risk_assessment?.level || 'Medium';

            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -6 }}
                onClick={() => navigate(`/matches/${match.id}`)}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden group cursor-pointer hover:border-yellow-500/30 transition-all duration-300 relative"
              >
                {/* Top Accent Bar */}
                <div className={cn(
                  "h-1 w-full",
                  riskLevel === 'High' ? "bg-gradient-to-r from-red-500 to-red-600" :
                  riskLevel === 'Medium' ? "bg-gradient-to-r from-yellow-500 to-amber-500" :
                  "bg-gradient-to-r from-emerald-500 to-emerald-600"
                )} />

                <div className="p-5">
                  {/* League & Time */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                      {match.competition?.name || 'League'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(match.utcDate).toLocaleDateString([], { day: 'numeric', month: 'short' })} · {new Date(match.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </div>

                  {/* Teams */}
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center p-2 flex-shrink-0">
                        <img src={match.homeTeam.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" alt="" />
                      </div>
                      <span className="text-sm font-bold text-white truncate">{match.homeTeam.name}</span>
                    </div>
                    <span className="text-zinc-700 font-black text-lg flex-shrink-0">VS</span>
                    <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                      <span className="text-sm font-bold text-white truncate text-right">{match.awayTeam.name}</span>
                      <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center p-2 flex-shrink-0">
                        <img src={match.awayTeam.crest} className="w-full h-full object-contain" referrerPolicy="no-referrer" alt="" />
                      </div>
                    </div>
                  </div>

                  {/* Prediction Data */}
                  {hasPrediction ? (
                    <div className="space-y-3">
                      {/* Probability Bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono font-bold text-emerald-500 w-7">{homeProb}%</span>
                        <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden flex">
                          <div style={{ width: `${homeProb}%` }} className="h-full bg-emerald-500" />
                          <div style={{ width: `${drawProb}%` }} className="h-full bg-zinc-700" />
                          <div style={{ width: `${awayProb}%` }} className="h-full bg-yellow-500" />
                        </div>
                        <span className="text-[8px] font-mono font-bold text-yellow-500 w-7 text-right">{awayProb}%</span>
                      </div>

                      {/* Meta Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3 h-3 text-yellow-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                            {safeSide || 'Calibrating'}
                          </span>
                        </div>
                        {confidence && (
                          <span className={cn(
                            "text-[9px] font-mono font-bold",
                            confidence > 70 ? "text-emerald-500" : confidence > 40 ? "text-yellow-500" : "text-red-500"
                          )}>
                            {confidence.toFixed(0)}% conf.
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRunAnalysis?.(match.id.toString());
                      }}
                      className="w-full py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-yellow-500 hover:border-yellow-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Run AI Analysis
                    </button>
                  )}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-b from-yellow-500/[0.02] to-transparent" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
