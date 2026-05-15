
export interface MicroEvent {
  type: string;
  likelihood: 'High' | 'Med' | 'Low';
  reason: string;
}

export interface OddEntry {
  bookmaker: string;
  home_win: number;
  draw: number;
  away_win: number;
  market_movement?: 'up' | 'down' | 'stable';
}

export interface MatchAnalysis {
  match_id: string;
  prediction: {
    safe_side: string;
    scoreline: string;
    win_probability: { home: number; away: number; draw: number };
    confidence_score: number;
    expected_goals?: { home: number; away: number };
    btts_probability?: number;
    over_2_5_probability?: number;
    kelly_stake_percent?: number;
    value_bet?: boolean;
    value_explanation?: string;
    trap_game_warning?: boolean;
    trap_game_reason?: string;
    poisson_scorelines?: Array<{ score: string; probability: number }>;
  };
  risk_assessment: {
    level: 'Low' | 'Medium' | 'High';
    primary_risk: string;
    safety_buffer: string;
    fatigue_index?: { home: number; away: number };
  };
  form_analysis?: { home: string; away: string };
  predicted_lineups?: {
    home: {
      formation: string;
      starting_xi: Array<{ name: string; position: string; is_key_player?: boolean }>;
    };
    away: {
      formation: string;
      starting_xi: Array<{ name: string; position: string; is_key_player?: boolean }>;
    };
  };
  odds_data?: OddEntry[];
  micro_events: MicroEvent[];
  reasoning_summary: string;
}

export const MODEL_ID = "gemini-2.0-flash";

/**
 * Generic AI generation call via server proxy
 */
export async function generateAIContent(prompt: string): Promise<string> {
  const response = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error("Neural link unstable. System recalibrating.");
    }
    
    if (errorData.isQuotaExceeded) {
      throw new Error(JSON.stringify(errorData));
    }
    
    throw new Error(errorData.error || "Tactical communication failure.");
  }

  const data = await response.json();
  return data.text;
}

/**
 * Parses a potential JSON error string into a readable format.
 */
export function formatAIError(error: any): string {
  const message = error instanceof Error ? error.message : String(error);
  
  try {
    const jsonMatch = message.match(/\{.*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      if (data.error) return data.error;
    }
  } catch (e) {}

  if (message.includes("429") || message.includes("quota")) {
    return "Intelligence Node cooling down. Too many requests.";
  }
  
  if (message.includes("fetch")) {
    return "Neural link timeout. Check connection.";
  }

  return message;
}

/**
 * Chat with AI via server proxy
 */
export async function chatAI(message: string, history: any[]): Promise<string> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history })
  });

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error("Neural link unstable. System recalibrating.");
    }
    
    if (errorData.isQuotaExceeded) {
      throw new Error(JSON.stringify(errorData));
    }
    
    throw new Error(errorData.error || "Tactical communication failure.");
  }

  const data = await response.json();
  return data.text;
}

export const buildMatchAnalysisPrompt = (matchData: any, h2hData: any, teamStats?: { home: any; away: any }, weather?: any, lineups?: any, oddsData?: any) => {
  const h2hSummary = h2hData ? `
Head-to-Head Stats:
Total Matches: ${h2hData.aggregates.numberOfMatches}
${matchData.homeTeam.name} Wins: ${h2hData.aggregates.homeTeam.wins}
${matchData.awayTeam.name} Wins: ${h2hData.aggregates.awayTeam.wins}
Recent Results: ${h2hData.matches?.slice(0,3).map((m: any) => `${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name}`).join(', ')}
` : "Head-to-Head data not available.";

  const statsContext = teamStats ? `
Detailed Team Statistics (Season Averages) & Recent Form:
${matchData.homeTeam.name} (Home):
- Possession: ${teamStats.home.statistics?.possession || 'N/A'}%
- Shots/Game: ${teamStats.home.statistics?.shots || 'N/A'}
- Goals Scored: ${teamStats.home.statistics?.goalsFor || 'N/A'}
- Defensive Solidity: ${teamStats.home.statistics?.goalsAgainst || 'N/A'} (goals against)
- Recent Results (Last 5): ${teamStats.home.recentMatches?.map((m: any) => {
    const isHome = m.homeTeam.id === matchData.homeTeam.id;
    const score = m.score.fullTime;
    const result = (score.home === score.away) ? 'D' : ((isHome && score.home > score.away) || (!isHome && score.away > score.home)) ? 'W' : 'L';
    return `${result} (${score.home}-${score.away} vs ${isHome ? m.awayTeam.name : m.homeTeam.name})`;
  }).join(', ') || 'N/A'}

${matchData.awayTeam.name} (Away):
- Possession: ${teamStats.away.statistics?.possession || 'N/A'}%
- Shots/Game: ${teamStats.away.statistics?.shots || 'N/A'}
- Goals Scored: ${teamStats.away.statistics?.goalsFor || 'N/A'}
- Defensive Solidity: ${teamStats.away.statistics?.goalsAgainst || 'N/A'} (goals against)
- Recent Results (Last 5): ${teamStats.away.recentMatches?.map((m: any) => {
    const isHome = m.homeTeam.id === matchData.awayTeam.id;
    const score = m.score.fullTime;
    const result = (score.home === score.away) ? 'D' : ((isHome && score.home > score.away) || (!isHome && score.away > score.home)) ? 'W' : 'L';
    return `${result} (${score.home}-${score.away} vs ${isHome ? m.awayTeam.name : m.homeTeam.name})`;
  }).join(', ') || 'N/A'}
` : "";

  const environmentContext = weather ? `
Environmental Factors:
- Temperature: ${weather.temp}°C
- Description: ${weather.description}
- Wind: ${weather.windSpeed} km/h ${weather.windDirection}
- Tactical Impact Level: ${weather.impact}
` : "";

  const lineupContext = lineups ? `
Lineup Intelligence:
- Home Formation: ${lineups.homeTeam?.formation || 'Standard'}
- Away Formation: ${lineups.awayTeam?.formation || 'Standard'}
- Key Absences/Notes: Analyzed from operational roster.
` : "";

  const oddsContext = oddsData ? `
Market Odds Context:
${oddsData.bookmakers?.map((b: any) => `- ${b.name}: Home(${b.markets.h2h.home}), Draw(${b.markets.h2h.draw}), Away(${b.markets.h2h.away})`).join('\n') || 'N/A'}
` : "";

  return `Role: Senior Quantitative Sports Analyst & Predictive Mathematical Modeler.
Task: Execute a "High-Fidelity Strategic Forecast" using a multi-layered Bayesian weighting engine.

Engagement Context:
Fixture: ${matchData.homeTeam.name} vs ${matchData.awayTeam.name}
Competition: ${matchData.competition.name}
Venue: ${matchData.venue} (Home advantage weighting: active)

${h2hSummary}
${statsContext}
${environmentContext}
${lineupContext}
${oddsContext}

Analytical Constraints & Directives:
1. UNBIASED CALCULATIONS: Avoid equal distributions (e.g., 33/33/33). Calculate specific edges based on input data.
2. HOME-AWAY BIAS: Explicitly factor in ${matchData.homeTeam.name}'s home dominance vs ${matchData.awayTeam.name}'s away fragility.
3. TACTICAL SYNC: Factor in possession styles and shot conversion efficiencies provided in stats.
4. ENVIRONMENTAL FRICTION: Analyze how the ${weather?.description || 'current'} weather affects match tempo and goal probability (e.g., rain slowing down counter-attacks).
5. RISK SENSITIVITY: Identify "Trap Game" scenarios where the favorite is statistically over-leveraged.
6. VALUE IDENTIFICATION: Use the Market Odds Context to determine if the win probabilities suggest a "Value Bet".

Output Schema (Strict JSON):
{
  "match_id": "${matchData.id}",
  "prediction": {
    "safe_side": "Team Name or Draw (The statistically safest outcome)",
    "scoreline": "X-X",
    "win_probability": { "home": 0.0, "away": 0.0, "draw": 0.0 }, (Values MUST sum to 100.0)
    "confidence_score": 0-100,
    "expected_goals": { "home": 0.0, "away": 0.0 },
    "btts_probability": 0.0,
    "over_2_5_probability": 0.0,
    "kelly_stake_percent": 0.0,
    "value_bet": boolean,
    "value_explanation": "string describing the quantitative edge found",
    "trap_game_warning": boolean,
    "trap_game_reason": "string (mandatory if warning is true)",
    "poisson_scorelines": [{"score": "1-0", "probability": 0.15}]
  },
  "risk_assessment": {
    "level": "Low/Medium/High",
    "primary_risk": "Specific tactical or environmental threat",
    "safety_buffer": "How to hedge this prediction",
    "fatigue_index": { "home": 0-10, "away": 0-10 }
  },
  "form_analysis": { "home": "Brief tactical form summary", "away": "Brief tactical form summary" },
  "predicted_lineups": {
    "home": {
      "formation": "4-3-3",
      "starting_xi": [
        { "name": "Player Name", "position": "GK", "is_key_player": false }
      ]
    },
    "away": {
      "formation": "4-2-3-1",
      "starting_xi": [
        { "name": "Player Name", "position": "GK", "is_key_player": false }
      ]
    }
  },
  "odds_data": [
    { "bookmaker": "Bet365", "home_win": 1.95, "draw": 3.40, "away_win": 4.10, "market_movement": "up" },
    { "bookmaker": "Pinnacle", "home_win": 1.98, "draw": 3.45, "away_win": 4.15, "market_movement": "down" }
  ],
  "micro_events": [
    { "type": "Specific Match Event (e.g., Late Goal, Early Booking)", "likelihood": "High/Med/Low", "reason": "string" }
  ],
  "reasoning_summary": "Provide a detailed, quantitative justification for the win percentages. Mention specific stats used (possession, H2H, xG, weather) and how they influenced the final outcome."
}`;
};

export async function analyzeMatch(matchData: any, h2hData: any, teamStats?: { home: any; away: any }, weather?: any, lineups?: any, oddsData?: any): Promise<MatchAnalysis> {
  const prompt = buildMatchAnalysisPrompt(matchData, h2hData, teamStats, weather, lineups, oddsData);

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return await response.json() as MatchAnalysis;
}
