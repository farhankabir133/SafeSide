import { GoogleGenAI, Type } from "@google/genai";

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
  };
  risk_assessment: {
    level: 'Low' | 'Medium' | 'High';
    primary_risk: string;
    safety_buffer: string;
  };
  micro_events: MicroEvent[];
  reasoning_summary: string;
}

// Global Gemini client configured for the frontend
// AI Studio injects process.env.GEMINI_API_KEY at runtime for previews
export const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY as string 
});

export const MODEL_ID = "gemini-3-flash-preview";

export async function analyzeMatch(matchData: any, h2hData: any): Promise<MatchAnalysis> {
  const h2hSummary = h2hData ? `
Head-to-Head Stats:
Total Matches: ${h2hData.aggregates.numberOfMatches}
${matchData.homeTeam.name} Wins: ${h2hData.aggregates.homeTeam.wins}
${matchData.awayTeam.name} Wins: ${h2hData.aggregates.awayTeam.wins}
Recent Result: ${h2hData.matches && h2hData.matches[0] ? h2hData.matches[0].homeTeam.name + ' ' + h2hData.matches[0].score.fullTime.home + '-' + h2hData.matches[0].score.fullTime.away + ' ' + h2hData.matches[0].awayTeam.name : 'N/A' }
` : "Head-to-Head data not available.";

  const prompt = `Role: Senior Predictive Sports Analyst and Risk Manager.
Context: May 2026.

Analyze this match data and provide a "Safe Side" forecast:
Match: ${matchData.homeTeam.name} vs ${matchData.awayTeam.name}
Competition: ${matchData.competition.name}
${h2hSummary}

Logic Constraints:
- Safety First: If volatility is high, output "Low Confidence" and "No Bet".
- Expected Value: Only suggest a "Safe Side" if probability > 70%.
- Goal Lines: Always assess the likelihood of "Under 2.5 Goals" vs "Over 2.5 Goals".`;

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          match_id: { type: Type.STRING },
          prediction: {
            type: Type.OBJECT,
            properties: {
              safe_side: { type: Type.STRING },
              scoreline: { type: Type.STRING },
              win_probability: {
                type: Type.OBJECT,
                properties: {
                  home: { type: Type.NUMBER },
                  away: { type: Type.NUMBER },
                  draw: { type: Type.NUMBER }
                }
              },
              confidence_score: { type: Type.NUMBER }
            }
          },
          risk_assessment: {
            type: Type.OBJECT,
            properties: {
              level: { type: Type.STRING },
              primary_risk: { type: Type.STRING },
              safety_buffer: { type: Type.STRING }
            }
          },
          micro_events: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                likelihood: { type: Type.STRING },
                reason: { type: Type.STRING }
              }
            }
          },
          reasoning_summary: { type: Type.STRING }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    throw new Error("Failed to parse analysis result from AI.");
  }
}
