import { Request, Response } from "express";
import { FootballApiService } from "../services/footballApiService";
import { resolveFootballApiKey } from "../middleware/apiKeyValidator";

const footballApi = FootballApiService.getInstance();

export async function getWorldCupFixtures(req: Request, res: Response) {
  try {
    const apiKey = resolveFootballApiKey();
    if (apiKey) {
      try {
        const data = await footballApi.fetchWithCache(
          "https://api.football-data.org/v4/matches?competitions=2229",
          apiKey,
          180000
        );
        if (data && data.matches && data.matches.length > 0) {
          return res.json({ matches: data.matches, source: "api" });
        }
      } catch (apiErr: any) {
        console.warn("[World Cup API] fallback to static data:", apiErr.message);
      }
    }

    const { generateWorldCupFallback } = await import("../../src/services/worldCupData");
    const fallback = generateWorldCupFallback();
    res.json({ matches: fallback, source: "static" });
  } catch (err: any) {
    res.status(422).json({ error: "NO_DATA_AVAILABLE", message: err.message });
  }
}
