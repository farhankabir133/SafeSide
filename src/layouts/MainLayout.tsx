import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/src/components/Navbar';
import { usePredictions } from '@/src/hooks/usePredictions';
import { BrainCircuit, X } from 'lucide-react';
import { Toaster } from 'sonner';
import { ChatInterface } from '@/src/components/ChatInterface';
import { useAgent } from '@/src/contexts/AgentContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export const MainLayout: React.FC = () => {
  const { matches, stats } = usePredictions();
  const { isChatOpen, setIsChatOpen, selectedMatch, setSelectedMatch } = useAgent();

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

      {/* Global AI Agent Floating Interface */}
      <AnimatePresence>
        {isChatOpen && (
          <div className="fixed inset-0 z-[300] flex items-end justify-end p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-[450px] pointer-events-auto relative"
            >
              <button 
                onClick={() => setIsChatOpen(false)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <ChatInterface 
                matches={matches} 
                selectedMatch={selectedMatch} 
                onClearSelected={() => setSelectedMatch(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={cn(
          "fixed bottom-24 right-8 z-[250] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300",
          isChatOpen ? "bg-zinc-800 text-white scale-0" : "bg-yellow-500 hover:bg-yellow-400 text-black hover:scale-110"
        )}
      >
        <BrainCircuit className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
        </span>
      </button>

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
