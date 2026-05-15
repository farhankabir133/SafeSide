import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Terminal, Zap, Activity, Target, Shield, X, Cpu } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';

interface CommandConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  matches: any[];
}

export const CommandConsole: React.FC<CommandConsoleProps> = ({ isOpen, onClose, matches }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredItems = React.useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    
    const results: any[] = [];
    
    // Search Teams
    const teams = new Set();
    matches.forEach(m => {
      if (m.homeTeam.name.toLowerCase().includes(q)) teams.add(JSON.stringify({ type: 'team', id: m.homeTeam.id, name: m.homeTeam.name, crest: m.homeTeam.crest }));
      if (m.awayTeam.name.toLowerCase().includes(q)) teams.add(JSON.stringify({ type: 'team', id: m.awayTeam.id, name: m.awayTeam.name, crest: m.awayTeam.crest }));
    });

    // Search Competitions
    const comps = new Set();
    matches.forEach(m => {
      if (m.competition?.name.toLowerCase().includes(q)) comps.add(JSON.stringify({ type: 'league', name: m.competition.name, icon: TrophyIcon }));
    });

    return [
      ...Array.from(teams).map(t => JSON.parse(t as string)),
      ...Array.from(comps).map(c => JSON.parse(c as string))
    ].slice(0, 8);
  }, [query, matches]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      const item = filteredItems[selectedIndex];
      if (item.type === 'team') navigate(`/teams/${item.id}`);
      else navigate(`/leagues`);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-2xl bg-[#0d0d0d] border border-zinc-800 rounded-[32px] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden relative z-10"
          >
            {/* Console Header */}
            <div className="p-6 border-b border-zinc-900 bg-zinc-950/50 flex items-center gap-4">
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <Terminal className="w-5 h-5 text-yellow-500" />
              </div>
              <input 
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tactical intercept query..."
                className="bg-transparent border-none outline-none text-xl font-black uppercase tracking-tight text-white placeholder:text-zinc-700 flex-1"
              />
              <div className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] font-black text-zinc-500 uppercase">ESC</span>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
              {!query ? (
                <div className="p-8 text-center">
                  <Cpu className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-600 text-sm font-bold uppercase tracking-widest">Neural link idle.</p>
                  <p className="text-zinc-800 text-[10px] uppercase font-black tracking-widest mt-2">Enter target team or league for intercept.</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center">
                  <X className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-600 text-sm font-bold uppercase tracking-widest">No signature matches.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item, i) => (
                    <button
                      key={i}
                      onMouseEnter={() => setSelectedIndex(i)}
                      onClick={() => {
                        if (item.type === 'team') navigate(`/teams/${item.id}`);
                        else navigate(`/leagues`);
                        onClose();
                      }}
                      className={cn(
                        "w-full p-4 rounded-2xl flex items-center justify-between transition-all group",
                        selectedIndex === i ? "bg-zinc-900 border border-zinc-800 translate-x-1" : "bg-transparent border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-center overflow-hidden">
                          {item.crest ? (
                            <img src={item.crest} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <Zap className="w-5 h-5 text-zinc-700" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className={cn("text-sm font-black uppercase tracking-tight", selectedIndex === i ? "text-white" : "text-zinc-500")}>
                            {item.name}
                          </p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700 group-hover:text-zinc-600">
                            {item.type === 'team' ? 'Direct Node Link' : 'Strategic Zone'}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "opacity-0 transition-opacity flex items-center gap-2",
                        selectedIndex === i && "opacity-100"
                      )}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Sync Signal</span>
                        <Zap className="w-3 h-3 text-yellow-500" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Console Footer */}
            <div className="p-4 bg-zinc-950/50 border-t border-zinc-900 flex items-center justify-between">
              <div className="flex gap-4">
                <FooterHint label="Navigate" keys={['↑', '↓']} />
                <FooterHint label="Select" keys={['RET']} />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Sub-system Active</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const FooterHint = ({ label, keys }: { label: string, keys: string[] }) => (
  <div className="flex items-center gap-2">
    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</span>
    <div className="flex gap-1">
      {keys.map(k => (
        <span key={k} className="px-1 py-px rounded bg-zinc-900 border border-zinc-800 text-[8px] font-black text-zinc-400">{k}</span>
      ))}
    </div>
  </div>
);

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);
