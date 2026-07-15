import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionPrefs } from '@/src/components/motion/MotionProvider';
import { Spotlight } from '@/src/components/motion/Spotlight';
import { Magnetic } from '@/src/components/motion/Magnetic';
import { useNavigate } from 'react-router-dom';
import { 
  Radio, 
  Activity, 
  Brain, 
  Flame, 
  FileText, 
  TrendingUp, 
  ShieldAlert, 
  Zap, 
  ChevronRight, 
  RefreshCw, 
  CheckCircle, 
  Dribbble, 
  Award, 
  AlertTriangle,
  Lightbulb,
  Sparkles,
  MessageSquare,
  CornerDownLeft,
  User,
  Bot,
  Calendar,
  Clock,
  ArrowRight,
  Tv,
  Gamepad,
  ArrowLeft,
  ExternalLink,
  Shield
} from 'lucide-react';
import { useAgent } from '@/src/contexts/AgentContext';
import { usePredictions } from '@/src/hooks/usePredictions';
import { useLiveMatch } from '@/src/hooks/useLiveMatch';
import { useMatchPrediction } from '@/src/hooks/useMatchPrediction';
import { PossessionHeatmap } from '@/src/components/CommandCenter/PossessionHeatmap';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function LiveAnalysisPage() {
  const navigate = useNavigate();
  const { openAgentWithMatch } = useAgent();
  const { matches, loading: matchesLoading } = usePredictions();

  const INTEGRATED_CODES = ['PL', 'CL', 'PD', 'BL1', 'SA', 'WC'];

  // Filter matches into pristine channels
  const prominentMatches = matches.filter(m => {
    const code = m.competition?.code;
    const name = m.competition?.name || '';
    return INTEGRATED_CODES.includes(code) || 
      name.includes('Premier League') || 
      name.includes('Champions League') || 
      name.includes('La Liga') || 
      name.includes('Bundesliga') || 
      name.includes('Serie A') || 
      name.includes('World Cup');
  });

  const liveMatches = prominentMatches.filter(m => 
    ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status)
  );

  const scheduledMatches = prominentMatches.filter(m => 
    ['TIMED', 'SCHEDULED'].includes(m.status)
  );

  const completedMatches = prominentMatches.filter(m => 
    ['FINISHED', 'AWARDED'].includes(m.status)
  ).slice(0, 4);

  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

  // Bind to our real stream SSE hook
  const { data: matchState, loading: streamLoading, error: streamError, isReconnecting } = useLiveMatch(selectedMatchId);

  // Invoke full quantitative multi-model pass hook
  const { prediction: quantPrediction, loading: quantLoading, error: quantError } = useMatchPrediction(selectedMatchId, matchState);

  const connected = !streamLoading && !streamError && !isReconnecting;
  const latency = 1.25;
  const { effective } = useMotionPrefs();

  const [activeTab, setActiveTab] = useState<'statistics' | 'poisson' | 'alerts' | 'quantitative'>('statistics');
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Self-Contain Match Briefing & Live Oracle QA Memory
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [askingOracle, setAskingOracle] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-connect to the first live match if available
  useEffect(() => {
    if (liveMatches.length > 0 && !selectedMatchId) {
      setSelectedMatchId(liveMatches[0].id);
    }
  }, [liveMatches, selectedMatchId]);

  // Set up chatbot greetings dynamically when a new match connects
  useEffect(() => {
    if (matchState) {
      setChatMessages([
        {
          role: 'assistant',
          content: `⚡ **Live Telemetry Stream Synchronized** for **${matchState.homeTeam.name} vs ${matchState.awayTeam.name}** (${matchState.competition}).\n\nAsk me any live tactical adjustments, safe hedging index parameters, or physical momentum triggers for this fixture.`,
          timestamp: 'Now'
        }
      ]);
    }
  }, [matchState?.id]);

  // Auto scroll to latest events in the telemetry log
  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [matchState?.timeline?.length]);

  // Auto scroll interactive chat box
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, askingOracle]);

  // Submit dynamic context question directly to the Oracle
  const handleAskOracle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userQuery.trim() || askingOracle || !matchState) return;

    const query = userQuery.trim();
    setUserQuery('');
    
    // Append user question
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { role: 'user', content: query, timestamp: timeStr }]);
    setAskingOracle(true);

    const compiledPrompt = `You are the Safe Side Oracle AI, an elite tactical football analyst processing a live Real-Time telemetry stream. 
Active Match: ${matchState.homeTeam.name} vs ${matchState.awayTeam.name}
Current minute: ${matchState.minute}' minutes
Scoreline: ${matchState.score.home} - ${matchState.score.away}
Ball Possession: ${matchState.possession.home}% (Home) vs ${matchState.possession.away}% (Away)
Shots On Target: ${matchState.shotsOnTarget.home} (Home) vs ${matchState.shotsOnTarget.away} (Away)
Fouls: ${matchState.fouls.home} (Home) vs ${matchState.fouls.away} (Away)
Poisson outcome percentages: Home win ${matchState.probabilities.home}%, Draw ${matchState.probabilities.draw}%, Away win ${matchState.probabilities.away}%.
User Question regarding this live context: "${query}"

Provide a punchy, highly technical response under 4 sentences. Break down key probabilities or specific tactical suggestions. Use markdown where helpful.`;

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: [], message: compiledPrompt })
      });

      if (!response.ok) throw new Error("Intelligence link lag");
      const result = await response.json();

      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.text || "Tactical coordinates failed to compile.", 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    } catch (err) {
      console.warn("Oracle connection lag:", err);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "⚠️ **System Overload**: Security telemetry links are currently locked at capacity. Please allow 10 seconds and resubmit your query.", 
        timestamp: 'Error' 
      }]);
    } finally {
      setAskingOracle(false);
    }
  };

  const handleRequestPromptBriefing = () => {
    setUserQuery("Could you provide a complete tactical overview of current momentum shifts and expected outcome index?");
    setTimeout(() => {
      const form = document.getElementById('oracle-chat-form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
    }, 100);
  };

  const handleDisconnectStream = () => {
    setSelectedMatchId(null);
  };

  if (matchesLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: 'linear', duration: 1.5 }}
            className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full"
          >
            <RefreshCw className="w-6 h-6 animate-spin" />
          </motion.div>
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Scanning Satellite Feeds</h2>
          <p className="text-xs text-zinc-500 leading-relaxed font-sans">
            Establishing neural links to Spain, England, Germany, Italy & Europe stadiums...
          </p>
        </div>
      </div>
    );
  }

  // RENDER COCKPIT SCREEN IF NO ACTIVE MATCH STREAM IS LOADED
  if (!matchState) {
    return (
      <div className="min-h-screen bg-black text-white py-12 px-4 select-none relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-[radial-gradient(circle_at_0%_0%,rgba(6,182,212,0.03),transparent)] blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              SafeSide Intelligence Standby Mode
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-none">
              Live Tactical <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-405 to-indigo-405">Cockpit</span>
            </h1>
            <p className="text-zinc-400 text-sm max-w-2xl mx-auto font-sans leading-relaxed font-semibold">
              Real-time synchronization and mathematical Poisson updates across prime European arenas. Sourcing active telemetry including in-play player metrics and momentum heatmaps.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-zinc-950/85 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.06)] rounded-[32px] p-8 relative overflow-hidden group/radar">
            <div className="lg:col-span-4 flex flex-col items-center justify-center py-6 border-b lg:border-b-0 lg:border-r border-zinc-900">
              <div className="relative w-44 h-44 rounded-full border border-cyan-500/10 flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }} 
                  className="absolute inset-0 border-t border-cyan-500/40 rounded-full" 
                />
                <div className="text-center space-y-1 z-20">
                  <Radio className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
                  <div className="text-[10px] font-mono leading-none tracking-widest uppercase font-black text-cyan-400">SCAN: ON</div>
                  <div className="text-[9px] font-mono text-zinc-500 uppercase">Searching live-feeds</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <h3 className="text-lg font-black uppercase tracking-tight text-white">Live-Feeds Satellite Coverage</h3>
              <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                Connect directly to an active, real-time telemetry stream by selecting one of the synced fixtures below.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {liveMatches.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMatchId(m.id)}
                    className="p-4 bg-zinc-900 hover:bg-zinc-850 hover:border-cyan-500/50 border border-zinc-800 text-left rounded-xl transition-all space-y-2 cursor-pointer relative overflow-hidden group"
                  >
                    <div className="flex justify-between items-center text-[9px] font-mono text-cyan-400 font-extrabold uppercase">
                      <span>LIVE STREAM</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
                    </div>
                    <div className="text-xs font-black truncate text-zinc-100">{m.homeTeam?.name} vs {m.awayTeam?.name}</div>
                    <div className="text-[10px] font-mono text-zinc-500">{m.competition?.name || "League"}</div>
                  </button>
                ))}
                {liveMatches.length === 0 && (
                  <div className="col-span-3 py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                    No active in-play matches detected. Please explore scheduled games or simulation triggers.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SCHEDULED FIXTURES GRID */}
          <div className="space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <Calendar className="w-5 h-5 text-zinc-500" />
              <span>Upcoming Live-Stream Events</span>
              <div className="h-[1px] flex-1 bg-zinc-900" />
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduledMatches.slice(0, 6).map((m: any) => {
                const kickoffTime = new Date(m.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div 
                    key={m.id}
                    onClick={() => setSelectedMatchId(m.id)}
                     className="p-6 bg-zinc-950 border border-zinc-900 hover:border-cyan-500/30 hover:bg-zinc-900/50 rounded-[20px] transition-all space-y-4 cursor-pointer group"
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-zinc-500 uppercase tracking-widest">{m.competition?.name}</span>
                      <span className="text-zinc-405 font-bold bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                        <Clock className="w-3" /> {kickoffTime}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 text-xs font-bold font-mono">
                      <div className="flex items-center gap-2 max-w-[45%]">
                        {m.homeTeam?.crest && <img src={m.homeTeam.crest} alt="" className="w-4.5 h-4.5 object-contain" referrerPolicy="no-referrer" />}
                        <span className="truncate">{m.homeTeam?.name}</span>
                      </div>
                      <span className="text-zinc-650 text-[10px]">VS</span>
                      <div className="flex items-center gap-2 max-w-[45%] justify-end text-right">
                        <span className="truncate">{m.awayTeam?.name}</span>
                        {m.awayTeam?.crest && <img src={m.awayTeam.crest} alt="" className="w-4.5 h-4.5 object-contain" referrerPolicy="no-referrer" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-zinc-900 text-zinc-500">
                      <span>Telemetry Standby</span>
                      <span className="text-zinc-400 group-hover:text-white transition-colors flex items-center gap-1 uppercase tracking-widest font-black text-[9px]">
                        Initialize Stream <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE LIVE-STREAM INTERFACE
  const homeProb = matchState.probabilities.home;
  const awayProb = matchState.probabilities.away;
  const drawProb = matchState.probabilities.draw;

  return (
    <div id="live-analysis-dashboard" className="min-h-screen bg-black text-white py-8 px-4 font-sans select-none relative overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Global stream control toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-4.5">
          <Magnetic strength={0.3}>
          <button 
            onClick={handleDisconnectStream}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest cursor-pointer group shrink-0"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>EXITS TO COCKPIT BOARD</span>
          </button>
        </Magnetic>

          <div className="px-3 py-1 bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/25 rounded-lg text-red-400 font-mono text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> Real-Time Synchronized Telemetry Feed
          </div>
        </div>

        {/* Stream metadata dashboard header */}
        <div id="telemetry-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 border border-zinc-900 rounded-[20px] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[45%] h-[120%] bg-radial from-cyan-500/5 to-transparent blur-2xl pointer-events-none" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className={connected ? "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" : ""} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              </span>
              <span className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-zinc-400">
                {connected ? "SECURE ELECTRON SATELLITE SYNC" : "RECONNECTING OPTICAL TRANSITIONS..."}
              </span>
            </div>
            <h2 className="text-2xl font-black uppercase text-white leading-tight">Live Football Intelligence Engine</h2>
            <p className="text-xs text-zinc-405 max-w-2xl font-sans">
              Dynamic system integration with true satellite telemetry channels and Poisson modeling parameters matching historical event densities.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-center shrink-0">
              <div className="text-[9px] font-mono text-zinc-500 uppercase font-black">Frame Latency</div>
              <div className="text-xs font-mono font-black text-cyan-400">{latency}ms</div>
            </div>
            <Magnetic strength={0.3}>
              <button
                onClick={() => openAgentWithMatch(matchState)}
                className="px-4 py-3 bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
              >
                <Brain className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                Agent Console
              </button>
            </Magnetic>
          </div>
        </div>

        {/* Dynamic Stadium Scoreboard display */}
        <div id="live-scoreboard" className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 bg-zinc-950 border border-zinc-900 rounded-[24px] p-6 overflow-hidden font-sans">
          <Spotlight color="rgba(6,182,212,0.10)" size={420} className="rounded-[24px]" />
          <div className="lg:col-span-12 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-zinc-900 pb-6">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                {matchState.competition}
              </div>
              <div className="text-zinc-500 text-xs font-mono">ID: #{matchState.id}</div>
            </div>
          </div>

          <div className="lg:col-span-5 flex items-center gap-6 justify-center lg:justify-end lg:pr-4 w-full">
            <div className="text-center lg:text-right space-y-1">
              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider font-mono">HOME TEAM</span>
              <h3 className="text-2xl font-black uppercase text-zinc-100">{matchState.homeTeam.name}</h3>
            </div>
            {matchState.homeTeam.crest && (
              <img src={matchState.homeTeam.crest} alt="Crest" className="w-16 h-16 object-contain shrink-0 animate-pulse" referrerPolicy="no-referrer" />
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col items-center justify-center py-6 lg:py-4 px-2 border-y lg:border-y-0 lg:border-x border-zinc-900 gap-1 my-4 lg:my-0 w-full">
            <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest text-center">Scoreline</span>
            <div className="flex items-center gap-4 text-4xl font-mono font-black justify-center">
              <span className="text-white">{matchState.score.home}</span>
              <span className="text-zinc-800">:</span>
              <span className="text-white">{matchState.score.away}</span>
            </div>
            <div className="px-3 py-1 bg-cyan-400 text-black rounded-full text-xs font-mono font-black animate-pulse mt-2">
              {matchState.minute}' MIN
            </div>
          </div>

          <div className="lg:col-span-5 flex items-center gap-6 justify-center lg:justify-start lg:pl-4 w-full">
            {matchState.awayTeam.crest && (
              <img src={matchState.awayTeam.crest} alt="Crest" className="w-16 h-16 object-contain shrink-0 animate-pulse" referrerPolicy="no-referrer" />
            )}
            <div className="text-center lg:text-left space-y-1">
              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider font-mono">AWAY TEAM</span>
              <h3 className="text-2xl font-black uppercase text-zinc-100">{matchState.awayTeam.name}</h3>
            </div>
          </div>
        </div>

        {/* Dynamic heatmap widget block */}
        <div className="border border-zinc-900 rounded-[28px] overflow-hidden p-6 bg-zinc-950">
          <PossessionHeatmap
            matchId="live-heatmap-view"
            homeTeamName={matchState.homeTeam.name}
            awayTeamName={matchState.awayTeam.name}
            homeCrest={matchState.homeTeam.crest}
            awayCrest={matchState.awayTeam.crest}
            homePossession={matchState.possession.home}
            awayPossession={matchState.possession.away}
          />
        </div>

        {/* Interactive Stats and commentary columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-zinc-950 border border-zinc-900 rounded-[24px] p-6 h-[510px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-105">Live Commentary Timeline</h3>
                <span className="text-[9px] font-mono text-zinc-500 uppercase">{matchState.timeline.length} Events</span>
              </div>
              <div className="space-y-3 h-[380px] overflow-y-auto pr-1">
                {matchState.timeline.map((event, index) => (
                  <div key={index} className="p-3.5 bg-black/40 border border-zinc-900 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 font-mono">{event.minute}'</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-zinc-800 uppercase">{event.type}</span>
                    </div>
                    <p className="text-xs text-zinc-350 leading-relaxed">{event.message}</p>
                  </div>
                ))}
                <div ref={feedEndRef} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-zinc-950 border border-zinc-900 rounded-[24px] p-6 h-[510px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-4 mb-4">
                <button
                  onClick={() => setActiveTab('statistics')}
                  className={`relative px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'statistics' ? 'bg-cyan-400 text-black' : 'text-zinc-400 bg-zinc-900/50'}`}
                >
                  {activeTab === 'statistics' && <motion.div layoutId="liveTabPill" className="absolute inset-0 bg-cyan-400 rounded-lg" />}
                  <span className="relative z-10">Live Statistics</span>
                </button>
                <button
                  onClick={() => setActiveTab('poisson')}
                  className={`relative px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'poisson' ? 'bg-cyan-400 text-black' : 'text-zinc-400 bg-zinc-900/50'}`}
                >
                  {activeTab === 'poisson' && <motion.div layoutId="liveTabPill" className="absolute inset-0 bg-cyan-400 rounded-lg" />}
                  <span className="relative z-10">Poisson Fluctuations</span>
                </button>
                <button
                  onClick={() => setActiveTab('quantitative')}
                  className={`relative px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'quantitative' ? 'bg-cyan-400 text-black' : 'text-zinc-400 bg-zinc-900/50'}`}
                >
                  {activeTab === 'quantitative' && <motion.div layoutId="liveTabPill" className="absolute inset-0 bg-cyan-400 rounded-lg" />}
                  <span className="relative z-10">Quantitative Reasoning HUD</span>
                </button>
              </div>

              {activeTab === 'statistics' && (
                <div className="space-y-4 font-mono">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>POSSESSION ({matchState.possession.home}%)</span>
                      <span>POSSESSION ({matchState.possession.away}%)</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-900 rounded-lg overflow-hidden flex">
                      <div className="bg-cyan-400 h-full transition-all duration-550" style={{ width: `${matchState.possession.home}%` }} />
                      <div className="bg-white/80 h-full transition-all duration-550" style={{ width: `${matchState.possession.away}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-zinc-500 uppercase">Total Shots</span>
                      <div className="flex justify-between items-end">
                        <span className="text-xl font-black text-white">{matchState.shots.home}</span>
                        <span className="text-xl font-black text-white">{matchState.shots.away}</span>
                      </div>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-zinc-500 uppercase">Shots On Target</span>
                      <div className="flex justify-between items-end">
                        <span className="text-xl font-black text-white">{matchState.shotsOnTarget.home}</span>
                        <span className="text-xl font-black text-white">{matchState.shotsOnTarget.away}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'poisson' && (
                <div className="space-y-4">
                  <div className="text-[11px] font-mono text-zinc-550 uppercase mb-2 border-b border-zinc-900 pb-2">
                    Mathematical Joint Density Outputs
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-zinc-300">
                      <span>{matchState.homeTeam.name} Wins</span>
                      <span className="font-extrabold text-white">{homeProb}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div className="bg-cyan-405 h-full transition-all duration-300 pointer-events-none" style={{ width: `${homeProb}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-zinc-300">
                      <span>Draw Outcome</span>
                      <span className="font-extrabold text-white">{drawProb}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div className="bg-zinc-705 h-full transition-all duration-300 pointer-events-none" style={{ width: `${drawProb}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-zinc-300">
                      <span>{matchState.awayTeam.name} Wins</span>
                      <span className="font-extrabold text-white">{awayProb}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div className="bg-white/90 h-full transition-all duration-300 pointer-events-none" style={{ width: `${awayProb}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'quantitative' && (
                <div className="space-y-3 font-mono overflow-y-auto h-[400px] pr-1.5 scrollbar-thin">
                  {quantLoading && (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-zinc-500 gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                      <span className="text-[10px] uppercase font-black tracking-widest">Running Dynamic Multi-Model Sweep...</span>
                    </div>
                  )}

                  {quantError && (
                    <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl space-y-1 text-center py-10">
                      <ShieldAlert className="w-6 h-6 text-red-500 mx-auto animate-bounce" />
                      <div className="text-[10px] uppercase font-black text-red-400 tracking-wider">Verification Breakdown</div>
                      <p className="text-[11px] text-zinc-400 leading-normal">{quantError}</p>
                    </div>
                  )}

                  {!quantLoading && !quantError && quantPrediction && (
                    <div className="space-y-4">
                      {/* Satellite AI Strategic Verdict Header */}
                      <div className="p-3 bg-gradient-to-r from-cyan-400/10 to-transparent border border-cyan-500/25 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-black tracking-widest text-cyan-400">Tactical Satellite Verdict</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            quantPrediction.quantitativeReasoning.finalQuantitativeVerdict === 'VITAL' ? 'bg-cyan-400 text-black' :
                            quantPrediction.quantitativeReasoning.finalQuantitativeVerdict === 'STRATEGIC' ? 'bg-zinc-800 text-white' :
                            quantPrediction.quantitativeReasoning.finalQuantitativeVerdict === 'SPECULATIVE' ? 'bg-yellow-400/20 text-yellow-405 border border-yellow-500/20' : 'bg-zinc-900 text-zinc-500'
                          }`}>
                            {quantPrediction.quantitativeReasoning.finalQuantitativeVerdict}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-350 leading-relaxed font-sans font-medium">
                          {quantPrediction.quantitativeReasoning.verdictRationale}
                        </p>
                      </div>

                      {/* Multichannel Probabilistic Core Calibration */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-2">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
                            <Activity className="w-3 h-3 text-cyan-400" /> Poisson Distribution
                          </span>
                          <div className="space-y-1.5 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Home Prob:</span>
                              <span className="text-white font-bold">{quantPrediction.poissonForecast.homeWinProb}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Draw Prob:</span>
                              <span className="text-white font-bold">{quantPrediction.poissonForecast.drawProb}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Away Prob:</span>
                              <span className="text-white font-bold">{quantPrediction.poissonForecast.awayWinProb}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-2">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
                            <Flame className="w-3 h-3 text-cyan-400" /> Dixon-Coles Low-Score
                          </span>
                          <div className="space-y-1.5 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Home Prob:</span>
                              <span className="text-white font-bold">{quantPrediction.dcForecast.homeWinProb}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Draw Prob:</span>
                              <span className="text-white font-bold">{quantPrediction.dcForecast.drawProb}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Away Prob:</span>
                              <span className="text-white font-bold">{quantPrediction.dcForecast.awayWinProb}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bayesian Shrinkage & Calibration */}
                      <div className="p-3.5 bg-black/40 border border-zinc-900 rounded-xl space-y-2 text-[10px]">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-cyan-400" /> Bayesian Confidence Adjustments
                        </span>
                        <div className="flex items-center justify-between font-bold border-b border-zinc-900/50 pb-2">
                          <div>
                            <span className="text-zinc-400 block text-[8px] uppercase tracking-widest font-normal">Raw Max Prob</span>
                            <span className="text-xs text-white/50">{quantPrediction.calibrationResult.uncalibratedConfidence}%</span>
                          </div>
                          <div className="text-zinc-600 font-sans text-xs">→</div>
                          <div className="text-right">
                            <span className="text-cyan-400 block text-[8px] uppercase tracking-widest font-normal">Bayesian calibrated</span>
                            <span className="text-sm font-black text-cyan-400">{quantPrediction.calibrationResult.calibratedConfidence}%</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                          {quantPrediction.quantitativeReasoning.confidenceCalibrationLog.calibrationReasoning}
                        </p>
                      </div>

                      {/* Variance & Disagreement Analysis */}
                      <div className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] uppercase tracking-widest font-black">
                          <span className="text-zinc-400">Model Variance Delta</span>
                          <span className={`${
                            quantPrediction.quantitativeReasoning.modelDisagreementAnalysis.disagreementLevel === 'HIGH' ? 'text-red-400' :
                            quantPrediction.quantitativeReasoning.modelDisagreementAnalysis.disagreementLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-cyan-400'
                          }`}>
                            {quantPrediction.quantitativeReasoning.modelDisagreementAnalysis.disagreementLevel} ({quantPrediction.quantitativeReasoning.modelDisagreementAnalysis.poissonVsDixonColesDelta}%)
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                          {quantPrediction.quantitativeReasoning.modelDisagreementAnalysis.explanation}
                        </p>
                      </div>

                      {/* Market calibration Inefficiencies */}
                      <div className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-2 text-[10px]">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-cyan-400" /> Market calibration Edge Mapping
                        </span>
                        <div className="grid grid-cols-2 border-b border-zinc-900 pb-2">
                          <div>
                            <span className="text-zinc-500 text-[8px] block uppercase">Est. Overround (Vig)</span>
                            <span className="text-white font-bold">{quantPrediction.quantitativeReasoning.marketInefficiencyDetail.estimatedVigImpact}%</span>
                          </div>
                          <div>
                            <span className="text-zinc-505 text-[8px] block uppercase">Underpriced target</span>
                            <span className="text-cyan-400 font-black">{quantPrediction.quantitativeReasoning.marketInefficiencyDetail.underpricingTarget.toUpperCase()}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                          {quantPrediction.quantitativeReasoning.marketInefficiencyDetail.edgeRationale}
                        </p>
                      </div>

                      {/* Structural Asymmetry & Collapses */}
                      <div className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-2 text-[10px]">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-cyan-400" /> Structural Asymmetry & Volatility
                        </span>
                        <div className="grid grid-cols-2 border-b border-zinc-900 pb-2">
                          <div>
                            <span className="text-zinc-505 text-[8px] block uppercase">Asymmetry Pitch Metric</span>
                            <span className="text-white font-bold">{quantPrediction.quantitativeReasoning.tacticalMismatchSummary.formationAsymmetryMetric}/100</span>
                          </div>
                          <div>
                            <span className="text-zinc-505 text-[8px] block uppercase">Collapse Risks Detected</span>
                            <span className={`font-black ${quantPrediction.quantitativeReasoning.anomalyAnalysisLog.collapseRiskDetected ? 'text-red-400' : 'text-emerald-400'}`}>
                              {quantPrediction.quantitativeReasoning.anomalyAnalysisLog.collapseRiskDetected ? 'CRITICAL RISK' : 'STABLE'}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                          {quantPrediction.quantitativeReasoning.tacticalMismatchSummary.vulnerabilityExploited}
                        </p>
                      </div>

                      {/* Detailed Traceable Evidence Chain */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block">Telemetry Evidence Chain Linage</span>
                        <div className="space-y-1">
                          {quantPrediction.quantitativeReasoning.evidenceChain.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-black border border-zinc-900/60 p-2 rounded-lg text-[9px]">
                              <div className="space-y-0.5">
                                <span className="text-zinc-400 font-bold block">{item.metricName}</span>
                                <span className="text-zinc-500 font-medium">{item.observedValueString}</span>
                              </div>
                              <div className="text-right space-y-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                  item.statisticalSignificance === 'CRITICAL' ? 'bg-red-400/20 text-red-400' :
                                  item.statisticalSignificance === 'NOTABLE' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-zinc-850 text-zinc-500'
                                }`}>
                                  {item.statisticalSignificance}
                                </span>
                                <span className="text-zinc-500 block">{item.deducedImpact}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Uncertainty Explicit Log */}
                      <div className="p-3 bg-red-950/5 border border-red-950/20 rounded-xl space-y-1 text-[9px] text-zinc-550 font-sans leading-relaxed">
                        <span className="uppercase font-black text-red-400 tracking-wide block font-mono">Uncertainty Parameter Bounds</span>
                        {quantPrediction.quantitativeReasoning.uncertaintyExplicitLog}
                      </div>

                      {/* Origin Audit Footprint */}
                      <div className="p-2 border border-zinc-900 rounded-lg text-[8px] text-zinc-600 font-mono uppercase flex justify-between">
                        <span>DATA ORIGIN: {quantPrediction.originMeta?.origin || "API"}</span>
                        <span>SYSTEM ID: {quantPrediction.originMeta?.systemId || "DefaultLineageService"}</span>
                        <span>TS: {quantPrediction.originMeta?.timestamp ? new Date(quantPrediction.originMeta.timestamp).toLocaleTimeString() : "N/A"}</span>
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Oracle interaction unit container */}
        <div className="p-6 bg-gradient-to-r from-cyan-500/5 via-zinc-950 to-zinc-950 border border-zinc-900 rounded-[24px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4 pr-0 lg:pr-4 border-b lg:border-b-0 lg:border-r border-zinc-900 pb-4 lg:pb-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400">
                <Brain className="w-5 h-5 animate-pulse" />
                <h4 className="text-sm font-black uppercase tracking-wider font-mono">Oracle Satellite AI</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Interrogate the AI predictor tool about current in-play tactical momentum and live outcome probabilities.
              </p>
            </div>
            <button
              onClick={handleRequestPromptBriefing}
              className="w-full text-left p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-900 text-zinc-350 font-sans text-xs transition-colors flex items-center justify-between group cursor-pointer"
            >
              <span>Compile deep strategy briefing</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-405" />
            </button>
          </div>

          <div className="lg:col-span-8 flex flex-col justify-between h-[280px]">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin px-2 min-h-[170px]">
              {chatMessages.map((msg, mIdx) => (
                <div key={mIdx} className={`flex gap-2.5 text-xs max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                  <div className={`p-2 rounded-full h-7 w-7 flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-zinc-805' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 font-semibold" />}
                  </div>
                  <div className={`p-3 rounded-2xl ${msg.role === 'user' ? 'bg-zinc-900 text-zinc-200' : 'bg-zinc-950 border border-zinc-900 text-zinc-300'}`}>
                    <p className="leading-relaxed font-semibold">{msg.content}</p>
                  </div>
                </div>
              ))}
              {askingOracle && (
                <div className="flex gap-2.5 text-xs max-w-[85%] items-center animate-pulse">
                  <div className="p-2 bg-cyan-550/10 rounded-full h-7 w-7 flex items-center justify-center text-cyan-400">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-zinc-500 italic font-mono text-[10px]">Compiling stadium metrics...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <form id="oracle-chat-form" onSubmit={handleAskOracle} className="flex gap-2 bg-black border border-zinc-900 p-1.5 rounded-xl mt-3">
              <input
                type="text"
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                placeholder="Ask Oracle about live physical parameters..."
                className="flex-1 bg-transparent px-3 py-2 text-xs text-white focus:outline-none placeholder-zinc-500"
              />
              <button
                type="submit"
                disabled={askingOracle || !userQuery.trim()}
                className="p-2 bg-cyan-500 hover:bg-cyan-455 text-black text-xs font-black rounded-lg px-4 disabled:opacity-40 transition-opacity cursor-pointer flex items-center gap-1"
              >
                <span>Send</span>
                <CornerDownLeft className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
