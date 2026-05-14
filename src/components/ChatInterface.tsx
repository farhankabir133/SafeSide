import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrainCircuit, Send, User, Bot, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ai, MODEL_ID } from "@/src/services/geminiService";

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
    { role: 'model', content: "Hello. I am the Safe Side Oracle. Ask me about match dynamics, tactical risks, or predictive logic for any upcoming fixture." }
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
    // Small delay to ensure content is rendered before scrolling
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
          // Dispatch event to update App state so it can be highlighted
          window.dispatchEvent(new CustomEvent('matchDetected', { detail: activeMatch }));
        }
      }

      // Filter history: Gemini requires the first message to be 'user'
      // We also exclude the initial welcome message from the history sent to the model
      const chatHistory = messages
        .filter((m, idx) => !(idx === 0 && m.role === 'model'))
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

      const chat = ai.startChat({
        history: chatHistory
      });

      const matchesSummary = matches && matches.length > 0 
        ? `Upcoming Matches Available for Scanning:\n${matches.map((m: any) => `- ${m.homeTeam.name} vs ${m.awayTeam.name} (${m.competition?.name || 'Unknown Competition'}) at ${m.utcDate}`).join('\n')}`
        : "No live fixture data provided in current context.";

      const selectedContext = activeMatch 
        ? `PRORITY SCAN TARGET: ${activeMatch.homeTeam.name} vs ${activeMatch.awayTeam.name} (${activeMatch.competition?.name || 'Unknown'})\nUser is specifically interested in this match.`
        : '';

      const systemPrompt = `You are the "Safe Side Oracle", a high-level Professional Predictive Agent. 
Current Date: May 2026. 
Mission: Analyze, scan, and provide feedback on football fixtures with extreme scrutiny.

Professional Protocol:
1. Analytical Depth: Use the match context provided below.
2. Risk Management: Identify high-risk variables (fatigue, motivation, suspension).
3. Tone: Precise, data-focused, and professional. 
4. Constraint: No financial advice. 

${selectedContext}

Scanned Data Context:
${matchesSummary}`;

      const result = await chat.sendMessage(`${systemPrompt}\n\nUser Message: ${userMessage}`);
      const text = result.response.text();

      setMessages(prev => [...prev, { role: 'model', content: text }]);
    } catch (error: any) {
      const errorMessage = error.message || "Simulation failed. Please check connectivity.";
      setMessages(prev => [...prev, { role: 'model', content: `Agent Offline: ${errorMessage}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-zinc-900 bg-zinc-900/20 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
              <BrainCircuit className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-tighter">AI Prediction Lab</h4>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Safe Side Oracle v1.0</p>
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
                className="w-6 h-6 rounded-full hover:bg-yellow-500 hover:text-black opacity-30 group-hover:opacity-100 transition-all"
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
                  "flex gap-4 max-w-[85%]",
                  m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                  m.role === 'user' ? "bg-zinc-800 border-zinc-700" : "bg-yellow-500/10 border-yellow-500/20"
                )}>
                  {m.role === 'user' ? <User className="w-4 h-4 text-zinc-400" /> : <Bot className="w-4 h-4 text-yellow-500" />}
                </div>
                <div className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed",
                  m.role === 'user' ? "bg-zinc-900 text-zinc-100" : "bg-zinc-950 border border-zinc-900 text-zinc-300"
                )}>
                  {m.role === 'model' && (
                    <div className="flex items-center gap-1.5 mb-2">
                       <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">Verified Agent</span>
                    </div>
                  )}
                  {m.content}
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
            placeholder="Ask about team fatigue, tactical risks..."
            className="pr-12 bg-zinc-900/50 border-zinc-800 h-12 rounded-xl focus:ring-yellow-500/50 focus:border-yellow-500/50"
          />
          <Button 
            type="submit" 
            disabled={loading}
            size="icon" 
            className="absolute right-1.5 top-1.5 w-9 h-9 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[10px] text-zinc-600 text-center mt-3 uppercase tracking-widest font-black">
          Data sync: Real-time Analysis Mode
        </p>
      </div>
    </div>
  );
}
