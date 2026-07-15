import { Request, Response } from "express";
import { FootballApiService } from "../services/footballApiService";
import { resolveFootballApiKey } from "../middleware/apiKeyValidator";

const footballApi = FootballApiService.getInstance();

export async function getMatches(req: Request, res: Response) {
  try {
    const apiKey = resolveFootballApiKey();
    if (!apiKey) {
      return res.status(422).json({
        error: "NO_DATA_AVAILABLE",
        detail: "FOOTBALL_API_KEY is verify-locked out.",
      });
    }
    const data = await footballApi.fetchWithCache(
      "https://api.football-data.org/v4/matches",
      apiKey,
      180000
    );
    res.json(data);
  } catch (err: any) {
    res.status(422).json({ error: "NO_DATA_AVAILABLE", message: err.message });
  }
}

export async function getMatchDetail(req: Request, res: Response) {
  try {
    const apiKey = resolveFootballApiKey();
    if (!apiKey) {
      return res.status(422).json({ error: "NO_DATA_AVAILABLE", detail: "Football API key required." });
    }
    const { id } = req.params;
    const data = await footballApi.fetchWithCache(
      `https://api.football-data.org/v4/matches/${id}`,
      apiKey,
      15000
    );
    res.json(data);
  } catch (err: any) {
    res.status(422).json({ error: "NO_DATA_AVAILABLE", message: err.message });
  }
}

export async function getMatchHeadToHead(req: Request, res: Response) {
  try {
    const apiKey = resolveFootballApiKey();
    if (!apiKey) {
      return res.status(422).json({ error: "NO_DATA_AVAILABLE", detail: "Football API key required." });
    }
    const { id } = req.params;
    const data = await footballApi.fetchWithCache(
      `https://api.football-data.org/v4/matches/${id}/head2head`,
      apiKey,
      180000
    );
    res.json(data);
  } catch (err: any) {
    res.status(422).json({ error: "NO_DATA_AVAILABLE", message: err.message });
  }
}
