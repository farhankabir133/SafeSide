import { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { PoissonPredictor } from "../../src/services/PoissonPredictor";
import { DixonColesModel } from "../../src/services/DixonColesModel";
import { EloRatingEngine } from "../../src/services/EloRatingEngine";
import { MatchTelemetryService } from "../../src/services/matchTelemetryService";
import { OddsService } from "../../src/services/oddsService";
import { TeamFormService } from "../../src/services/teamFormService";
import { LivePersistenceService } from "../../src/services/livePersistenceService";
import { DataOriginTracker, TrackedTelemetryPayload } from "../../src/utils/dataOriginTracker";
import { MarketCalibrationService } from "../../src/services/MarketCalibrationService";
import { AnomalyDetectionService } from "../../src/services/AnomalyDetectionService";
import { ConfidenceCalibrationService, HistoricalPrediction } from "../../src/services/ConfidenceCalibrationService";
import { TacticalAiService } from "../../src/services/tacticalAiService";
import { FootballApiService } from "../services/footballApiService";
import { resolveFootballApiKey } from "../middleware/apiKeyValidator";

const matchTelemetryService = MatchTelemetryService.getInstance();
const oddsService = OddsService.getInstance();
const teamFormService = TeamFormService.getInstance();
const livePersistenceService = LivePersistenceService.getInstance();
const tracker = DataOriginTracker.getInstance();
const footballApi = FootballApiService.getInstance();

const webhookStreamState = new globalThis.Map<number, any>();

function getDeterministicTeamId(name: string, defaultId: number): number {
  if (!name) return defaultId;
  return name.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) || defaultId;
}

function buildDefaultStats() {
  return {
    possessionHome: 50, possessionAway: 50,
    shotsHome: 0, shotsAway: 0, shotsOnTargetHome: 0, shotsOnTargetAway: 0,
    cornersHome: 0, cornersAway: 0, foulsHome: 0, foulsAway: 0,
    yellowCardsHome: 0, yellowCardsAway: 0, redCardsHome: 0, redCardsAway: 0,
  };
}

export async function analyzeMatch(req: Request, res: Response) {
  let { prompt, matchTelemetry } = req.body;
  const matchId = req.body.matchId ? parseInt(req.body.matchId) : matchTelemetry?.id ? parseInt(matchTelemetry.id) : null;

  if (!matchId || isNaN(matchId)) {
    console.warn("[SafeSide AI Sanity Lock] Blocked attempt due to missing or invalid matchId.");
    return res.status(400).json({ error: "INSUFFICIENT_REAL_DATA", reason: "Analysis blocked: matchId parameter missing or corrupt." });
  }

  if (matchTelemetry) {
    const hasCompleteness =
      matchTelemetry.possessionHome !== undefined &&
      matchTelemetry.shotsHome !== undefined &&
      matchTelemetry.computedXGHome !== undefined;

    let hasValidOrigin = false;
    if (matchTelemetry.originMeta) {
      try {
        tracker.validateTracking(matchTelemetry as TrackedTelemetryPayload);
        hasValidOrigin = true;
      } catch {
        hasValidOrigin = false;
      }
    }

    if (!hasCompleteness || !hasValidOrigin) {
      console.warn("[SafeSide AI Sanity Lock] Blocked attempt to call Gemini on incomplete/unverified telemetry.");
      return res.status(422).json({ error: "INSUFFICIENT_REAL_DATA", reason: "Analysis blocked due to telemetry verification breakdown." });
    }
  } else {
    const activeState = webhookStreamState.get(matchId);
    if (activeState) {
      const liveTel = matchTelemetryService.generateTelemetry(
        matchId,
        activeState.minute || 0,
        activeState.score?.home ?? 0,
        activeState.score?.away ?? 0,
        activeState.stats || buildDefaultStats(),
        activeState.events || []
      );
      matchTelemetry = tracker.tagPayload(matchId, liveTel, "webhook", "WebhookCollectorService");
    } else {
      const dbTelemetry = await livePersistenceService.getLiveTelemetry(matchId);
      if (dbTelemetry) {
        matchTelemetry = tracker.tagPayload(matchId, dbTelemetry, "db", "DatabaseLineageService");
      } else {
        const apiKey = resolveFootballApiKey();
        if (apiKey) {
          try {
            const matchData = await footballApi.fetchWithCache(
              `https://api.football-data.org/v4/matches/${matchId}`,
              apiKey,
              15000
            );
            if (matchData) {
              const scoreHome = matchData.score?.fullTime?.home ?? 0;
              const scoreAway = matchData.score?.fullTime?.away ?? 0;
              const status = matchData.status;
              const minute = status === "FINISHED" ? 90 : 0;
              const liveTel = matchTelemetryService.generateTelemetry(
                matchId, minute, scoreHome, scoreAway, buildDefaultStats(), []
              );
              matchTelemetry = tracker.tagPayload(matchId, liveTel, "api", "ExternalFootballApiService");
            }
          } catch (err: any) {
            console.warn("[SafeSide API Query Fail] Could not fetch pre/post-match telemetry verification from external API:", err.message);
          }
        }
      }
    }

    if (!matchTelemetry) {
      console.warn("[SafeSide AI Sanity Lock] Blocked attempt: No verified telemetry source is available.");
      return res.status(422).json({ error: "INSUFFICIENT_REAL_DATA", reason: "Analysis blocked: No verified real-world telemetry available." });
    }
  }

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY environment variable is required");

    if (prompt) {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", temperature: 0.1 },
      });
      const text = result.text;
      if (!text) throw new Error("Empty AI response returned");
      return res.json(JSON.parse(text));
    }

    let homeTeamName = "Home Team";
    let awayTeamName = "Away Team";
    let competitionCode = "PL";
    let competitionName = "Premier League";
    let scoreStr = "0-0";
    let matchDate = new Date().toISOString();

    const activeWebhook = webhookStreamState.get(matchId);
    if (activeWebhook) {
      homeTeamName = activeWebhook.homeTeam?.name || homeTeamName;
      awayTeamName = activeWebhook.awayTeam?.name || awayTeamName;
      competitionName = activeWebhook.competition || competitionName;
      scoreStr = `${activeWebhook.score?.home ?? 0}-${activeWebhook.score?.away ?? 0}`;
    } else {
      const apiKey = resolveFootballApiKey();
      if (apiKey) {
        try {
          const matchData = await footballApi.fetchWithCache(
            `https://api.football-data.org/v4/matches/${matchId}`,
            apiKey,
            15000
          );
          if (matchData) {
            homeTeamName = matchData.homeTeam?.name || homeTeamName;
            awayTeamName = matchData.awayTeam?.name || awayTeamName;
            competitionCode = matchData.competition?.code || competitionCode;
            competitionName = matchData.competition?.name || competitionName;
            scoreStr = `${matchData.score?.fullTime?.home ?? 0}-${matchData.score?.fullTime?.away ?? 0}`;
            matchDate = matchData.utcDate || matchDate;
          }
        } catch (err: any) {
          console.warn("[SafeSide API Resolve Info Fail] fallback info match:", err.message);
        }
      }
    }

    let historicalMatches: any[] = [];
    try {
      for (const [_key, cachedVal] of footballApi["cache"].entries() || []) {
        if (cachedVal?.data && Array.isArray(cachedVal.data.matches)) {
          historicalMatches = cachedVal.data.matches;
          break;
        }
      }
      if (historicalMatches.length === 0 && process.env.FOOTBALL_API_KEY) {
        const apiData = await footballApi.fetchWithCache(
          "https://api.football-data.org/v4/matches",
          process.env.FOOTBALL_API_KEY,
          300000
        );
        if (apiData?.matches) {
          historicalMatches = apiData.matches;
        }
      }
    } catch (e) {
      console.warn("[SafeSide Dixon-Coles] Dynamic historical data loading error:", e);
    }

    const homeTeamId = getDeterministicTeamId(homeTeamName, 1);
    const awayTeamId = getDeterministicTeamId(awayTeamName, 2);

    if (historicalMatches.length > 0) {
      try {
        EloRatingEngine.getInstance().recalculateHistoricalRatings(historicalMatches);
      } catch (eloErr) {
        console.warn("[SafeSide Elo Engine] Dynamic rating update error:", eloErr);
      }
    }

    const homeProfile = teamFormService.getTeamProfile(homeTeamId);
    const awayProfile = teamFormService.getTeamProfile(awayTeamId);

    const homeAttack = homeProfile.goalsScoredAvg5Matches / 1.45;
    const homeDefense = homeProfile.goalsConcededAvg5Matches / 1.18;
    const awayAttack = awayProfile.goalsScoredAvg5Matches / 1.45;
    const awayDefense = awayProfile.goalsConcededAvg5Matches / 1.18;

    const currentOdds = { home: 2.10, draw: 3.30, away: 3.80 };

    const poissonForecast = PoissonPredictor.generateForecast(
      homeAttack, homeDefense, awayAttack, awayDefense, 1.45, 1.18, currentOdds
    );
    const dcForecast = DixonColesModel.getInstance().generateForecast(
      homeTeamId, awayTeamId, homeTeamName, awayTeamName, historicalMatches, currentOdds
    );

    const marketSummary = MarketCalibrationService.getInstance().calibrateAndAnalyze(
      matchId, poissonForecast, currentOdds, [], competitionCode
    );

    const uncalibratedTelemetry = matchTelemetry.data || matchTelemetry;
    const anomalyReport = AnomalyDetectionService.getInstance().analyzeMatchAnomaly(
      matchId,
      {
        minute: uncalibratedTelemetry.minute || 0,
        homeGoals: uncalibratedTelemetry.homeGoals || 0,
        awayGoals: uncalibratedTelemetry.awayGoals || 0,
        homeShots: uncalibratedTelemetry.shotsHome || 0,
        awayShots: uncalibratedTelemetry.shotsAway || 0,
        homeShotsOnTarget: uncalibratedTelemetry.shotsOnTargetHome || 0,
        awayShotsOnTarget: uncalibratedTelemetry.shotsOnTargetAway || 0,
        homePossession: (uncalibratedTelemetry.possessionHome || 50) / 100,
        awayPossession: (uncalibratedTelemetry.possessionAway || 50) / 100,
        homeRedCards: uncalibratedTelemetry.redCardsHome || 0,
        awayRedCards: uncalibratedTelemetry.redCardsAway || 0,
        homeXG: uncalibratedTelemetry.computedXGHome || 0,
        awayXG: uncalibratedTelemetry.computedXGAway || 0,
      },
      {
        openingOdds: { home: currentOdds.home * 1.05, draw: currentOdds.draw, away: currentOdds.away * 0.95 },
        currentOdds,
      },
      {
        homeLeaguePosition: 5,
        awayLeaguePosition: 8,
        homeFormTrend: homeProfile.goalsScoredAvg5Matches - homeProfile.goalsConcededAvg5Matches,
        awayFormTrend: awayProfile.goalsScoredAvg5Matches - awayProfile.goalsConcededAvg5Matches,
        h2hTotalMatches: 10,
        h2hHomeWins: 4,
        h2hAwayWins: 3,
      },
      {
        homeSubstitutionsCount: 0,
        awaySubstitutionsCount: 0,
        homeFormationChanged: false,
        awayFormationChanged: false,
        homeRestDays: 4,
        awayRestDays: 4,
      }
    );

    const historicalPredictions: HistoricalPrediction[] = [];
    const calibrationResult = ConfidenceCalibrationService.getInstance().calibratePrediction(
      matchId, poissonForecast, historicalPredictions
    );

    const quantitativePrompt = TacticalAiService.getInstance().buildQuantitativePrompt(
      { homeTeam: homeTeamName, awayTeam: awayTeamName, competition: competitionName, score: scoreStr },
      {
        matchId,
        minute: uncalibratedTelemetry.minute || 0,
        possessionHome: uncalibratedTelemetry.possessionHome || 50,
        possessionAway: uncalibratedTelemetry.possessionAway || 50,
        shotsHome: uncalibratedTelemetry.shotsHome || 0,
        shotsAway: uncalibratedTelemetry.shotsAway || 0,
        shotsOnTargetHome: uncalibratedTelemetry.shotsOnTargetHome || 0,
        shotsOnTargetAway: uncalibratedTelemetry.shotsOnTargetAway || 0,
        cornersHome: uncalibratedTelemetry.cornersHome || 0,
        cornersAway: uncalibratedTelemetry.cornersAway || 0,
        foulsHome: uncalibratedTelemetry.foulsHome || 0,
        foulsAway: uncalibratedTelemetry.foulsAway || 0,
        yellowCardsHome: uncalibratedTelemetry.yellowCardsHome || 0,
        yellowCardsAway: uncalibratedTelemetry.yellowCardsAway || 0,
        redCardsHome: uncalibratedTelemetry.redCardsHome || 0,
        redCardsAway: uncalibratedTelemetry.redCardsAway || 0,
        computedXGHome: uncalibratedTelemetry.computedXGHome || 0,
        computedXGAway: uncalibratedTelemetry.computedXGAway || 0,
        momentumIndex: uncalibratedTelemetry.momentumIndex || 0,
        momentumHistory: uncalibratedTelemetry.momentumHistory || [],
        xgHistory: uncalibratedTelemetry.xgHistory || [],
        events: uncalibratedTelemetry.events || [],
      },
      poissonForecast,
      dcForecast,
      marketSummary,
      anomalyReport,
      calibrationResult
    );

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const mainResult = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: quantitativePrompt }] }],
      config: { responseMimeType: "application/json", temperature: 0.1 },
    });

    const aiText = mainResult.text;
    if (!aiText) throw new Error("Empty AI response returned");

    const parsedReasoning = TacticalAiService.getInstance().parseQuantitativeAnalysis(aiText);

    res.json({
      matchId,
      poissonForecast,
      dcForecast,
      marketSummary,
      anomalyReport,
      calibrationResult,
      quantitativeReasoning: parsedReasoning,
      originMeta: matchTelemetry.originMeta,
    });
  } catch (err: any) {
    console.error("[SafeSide AI Proxy] error during quantitative pass:", err);
    res.status(422).json({ error: "Oracle connection link failure.", reason: err.message });
  }
}
