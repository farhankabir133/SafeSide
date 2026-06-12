import { OddsMarket } from "./oddsService";
import { MathematicalForecast } from "./PoissonPredictor";

export interface OddsMovementHistory {
  timestamp: string;
  odds: OddsMarket;
}

export interface CalibrationResult {
  fairProbabilities: { home: number; draw: number; away: number };
  fairOdds: OddsMarket;
  marketMargin: number; // The vigor percentage (e.g., 0.05 for 5%)
  impliedProbabilitiesWithVig: { home: number; draw: number; away: number };
}

export interface ValueOpportunity {
  outcome: "home" | "draw" | "away";
  bookmakerOdds: number;
  fairOdds: number;
  modelProbability: number;
  marketImpliedProbability: number;
  rawEdgePercent: number; // (modelProb * bookmakerOdds - 1) * 100
  expectedValueMultiplier: number; // Expected return (e.g., 1.08 meaning +8% EV)
  kellyStakePercent: number; // Custom risk-adjusted Kelly stake
  confidenceScore: number; // Bounded 0-100 indicating quality of value
}

export interface OddsMovementAlert {
  outcome: "home" | "draw" | "away";
  openingOdds: number;
  currentOdds: number;
  impliedShiftPercent: number; // Percent shift in underlying probability
  isSteamMove: boolean; // Flag if sudden heavy market alignment occurs
  isSuspiciousDrop: boolean; // Flag for abnormal drops
}

export interface MarketCalibrationSummary {
  matchId: number;
  calibration: CalibrationResult;
  opportunities: ValueOpportunity[];
  marketDisagreementIndex: number; // Variance between model expectation and market expectation
  movementAlerts: OddsMovementAlert[];
  recommendations: {
    selection: "home" | "draw" | "away" | "NO_BET";
    recommendedOdds: number;
    valueEdgePercent: number;
    recommendedStakePercent: number;
    explanation: string;
    actionRating: "VITAL" | "STRATEGIC" | "SPECULATIVE" | "HOLD";
  };
}

export class MarketCalibrationService {
  private static instance: MarketCalibrationService;

  private constructor() {}

  public static getInstance(): MarketCalibrationService {
    if (!MarketCalibrationService.instance) {
      MarketCalibrationService.instance = new MarketCalibrationService();
    }
    return MarketCalibrationService.instance;
  }

  /**
   * Calculates the bookmaker's overround (margin/vig)
   */
  public calculateOverround(odds: OddsMarket): number {
    if (odds.home <= 0 || odds.draw <= 0 || odds.away <= 0) return 0;
    const sumImplied = (1 / odds.home) + (1 / odds.draw) + (1 / odds.away);
    return Math.max(0, sumImplied - 1);
  }

  /**
   * Removes bookmaker margin (vig) to find underlying market-implied probabilities.
   * Emplements three distinct methodologies:
   * 1. Multiplicative (Standard Proportional Adjustment)
   * 2. Log-Power Method (Accounts for Longshot Bias)
   * 3. Custom Approximation of Shin's pricing model (Optimal for Draw weights)
   */
  public calibrateOdds(odds: OddsMarket, method: "multiplicative" | "power" | "shin" = "shin"): CalibrationResult {
    const homeImplied = 1 / Math.max(1.01, odds.home);
    const drawImplied = 1 / Math.max(1.01, odds.draw);
    const awayImplied = 1 / Math.max(1.01, odds.away);

    const sumImplied = homeImplied + drawImplied + awayImplied;
    const overround = Math.max(0, sumImplied - 1);

    const impliedProbabilitiesWithVig = {
      home: homeImplied,
      draw: drawImplied,
      away: awayImplied
    };

    let pHome = 0;
    let pDraw = 0;
    let pAway = 0;

    if (method === "multiplicative") {
      pHome = homeImplied / sumImplied;
      pDraw = drawImplied / sumImplied;
      pAway = awayImplied / sumImplied;
    } else if (method === "power") {
      // Find power coefficient k where sum(p_i ^ (1/k)) = 1
      // We solve numerically using Newton-Raphson approximation
      let k = 1.0;
      for (let iter = 0; iter < 10; iter++) {
        const sum = Math.pow(homeImplied, k) + Math.pow(drawImplied, k) + Math.pow(awayImplied, k);
        const f = sum - 1;
        const df = Math.pow(homeImplied, k) * Math.log(homeImplied) + 
                   Math.pow(drawImplied, k) * Math.log(drawImplied) + 
                   Math.pow(awayImplied, k) * Math.log(awayImplied);
        if (Math.abs(df) < 1e-9) break;
        k = k - f / df;
      }
      pHome = Math.pow(homeImplied, k);
      pDraw = Math.pow(drawImplied, k);
      pAway = Math.pow(awayImplied, k);
    } else {
      // "shin" calibration approximation (captures trading skew & information asymmetry)
      // Shin formulation: z is fraction of uninformed traders
      // p_i = sqrt( z^2 + 4*(1-z)*(y_i^2) / S ) ... where S sum(y_i)
      // We find optimal asymmetric factor beta numerically
      let z = overround / (1 + overround); // initial guess
      let bestDiff = Infinity;
      let optimalP = [homeImplied / sumImplied, drawImplied / sumImplied, awayImplied / sumImplied];

      for (let testZ = 0.001; testZ < 0.25; testZ += 0.005) {
        const hVal = Math.sqrt(testZ * testZ + 4 * (1 - testZ) * (homeImplied * homeImplied) / sumImplied);
        const dVal = Math.sqrt(testZ * testZ + 4 * (1 - testZ) * (drawImplied * drawImplied) / sumImplied);
        const aVal = Math.sqrt(testZ * testZ + 4 * (1 - testZ) * (awayImplied * awayImplied) / sumImplied);
        
        const testSum = hVal + dVal + aVal;
        const diff = Math.abs(testSum - (2 - testZ));
        if (diff < bestDiff) {
          bestDiff = diff;
          // Normalize results
          const denominator = 2 - testZ;
          optimalP = [hVal / denominator, dVal / denominator, aVal / denominator];
        }
      }
      pHome = optimalP[0];
      pDraw = optimalP[1];
      pAway = optimalP[2];
    }

    // Renormalize to sum to exactly 1.0
    const totalP = pHome + pDraw + pAway || 1.0;
    pHome /= totalP;
    pDraw /= totalP;
    pAway /= totalP;

    const fairOdds: OddsMarket = {
      home: parseFloat((1 / pHome).toFixed(4)),
      draw: parseFloat((1 / pDraw).toFixed(4)),
      away: parseFloat((1 / pAway).toFixed(4))
    };

    return {
      fairProbabilities: { home: pHome, draw: pDraw, away: pAway },
      fairOdds,
      marketMargin: overround,
      impliedProbabilitiesWithVig
    };
  }

  /**
   * Compares model probabilities against the bookmaker odds to isolate value opportunities
   */
  public evaluateModelValue(
    modelForecast: MathematicalForecast,
    bookmakerOdds: OddsMarket,
    matchImportanceWeight = 1.0
  ): ValueOpportunity[] {
    const opps: ValueOpportunity[] = [];
    const calibration = this.calibrateOdds(bookmakerOdds, "shin");

    const outcomes: Array<{ key: "home" | "draw" | "away"; modelP: number; marketImpliedP: number; odds: number; fair: number }> = [
      {
        key: "home",
        modelP: modelForecast.homeWinProb / 100,
        marketImpliedP: calibration.fairProbabilities.home,
        odds: bookmakerOdds.home,
        fair: calibration.fairOdds.home
      },
      {
        key: "draw",
        modelP: modelForecast.drawProb / 100,
        marketImpliedP: calibration.fairProbabilities.draw,
        odds: bookmakerOdds.draw,
        fair: calibration.fairOdds.draw
      },
      {
        key: "away",
        modelP: modelForecast.awayWinProb / 100,
        marketImpliedP: calibration.fairProbabilities.away,
        odds: bookmakerOdds.away,
        fair: calibration.fairOdds.away
      }
    ];

    outcomes.forEach(out => {
      // EV Multiplier = Probability * Odds
      const evMult = out.modelP * out.odds;
      const rawEdge = (evMult - 1) * 100;

      if (rawEdge > 0) {
        // Full Kelly: f = (p * b - q) / b where b = odds - 1
        const b = out.odds - 1;
        const q = 1 - out.modelP;
        let kelly = 0;
        if (b > 0) {
          kelly = (out.modelP * b - q) / b;
        }

        // Apply fractional Kelly safety constraint (Quarter-Kelly) & cap at 12% total bankroll allocation
        const fractionalKelly = Math.max(0, Math.min(0.12, kelly * 0.25));

        // Evaluate custom confidence metric (combines edge severity, overround stability, and importance factor)
        // High margins diminish confidence. High importance (champions league) increases validation.
        const marginFactor = Math.max(0.1, 1 - calibration.marketMargin * 4);
        const edgeScaled = Math.min(50, rawEdge * 2);
        const confidenceScoreStr = Math.min(100, Math.max(10, (edgeScaled + 50) * marginFactor * matchImportanceWeight));

        opps.push({
          outcome: out.key,
          bookmakerOdds: out.odds,
          fairOdds: parseFloat(out.fair.toFixed(2)),
          modelProbability: out.modelP,
          marketImpliedProbability: out.marketImpliedP,
          rawEdgePercent: parseFloat(rawEdge.toFixed(2)),
          expectedValueMultiplier: parseFloat(evMult.toFixed(4)),
          kellyStakePercent: parseFloat((fractionalKelly * 100).toFixed(2)),
          confidenceScore: parseFloat(confidenceScoreStr.toFixed(1))
        });
      }
    });

    // Sort opportunities descending by expected value multiplier
    return opps.sort((a, b) => b.expectedValueMultiplier - a.expectedValueMultiplier);
  }

  /**
   * Monitors closing vs opening odds lines to flag market trends and insider drops
   */
  public analyzeLineMovement(opening: OddsMarket, current: OddsMarket): OddsMovementAlert[] {
    const alerts: OddsMovementAlert[] = [];
    const outcomes: Array<"home" | "draw" | "away"> = ["home", "draw", "away"];

    outcomes.forEach(out => {
      const openOdds = opening[out];
      const curOdds = current[out];

      if (openOdds <= 0 || curOdds <= 0) return;

      const openProb = 1 / openOdds;
      const curProb = 1 / curOdds;

      // Absolute underlying probability shift
      const rawShift = curProb - openProb;
      const pctShift = rawShift * 100;

      // Check for steam moves: implied probability increases by more than 4% absolute
      const isSteamMove = pctShift > 4.5;
      // Suspicious drops match sharp odds alignment (e.g. odds drop by more than 22% of opening price)
      const ratioDrop = (openOdds - curOdds) / openOdds;
      const isSuspiciousDrop = ratioDrop > 0.22 && pctShift > 2.5;

      if (Math.abs(pctShift) > 1.2) {
        alerts.push({
          outcome: out,
          openingOdds: openOdds,
          currentOdds: curOdds,
          impliedShiftPercent: parseFloat(pctShift.toFixed(2)),
          isSteamMove,
          isSuspiciousDrop
        });
      }
    });

    return alerts;
  }

  /**
   * Compiles the full market odds calibration matrix
   */
  public calibrateAndAnalyze(
    matchId: number,
    modelForecast: MathematicalForecast,
    currentOdds: OddsMarket,
    historicalLineMovement?: OddsMovementHistory[],
    competitionCode = "PL"
  ): MarketCalibrationSummary {
    const calibration = this.calibrateOdds(currentOdds, "shin");

    // Match importance multiplier based on tournament code
    let matchImportanceWeight = 1.0;
    const code = (competitionCode || "").toUpperCase();
    if (code === "CL" || code === "WC") matchImportanceWeight = 1.15;
    if (code === "PL" || code === "SA") matchImportanceWeight = 1.05;
    if (code === "FL1") matchImportanceWeight = 0.95;

    const opportunities = this.evaluateModelValue(modelForecast, currentOdds, matchImportanceWeight);

    // Calculate Market Disagreement Index (using Chi-squared style relative variance of probabilities)
    let disagreementSum = 0;
    disagreementSum += Math.pow((modelForecast.homeWinProb / 100) - calibration.fairProbabilities.home, 2) / Math.max(0.01, calibration.fairProbabilities.home);
    disagreementSum += Math.pow((modelForecast.drawProb / 100) - calibration.fairProbabilities.draw, 2) / Math.max(0.01, calibration.fairProbabilities.draw);
    disagreementSum += Math.pow((modelForecast.awayWinProb / 100) - calibration.fairProbabilities.away, 2) / Math.max(0.01, calibration.fairProbabilities.away);

    const marketDisagreementIndex = parseFloat((disagreementSum * 100).toFixed(2));

    // Compile line movement trends if historical checkpoints were supplied
    let movementAlerts: OddsMovementAlert[] = [];
    if (historicalLineMovement && historicalLineMovement.length >= 2) {
      const sortedHistory = [...historicalLineMovement].sort((a, b) => new Date(a.timestamp).getTime() - b.timestamp.localeCompare(a.timestamp));
      const opening = sortedHistory[sortedHistory.length - 1].odds;
      movementAlerts = this.analyzeLineMovement(opening, currentOdds);
    }

    // Determine final recommendation logic (Only recommend positive EV options with threshold of 3.5% Edge)
    let bestSelection: "home" | "draw" | "away" | "NO_BET" = "NO_BET";
    let recommendedOdds = 0;
    let valueEdgePercent = 0;
    let recommendedStakePercent = 0;
    let explanation = "Market is efficiently matched to statistical probability densities. Hold positions.";
    let actionRating: "VITAL" | "STRATEGIC" | "SPECULATIVE" | "HOLD" = "HOLD";

    const topValue = opportunities.find(o => o.rawEdgePercent >= 3.5);

    if (topValue) {
      bestSelection = topValue.outcome;
      recommendedOdds = topValue.bookmakerOdds;
      valueEdgePercent = topValue.rawEdgePercent;
      recommendedStakePercent = topValue.kellyStakePercent;

      if (topValue.expectedValueMultiplier >= 1.12 && topValue.confidenceScore >= 75) {
        actionRating = "VITAL";
        explanation = `High-conviction value discovered for ${topValue.outcome.toUpperCase()}. Model-indicated probability completely outpaces bookmaker boundaries by ${topValue.rawEdgePercent}%.`;
      } else if (topValue.expectedValueMultiplier >= 1.06 && topValue.confidenceScore >= 55) {
        actionRating = "STRATEGIC";
        explanation = `Solid mathematical edge on ${topValue.outcome.toUpperCase()} matching tactical forecast models. Proposing restricted stake depth of ${topValue.kellyStakePercent}%.`;
      } else {
        actionRating = "SPECULATIVE";
        explanation = `Minor value margin on ${topValue.outcome.toUpperCase()}. Suitable primarily for low-exposure portfolios due to tighter validation margins.`;
      }
    }

    return {
      matchId,
      calibration,
      opportunities,
      marketDisagreementIndex,
      movementAlerts,
      recommendations: {
        selection: bestSelection,
        recommendedOdds,
        valueEdgePercent,
        recommendedStakePercent,
        explanation,
        actionRating
      }
    };
  }
}
