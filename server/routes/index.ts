import { Router, Request, Response } from "express";
import liveRoutes from "./live";
import matchRoutes from "./matches";
import leagueRoutes from "./leagues";
import teamRoutes from "./teams";
import analyzeRoutes from "./analyze";
import aiRoutes from "./ai";
import weatherRoutes from "./weather";
import worldCupRoutes from "./worldCup";
import lineupsRoutes from "./lineups";
import adminRoutes from "./admin";
import { getMatchOdds } from "../controllers/lineupsController";

export default function registerRoutes(app: Router) {
  app.use("/api/live-stream", liveRoutes);
  app.use("/api/webhooks", liveRoutes);
  app.use("/api/matches", matchRoutes);
  app.use("/api/matches", lineupsRoutes);
  app.use("/api/leagues", leagueRoutes);
  app.use("/api/teams", teamRoutes);
  app.use("/api/analyze", analyzeRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/weather", weatherRoutes);
  app.use("/api/world-cup-fixtures", worldCupRoutes);
  app.use("/api/admin", adminRoutes);
  app.get("/api/odds/:matchId", getMatchOdds);
}
