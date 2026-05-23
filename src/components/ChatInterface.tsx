import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrainCircuit, Send, User, Bot, Loader2, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { chatAI, formatAIError } from "@/src/services/geminiService";
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ChatInterfaceProps {
  matches: any[];
  selectedMatch?: any | null;
  onClearSelected?: () => void;
}

export function ChatInterface({ matches, selectedMatch, onClearSelected }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      content: `### 👋 Oracle Tactical Console Active

I am the **Safe Side Oracle**, your predictive intelligence copilot. I analyze performance matrices, squad dynamics, and market variables to eliminate gambler's bias.

Select any upcoming match and ask me for:
- ⚡ **Tactical Audits**: Playstyles, tempos, and goal probability biases.
- 🛡️ **Risk Anomalies**: Spotting squad fatigue, "trap matches", and motivation shifts.
- 🎯 **Mathematical Insights**: Poisson density mapping and fractional staking alignments.`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current;
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Auto-detect match mentioned in query if none selected
      let activeMatch = selectedMatch;
      if (!activeMatch) {
        activeMatch = matches.find(m => 
          userMessage.toLowerCase().includes(m.homeTeam.name.toLowerCase()) || 
          userMessage.toLowerCase().includes(m.awayTeam.name.toLowerCase())
        );
        if (activeMatch) {
          window.dispatchEvent(new CustomEvent('matchDetected', { detail: activeMatch }));
        }
      }

      const chatHistory = messages
        .filter((m, idx) => !(idx === 0 && m.role === 'model'))
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

      const matchesSummary = matches && matches.length > 0 
        ? `Upcoming Matches Available for Scanning:\n${matches.map((m: any) => `- ${m.homeTeam.name} vs ${m.awayTeam.name} (${m.competition?.name || 'Unknown Competition'}) at ${m.utcDate}`).join('\n')}`
        : "No live fixture data provided in current context.";

      const selectedContext = activeMatch 
        ? `PRORITY SCAN TARGET: ${activeMatch.homeTeam.name} vs ${activeMatch.awayTeam.name} (${activeMatch.competition?.name || 'Unknown'})\nUser is specifically interested in this match.`
        : '';

      const systemPrompt = `You are the "Safe Side Oracle", an elite predictive intelligence agent for football analytics.
Current Date: May 2026.

MISSION:
Weigh tactical patterns, squad rest indices, injury telemetry, and mathematical density overlays (Poisson/Kelly) to deliver immediate, high-probability advice for any football fan. Your output must be highly concise, visually organized, and professional.

REQUIRED LAYOUT STRUCTURE:
Never return wall-of-text paragraphs. Always format your responses using these exact markdown headers and bold terms:

### ⚡ TACTICAL AUDIT
- **Style Index**: [State main attacking style and matchup dynamic, e.g. High-pressing home side vs low-block counter side]
- **Key Vulnerabilities**: [Direct list of defensive Risks, transition traps, or fatigue vectors]

### 🛡️ RISK & TRAP CHECK
- **Tactical Friction**: [Highlight suspensions, motivation level (e.g. cup priority), or key physical factors]
- **Value Trap rating**: [X/10 rating (where x is 1 to 10) with one crisp justification line, e.g., "7/10: Public over-backing the home team despite severe travel strain"]

### 🎯 MATHEMATICAL CONCLUSION
- **Poisson Value Focus**: [Best value scorelines or low-risk markets, e.g. "Draw or Under 2.5 goals"]
- **Capital Deployment**: [Staking advice, e.g., "Suggest standard 0.2x fractional Kelly. Moderate risk, keep stake at 1.5%."]

Keep all sentences extremely bite-sized, data-focused, objective, and easy for any casual football fan to instantly digest. No fluff or conversational introductions.`;

      const fullMessage = `${systemPrompt}\n\n${selectedContext}\n\nUser Question: ${userMessage}`;
      const text = await chatAI(fullMessage, chatHistory);

      setMessages(prev => [...prev, { role: 'model', content: text }]);
    } catch (error: any) {
      const errorMessage = formatAIError(error);
      setMessages(prev => [...prev, { role: 'model', content: `Agent Offline: ${errorMessage}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl relative">
      <div className="p-6 border-b border-zinc-900 bg-zinc-900/20 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
              <BrainCircuit className="w-5 h-5 text-yellow-500 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-tighter">AI Prediction Lab</h4>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Safe Side Oracle v1.1</p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {selectedMatch && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between group"
            >
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1">Targeting Scanned Item</span>
                <span className="text-xs font-bold text-zinc-300">
                  {selectedMatch.homeTeam.name} <span className="text-zinc-600">vs</span> {selectedMatch.awayTeam.name}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClearSelected}
                className="w-6 h-6 rounded-full hover:bg-yellow-500 hover:text-black opacity-30 group-hover:opacity-100 transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar" 
        ref={scrollRef}
      >
        <div className="space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4 max-w-[92%]",
                  m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                  m.role === 'user' ? "bg-zinc-850 border-zinc-700" : "bg-yellow-500/10 border-yellow-500/20"
                )}>
                  {m.role === 'user' ? <User className="w-4 h-4 text-zinc-400" /> : <Bot className="w-4 h-4 text-yellow-500" />}
                </div>
                
                <div className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed relative overflow-hidden",
                  m.role === 'user' 
                    ? "bg-zinc-900 text-zinc-100 border border-zinc-800" 
                    : "bg-gradient-to-b from-zinc-950 to-zinc-950/90 border border-zinc-800 text-zinc-300 shadow-lg"
                )}>
                  {m.role === 'model' && (
                    <div className="flex items-center justify-between mb-3 pointer-events-none">
                       <span className="text-[8px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                         Oracle System Verified
                       </span>
                    </div>
                  )}
                  
                  {/* Markdown Renderer with Custom Styled Elements for Football Fans */}
                  <div className="markdown-body space-y-2 text-zinc-300">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => {
                          const text = String(props.children || '').toUpperCase();
                          let icon = "⚡";
                          let color = "text-yellow-500 border-yellow-500/20";
                          let bg = "bg-yellow-500/5";
                          if (text.includes("RISK") || text.includes("TRAP")) {
                            icon = "🛡️";
                            color = "text-emerald-400 border-emerald-500/20";
                            bg = "bg-emerald-500/5";
                          } else if (text.includes("MATH") || text.includes("CONCLU")) {
                            icon = "🎯";
                            color = "text-sky-400 border-sky-500/20";
                            bg = "bg-sky-500/5";
                          }
                          return (
                            <h3 className={cn(
                              "text-[10.5px] font-black uppercase tracking-wider flex items-center gap-2 border-l-2 pl-3 py-1.5 rounded-r-xl border-t border-r border-b border-zinc-900 my-4 font-sans",
                              color,
                              bg
                            )}>
                              <span className="text-xs">{icon}</span>
                              {props.children}
                            </h3>
                          );
                        },
                        p: ({node, ...props}) => (
                          <p className="text-xs text-zinc-400 leading-relaxed my-1 font-sans" {...props} />
                        ),
                        ul: ({node, ...props}) => (
                          <ul className="space-y-1.5 my-2 pl-1" {...props} />
                        ),
                        li: ({node, ...props}) => (
                          <li className="text-xs text-zinc-300 leading-relaxed font-sans flex items-start gap-2.5 my-1.5">
                            <span className="text-yellow-500/50 select-none font-mono mt-0.5">•</span>
                            <span className="flex-1">{props.children}</span>
                          </li>
                        ),
                        strong: ({node, ...props}) => (
                          <strong className="font-black text-white bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-lg text-[11px] font-sans mx-0.5" {...props} />
                        ),
                        code: ({node, ...props}) => (
                          <code className="bg-black text-yellow-400 font-mono text-[10px] px-1.5 py-1 rounded-md border border-zinc-900 mx-0.5 font-bold" {...props} />
                        )
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-yellow-500/10 border-yellow-500/20">
                <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900 border-dashed animate-pulse">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-900 bg-zinc-900/10">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about team fatigue, tactical risks, or any match..."
            className="pr-12 bg-zinc-900/50 border-zinc-800 h-12 rounded-xl focus:ring-yellow-500/50 focus:border-yellow-500/50 placeholder:text-zinc-600 text-xs"
          />
          <Button 
            type="submit" 
            disabled={loading}
            size="icon" 
            className="absolute right-1.5 top-1.5 w-9 h-9 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg cursor-pointer transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[10px] text-zinc-600 text-center mt-3 uppercase tracking-widest font-black pointer-events-none">
          Active Node: Regional Aggregation Feed
        </p>
      </div>
    </div>
  );
}

