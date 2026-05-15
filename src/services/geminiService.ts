import { GoogleGenerativeAI } from "@google/generative-ai";

export interface MicroEvent {
  type: string;
  likelihood: 'High' | 'Med' | 'Low';
  reason: string;
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
  micro_events: MicroEvent[];
  reasoning_summary: string;
}

export const MODEL_ID = "gemini-2.0-flash";

// Global Gemini client configured for the frontend
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
export const ai = genAI.getGenerativeModel({ model: MODEL_ID });

export const buildMatchAnalysisPrompt = (matchData: any, h2hData: any, teamStats?: { home: any; away: any }, weather?: any, lineups?: any) => {
  const h2hSummary = h2hData ? `
Head-to-Head Stats:
Total Matches: ${h2hData.aggregates.numberOfMatches}
${matchData.homeTeam.name} Wins: ${h2hData.aggregates.homeTeam.wins}
${matchData.awayTeam.name} Wins: ${h2hData.aggregates.awayTeam.wins}
Recent Results: ${h2hData.matches?.slice(0,3).map((m: any) => `${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name}`).join(', ')}
` : "Head-to-Head data not available.";

  const statsContext = teamStats ? `
Detailed Team Statistics (Season Averages):
${matchData.homeTeam.name} (Home):
- Possession: ${teamStats.home.statistics?.possession || 'N/A'}%
- Shots/Game: ${teamStats.home.statistics?.shots || 'N/A'}
- Goals Scored: ${teamStats.home.statistics?.goalsFor || 'N/A'}
- Defensive Solidity: ${teamStats.home.statistics?.goalsAgainst || 'N/A'} (goals against)

${matchData.awayTeam.name} (Away):
- Possession: ${teamStats.away.statistics?.possession || 'N/A'}%
- Shots/Game: ${teamStats.away.statistics?.shots || 'N/A'}
- Goals Scored: ${teamStats.away.statistics?.goalsFor || 'N/A'}
- Defensive Solidity: ${teamStats.away.statistics?.goalsAgainst || 'N/A'} (goals against)
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
- Home Formation: ${lineups.homeTeam.formation}
- Away Formation: ${lineups.awayTeam.formation}
- Key Absences/Notes: Analyzed from operational roster.
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

Analytical Constraints & Directives:
1. UNBIASED CALCULATIONS: Avoid equal distributions (e.g., 33/33/33). Calculate specific edges based on input data.
2. HOME-AWAY BIAS: Explicitly factor in ${matchData.homeTeam.name}'s home dominance vs ${matchData.awayTeam.name}'s away fragility.
3. TACTICAL SYNC: Factor in possession styles and shot conversion efficiencies provided in stats.
4. ENVIRONMENTAL FRICTION: Analyze how the ${weather?.description || 'current'} weather affects match tempo and goal probability (e.g., rain slowing down counter-attacks).
5. RISK SENSITIVITY: Identify "Trap Game" scenarios where the favorite is statistically over-leveraged.

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
  "micro_events": [
    { "type": "Specific Match Event (e.g., Late Goal, Early Booking)", "likelihood": "High/Med/Low", "reason": "string" }
  ],
  "reasoning_summary": "Provide a detailed, quantitative justification for the win percentages. Mention specific stats used (possession, H2H, xG, weather) and how they influenced the final outcome."
}`;
};

export async function analyzeMatch(matchData: any, h2hData: any, teamStats?: { home: any; away: any }, weather?: any, lineups?: any): Promise<MatchAnalysis> {
  const prompt = buildMatchAnalysisPrompt(matchData, h2hData, teamStats, weather, lineups);

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Tactical node analysis failed.");
  }

  return await response.json() as MatchAnalysis;
}
