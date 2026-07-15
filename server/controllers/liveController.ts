import { Request, Response } from "express";
import { MatchTelemetryService } from "../../src/services/matchTelemetryService";
import { OddsService } from "../../src/services/oddsService";
import { TeamFormService } from "../../src/services/teamFormService";
import { LivePersistenceService } from "../../src/services/livePersistenceService";
import { DataOriginTracker, TrackedTelemetryPayload } from "../../src/utils/dataOriginTracker";
import { DixonColesModel } from "../../src/services/DixonColesModel";
import { EloRatingEngine } from "../../src/services/EloRatingEngine";
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
import { EventEmitter } from "events";
const matchEmitter = new EventEmitter();
matchEmitter.setMaxListeners(250);

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

export async function streamLiveMatch(req: Request, res: Response) {
  const matchIdStr = req.query.matchId;
  const matchId = matchIdStr ? parseInt(String(matchIdStr)) : null;

  if (!matchId || isNaN(matchId)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "INVALID_MATCH_ID" }));
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const heartbeat = setInterval(() => {
    res.write("event: ping\ndata: \n\n");
  }, 10000);

  let homeForm, awayForm;
  try {
    homeForm = teamFormService.getTeamProfile(1);
    awayForm = teamFormService.getTeamProfile(2);
  } catch {
    homeForm = null;
    awayForm = null;
  }

  const activeWebhookState = webhookStreamState.get(matchId);
  let initialTelemetry: any = null;
  let initialTagged: TrackedTelemetryPayload | null = null;
  let homeTeamInfo = { name: "Home Team", crest: "" };
  let awayTeamInfo = { name: "Away Team", crest: "" };
  let competitionName = "Live Match";
  let scoreInfo = { home: 0, away: 0 };
  let currentMinute = 0;

  if (activeWebhookState) {
    initialTelemetry = matchTelemetryService.generateTelemetry(
      matchId,
      activeWebhookState.minute || 0,
      activeWebhookState.score?.home ?? 0,
      activeWebhookState.score?.away ?? 0,
      activeWebhookState.stats || buildDefaultStats(),
      activeWebhookState.events || []
    );
    initialTagged = tracker.tagPayload(matchId, initialTelemetry, "webhook", "WebhookCollectorService");
    homeTeamInfo = activeWebhookState.homeTeam || homeTeamInfo;
    awayTeamInfo = activeWebhookState.awayTeam || awayTeamInfo;
    competitionName = activeWebhookState.competition || competitionName;
    scoreInfo = activeWebhookState.score || scoreInfo;
    currentMinute = activeWebhookState.minute || 0;
  } else {
    const apiKey = resolveFootballApiKey();
    if (apiKey) {
      try {
        const apiMatchData = await footballApi.fetchWithCache(
          `https://api.football-data.org/v4/matches/${matchId}`,
          apiKey,
          15000
        );
        if (apiMatchData) {
          homeTeamInfo = { name: apiMatchData.homeTeam?.name || "Home Team", crest: apiMatchData.homeTeam?.crest || "" };
          awayTeamInfo = { name: apiMatchData.awayTeam?.name || "Away Team", crest: apiMatchData.awayTeam?.crest || "" };
          competitionName = apiMatchData.competition?.name || "League Match";
          scoreInfo = {
            home: apiMatchData.score?.fullTime?.home ?? 0,
            away: apiMatchData.score?.fullTime?.away ?? 0,
          };
          if (apiMatchData.status === "IN_PLAY" && apiMatchData.utcDate) {
            currentMinute = Math.min(95, Math.floor((Date.now() - new Date(apiMatchData.utcDate).getTime()) / 60000));
          }
          initialTelemetry = matchTelemetryService.generateTelemetry(
            matchId, currentMinute, scoreInfo.home, scoreInfo.away, buildDefaultStats(), []
          );
          await livePersistenceService.saveLiveTelemetry(matchId, initialTelemetry);
          initialTagged = tracker.tagPayload(matchId, initialTelemetry, "api", "LiveFootballApiPoller");
        }
      } catch (err: any) {
        console.warn(`[SafeSide SSE API Poll Fail] Error retrieving match details for streaming: ${err.message}`);
      }
    }

    if (!initialTelemetry && !initialTagged) {
      try {
        const dbTelemetry = await livePersistenceService.getLiveTelemetry(matchId);
        if (dbTelemetry) {
          initialTelemetry = dbTelemetry;
          initialTagged = tracker.tagPayload(matchId, dbTelemetry, "db", "DatabaseLineageService");
          let homeG = 0, awayG = 0;
          if (dbTelemetry.events && dbTelemetry.events.length > 0) {
            dbTelemetry.events.forEach((g: any) => {
              if (g.type === "goal") {
                if (g.team === "home") homeG++;
                else awayG++;
              }
            });
          }
          scoreInfo = { home: homeG, away: awayG };
          currentMinute = dbTelemetry.minute;
        }
      } catch (dbErr: any) {
        console.warn(`[SafeSide SSE DB Read Fail] Error retrieving match details from DB: ${dbErr.message}`);
      }
    }
  }

  if (!initialTagged || !initialTelemetry) {
    res.write(
      `data: ${JSON.stringify({ error: "NO_DATA_AVAILABLE", detail: "No telemetry stream or API polling details are available for this match ID. Live fallback or mock simulation is strictly locked out." })}\n\n`
    );
    clearInterval(heartbeat);
    res.end();
    return;
  }

  const strength = homeForm && awayForm ? teamFormService.evaluateStrengthCoefficients(homeForm, awayForm) : null;

  const forecasts = strength
    ? DixonColesModel.getInstance().generateForecast(
        getDeterministicTeamId(homeTeamInfo.name, 1),
        getDeterministicTeamId(awayTeamInfo.name, 2),
        homeTeamInfo.name,
        awayTeamInfo.name,
        [],
        { home: 1.95, draw: 3.40, away: 4.10 }
      )
    : null;

  const mergedPayload: any = {
    id: matchId,
    homeTeam: homeTeamInfo,
    awayTeam: awayTeamInfo,
    competition: competitionName,
    minute: currentMinute,
    score: scoreInfo,
    possession: { home: initialTelemetry.possessionHome, away: initialTelemetry.possessionAway },
    shots: { home: initialTelemetry.shotsHome, away: initialTelemetry.shotsAway },
    shotsOnTarget: { home: initialTelemetry.shotsOnTargetHome, away: initialTelemetry.shotsOnTargetAway },
    corners: { home: initialTelemetry.cornersHome, away: initialTelemetry.cornersAway },
    fouls: { home: initialTelemetry.foulsHome, away: initialTelemetry.foulsAway },
    yellowCards: { home: initialTelemetry.yellowCardsHome, away: initialTelemetry.yellowCardsAway },
    redCards: { home: initialTelemetry.redCardsHome, away: initialTelemetry.redCardsAway },
    probabilities: forecasts
      ? {
          home: forecasts.homeWinProb,
          draw: forecasts.drawProb,
          away: forecasts.awayWinProb,
          over25: forecasts.over25Prob,
          under25: 100 - forecasts.over25Prob,
        }
      : { home: 33, draw: 33, away: 34, over25: 50, under25: 50 },
    timeline: initialTelemetry.events,
    originMeta: initialTagged.originMeta,
  };

  res.write(`data: ${JSON.stringify(mergedPayload)}\n\n`);

  const onMatchUpdate = (tracked: TrackedTelemetryPayload) => {
    try {
      tracker.validateTracking(tracked);
    } catch (validationErr: any) {
      console.error("[SafeSide SSE Broadcast Blocked] Missing/invalid telemetry origin credentials:", validationErr.message);
      return;
    }

    const update = tracked.data;
    const livePayload = {
      ...mergedPayload,
      minute: update.minute,
      possession: { home: update.possessionHome, away: update.possessionAway },
      shots: { home: update.shotsHome, away: update.shotsAway },
      shotsOnTarget: { home: update.shotsOnTargetHome, away: update.shotsOnTargetAway },
      corners: { home: update.cornersHome, away: update.cornersAway },
      yellowCards: { home: update.yellowCardsHome, away: update.yellowCardsAway },
      timeline: update.events,
      originMeta: tracked.originMeta,
    };
    res.write(`data: ${JSON.stringify(livePayload)}\n\n`);
  };

  matchEmitter.on(`update_${matchId}`, onMatchUpdate);

  req.on("close", () => {
    clearInterval(heartbeat);
    matchEmitter.removeListener(`update_${matchId}`, onMatchUpdate);
  });
}

export async function ingestWebhook(req: Request, res: Response) {
  const {
    matchId, eventType, team, minute, message, score, stats, homeTeam, awayTeam, competition,
  } = req.body;

  if (!matchId) {
    return res.status(400).json({ error: "Missing matchId parameter" });
  }

  const key = parseInt(String(matchId));
  const existing = webhookStreamState.get(key) || {
    minute: 0,
    score: { home: 0, away: 0 },
    stats: buildDefaultStats(),
    events: [],
    homeTeam, awayTeam, competition,
  };

  if (minute !== undefined) existing.minute = minute;
  if (score !== undefined) existing.score = score;
  if (stats !== undefined) existing.stats = stats;
  if (homeTeam !== undefined) existing.homeTeam = homeTeam;
  if (competition !== undefined) existing.competition = competition;

  if (eventType && message) {
    existing.events.push({ minute: minute || 0, type: eventType, team: team || "home", message });
  }

  webhookStreamState.set(key, existing);

  const telemetry = matchTelemetryService.generateTelemetry(
    key, existing.minute, existing.score.home, existing.score.away, existing.stats, existing.events
  );
  await livePersistenceService.saveLiveTelemetry(key, telemetry);
  const tagged = tracker.tagPayload(key, telemetry, "webhook", "WebhookIngestPipeline");
  matchEmitter.emit(`update_${key}`, tagged);
  res.json({ status: "processed", received: Date.now(), originMeta: tagged.originMeta });
}

export { webhookStreamState, matchEmitter };
