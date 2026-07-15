import { Request, Response } from "express";
import { FootballApiService } from "../services/footballApiService";
import { resolveFootballApiKey } from "../middleware/apiKeyValidator";

const footballApi = FootballApiService.getInstance();

export async function getTeamDetail(req: Request, res: Response) {
  try {
    const apiKey = resolveFootballApiKey();
    if (!apiKey) {
      return res.status(422).json({ error: "NO_DATA_AVAILABLE", detail: "Football API key required." });
    }
    const { id } = req.params;
    const data = await footballApi.fetchWithCache(
      `https://api.football-data.org/v4/teams/${id}`,
      apiKey,
      180000
    );
    res.json(data);
  } catch (err: any) {
    res.status(422).json({ error: "NO_DATA_AVAILABLE", message: err.message });
  }
}

export async function getTeamMatches(req: Request, res: Response) {
  try {
    const apiKey = resolveFootballApiKey();
    if (!apiKey) {
      return res.status(422).json({ error: "NO_DATA_AVAILABLE", detail: "Football API key required." });
    }
    const { id } = req.params;
    const { status, limit } = req.query;
    let url = `https://api.football-data.org/v4/teams/${id}/matches`;
    const qs: string[] = [];
    if (status) qs.push(`status=${status}`);
    if (limit) qs.push(`limit=${limit}`);
    if (qs.length) url += `?${qs.join("&")}`;
    const data = await footballApi.fetchWithCache(url, apiKey, 180000);
    res.json(data);
  } catch (err: any) {
    res.status(422).json({ error: "NO_DATA_AVAILABLE", message: err.message });
  }
}
