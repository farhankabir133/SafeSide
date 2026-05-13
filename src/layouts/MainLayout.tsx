import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/src/components/Navbar';
import { usePredictions } from '@/src/hooks/usePredictions';
import { BrainCircuit } from 'lucide-react';
import { Toaster } from 'sonner';

export const MainLayout: React.FC = () => {
  const { matches, stats } = usePredictions();

  const leagueCount = React.useMemo(() => {
    const leagues = new Set();
    matches.forEach(m => {
      if (m.competition?.name) leagues.add(m.competition.name);
    });
    return leagues.size;
  }, [matches]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-yellow-500 selection:text-black pb-20 md:pb-0">
      <Navbar accuracy={stats.accuracy} leagueCount={leagueCount} />
      
      <main>
        <Outlet />
      </main>

      <footer className="border-t border-zinc-900 py-12 px-4 mt-24">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 grayscale opacity-30">
             <BrainCircuit className="w-6 h-6" />
             <span className="font-black text-xl tracking-tighter uppercase">Safe Side</span>
          </div>
          <div className="flex gap-8 text-[10px] uppercase font-bold tracking-widest text-zinc-600 font-mono">
            <span>© 2026 INTERNAL USE ONLY</span>
            <button className="hover:text-white transition-colors">Documentation</button>
            <button className="hover:text-white transition-colors">Privacy</button>
          </div>
        </div>
      </footer>
      
      <Toaster position="top-right" theme="dark" richColors />
    </div>
  );
};
