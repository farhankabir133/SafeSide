import { Match } from "../types";
import { OddsMarket } from "./oddsService";

export interface LiveTelemetryInput {
  minute: number;
  homeGoals: number;
  awayGoals: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homePossession: number; // e.g. 0.55 for 55%
  awayPossession: number;
  homeRedCards: number;
  awayRedCards: number;
  homeXG: number;
  awayXG: number;
}

export interface OddsMovementInput {
  openingOdds: OddsMarket;
  currentOdds: OddsMarket;
}

export interface HistoricalTrendsInput {
  homeLeaguePosition: number;
  awayLeaguePosition: number;
  homeFormTrend: number; // Rating indicator: positive representing strong run
  awayFormTrend: number;
  h2hTotalMatches: number;
  h2hHomeWins: number;
  h2hAwayWins: number;
}

export interface TacticalShiftsInput {
  homeSubstitutionsCount: number;
  awaySubstitutionsCount: number;
  homeFormationChanged: boolean;
  awayFormationChanged: boolean;
  homeRestDays: number;
  awayRestDays: number;
}

export interface AnomalyReport {
  matchId: number;
  anomalySeverityScore: number; // 0 to 100
  volatilityIndex: number;      // 0 to 100
  upsetProbability: number;     // 0 to 100
  tacticalInstability: {
    homeCollapseRisk: boolean;
    awayCollapseRisk: boolean;
    overreactionDetected: boolean;
    trapGameAlert: boolean;
    redCardAsymmetryIndex: number;
    momentumDelta: number;
    triggers: string[];
  };
}

export class AnomalyDetectionService {
  private static instance: AnomalyDetectionService;

  private constructor() {}

  public static getInstance(): AnomalyDetectionService {
    if (!AnomalyDetectionService.instance) {
      AnomalyDetectionService.instance = new AnomalyDetectionService();
    }
    return AnomalyDetectionService.instance;
  }

  /**
   * Helper to perform standard bookmaker odds implied probability transformation
   */
  private getImpliedProbabilities(odds: OddsMarket): { home: number; draw: number; away: number } {
    const rawHome = odds.home > 0 ? 1 / odds.home : 0;
    const rawDraw = odds.draw > 0 ? 1 / odds.draw : 0;
    const rawAway = odds.away > 0 ? 1 / odds.away : 0;
    const sum = rawHome + rawDraw + rawAway || 1.0;
    return {
      home: rawHome / sum,
      draw: rawDraw / sum,
      away: rawAway / sum
    };
  }

  /**
   * Evaluates the active tactical momentum delta of the match using shots, possession, and xG.
   * Leverages exponential weight based on current minutes to avoid early-game outlier sensitivity.
   */
  private calculateMomentumDelta(telemetry: LiveTelemetryInput): number {
    const shotsDelta = (telemetry.homeShotsOnTarget * 1.5 + telemetry.homeShots * 0.5) - 
                       (telemetry.awayShotsOnTarget * 1.5 + telemetry.awayShots * 0.5);
    const possessionDelta = (telemetry.homePossession - telemetry.awayPossession) * 10;
    const xGDelta = (telemetry.homeXG - telemetry.awayXG) * 5;

    const rawDelta = shotsDelta * 0.4 + possessionDelta * 0.3 + xGDelta * 0.3;
    
    // Scale down early minutes to avoid extreme noise (min 15 mins for full momentum impact)
    const temporalScale = Math.min(1.0, telemetry.minute / 15);
    return rawDelta * temporalScale;
  }

  /**
   * Analyzes live telemetry, market activity, histories, and tactics
   * to compute a rigorous game-state safety and volatile anomaly assessment.
   */
  public analyzeMatchAnomaly(
    matchId: number,
    telemetry: LiveTelemetryInput,
    oddsMovement: OddsMovementInput,
    history: HistoricalTrendsInput,
    tactics: TacticalShiftsInput
  ): AnomalyReport {
    const triggers: string[] = [];
    
    // --- 1. OVERREACTION & ODD SWING DETECTION ---
    const openProb = this.getImpliedProbabilities(oddsMovement.openingOdds);
    const curProb = this.getImpliedProbabilities(oddsMovement.currentOdds);
    
    const homeProbDelta = curProb.home - openProb.home;
    const awayProbDelta = curProb.away - openProb.away;
    const maxOddsShift = Math.max(Math.abs(homeProbDelta), Math.abs(awayProbDelta));
    
    let isMarketOverreaction = false;
    let oddsSwingScore = 0;

    if (maxOddsShift > 0.05) {
      oddsSwingScore = Math.min(100, maxOddsShift * 400); // 25% shift leads to 100 base score
      
      // Look for drift that opposes live telemetry performance to flag overreaction
      const liveXGDiff = telemetry.homeXG - telemetry.awayXG;
      if (homeProbDelta < -0.08 && liveXGDiff > 0.8) {
        isMarketOverreaction = true;
        triggers.push("MARKET_OVERREACTION: Odds drifted away from the home team despite superior xG production.");
      } else if (awayProbDelta < -0.08 && liveXGDiff < -0.8) {
        isMarketOverreaction = true;
        triggers.push("MARKET_OVERREACTION: Odds drifted away from the away team despite superior xG production.");
      }
    }

    // --- 2. RED-CARD VOLATILITY INDEXING ---
    let redCardVolatilityIndex = 0;
    let redCardAsymmetryIndex = 0;
    if (telemetry.homeRedCards > 0 || telemetry.awayRedCards > 0) {
      redCardAsymmetryIndex = telemetry.homeRedCards - telemetry.awayRedCards;
      
      // Volatility scales exponentially with remaining game duration
      const remainingTime = Math.max(5, 90 - telemetry.minute);
      redCardVolatilityIndex = Math.min(100, (Math.abs(redCardAsymmetryIndex) * 35) * (remainingTime / 60));
      
      if (Math.abs(redCardAsymmetryIndex) > 0) {
        triggers.push(`RED_CARD_VOLATILITY: ${Math.abs(redCardAsymmetryIndex)} card asymmetry detected with ${remainingTime} minutes remaining.`);
      }
    }

    // --- 3. MOMENTUM COLLAPSE & SQUAD FATIGUE TRACKING ---
    const momentumDelta = this.calculateMomentumDelta(telemetry);
    let homeCollapseRisk = false;
    let awayCollapseRisk = false;

    // Detect cases where high possession results in zero shots/xG, or squad has insufficient rest rest
    if (telemetry.minute > 55) {
      if (telemetry.homePossession > 0.62 && momentumDelta < -3.0 && tactics.homeRestDays < 4) {
        homeCollapseRisk = true;
        triggers.push("MOMENTUM_COLLAPSE: Home team displaying high passive possession with decaying real momentum risk and low squad rest.");
      }
      if (telemetry.awayPossession > 0.62 && momentumDelta > 3.0 && tactics.awayRestDays < 4) {
        awayCollapseRisk = true;
        triggers.push("MOMENTUM_COLLAPSE: Away team displaying high passive possession with decaying real momentum risk and low squad rest.");
      }
    }

    // --- 4. UPSET CONFIGURATION PROBABILITY ---
    // Grounded on: Pre-match favorites (via opening odds), current goals scoreline, and rest imbalances
    const isHomeFavorite = openProb.home > 0.55;
    const isAwayFavorite = openProb.away > 0.55;
    let upsetProbability = 0;

    if (isHomeFavorite && telemetry.awayGoals > telemetry.homeGoals) {
      // Favorite is trailing
      const remainingPeriodFactor = Math.max(0.1, (90 - telemetry.minute) / 90);
      upsetProbability = Math.min(100, (60 + (telemetry.awayGoals - telemetry.homeGoals) * 15) * remainingPeriodFactor);
      triggers.push(`UPSET_CONDITION: Home pre-match favorite is trailing in minute ${telemetry.minute}.`);
    } else if (isAwayFavorite && telemetry.homeGoals > telemetry.awayGoals) {
      // Favorite is trailing
      const remainingPeriodFactor = Math.max(0.1, (90 - telemetry.minute) / 90);
      upsetProbability = Math.min(100, (60 + (telemetry.homeGoals - telemetry.awayGoals) * 15) * remainingPeriodFactor);
      triggers.push(`UPSET_CONDITION: Away pre-match favorite is trailing in minute ${telemetry.minute}.`);
    }

    // --- 5. TRAP-GAME CONDITIONS ---
    // A favorite is resting key players or has a severe league position variance (e.g. overconfidence vs highly motivated relegation team)
    let trapGameAlert = false;
    const positionGap = Math.abs(history.homeLeaguePosition - history.awayLeaguePosition);
    if (positionGap > 10) {
      const isBetterRankedHome = history.homeLeaguePosition < history.awayLeaguePosition;
      // High rating team resting key players or coming in on a negative trend
      if (isBetterRankedHome && history.homeFormTrend < -1.5 && tactics.homeRestDays < 4) {
        trapGameAlert = true;
        triggers.push("TRAP_GAME_ALERT: Highly ranked Home team is in negative form trend with tight squad rotation.");
      } else if (!isBetterRankedHome && history.awayFormTrend < -1.5 && tactics.awayRestDays < 4) {
        trapGameAlert = true;
        triggers.push("TRAP_GAME_ALERT: Highly ranked Away team is in negative form trend with tight squad rotation.");
      }
    }

    // --- 6. AGGREGATING FINAL ANOMALY SEVERITY & VOLATILITY INDEX ---
    // Cumulative mathematically derived scores bounding [0, 100]
    
    // Volatility Index factors: live xG variance, timing, red cards, and odds drift
    const liveGoalsSum = telemetry.homeGoals + telemetry.awayGoals;
    const goalVelocityFactor = telemetry.minute > 0 ? (liveGoalsSum / telemetry.minute) * 30 : 0;
    
    let baseVolatility = (oddsSwingScore * 0.3) + (redCardVolatilityIndex * 0.4) + (Math.min(30, goalVelocityFactor) * 1.0);
    if (telemetry.minute > 75 && Math.abs(telemetry.homeGoals - telemetry.awayGoals) === 1) {
      baseVolatility += 15; // 1-goal margins near the end of match are highly volatile
    }
    const finalVolatilityIndex = Math.min(100, Math.max(0, parseFloat(baseVolatility.toFixed(1))));

    // Severity Index factors: Red card imbalances, severe upsets, overreactions, collapse warnings
    let baseSeverity = (upsetProbability * 0.4) + (redCardVolatilityIndex * 0.3);
    if (isMarketOverreaction) baseSeverity += 20;
    if (homeCollapseRisk || awayCollapseRisk) baseSeverity += 15;
    if (trapGameAlert) baseSeverity += 10;
    
    // Normalize to 0-100 scale
    const finalAnomalySeverityScore = Math.min(100, Math.max(0, parseFloat(baseSeverity.toFixed(1))));

    return {
      matchId,
      anomalySeverityScore: finalAnomalySeverityScore,
      volatilityIndex: finalVolatilityIndex,
      upsetProbability: parseFloat(upsetProbability.toFixed(1)),
      tacticalInstability: {
        homeCollapseRisk,
        awayCollapseRisk,
        overreactionDetected: isMarketOverreaction,
        trapGameAlert,
        redCardAsymmetryIndex,
        momentumDelta: parseFloat(momentumDelta.toFixed(2)),
        triggers
      }
    };
  }
}
