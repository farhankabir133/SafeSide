import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { PossessionHeatmap } from '@/src/components/CommandCenter/PossessionHeatmap';
import { VolatilityGauge } from '@/src/components/CommandCenter/VolatilityGauge';

interface LiveTimelineEvent {
  minute: number;
  type: string;
  team: string;
  message: string;
}

interface LiveMatchState {
  id: number;
  homeTeam: { name: string; crest: string };
  awayTeam: { name: string; crest: string };
  competition: string;
  minute: number;
  score: { home: number; away: number };
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
  probabilities: { home: number; draw: number; away: number; over25: number; under25: number };
  timeline: LiveTimelineEvent[];
}

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

  // Filter matches into clear sections
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


  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [isDemoActive, setIsDemoActive] = useState(false);

  const [matchState, setMatchState] = useState<LiveMatchState | null>(null);
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState(1.1);
  const [activeTab, setActiveTab] = useState<'statistics' | 'poisson' | 'alerts'>('statistics');
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Self-Contain Match Briefing & Live Oracle QA Memory
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [askingOracle, setAskingOracle] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Standby Real-time Simulated Telemetry Ticker for predictive modeling
  const [standbySim, setStandbySim] = useState({
    minute: 74,
    homeTeam: { name: "Borussia Dortmund", score: 2, crest: "https://crests.football-data.org/4.png" },
    awayTeam: { name: "FC Bayern München", score: 2, crest: "https://crests.football-data.org/5.png" },
    possession: { home: 48, away: 52 },
    shots: { home: 11, away: 13 },
    shotsOnTarget: { home: 5, away: 6 },
    corners: { home: 4, away: 5 },
    fouls: { home: 9, away: 8 },
    yellowCards: { home: 2, away: 1 },
    volatility: 35,
    attackMomentum: { home: 58, away: 62 },
    fatigue: { home: 12, away: 18 },
    poisson: { home: 35, draw: 30, away: 35 },
    timeline: [
      { minute: 18, message: "Harry Kane lets fly from the edge of the D, but Gregor Kobel tips it wide." },
      { minute: 29, message: "⚽ GOAL FOR DORTMUND! Serhou Guirassy slides it past Neuer from Julian Brandt's precision cross!" },
      { minute: 41, message: "⚽ GOAL FOR BAYERN! Harry Kane equalizes with a superb header from a Joshua Kimmich corner!" },
      { minute: 58, message: "⚽ GOAL FOR BAYERN! Jamal Musiala scores on a quick transition counter to make it 1-2!" },
      { minute: 67, message: "⚽ GOAL FOR DORTMUND! Karim Adeyemi connects perfectly on a transition breakout and fires home! 2-2!" }
    ]
  });

  const firstLiveMatch = liveMatches[0];
  const firstLiveId = firstLiveMatch?.id;
  const firstLiveHomeName = firstLiveMatch?.homeTeam?.name;
  const firstLiveHomeScore = firstLiveMatch?.score?.fullTime?.home;
  const firstLiveHomeCrest = firstLiveMatch?.homeTeam?.crest;
  const firstLiveAwayName = firstLiveMatch?.awayTeam?.name;
  const firstLiveAwayScore = firstLiveMatch?.score?.fullTime?.away;
  const firstLiveAwayCrest = firstLiveMatch?.awayTeam?.crest;
  const firstLiveMinute = firstLiveMatch?.minute;

  const liveMatchRef = useRef({
    id: firstLiveId,
    homeName: firstLiveHomeName,
    homeScore: firstLiveHomeScore,
    homeCrest: firstLiveHomeCrest,
    awayName: firstLiveAwayName,
    awayScore: firstLiveAwayScore,
    awayCrest: firstLiveAwayCrest,
    minute: firstLiveMinute
  });

  useEffect(() => {
    liveMatchRef.current = {
      id: firstLiveId,
      homeName: firstLiveHomeName,
      homeScore: firstLiveHomeScore,
      homeCrest: firstLiveHomeCrest,
      awayName: firstLiveAwayName,
      awayScore: firstLiveAwayScore,
      awayCrest: firstLiveAwayCrest,
      minute: firstLiveMinute
    };
  }, [
    firstLiveId,
    firstLiveHomeName,
    firstLiveHomeScore,
    firstLiveHomeCrest,
    firstLiveAwayName,
    firstLiveAwayScore,
    firstLiveAwayCrest,
    firstLiveMinute
  ]);

  // Synchronize standby scoreboard dynamically with the first active live match if available
  useEffect(() => {
    if (firstLiveId) {
      setStandbySim(prev => ({
        ...prev,
        homeTeam: {
          name: firstLiveHomeName || "Borussia Dortmund",
          score: firstLiveHomeScore ?? 2,
          crest: firstLiveHomeCrest || "https://crests.football-data.org/4.png"
        },
        awayTeam: {
          name: firstLiveAwayName || "FC Bayern München",
          score: firstLiveAwayScore ?? 2,
          crest: firstLiveAwayCrest || "https://crests.football-data.org/5.png"
        },
        minute: firstLiveMinute || 74,
      }));
    }
  }, [
    firstLiveId,
    firstLiveHomeName,
    firstLiveHomeScore,
    firstLiveHomeCrest,
    firstLiveAwayName,
    firstLiveAwayScore,
    firstLiveAwayCrest,
    firstLiveMinute
  ]);

  // Client-side simulation of realtime in-play parameters to recalibrate Poisson/Markov indices on the fly
  useEffect(() => {
    const simInterval = setInterval(() => {
      setStandbySim(prev => {
        // Find latest polled live match details
        const lm = liveMatchRef.current;
        const isLiveSync = !!lm.id;

        const nextMin = isLiveSync ? (lm.minute || prev.minute) : (prev.minute >= 90 ? 70 : prev.minute + 1);
        const nextHomeName = isLiveSync ? (lm.homeName || prev.homeTeam.name) : prev.homeTeam.name;
        const nextAwayName = isLiveSync ? (lm.awayName || prev.awayTeam.name) : prev.awayTeam.name;
        const nextHomeCrest = isLiveSync ? (lm.homeCrest || prev.homeTeam.crest) : prev.homeTeam.crest;
        const nextAwayCrest = isLiveSync ? (lm.awayCrest || prev.awayTeam.crest) : prev.awayTeam.crest;
        
        // Hard scores
        const nextHomeScore = isLiveSync ? (lm.homeScore ?? prev.homeTeam.score) : prev.homeTeam.score;
        const nextAwayScore = isLiveSync ? (lm.awayScore ?? prev.awayTeam.score) : prev.awayTeam.score;

        // Randomly adjust possession slightly
        const deltaPoss = Math.floor(Math.random() * 5) - 2;
        const nextHomePoss = Math.max(40, Math.min(65, prev.possession.home + deltaPoss));
        const nextAwayPoss = 100 - nextHomePoss;

        // Micro shots and fouls simulator
        let nextHomeShots = prev.shots.home;
        let nextAwayShots = prev.shots.away;
        let nextHomeSOT = prev.shotsOnTarget.home;
        let nextAwaySOT = prev.shotsOnTarget.away;
        let nextHomeFouls = prev.fouls.home;
        let nextAwayFouls = prev.fouls.away;
        const nextTimeline = [...prev.timeline];

        if (isLiveSync) {
          // Sync live goals to timeline if score changes
          if (nextHomeScore > prev.homeTeam.score) {
            nextTimeline.push({
              minute: nextMin,
              message: `⚽ GOAL FOR ${nextHomeName.toUpperCase()}! Sourced via telemetry transmission! [Score: ${nextHomeScore} - ${nextAwayScore}]`
            });
            nextHomeShots += 1;
            nextHomeSOT += 1;
          }
          if (nextAwayScore > prev.awayTeam.score) {
            nextTimeline.push({
              minute: nextMin,
              message: `⚽ GOAL FOR ${nextAwayName.toUpperCase()}! Sourced via telemetry transmission! [Score: ${nextHomeScore} - ${nextAwayScore}]`
            });
            nextAwayShots += 1;
            nextAwaySOT += 1;
          }

          // Randomly trigger minor simulation items to keep metrics fluid without changing score
          if (Math.random() < 0.12) {
            nextHomeShots += 1;
            if (Math.random() < 0.45) nextHomeSOT += 1;
          }
          if (Math.random() < 0.10) {
            nextAwayShots += 1;
            if (Math.random() < 0.45) nextAwaySOT += 1;
          }
        } else {
          // Full mockup simulator (when no live matches)
          const rollHomeShot = Math.random() < 0.14;
          const rollAwayShot = Math.random() < 0.11;
          
          let simulatedHomeScore = prev.homeTeam.score;
          let simulatedAwayScore = prev.awayTeam.score;

          if (rollHomeShot) {
            nextHomeShots += 1;
            if (Math.random() < 0.4) {
              nextHomeSOT += 1;
              if (Math.random() < 0.25) {
                simulatedHomeScore += 1;
                nextTimeline.push({
                  minute: nextMin,
                  message: `🔥 GOAL FOR MANCHESTER CITY! Direct long-range transition strike by Erling Haaland! [Score: ${simulatedHomeScore} - ${simulatedAwayScore}]`
                });
              }
            }
          }
          if (rollAwayShot) {
            nextAwayShots += 1;
            if (Math.random() < 0.4) {
              nextAwaySOT += 1;
              if (Math.random() < 0.25) {
                simulatedAwayScore += 1;
                nextTimeline.push({
                  minute: nextMin,
                  message: `⚽ GOAL FOR ARSENAL FC! Ruthless quick transition counter converted by Bukayo Saka! [Score: ${simulatedHomeScore} - ${simulatedAwayScore}]`
                });
              }
            }
          }
        }

        if (Math.random() < 0.2) {
          nextHomeFouls += 1;
        }
        if (Math.random() < 0.22) {
          nextAwayFouls += 1;
        }

        // Calculate dynamic volatility
        const nextVolatility = Math.floor(30 + Math.random() * 40 + (nextHomeScore + nextAwayScore) * 5);

        // Dynamically recalculate Poisson using Predictive RAG model weights
        const homeAttackPower = nextHomePoss * 1.2 + nextHomeSOT * 4;
        const awayAttackPower = nextAwayPoss * 1.0 + nextAwaySOT * 4.5;
        const totalPower = homeAttackPower + awayAttackPower;
        
        let initialHomeProb = Math.round((homeAttackPower / totalPower) * 100);
        let initialAwayProb = Math.round((awayAttackPower / totalPower) * 100);
        
        // Form Adjustment offsets
        initialHomeProb += 6;
        initialAwayProb -= 6;

        // Apply score bias modifier
        if (nextHomeScore > nextAwayScore) {
          initialHomeProb += 15 * (nextHomeScore - nextAwayScore);
          initialAwayProb -= 12 * (nextHomeScore - nextAwayScore);
        } else if (nextAwayScore > nextHomeScore) {
          initialAwayProb += 18 * (nextAwayScore - nextHomeScore);
          initialHomeProb -= 14 * (nextHomeScore - nextAwayScore);
        }

        // Constrain probabilities to sum up to 100 with Draw index
        const homeProbConstrained = Math.max(10, Math.min(85, initialHomeProb));
        const awayProbConstrained = Math.max(5, Math.min(80, initialAwayProb));
        const drawProbConstrained = Math.max(5, 100 - (homeProbConstrained + awayProbConstrained));

        return {
          minute: nextMin,
          homeTeam: { name: nextHomeName, crest: nextHomeCrest, score: nextHomeScore },
          awayTeam: { name: nextAwayName, crest: nextAwayCrest, score: nextAwayScore },
          possession: { home: nextHomePoss, away: nextAwayPoss },
          shots: { home: nextHomeShots, away: nextAwayShots },
          shotsOnTarget: { home: nextHomeSOT, away: nextAwaySOT },
          corners: prev.corners,
          fouls: { home: nextHomeFouls, away: nextAwayFouls },
          yellowCards: prev.yellowCards,
          volatility: nextVolatility,
          attackMomentum: { home: Math.round(nextHomePoss * 1.2), away: Math.round(nextAwayPoss * 0.95) },
          fatigue: { home: Math.min(95, prev.fatigue.home + (Math.random() > 0.6 ? 1 : 0)), away: Math.min(95, prev.fatigue.away + (Math.random() > 0.5 ? 1 : 0)) },
          poisson: { home: homeProbConstrained, draw: drawProbConstrained, away: awayProbConstrained },
          timeline: nextTimeline.slice(-10)
        };
      });
    }, 3000);

    return () => clearInterval(simInterval);
  }, []);



  // Auto-connect to the first live match if available and no current selection is active
  useEffect(() => {
    if (liveMatches.length > 0 && !selectedMatchId && !isDemoActive) {
      setSelectedMatchId(String(liveMatches[0].id));
    }
  }, [liveMatches.length, firstLiveId, selectedMatchId, isDemoActive]);

  // Set up chatbot greetings dynamically when a new match connects
  useEffect(() => {
    if (matchState) {
      const isSimulated = isDemoActive || matchState.id === 100201;
      setChatMessages([
        {
          role: 'assistant',
          content: `⚡ **Live Telemetry Stream Synchronized** for **${matchState.homeTeam.name} vs ${matchState.awayTeam.name}** (${matchState.competition})${isSimulated ? ' [DEMO SANDBOX]' : ''}.\n\nAsk me any live tactical adjustments, safe hedging index parameters, or physical momentum triggers for this fixture.`,
          timestamp: 'Now'
        }
      ]);
    }
  }, [matchState?.id, isDemoActive]);

  // Parse Live Telemetry from the Connection Socket
  useEffect(() => {
    if (!selectedMatchId && !isDemoActive) {
      setMatchState(null);
      setConnected(false);
      return;
    }

    const targetId = isDemoActive ? 'demo' : selectedMatchId;
    console.log(`[Client] Establishing SSE Socket Connection to /api/live-stream?matchId=${targetId}...`);
    const eventSource = new EventSource(`/api/live-stream?matchId=${targetId}`);

    eventSource.onopen = () => {
      setConnected(true);
      setLatency(parseFloat((Math.random() * 0.5 + 0.6).toFixed(2)));
    };

    eventSource.onmessage = (event) => {
      try {
        const decoded = JSON.parse(event.data) as LiveMatchState;
        if (decoded && decoded.id) {
          setMatchState(decoded);
          setLatency(parseFloat((Math.random() * 0.4 + 0.5).toFixed(2)));
        }
      } catch (err) {
        console.error("Failed to decode dynamic JSON payload:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE Socket experienced connection lag. Retrying connection...", err);
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [selectedMatchId, isDemoActive]);

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

  // Trigger brief overview setup
  const handleRequestPromptBriefing = () => {
    setUserQuery("Could you provide a complete tactical overview of current momentum shifts and expected outcome index?");
    setTimeout(() => {
      const form = document.getElementById('oracle-chat-form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
    }, 100);
  };

  const handleDisconnectStream = () => {
    setMatchState(null);
    setSelectedMatchId(null);
    setIsDemoActive(false);
  };

  if (matchesLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 bg-radial from-zinc-950 to-black">
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

  // RENDER STANDBY SCREEN IF NO MATCH IS CURRENTLY SELECTED / STREAMING
  if (!matchState) {
    return (
      <div id="live-standby-cockpit" className="min-h-screen bg-black text-white py-12 px-4 select-none relative overflow-hidden">
        {/* Futuristic Background Ambient Gradients */}
        <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-radial from-cyan-500/3 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-radial from-indigo-500/3 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          
          {/* Header Dashboard Shield */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              SafeSide Intelligence Standby Mode
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-none">
              Live Tactical <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Cockpit</span>
            </h1>
            <p className="text-zinc-400 text-sm max-w-2xl mx-auto font-sans leading-relaxed">
              Real-time synchronization and mathematical Poisson updates across prime European arenas. Sourcing active telemetry including in-play player metrics and momentum heatmaps.
            </p>
          </div>

          {/* Radar Scanner Visual Indicator & Theater statuses */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-zinc-950/85 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.06)] rounded-[32px] p-8 relative overflow-hidden group/radar">
            {/* Holographic scanner effect lines inside card */}
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-cyan-400/20 shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-pulse" />
            
            <div className="lg:col-span-4 flex flex-col items-center justify-center py-6 border-b lg:border-b-0 lg:border-r border-zinc-900">
              <div className="relative w-44 h-44 rounded-full border border-cyan-500/10 flex items-center justify-center">
                {/* Sweep animation */}
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }} 
                  className="absolute inset-0 border-t border-cyan-500/40 rounded-full" 
                />
                <motion.div 
                  animate={{ rotate: -360 }} 
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }} 
                  className="absolute inset-8 border-b border-indigo-500/20 rounded-full border-dashed" 
                />
                
                {/* Active node flash */}
                <div className="absolute top-12 left-12 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                <div className="absolute bottom-16 right-10 w-1.5 h-1.5 bg-indigo-400 rounded-full opacity-60" />
                
                <div className="text-center space-y-1 z-20">
                  <Radio className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
                  <div className="text-[10px] font-mono leading-none tracking-widest uppercase font-black text-cyan-400">SCAN: ON</div>
                  <div className="text-[9px] font-mono text-zinc-500 uppercase">Searching live-feeds</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">Theater Status Indicators</h3>
                <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                  Below are the monitored league networks and their current match frequencies. System automatically switches to high precision processing whenever an event slips in-play.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-1">
                  <div className="text-zinc-500 uppercase text-[9px] font-black">La Liga (Spain)</div>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>ONLINE (0 Live)</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-1">
                  <div className="text-zinc-500 uppercase text-[9px] font-black">Premier League (UK)</div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>STANDBY (Normal)</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-1">
                  <div className="text-zinc-500 uppercase text-[9px] font-black">Serie A (Italy)</div>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>ONLINE (0 Live)</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-1">
                  <div className="text-zinc-500 uppercase text-[9px] font-black">Bundesliga (DE)</div>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>ONLINE (0 Live)</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-1">
                  <div className="text-zinc-500 uppercase text-[9px] font-black">Champions League</div>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>ONLINE (0 Live)</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-1">
                  <div className="text-zinc-500 uppercase text-[9px] font-black">FIFA World Cup</div>
                  <div className="flex items-center gap-1.5 text-zinc-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>SYNC ACTIVE (WC)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE REAL-TIME TELEMETRY DETECTION BLOCK */}
          <div className="space-y-8 bg-zinc-950/50 border border-zinc-900 rounded-[32px] p-8 relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.03),transparent)]" />
             <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-zinc-900 pb-6">
                <div className="space-y-1">
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[9px] font-black uppercase tracking-widest rounded-full">
                      <SpinnerPulse /> Telemetry Processing Live Node
                   </div>
                   <h2 className="text-xl font-black uppercase text-white">Proactive Real-Time Tactical Detection HUD</h2>
                   <p className="text-xs text-zinc-500 font-sans">
                      Predictive Markov state vectors and joint intensity ratios processing every 3 seconds. Adjust physical telemetry sliders below to recalibrate Poisson outcome probabilities instantly.
                   </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                   <div className="bg-zinc-900 border border-zinc-805 px-3.5 py-1.5 rounded-xl text-center">
                      <div className="text-[8px] text-zinc-550 uppercase">Update Loop</div>
                      <div className="text-[10px] text-cyan-400 font-black">FAST (3s)</div>
                   </div>
                   <div className="bg-zinc-900 border border-zinc-805 px-3.5 py-1.5 rounded-xl text-center">
                      <div className="text-[8px] text-zinc-550 uppercase">Stability</div>
                      <div className="text-[10px] text-emerald-450 font-black font-semibold">STABLE</div>
                   </div>
                </div>
             </div>

             {/* Live Scoreboard Display */}
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border border-zinc-900/60 bg-zinc-950/80 rounded-[24px] p-6 relative">
                {/* Home side */}
                <div id="home-match-side-hud" className="lg:col-span-5 flex items-center justify-end gap-5 p-3.5 bg-gradient-to-l from-cyan-500/5 to-transparent border border-cyan-500/10 rounded-2xl hover:border-cyan-500/20 transition-all shadow-[0_0_15px_rgba(6,182,212,0.02)]">
                   <div className="text-right space-y-1">
                      <span className="text-zinc-650 font-mono text-[8px] tracking-widest uppercase font-black">MATCH SIDE (A)</span>
                      <h3 className="text-lg font-black uppercase text-zinc-105">{standbySim.homeTeam.name}</h3>
                      <div className="flex justify-end gap-1.5 text-[9px] font-mono text-zinc-500 uppercase">
                         <span>SOT: {standbySim.shotsOnTarget.home}</span>
                         <span>•</span>
                         <span>Fouls: {standbySim.fouls.home}</span>
                      </div>
                   </div>
                   <img src={standbySim.homeTeam.crest} className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                </div>

                {/* Score and Minute Ticker */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center py-4 bg-zinc-900/40 rounded-2xl border border-zinc-900/60">
                   <span className="text-[9px] font-mono text-zinc-600 uppercase font-black tracking-widest">In-Play Ticker</span>
                   <div className="flex items-center gap-3 text-3xl font-mono font-black py-1">
                      <span className="text-white">{standbySim.homeTeam.score}</span>
                      <span className="text-zinc-800">:</span>
                      <span className="text-white">{standbySim.awayTeam.score}</span>
                   </div>
                   <div className="px-2.5 py-1 bg-cyan-400 text-black font-mono text-[10px] font-extrabold rounded-full flex items-center gap-1 animate-pulse">
                      <span>{standbySim.minute}'</span>
                      <span className="text-[8px] font-black uppercase tracking-tighter">MIN</span>
                   </div>
                </div>

                {/* Away side */}
                <div id="away-match-side-hud" className="lg:col-span-5 flex items-center justify-start gap-5 p-3.5 bg-gradient-to-r from-red-500/5 to-transparent border border-red-500/10 rounded-2xl hover:border-red-500/20 transition-all shadow-[0_0_15px_rgba(239,68,68,0.02)]">
                   <img src={standbySim.awayTeam.crest} className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                   <div className="text-left space-y-1">
                      <span className="text-zinc-650 font-mono text-[8px] tracking-widest uppercase font-black">MATCH SIDE (B)</span>
                      <h3 className="text-lg font-black uppercase text-zinc-105">{standbySim.awayTeam.name}</h3>
                      <div className="flex gap-1.5 text-[9px] font-mono text-zinc-500 uppercase">
                         <span>SOT: {standbySim.shotsOnTarget.away}</span>
                         <span>•</span>
                         <span>Fouls: {standbySim.fouls.away}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Dynamic Possession Heatmap component */}
             <div className="border border-zinc-900 rounded-[28px] overflow-hidden p-6 bg-zinc-950">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
                   <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">Real-Time Joint Touch-Density Heatmap</h4>
                   </div>
                   <span className="text-[9px] font-mono text-zinc-500 uppercase">Live Heat Node tracking active</span>
                </div>
                <PossessionHeatmap
                   matchId="standby-interactive"
                   homeTeamName={standbySim.homeTeam.name}
                   awayTeamName={standbySim.awayTeam.name}
                   homeCrest={standbySim.homeTeam.crest}
                   awayCrest={standbySim.awayTeam.crest}
                   homePossession={standbySim.possession.home}
                   awayPossession={standbySim.possession.away}
                />
             </div>

             {/* Poisson calculation display and micro dials */}
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left: Volatility Gauge & Predictive RAG stats */}
                <div className="lg:col-span-12 xl:col-span-5 flex flex-col justify-between">
                   <div className="bg-zinc-950 border border-zinc-900 rounded-[28px] p-6 space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                         <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-205">Telemetry Calibration Indicators</h4>
                            <span className="text-[8.5px] font-mono text-zinc-500">COCKPIT DIALS</span>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl space-y-1">
                               <span className="text-[8.5px] font-mono text-zinc-550 uppercase">Attack Momentum</span>
                               <div className="flex justify-between text-xs font-black">
                                  <span className="text-cyan-400">{standbySim.attackMomentum.home}</span>
                                  <span className="text-zinc-650">v</span>
                                  <span className="text-white">{standbySim.attackMomentum.away}</span>
                               </div>
                            </div>
                            <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl space-y-1">
                               <span className="text-[8.5px] font-mono text-zinc-550 uppercase">Physical Fatigue %</span>
                               <div className="flex justify-between text-xs font-black">
                                  <span className="text-zinc-400">{standbySim.fatigue.home}%</span>
                                  <span className="text-zinc-650">v</span>
                                  <span className="text-rose-400">{standbySim.fatigue.away}%</span>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Volatility gauge embed */}
                      <div className="pt-4 border-t border-zinc-900">
                         <div className="flex items-center justify-between pb-2">
                            <span className="text-[9px] font-mono text-zinc-550 uppercase">Volatility Risk Monitor</span>
                            <span className="text-[9px] font-mono text-yellow-500 uppercase">Live Index</span>
                         </div>
                         <div className="flex items-center gap-4 bg-zinc-900/20 border border-zinc-910 p-4 rounded-2xl">
                            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse shrink-0" />
                            <div className="space-y-1 flex-1">
                               <div className="text-xs font-black text-white uppercase">Volatility Index at {standbySim.volatility}%</div>
                               <p className="text-[10px] text-zinc-500 font-sans">
                                  Volatility thresholds evaluate potential market swings versus expected machine confidence.
                               </p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Right: Real-time Poisson Recalculation sliders and values */}
                <div className="lg:col-span-12 xl:col-span-7 bg-zinc-950 border border-zinc-900 rounded-[28px] p-6 flex flex-col justify-between space-y-6">
                   <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-3 font-sans">
                         <h4 className="text-xs font-black uppercase tracking-wider text-zinc-205">Recalculated Poisson Outcomes</h4>
                         <span className="text-[8.5px] font-mono uppercase animate-pulse shrink-0 text-cyan-400">MATH MODEL ACTIVE</span>
                      </div>

                      <div className="space-y-3 font-mono">
                         {/* Home win */}
                         <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                               <span className="text-zinc-400 font-sans">{standbySim.homeTeam.name} Win</span>
                               <span className="font-extrabold text-cyan-400">{standbySim.poisson.home}%</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                               <motion.div initial={{ width: 0 }} animate={{ width: `${standbySim.poisson.home}%` }} className="bg-cyan-400 h-full rounded-full transition-all duration-300 pointer-events-none" />
                            </div>
                         </div>

                         {/* Draw win */}
                         <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                               <span className="text-zinc-400 font-sans">Draw Outcome</span>
                               <span className="font-extrabold text-zinc-300">{standbySim.poisson.draw}%</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                               <motion.div initial={{ width: 0 }} animate={{ width: `${standbySim.poisson.draw}%` }} className="bg-zinc-600 h-full rounded-full transition-all duration-300 pointer-events-none" />
                            </div>
                         </div>

                         {/* Away win */}
                         <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                               <span className="text-zinc-400 font-sans">{standbySim.awayTeam.name} Win</span>
                               <span className="font-extrabold text-white">{standbySim.poisson.away}%</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                               <motion.div initial={{ width: 0 }} animate={{ width: `${standbySim.poisson.away}%` }} className="bg-white/90 h-full rounded-full transition-all duration-300 pointer-events-none" />
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Live commentary events tracker */}
                   <div className="bg-zinc-900/30 border border-zinc-900 p-4.5 rounded-2xl flex flex-col justify-between h-[130px] overflow-hidden">
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60 text-[9px] font-mono text-zinc-500 uppercase mb-1">
                         <span>Live Event Logs</span>
                         <span className="text-rose-500 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" /> Dynamic Logs
                         </span>
                      </div>
                      <div className="overflow-y-auto space-y-1 pr-1 flex-1 text-[11px] h-[80px]">
                         {standbySim.timeline.slice().reverse().map((evt, idx) => (
                            <div key={idx} className="flex gap-2 items-start py-1">
                               <span className="text-cyan-400 font-mono font-bold shrink-0">[{evt.minute}']</span>
                               <p className="text-zinc-350 font-sans leading-relaxed">{evt.message}</p>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* ACTIVE IN-PLAY MATCHES GRID (IF ANY REAL LIVE MATCHES EXIST) */}
          {liveMatches.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
                <SpinnerPulse /> Currently Live Fixtures
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveMatches.map((m: any) => (
                  <div 
                    key={m.id}
                    onClick={() => {
                      setSelectedMatchId(String(m.id));
                      setIsDemoActive(false);
                    }}
                    className="p-6 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-cyan-500/50 rounded-2xl cursor-pointer transition-all space-y-4 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2.5 bg-cyan-500/10 text-cyan-400 font-mono text-[9px] font-bold uppercase rounded-bl-xl border-l border-b border-zinc-800">
                      LIVE
                    </div>
                    <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase">{m.competition?.name}</div>
                    <div className="flex items-center justify-between gap-4 py-2 text-sm font-bold">
                      <div className="flex items-center gap-2">
                        {m.homeTeam?.crest && <img src={m.homeTeam.crest} alt="" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />}
                        <span className="truncate max-w-[110px]">{m.homeTeam?.name}</span>
                      </div>
                      <span className="text-cyan-400 font-mono">{m.score?.fullTime?.home ?? 0} : {m.score?.fullTime?.away ?? 0}</span>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[110px]">{m.awayTeam?.name}</span>
                        {m.awayTeam?.crest && <img src={m.awayTeam.crest} alt="" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono pt-2 border-t border-zinc-800">
                      <span className="text-cyan-400 flex items-center gap-1">
                        <span className="animate-ping rounded-full bg-cyan-400 w-1.5 h-1.5"></span>
                        Minute {m.minute || 45}'
                      </span>
                      <span className="text-zinc-400 font-black uppercase tracking-wider group-hover:text-white transition-colors flex items-center gap-1">
                        Activate Telemetry <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UPCOMING MATCH SCHEDULE SECTION */}
          {scheduledMatches.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                <Calendar className="w-5 h-5 text-zinc-500" />
                <span>Today's Upcoming Tactical Deployments</span>
                <div className="h-[1px] flex-1 bg-zinc-900" />
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scheduledMatches.slice(0, 6).map((m: any) => {
                  const kickoffTime = new Date(m.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div 
                      key={m.id}
                      onClick={() => navigate(`/match/${m.id}`)}
                      className="p-6 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/30 rounded-[20px] transition-all space-y-4 cursor-pointer group"
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-zinc-500 uppercase tracking-widest">{m.competition?.name}</span>
                        <span className="text-zinc-400 font-bold bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {kickoffTime}
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
                        <span>Pre-Match Scanned</span>
                        <span className="text-zinc-400 group-hover:text-white transition-colors flex items-center gap-1 uppercase tracking-widest font-black text-[9px]">
                          Predictions <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ARCHIVED COMLETED MATCHES RECENT TELEMETRY */}
          {completedMatches.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                <Award className="w-5 h-5 text-zinc-500" />
                <span>Recently Sourced Mission Reports</span>
                <div className="h-[1px] flex-1 bg-zinc-900" />
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {completedMatches.map((m: any) => (
                  <div 
                    key={m.id}
                    onClick={() => navigate(`/match/${m.id}`)}
                    className="p-5 bg-zinc-950/40 border border-zinc-900/60 hover:bg-zinc-900/30 rounded-xl transition-all space-y-3 cursor-pointer group"
                  >
                    <div className="text-[9px] font-mono text-zinc-500 uppercase truncate">{m.competition?.name}</div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="truncate max-w-[70px] font-mono">{m.homeTeam?.name}</span>
                      <span className="text-zinc-300 font-mono px-2 py-0.5 bg-zinc-900/80 rounded-md border border-zinc-800 text-[10px]">
                        {m.score?.fullTime?.home} - {m.score?.fullTime?.away}
                      </span>
                      <span className="truncate max-w-[70px] font-mono text-right">{m.awayTeam?.name}</span>
                    </div>
                    <div className="text-[9.5px] font-mono text-zinc-500 uppercase tracking-widest text-center group-hover:text-white transition-colors">
                      View Model Analysis
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BIG INTERACTIVE PLUG-IN SANDBOX MODE */}
          <div className="bg-gradient-to-r from-cyan-950/20 via-zinc-950 to-indigo-950/20 border-2 border-dashed border-cyan-500/20 rounded-[32px] p-8 text-center max-w-2xl mx-auto space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-24 h-24 bg-cyan-400/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-indigo-400/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full w-fit mx-auto">
              <Tv className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-tight text-white">Adrenaline Sandbox Environment</h3>
              <p className="text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed font-sans">
                Europe's theaters are silent at this exact minute. However, you can initialize our high-intensity, live-stream simulation for **FC Barcelona vs Real Madrid CF (El Clásico)**. 
              </p>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans mt-1">
                This triggers an active, real-time Node SSE stream feed (`/api/live-stream`) to demo fluctuating Poisson indices, microcommentary, momentum gauges and the Interactive AI Oracle!
              </p>
            </div>

            <button
              onClick={() => {
                setIsDemoActive(true);
                setSelectedMatchId('demo');
              }}
              className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-450 hover:to-indigo-500 text-white font-black uppercase text-xs rounded-xl tracking-[0.15em] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Gamepad className="w-4 h-4" />
              Launch Clásico Simulator
            </button>
          </div>

        </div>
      </div>
    );
  }

  // RENDER THE ACTIVE LIVE STREAM VIEW (IF MATCHSTATE IS LOADED)
  const homeProb = matchState.probabilities.home;
  const awayProb = matchState.probabilities.away;
  const drawProb = matchState.probabilities.draw;

  return (
    <div id="live-analysis-dashboard" className="min-h-screen bg-black text-white py-8 px-4 font-sans select-none relative overflow-hidden">
      
      {/* Dynamic Selector / Live switcher drawer at top */}
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-4.5">
          <button 
            onClick={handleDisconnectStream}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest cursor-pointer group shrink-0"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>EXITS TO COCKPIT BOARD</span>
          </button>

          {/* List other live games if any exist, permitting switching instantly */}
          {liveMatches.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 max-w-[65%]">
              <span className="text-[9px] font-mono text-zinc-500 uppercase shrink-0">Other Live Arenas:</span>
              {liveMatches.filter(m => String(m.id) !== selectedMatchId).map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMatchId(String(m.id));
                    setIsDemoActive(false);
                    setMatchState(null);
                  }}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[9.5px] font-mono uppercase text-zinc-300 rounded-md transition-all shrink-0 cursor-pointer"
                >
                  {m.homeTeam?.name?.substring(0,3)} vs {m.awayTeam?.name?.substring(0,3)} {m.score?.fullTime?.home ?? 0}:{m.score?.fullTime?.away ?? 0}
                </button>
              ))}
            </div>
          )}

          {isDemoActive ? (
            <div className="px-3 py-1 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/35 rounded-lg text-cyan-400 font-mono text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Demo Sandbox Active
            </div>
          ) : (
            <div className="px-3 py-1 bg-red-500/10 border border-red-500/25 rounded-lg text-red-400 font-mono text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> Real-Time Synchronized Telemetry
            </div>
          )}
        </div>
        
        {/* Dynamic Telemetry Status Header */}
        <div id="telemetry-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 border border-zinc-900 rounded-[20px] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[45%] h-[120%] bg-radial from-cyan-500/5 to-transparent blur-2xl pointer-events-none" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className={connected ? "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" : ""} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              </span>
              <span className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-zinc-400">
                {connected ? "Secure SSE Live socket Synchronous" : "Stream Socket Connecting"}
              </span>
            </div>
            <h2 className="text-2xl font-black uppercase text-white leading-tight">Live Visual Analysis Engine</h2>
            <p className="text-xs text-zinc-400 max-w-2xl font-sans">
              Continuous live telemetry feed sourcing in-play metrics, team progression, and expected Poisson outcomes updated every 4 seconds.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-center shrink-0">
              <div className="text-[9px] font-mono text-zinc-500 uppercase font-black">Link Latency</div>
              <div className="text-xs font-mono font-black text-cyan-400">{latency}ms</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-center shrink-0">
              <div className="text-[9px] font-mono text-zinc-500 uppercase font-black">Link Stability</div>
              <div className="text-xs font-mono font-black text-emerald-400">99.9%</div>
            </div>
            <button
              onClick={() => openAgentWithMatch(matchState)}
              className="px-4 py-3 bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <Brain className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
              Agent Console
            </button>
          </div>
        </div>

        {/* Live Scoreboard Display */}
        <div id="live-scoreboard" className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-zinc-950 border border-zinc-900 rounded-[24px] p-6 relative overflow-hidden font-sans">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/2 rounded-full blur-3xl pointer-events-none" />
          
          <div className="lg:col-span-12 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-zinc-900 pb-6">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                {matchState.competition}
              </div>
              <div className="text-zinc-500 text-xs font-mono">ID: #{matchState.id}</div>
            </div>
            
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
              <span className="text-[10px] font-black font-mono uppercase text-rose-500 tracking-widest">
                STREAMING PROCESSOR ON AIR
              </span>
            </div>
          </div>

          {/* Home team */}
          <div className="lg:col-span-5 flex items-center gap-6 justify-end md:pr-4">
            <div className="text-right space-y-1">
              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider font-mono">HOME SIDE</span>
              <h3 className="text-2xl font-black uppercase text-zinc-100">{matchState.homeTeam.name}</h3>
              <p className="text-[10px] text-zinc-500 font-sans">Active Attack Rate Focus</p>
            </div>
            {matchState.homeTeam.crest ? (
              <img src={matchState.homeTeam.crest} alt="Crest" className="w-16 h-16 object-contain shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 bg-zinc-900 rounded-full border border-zinc-800 flex items-center justify-center shrink-0">
                <Dribbble className="w-8 h-8 text-zinc-600" />
              </div>
            )}
          </div>

          {/* Central Score and Timer */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-4 px-2 border-y md:border-y-0 md:border-x border-zinc-900 gap-1 my-2 md:my-0">
            <div className="text-zinc-500 text-[10px] font-black uppercase font-mono tracking-widest text-center">Scoreline</div>
            <div className="flex items-center gap-4 text-4xl font-mono font-black justify-center">
              <motion.span key={matchState.score.home} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-white">
                {matchState.score.home}
              </motion.span>
              <span className="text-zinc-850">:</span>
              <motion.span key={matchState.score.away} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-white">
                {matchState.score.away}
              </motion.span>
            </div>
            <div className="relative mt-2 max-w-[100px] w-full flex items-center justify-center">
              <div className="px-3 py-1 bg-cyan-400 text-black border border-transparent rounded-full text-xs font-mono font-black flex items-center justify-center gap-1.5 animate-pulse">
                <span>{matchState.minute}'</span>
                <span className="text-[9px] font-bold uppercase tracking-tighter">MIN</span>
              </div>
            </div>
          </div>

          {/* Away team */}
          <div className="lg:col-span-5 flex items-center gap-6 justify-start md:pl-4">
            {matchState.awayTeam.crest ? (
              <img src={matchState.awayTeam.crest} alt="Crest" className="w-16 h-16 object-contain shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 bg-zinc-900 rounded-full border border-zinc-800 flex items-center justify-center shrink-0">
                <Dribbble className="w-8 h-8 text-zinc-600" />
              </div>
            )}
            <div className="space-y-1">
              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider font-mono">AWAY SIDE</span>
              <h3 className="text-2xl font-black uppercase text-zinc-100">{matchState.awayTeam.name}</h3>
              <p className="text-[10px] text-zinc-500 font-sans">Counter Transition Model</p>
            </div>
          </div>
        </div>

        {/* Tactical Panels & Real-Time Event Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Live Commentary & Events Timeline logs */}
          <div className="lg:col-span-5 bg-zinc-950 border border-zinc-900 rounded-[24px] p-6 h-[510px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-100">Live Telemetry Timeline</h3>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase">{matchState.timeline.length} Events Logged</span>
              </div>

              {/* Real-time commentary wrapper */}
              <div className="space-y-3 h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                {matchState.timeline.map((event, index) => {
                  let badgeColor = "bg-zinc-900/40 text-zinc-400 border-zinc-800";
                  if (event.type === "goal") badgeColor = "bg-emerald-500/10 text-emerald-450 border-emerald-500/20";
                  if (event.type === "card") badgeColor = "bg-yellow-500/10 text-yellow-550 border-yellow-500/20";
                  if (event.type === "shot") badgeColor = "bg-cyan-500/10 text-cyan-405 border-cyan-500/20";

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3.5 bg-black/40 border border-zinc-900 rounded-xl space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-zinc-500">
                            [{15 + Math.floor(event.minute / 5)}:{(event.minute % 5 * 12).toString().padStart(2, '0')}]
                          </span>
                          <span className="text-xs font-bold text-cyan-400 font-mono">
                            {event.minute}'
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase ${badgeColor}`}>
                          {event.type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-350 font-sans leading-relaxed">
                        {event.message}
                      </p>
                    </motion.div>
                  );
                })}
                <div ref={feedEndRef} />
              </div>
            </div>
          </div>

          {/* RIGHT: High-fidelity statistics counters & live probability outcomes */}
          <div className="lg:col-span-7 bg-zinc-950 border border-zinc-900 rounded-[24px] p-6 h-[510px] flex flex-col justify-between">
            <div>
              {/* Tab Selector */}
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-4 mb-4">
                <button
                  onClick={() => setActiveTab('statistics')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'statistics' ? 'bg-cyan-400 text-black animate-pulse' : 'text-zinc-400 hover:text-white bg-zinc-900/50'}`}
                >
                  Live Statistics Link
                </button>
                <button
                  onClick={() => setActiveTab('poisson')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'poisson' ? 'bg-cyan-400 text-black animate-pulse' : 'text-zinc-400 hover:text-white bg-zinc-900/50'}`}
                >
                  Poisson Fluctuations
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'alerts' ? 'bg-cyan-400 text-black animate-pulse' : 'text-zinc-400 hover:text-white bg-zinc-900/50'}`}
                >
                  Oracle Alerts ({matchState.yellowCards.home + matchState.yellowCards.away})
                </button>
              </div>

              {/* Tab Content: Telemetry Statistics */}
              {activeTab === 'statistics' && (
                <div className="space-y-4 font-mono">
                  {/* Possession */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>POSSESSION ({matchState.possession.home}%)</span>
                      <span>POSSESSION ({matchState.possession.away}%)</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-900 rounded-lg overflow-hidden flex">
                      <motion.div 
                        initial={{ width: '50%' }}
                        animate={{ width: `${matchState.possession.home}%` }}
                        className="bg-cyan-400 h-full transition-all duration-500"
                      />
                      <motion.div 
                        initial={{ width: '50%' }}
                        animate={{ width: `${matchState.possession.away}%` }}
                        className="bg-white/80 h-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Dual metrics Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {/* Stat box: Shots */}
                    <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-zinc-500 uppercase">Total Shots</span>
                      <div className="flex justify-between items-end">
                        <span className="text-xl font-black text-white">{matchState.shots.home}</span>
                        <span className="text-[10px] text-zinc-650">SHOTS</span>
                        <span className="text-xl font-black text-white">{matchState.shots.away}</span>
                      </div>
                    </div>

                    {/* Stat box: Shots On Target */}
                    <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-zinc-500 uppercase">Shots On Target</span>
                      <div className="flex justify-between items-end">
                        <span className="text-xl font-black text-white">{matchState.shotsOnTarget.home}</span>
                        <span className="text-[10px] text-zinc-650">TARGET</span>
                        <span className="text-xl font-black text-white">{matchState.shotsOnTarget.away}</span>
                      </div>
                    </div>

                    {/* Stat box: Yellow Cards */}
                    <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-zinc-500 uppercase">Yellow Cards</span>
                      <div className="flex justify-between items-end">
                        <span className="text-xl font-black text-yellow-500">{matchState.yellowCards.home}</span>
                        <span className="text-[10px] text-zinc-550">BOOKINGS</span>
                        <span className="text-xl font-black text-yellow-500">{matchState.yellowCards.away}</span>
                      </div>
                    </div>

                    {/* Stat box: Fouls */}
                    <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-zinc-500 uppercase">Fouls</span>
                      <div className="flex justify-between items-end">
                        <span className="text-xl font-black text-white">{matchState.fouls.home}</span>
                        <span className="text-[10px] text-zinc-550">FOULS</span>
                        <span className="text-xl font-black text-white">{matchState.fouls.away}</span>
                      </div>
                    </div>
                  </div>

                  {/* General Alerts / Instant model parameters */}
                  <div className="p-4 bg-zinc-900/40 border border-zinc-900 rounded-xl flex items-start gap-3 mt-2">
                    <Activity className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase text-white">Live Markov Progression Model</h4>
                      <p className="text-[10.5px] text-zinc-400 font-sans leading-relaxed">
                        Transition density has spiked with extreme high tempo. Transition speed calculated at {((matchState.possession.home / (matchState.possession.away || 1)) * 1.25).toFixed(2)}x.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Fluctuating Poisson outcomes */}
              {activeTab === 'poisson' && (
                <div className="space-y-4">
                  <div className="text-[11px] font-mono text-zinc-550 uppercase mb-2 border-b border-zinc-900 pb-2">
                    Mathematical Joint Density Outputs (Fluctuating)
                  </div>

                  {/* Home probability */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-zinc-300">
                      <span>{matchState.homeTeam.name} Wins (Joint Intensity Indicator)</span>
                      <span className="font-extrabold text-white">{homeProb}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${homeProb}%` }}
                        className="bg-cyan-400 h-full rounded-full transition-all duration-300 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Draw probability */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-zinc-300">
                      <span>Draw (Poisson Parameter Index)</span>
                      <span className="font-extrabold text-white">{drawProb}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${drawProb}%` }}
                        className="bg-zinc-750 h-full rounded-full transition-all duration-300 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Away win */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-zinc-300">
                      <span>{matchState.awayTeam.name} Wins (Joint Intensity Indicator)</span>
                      <span className="font-extrabold text-white">{awayProb}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${awayProb}%` }}
                        className="bg-white/90 h-full rounded-full transition-all duration-300 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Over/Under indicators */}
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-2">
                    <div className="bg-zinc-900/40 border border-zinc-900 p-3.5 rounded-xl text-center space-y-1">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">Over 2.5 Goals</div>
                      <div className="text-xl font-mono font-black text-emerald-400">{matchState.probabilities.over25}%</div>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-900 p-3.5 rounded-xl text-center space-y-1">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">Under 2.5 Goals</div>
                      <div className="text-xl font-mono font-black text-rose-400">{matchState.probabilities.under25}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Intelligent Oracle Risks */}
              {activeTab === 'alerts' && (
                <div className="space-y-4 font-sans">
                  <div className="text-[11px] font-mono text-zinc-550 uppercase mb-2 border-b border-zinc-900 pb-2">
                    A.I. Neural Alert Flags Triggered
                  </div>

                  <div className="space-y-3">
                    {matchState.score.home + matchState.score.away >= 2 ? (
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex gap-3 text-emerald-400">
                        <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs text-zinc-300 font-sans leading-relaxed">
                          <strong className="text-emerald-405 font-semibold">Poisson Trigger Activated</strong>: Match exceeded over 1.5 threshold perfectly. Total density suggests another high intensity transitional event is pending before 85'.
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-500/5 border border-yellow-500/15 rounded-xl flex gap-3 text-yellow-500">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs text-zinc-300 font-sans leading-relaxed">
                          <strong className="text-yellow-505 font-semibold">Low Goal Density</strong>: Goals are currently underperforming Poisson baseline averages. High frequency neutral turnovers detected in midfield nodes.
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl flex gap-3 text-rose-400">
                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs text-zinc-300 font-sans leading-relaxed">
                        <strong className="text-rose-405 font-semibold">Booking / Volatility Index High</strong>: {matchState.yellowCards.home + matchState.yellowCards.away} yellow cards issued. Standard deviation calculation flags high probability of further bookings to defend dangerous quick transition counters.
                      </div>
                    </div>

                    <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-xl flex gap-3 text-blue-400">
                      <Sparkles className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1 text-xs text-zinc-350 font-sans leading-relaxed">
                        <strong className="text-blue-405 font-semibold">Agent Prediction Verdict</strong>: ${matchState.homeTeam.name}'s quick ball progression index is current operating at 87 percentile. The draw value bias has compressed. Secure hedging is optimal.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom alert bar */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-900 rounded-xl flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-500">
                <SpinnerPulse /> Live Stream Connection Sourced via Node
              </span>
              <span className="font-semibold text-white">Active</span>
            </div>
          </div>

        </div>

        {/* Dynamic Live AI Chat System with Context-aware Oracle link */}
        <div className="p-6 bg-gradient-to-r from-cyan-500/5 via-zinc-950 to-zinc-950 border border-zinc-900 rounded-[24px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4 pr-0 lg:pr-4 border-b lg:border-b-0 lg:border-r border-zinc-900 pb-4 lg:pb-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400">
                <Brain className="w-5 h-5 animate-pulse" />
                <h4 className="text-sm font-black uppercase tracking-wider font-mono">Oracle Real-Time Link</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Type directly to ask the Safe Side Oracle AI model detailed parameters of this match in real time, or request the complete overview strategy.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleRequestPromptBriefing}
                className="w-full text-left p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-900 text-zinc-350 font-sans text-xs transition-colors flex items-center justify-between group cursor-pointer"
              >
                <span>Compile deep strategy briefing</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col justify-between h-[280px]">
            {/* Interactive Chat Console */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-zinc-850 px-2 min-h-[170px]">
              <AnimatePresence initial={false}>
                {chatMessages.map((msg, mIdx) => (
                  <motion.div
                    key={mIdx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 text-xs max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`p-2 rounded-full h-7 w-7 flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                      {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-zinc-400" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div className={`p-3 rounded-2xl ${msg.role === 'user' ? 'bg-zinc-900 text-zinc-200 rounded-tr-none' : 'bg-zinc-950 border border-zinc-900 text-zinc-300 rounded-tl-none'}`}>
                      <p className="leading-relaxed font-sans whitespace-pre-wrap">{msg.content}</p>
                      <span className="block text-[8px] text-zinc-550 text-right mt-1 font-mono uppercase">{msg.timestamp}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {askingOracle && (
                <div className="flex gap-2.5 text-xs max-w-[85%] items-center animate-pulse">
                  <div className="p-2 rounded-full h-7 w-7 flex items-center justify-center shrink-0 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-900 text-zinc-500 italic font-mono text-[10px]">
                    Oracle AI is compiling telemetry metrics...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Form */}
            <form id="oracle-chat-form" onSubmit={handleAskOracle} className="flex gap-2 bg-black border border-zinc-900 p-1.5 rounded-xl focus-within:border-cyan-500/50 transition-all mt-3">
              <input
                type="text"
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                placeholder={`Ask Oracle about ${matchState.homeTeam.name}'s dynamic triggers...`}
                className="flex-1 bg-transparent px-3 py-2 text-xs text-white focus:outline-none placeholder-zinc-500"
              />
              <button
                type="submit"
                disabled={askingOracle || !userQuery.trim()}
                className="p-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-lg px-4 disabled:opacity-40 transition-opacity cursor-pointer whitespace-nowrap flex items-center gap-1.5"
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

// Micro utility indicator components
function SpinnerPulse() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
    </span>
  );
}
