import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/src/components/Navbar';
import { usePredictions } from '@/src/hooks/usePredictions';
import { MessageSquare } from 'lucide-react';
import { Toaster } from 'sonner';
import { ChatInterface } from '@/src/components/ChatInterface';
import { useAgent } from '@/src/contexts/AgentContext';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CursorGlow } from '@/src/components/motion/CursorGlow';
import { useMotionPrefs } from '@/src/components/motion/MotionProvider';
import { tween } from '@/src/lib/motion';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const { matches } = usePredictions();
  const { isChatOpen, setIsChatOpen, selectedMatch, setSelectedMatch } = useAgent();
  const { effective } = useMotionPrefs();

  const leagueCount = React.useMemo(() => {
    const leagues = new Set();
    matches.forEach(m => {
      if (m.competition?.name) leagues.add(m.competition.name);
    });
    return leagues.size;
  }, [matches]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-200 font-sans selection:bg-white/10">
      <Navbar accuracy={0} leagueCount={leagueCount} />
      
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={effective === "full" ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={effective === "full" ? { opacity: 0, y: -10 } : undefined}
            transition={tween.smooth}
            className="min-h-[60vh] will-change-transform"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isChatOpen && (
          <div className="fixed inset-0 z-[300] flex items-end justify-end p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-[420px] pointer-events-auto relative"
            >
              <button 
                onClick={() => setIsChatOpen(false)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-[#0f0f10]/80 backdrop-blur-md border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                &times;
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
          "fixed bottom-8 right-8 z-[250] w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300",
          isChatOpen ? "bg-[#0f0f10] text-zinc-600 border-zinc-800 scale-0" : "bg-[#0f0f10] text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600"
        )}
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      <footer className="border-t border-zinc-900 py-8 px-4 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-tighter uppercase text-zinc-600">SafeSide</span>
            <span className="text-[10px] font-mono text-zinc-700">Tactical Intelligence</span>
          </div>
          <div className="flex gap-6 text-[10px] uppercase font-bold tracking-widest text-zinc-700 font-mono">
            <span>© 2026</span>
          </div>
        </div>
      </footer>
      
      <Toaster position="top-right" theme="dark" richColors />
      <CursorGlow />
    </div>
  );
};
