import { Request, Response } from "express";

export async function getMatchLineups(req: Request, res: Response) {
  res.status(422).json({
    error: "NO_DATA_AVAILABLE",
    message: "Lineups telemetry must be ingested from real-world telemetry sources.",
  });
}

export async function getMatchOdds(req: Request, res: Response) {
  res.status(422).json({
    error: "NO_DATA_AVAILABLE",
    message: "Odds feeds must be parsed from live market feeds or real telemetries.",
  });
}
