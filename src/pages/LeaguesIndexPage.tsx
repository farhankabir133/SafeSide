import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LEAGUES } from '@/src/constants';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Globe, Trophy, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function LeaguesIndexPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 py-24">
      <div className="mb-16">
        <h2 className="text-6xl font-black tracking-tighter uppercase mb-4">Theater <br/> Commands</h2>
        <p className="text-zinc-500 font-medium max-w-2xl">Access tactical intelligence across all major global operational zones. Each zone includes localized form modeling and fatigue mechanics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {LEAGUES.map((league, i) => (
          <motion.div
            key={league.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card 
              onClick={() => navigate(`/leagues/${league.slug}`)}
              className="bg-zinc-950 border-zinc-900 overflow-hidden group hover:border-yellow-500/50 transition-all rounded-3xl cursor-pointer p-8 relative"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Globe className="w-32 h-32 text-yellow-500" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <Badge variant="outline" className="border-zinc-800 text-zinc-500 font-black text-[10px] tracking-widest py-1 px-3">
                    {league.area}
                  </Badge>
                  <Trophy className="w-5 h-5 text-zinc-800 group-hover:text-yellow-500 transition-colors" />
                </div>

                <h3 className="text-3xl font-black tracking-tighter uppercase mb-2 group-hover:text-yellow-500 transition-colors">
                  {league.name}
                </h3>
                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-8">Intelligence Unit Node {league.code}</p>

                <div className="flex items-center gap-2 text-yellow-500 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  Open Secure Feed
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
