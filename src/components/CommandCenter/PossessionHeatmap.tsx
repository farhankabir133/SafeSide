import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Crosshair, Zap, Compass, RefreshCw, BarChart2, Radio } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PossessionHeatmapProps {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeCrest?: string;
  awayCrest?: string;
  homePossession?: number; // e.g. 52
  awayPossession?: number; // e.g. 48
}

interface HeatZone {
  id: number;
  row: number; // 0: Own Third, 1: Def Mid, 2: Att Mid, 3: Opp Third
  col: number; // 0: Left Flank, 1: Center, 2: Right Flank
  rowLabel: string;
  colLabel: string;
  homeIntensity: number; // 0 - 100
  awayIntensity: number; // 0 - 100
  homeTouches: number;
  awayTouches: number;
}

// Seeded random helper to ensure deterministic results for a given matchId and zone
function getSeededRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  return () => {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PossessionHeatmap: React.FC<PossessionHeatmapProps> = ({
  matchId,
  homeTeamName,
  awayTeamName,
  homePossession = 50,
  awayPossession = 50,
}) => {
  const [activeMode, setActiveMode] = useState<'home' | 'away' | 'dual'>('dual');
  const [hoveredZone, setHoveredZone] = useState<HeatZone | null>(null);

  // Generate tactical heat data seeded by matchId and formatted by actual possession
  const zones: HeatZone[] = useMemo(() => {
    const seed = `heatmap-seed-${matchId}`;
    const rand = getSeededRandom(seed);
    const result: HeatZone[] = [];
    
    const rowLabels = ["Defensive Deep Third", "Defensive Midfield Block", "Attacking Midfield Block", "Attacking Deep Third"];
    const colLabels = ["Left Corridor", "Central Corridor", "Right Corridor"];

    const totalHomeBase = homePossession;
    const totalAwayBase = awayPossession;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const id = r * 3 + c;
        // Generate raw ratios
        const homeBaseRand = 20 + rand() * 60;
        const awayBaseRand = 20 + rand() * 60;

        // Weighting zones differently to make them look like tactical plans
        // Home team attacks from left to right (r=0 is home defense, r=3 is home attack)
        // Away team attacks from right to left (r=3 is away defense, r=0 is away attack)
        let homeWeight = 1.0;
        let awayWeight = 1.0;

        if (r === 1 || r === 2) {
          homeWeight += 0.3; // Midfield congestion
          awayWeight += 0.3;
        }
        if (c === 1) {
          homeWeight += 0.2; // Central corridor preference
          awayWeight += 0.2;
        }

        // Apply a team-specific possession slant to show realistic patterns
        const homeIntensity = Math.round(
          Math.min(100, Math.max(10, homeBaseRand * homeWeight * (totalHomeBase / 50)))
        );
        const awayIntensity = Math.round(
          Math.min(100, Math.max(10, awayBaseRand * awayWeight * (totalAwayBase / 50)))
        );

        // Map intensity to total touches
        const homeTouches = Math.round(homeIntensity * 1.8 + rand() * 15);
        const awayTouches = Math.round(awayIntensity * 1.8 + rand() * 15);

        result.push({
          id,
          row: r,
          col: c,
          rowLabel: rowLabels[r],
          colLabel: colLabels[c],
          homeIntensity,
          awayIntensity,
          homeTouches,
          awayTouches,
        });
      }
    }
    return result;
  }, [matchId, homePossession, awayPossession]);

  // Aggregate stats from the generated heatmap zones
  const stats = useMemo(() => {
    let homeMid = 0, awayMid = 0;
    let homeLeft = 0, homeCenter = 0, homeRight = 0;
    let awayLeft = 0, awayCenter = 0, awayRight = 0;
    let homeDanger = 0, awayDanger = 0;

    zones.forEach(z => {
      // Midfield control (Rows 1 and 2)
      if (z.row === 1 || z.row === 2) {
        homeMid += z.homeTouches;
        awayMid += z.awayTouches;
      }
      
      // Corridors
      if (z.col === 0) {
        homeLeft += z.homeTouches;
        awayLeft += z.awayTouches;
      } else if (z.col === 1) {
        homeCenter += z.homeTouches;
        awayCenter += z.awayTouches;
      } else {
        homeRight += z.homeTouches;
        awayRight += z.awayTouches;
      }

      // Danger entries (Offensive deep zones: Row 3 for Home, Row 0 for Away)
      if (z.row === 3) homeDanger += z.homeTouches;
      if (z.row === 0) awayDanger += z.awayTouches;
    });

    const totalHome = homeLeft + homeCenter + homeRight;
    const totalAway = awayLeft + awayCenter + awayRight;

    return {
      midControlHome: Math.round((homeMid / (homeMid + awayMid || 1)) * 100),
      midControlAway: Math.round((awayMid / (homeMid + awayMid || 1)) * 100),
      homeBias: {
        left: Math.round((homeLeft / (totalHome || 1)) * 100),
        center: Math.round((homeCenter / (totalHome || 1)) * 100),
        right: Math.round((homeRight / (totalHome || 1)) * 100),
      },
      awayBias: {
        left: Math.round((awayLeft / (totalAway || 1)) * 100),
        center: Math.round((awayCenter / (totalAway || 1)) * 100),
        right: Math.round((awayRight / (totalAway || 1)) * 100),
      },
      dangerPoints: {
        home: Math.round(homeDanger / 4),
        away: Math.round(awayDanger / 4),
      }
    };
  }, [zones]);

  // Get current tactical comments for hovered zone
  const assessment = hoveredZone ? (() => {
    const total = hoveredZone.homeTouches + hoveredZone.awayTouches;
    const homeDom = (hoveredZone.homeTouches / (total || 1)) * 100;
    
    if (total === 0) return "No telemetry data detected in this node.";
    if (homeDom > 62) {
      return `${homeTeamName} establishes extreme offensive overload. Direct defensive containment recommended.`;
    } else if (homeDom < 38) {
      return `${awayTeamName} captures complete signal control in this zone. Home defensive block pressured.`;
    } else {
      return `Neutral tactical deadlock. Congested action rate with frequent physical duels.`;
    }
  })() : null;

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-[40px] overflow-hidden">
      {/* Header Panel */}
      <div className="p-8 border-b border-zinc-900 bg-black/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-black uppercase tracking-widest">Tactical Possession Grid</h3>
        </div>
        
        {/* Mode Toggle Controls */}
        <div className="flex bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setActiveMode('home')}
            className={cn(
              "text-[9px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all duration-300",
              activeMode === 'home'
                ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "text-zinc-500 hover:text-white"
            )}
          >
            {homeTeamName.split(' ')[0]}
          </button>
          <button
            onClick={() => setActiveMode('dual')}
            className={cn(
              "text-[9px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all duration-300",
              activeMode === 'dual'
                ? "bg-zinc-100 text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                : "text-zinc-500 hover:text-white"
            )}
          >
            Dual Control
          </button>
          <button
            onClick={() => setActiveMode('away')}
            className={cn(
              "text-[9px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all duration-300",
              activeMode === 'away'
                ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                : "text-zinc-500 hover:text-white"
            )}
          >
            {awayTeamName.split(' ')[0]}
          </button>
        </div>
      </div>

      <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Heatmap Pitch Display */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="relative aspect-[3/2] w-full bg-zinc-950 border border-zinc-900 rounded-[32px] overflow-hidden p-6 shadow-inner">
            
            {/* Holographic Wireframe SVG Background */}
            <svg 
              className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" 
              viewBox="0 0 120 80" 
              fill="none" 
              stroke="white" 
              strokeWidth="0.5"
            >
              {/* Pitch Boundaries */}
              <rect x="5" y="5" width="110" height="70" />
              {/* Halfway Line */}
              <line x1="60" y1="5" x2="60" y2="75" />
              {/* Center Circle */}
              <circle cx="60" cy="40" r="10" />
              <circle cx="60" cy="40" r="0.8" fill="white" />
              {/* Left Penalty Box */}
              <rect x="5" y="20" width="18" height="40" />
              <rect x="5" y="30" width="6" height="20" />
              <circle cx="23" cy="40" r="0.5" fill="white" />
              {/* Right Penalty Box */}
              <rect x="97" y="20" width="18" height="40" />
              <rect x="109" y="30" width="6" height="20" />
              <circle cx="97" cy="40" r="0.5" fill="white" />
              {/* Left & Right Penalty Arcs */}
              <path d="M 23 33 A 10 10 0 0 1 23 47" />
              <path d="M 97 33 A 10 10 0 0 0 97 47" />
            </svg>

            {/* Interactive Grid Map overlays */}
            <div className="absolute inset-4 grid grid-cols-4 grid-rows-3 gap-2">
              {/* Loop through the cells. Outer cols represent r=0..3 progress on pitch, inner row represents c=0..2 across width */}
              {Array.from({ length: 12 }).map((_, index) => {
                // To display as a football pitch:
                // Grid is 4 vertical columns representing depth (Defensive to Attacking)
                // Grid is 3 horizontal rows representing corridor (Left Corridor, Central Corridor, Right Corridor)
                const colIndex = index % 4; // 0: Own End, 1: Def Mid, 2: Att Mid, 3: Opp End
                const rowIndex = Math.floor(index / 4); // 0: Left Corridor, 1: Central Corridor, 2: Right Corridor

                // Match up to HeatZone record
                const zone = zones.find(z => z.row === colIndex && z.col === rowIndex);
                if (!zone) return null;

                // Intensity determining color weights
                let bgStyle = {};
                let borderStyle = "border-zinc-900/40 hover:border-zinc-600/50";
                
                if (activeMode === 'home') {
                  const alpha = zone.homeIntensity / 100 * 0.45;
                  bgStyle = { backgroundColor: `rgba(16, 185, 129, ${alpha})` };
                  if (zone.homeIntensity > 70) borderStyle = "border-emerald-500/20";
                } else if (activeMode === 'away') {
                  const alpha = zone.awayIntensity / 100 * 0.45;
                  bgStyle = { backgroundColor: `rgba(59, 130, 246, ${alpha})` };
                  if (zone.awayIntensity > 70) borderStyle = "border-blue-500/20";
                } else {
                  // Dual Domination Index Overlay
                  const homeW = zone.homeTouches;
                  const awayW = zone.awayTouches;
                  const total = homeW + awayW;
                  const homeRatio = homeW / (total || 1);
                  
                  if (total === 0) {
                    bgStyle = { backgroundColor: 'transparent' };
                  } else if (homeRatio > 0.55) {
                    const alpha = (homeRatio - 0.5) * 2 * 0.45;
                    bgStyle = { backgroundColor: `rgba(16, 185, 129, ${alpha})` };
                    borderStyle = "border-emerald-500/10 hover:border-emerald-500/30";
                  } else if (homeRatio < 0.45) {
                    const awayRatio = 1 - homeRatio;
                    const alpha = (awayRatio - 0.5) * 2 * 0.45;
                    bgStyle = { backgroundColor: `rgba(59, 130, 246, ${alpha})` };
                    borderStyle = "border-blue-500/10 hover:border-blue-500/30";
                  } else {
                    bgStyle = { backgroundColor: `rgba(113, 113, 122, 0.1)` };
                  }
                }

                return (
                  <div
                    key={zone.id}
                    onMouseEnter={() => setHoveredZone(zone)}
                    onMouseLeave={() => setHoveredZone(null)}
                    style={bgStyle}
                    className={cn(
                      "relative rounded-[16px] border flex flex-col items-center justify-center p-2 cursor-pointer transition-all duration-300 backdrop-blur-[2px]",
                      borderStyle,
                      hoveredZone?.id === zone.id ? "scale-[1.03] shadow-lg shadow-black/80 z-10" : "scale-100"
                    )}
                  >
                    <span className="text-[9px] font-black font-mono tracking-tighter opacity-40">
                      {activeMode === 'home' 
                        ? `${zone.homeIntensity}%` 
                        : activeMode === 'away' 
                        ? `${zone.awayIntensity}%` 
                        : `${Math.round((zone.homeTouches / (zone.homeTouches + zone.awayTouches || 1)) * 100)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between text-[9px] font-mono font-black tracking-widest text-zinc-500 px-2 uppercase">
            <span>Own Goal Line ({homeTeamName.split(' ')[0]} Defense)</span>
            <span>Opponent Box ({awayTeamName.split(' ')[0]} Defense)</span>
          </div>
        </div>

        {/* Tactical telemetry reporting side stats */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
          
          {/* Active Hovered Telemetry Block */}
          <div className="bg-zinc-900/20 border border-zinc-900 p-8 rounded-[32px] min-h-[140px] flex flex-col justify-between relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.02]">
              <Radio className="w-20 h-20 text-emerald-500 animate-pulse" />
            </div>

            {hoveredZone ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                    Telemetry: Node {hoveredZone.id + 1}
                  </span>
                  <Badge variant="outline" className="text-[8px] font-black border-zinc-800 tracking-wider">
                    {hoveredZone.colLabel}
                  </Badge>
                </div>
                
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{hoveredZone.rowLabel}</h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{assessment}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase">Home touches</span>
                    <span className="text-sm font-black font-mono text-emerald-500">{hoveredZone.homeTouches}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase">Away touches</span>
                    <span className="text-sm font-black font-mono text-blue-500">{hoveredZone.awayTouches}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full py-6 space-y-3">
                <Radio className="w-8 h-8 text-zinc-700 animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Hover over grid segments to extract live tactical zone insights.
                </p>
              </div>
            )}
          </div>

          {/* Pitches Tactical Balance Ratio stats */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">Node Balance Assessment</h4>

            {/* Midfield Domination Ratio */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-zinc-500">{homeTeamName.split(' ')[0]} Mid Control</span>
                <span className="font-mono text-emerald-500">{stats.midControlHome}% - {stats.midControlAway}%</span>
              </div>
              <div className="h-2 bg-zinc-950 p-[2px] rounded-full border border-zinc-900 overflow-hidden flex">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.midControlHome}%` }} />
                <div className="h-full bg-blue-500 rounded-full ml-auto" style={{ width: `${stats.midControlAway}%` }} />
              </div>
            </div>

            {/* Wing biasing coordinates */}
            <div className="grid grid-cols-2 gap-6 pt-1">
              <div>
                <p className="text-[9px] font-black uppercase text-zinc-600 tracking-wider mb-2">{homeTeamName.split(' ')[0]} Width Slant</p>
                <div className="space-y-1 text-[10px] font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Left Flank:</span>
                    <span className="font-bold text-white">{stats.homeBias.left}%</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Central Axis:</span>
                    <span className="font-bold text-white">{stats.homeBias.center}%</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Right Flank:</span>
                    <span className="font-bold text-white">{stats.homeBias.right}%</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black uppercase text-zinc-600 tracking-wider mb-2">{awayTeamName.split(' ')[0]} Width Slant</p>
                <div className="space-y-1 text-[10px] font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Left Flank:</span>
                    <span className="font-bold text-white">{stats.awayBias.left}%</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Central Axis:</span>
                    <span className="font-bold text-white">{stats.awayBias.center}%</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Right Flank:</span>
                    <span className="font-bold text-white">{stats.awayBias.right}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Danger Zone Penalties indicator */}
            <div className="pt-2 flex justify-between items-center border-t border-zinc-900 text-[10px] font-black uppercase">
              <span className="text-zinc-500">Aggressive Third Intrusion Rates</span>
              <span className="font-mono text-zinc-400">HM: <span className="text-emerald-500">{stats.dangerPoints.home}/m</span> | AW: <span className="text-blue-500">{stats.dangerPoints.away}/m</span></span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
