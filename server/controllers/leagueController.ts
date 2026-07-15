import { Request, Response } from "express";
import { FootballApiService } from "../services/footballApiService";
import { resolveFootballApiKey } from "../middleware/apiKeyValidator";

const footballApi = FootballApiService.getInstance();

export async function getLeagueStandings(req: Request, res: Response) {
  try {
    const apiKey = resolveFootballApiKey();
    if (!apiKey) {
      return res.status(422).json({ error: "NO_DATA_AVAILABLE", detail: "Football API key required." });
    }
    const { id } = req.params;
    const data = await footballApi.fetchWithCache(
      `https://api.football-data.org/v4/competitions/${id}/standings`,
      apiKey,
      180000
    );
    res.json(data);
  } catch (err: any) {
    res.status(422).json({ error: "NO_DATA_AVAILABLE", message: err.message });
  }
}

export async function getLeagueScorers(req: Request, res: Response) {
  try {
    const apiKey = resolveFootballApiKey();
    if (!apiKey) {
      return res.status(422).json({ error: "NO_DATA_AVAILABLE", detail: "Football API key required." });
    }
    const { id } = req.params;
    const data = await footballApi.fetchWithCache(
      `https://api.football-data.org/v4/competitions/${id}/scorers`,
      apiKey,
      180000
    );
    res.json(data);
  } catch (err: any) {
    res.status(422).json({ error: "NO_DATA_AVAILABLE", message: err.message });
  }
}
