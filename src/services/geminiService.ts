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

export const buildMatchAnalysisPrompt = (matchData: any, h2hData: any) => {
  const h2hSummary = h2hData ? `
Head-to-Head Stats:
Total Matches: ${h2hData.aggregates.numberOfMatches}
${matchData.homeTeam.name} Wins: ${h2hData.aggregates.homeTeam.wins}
${matchData.awayTeam.name} Wins: ${h2hData.aggregates.awayTeam.wins}
Recent Result: ${h2hData.matches && h2hData.matches[0] ? h2hData.matches[0].homeTeam.name + ' ' + h2hData.matches[0].score.fullTime.home + '-' + h2hData.matches[0].score.fullTime.away + ' ' + h2hData.matches[0].awayTeam.name : 'N/A' }
` : "Head-to-Head data not available.";

  return `Role: Professional Tactical Analyst & Predictive RAG Systems Architect.
Task: Perform a "Weighted Intelligence Briefing" for the following engagement.

Engagement: ${matchData.homeTeam.name} vs ${matchData.awayTeam.name}
Competition: ${matchData.competition.name}
${h2hSummary}

Analytical Weighting Algorithm:
- 30% Historical RAG: Deep-time trends, league win rates, and 50-year upset frequencies.
- 50% Present Form: Last 5 matches, xG variance, and velocity of momentum.
- 20% Tactical Context: Squad rotation, fatigue index, and micro-event probability.

Output Schema (Strict JSON):
{
  "match_id": "${matchData.id}",
  "prediction": {
    "safe_side": "Team Name or Draw",
    "scoreline": "X-X",
    "win_probability": { "home": 0.0, "away": 0.0, "draw": 0.0 },
    "confidence_score": 0-100,
    "expected_goals": { "home": 0.0, "away": 0.0 },
    "btts_probability": 0.0,
    "over_2_5_probability": 0.0,
    "kelly_stake_percent": 0.0,
    "value_bet": boolean,
    "value_explanation": "string",
    "trap_game_warning": boolean,
    "trap_game_reason": "string",
    "poisson_scorelines": [{"score": "1-0", "probability": 0.15}]
  },
  "risk_assessment": {
    "level": "Low/Medium/High",
    "primary_risk": "string",
    "safety_buffer": "string",
    "fatigue_index": { "home": 0-10, "away": 0-10 }
  },
  "form_analysis": { "home": "string", "away": "string" },
  "micro_events": [
    { "type": "Red Card", "likelihood": "High/Med/Low", "reason": "string" }
  ],
  "reasoning_summary": "string"
}`;
};

export async function analyzeMatch(matchData: any, h2hData: any): Promise<MatchAnalysis> {
  const prompt = buildMatchAnalysisPrompt(matchData, h2hData);

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
