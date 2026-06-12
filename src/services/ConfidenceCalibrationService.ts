import { MathematicalForecast } from "./PoissonPredictor";

export interface HistoricalPrediction {
  matchId: string | number;
  predictedProbabilities: { home: number; draw: number; away: number }; // Probabilities between 0.0 and 1.0
  actualOutcome: "home" | "draw" | "away" | null; // Completed actual outcome
}

export interface CalibrationBin {
  binMin: number;
  binMax: number;
  predictionCount: number;
  expectedAvgProbability: number;
  actualAccuracy: number;
  calibrationGap: number; // expected vs actual difference
}

export interface RollingAccuracyStats {
  totalCompleted: number;
  overallWinRate: number;
  brierScore: number; // Standard Brier Score for three-way categorical probability [0.0 - 2.0]
  rollingBrierScore: number; // Brier Score for the last N matches
  overconfidenceIndex: number; // Metric of over-confidence (positive if predicted probability was too high)
  calibrationCurve: CalibrationBin[];
}

export interface CalibratedConfidenceResult {
  matchId: string | number;
  originalForecast: MathematicalForecast;
  calibratedForecast: MathematicalForecast;
  uncalibratedConfidence: number; // Original highest probability
  calibratedConfidence: number;   // Calibrated highest probability
  uncertaintyIndex: number;       // Entropy-derived score [0 - 100]
  reliabilityRating: "EXCELLENT" | "HIGH" | "MODERATE" | "LOW" | "UNVERIFIED";
  calibratedDrawProb: number;
  confidenceShrinkageApplied: boolean;
  brierImprovementEst: number;
}

export class ConfidenceCalibrationService {
  private static instance: ConfidenceCalibrationService;

  private constructor() {}

  public static getInstance(): ConfidenceCalibrationService {
    if (!ConfidenceCalibrationService.instance) {
      ConfidenceCalibrationService.instance = new ConfidenceCalibrationService();
    }
    return ConfidenceCalibrationService.instance;
  }

  /**
   * Calculates the multi-categorical Brier Score for 3-way outcomes.
   * Lower is better (0.0 represents perfect prediction, 2.0 represents absolute worst).
   */
  public calculateBrierScore(predictions: HistoricalPrediction[]): number {
    const completed = predictions.filter(p => p.actualOutcome !== null);
    if (completed.length === 0) return 0.50; // Neutral default prior for 3 choices

    let cumulativeLoss = 0;
    completed.forEach(p => {
      const ph = p.predictedProbabilities.home;
      const pd = p.predictedProbabilities.draw;
      const pa = p.predictedProbabilities.away;

      const oh = p.actualOutcome === "home" ? 1 : 0;
      const od = p.actualOutcome === "draw" ? 1 : 0;
      const oa = p.actualOutcome === "away" ? 1 : 0;

      const loss = Math.pow(ph - oh, 2) + Math.pow(pd - od, 2) + Math.pow(pa - oa, 2);
      cumulativeLoss += loss;
    });

    return parseFloat((cumulativeLoss / completed.length).toFixed(4));
  }

  /**
   * Calculates Shannon Entropy of the model probabilities and normalizes it to [0 - 100].
   * Entropy measures the intrinsic uncertainty of the prediction distribution.
   * Maximum entropy for 3 choices is -ln(1/3) ~ 1.098612.
   */
  public calculateUncertaintyIndex(probs: { home: number; draw: number; away: number }): number {
    const ph = Math.max(1e-9, probs.home);
    const pd = Math.max(1e-9, probs.draw);
    const pa = Math.max(1e-9, probs.away);

    const entropy = -(ph * Math.log(ph) + pd * Math.log(pd) + pa * Math.log(pa));
    const maxEntropy = 1.098612;

    return parseFloat(((entropy / maxEntropy) * 100).toFixed(1));
  }

  /**
   * Evaluates historical rolling accuracy stats and builds a probability calibration curve.
   */
  public evaluateAccuracyStats(history: HistoricalPrediction[], rollingWindow = 20): RollingAccuracyStats {
    const completed = history.filter(p => p.actualOutcome !== null);
    const totalCompleted = completed.length;

    // Default return if no historical data exists
    if (totalCompleted === 0) {
      return {
        totalCompleted: 0,
        overallWinRate: 0,
        brierScore: 0.5,
        rollingBrierScore: 0.5,
        overconfidenceIndex: 0,
        calibrationCurve: this.getEmptyCalibrationCurve()
      };
    }

    // 1. Core Brier Score calculations
    const brierScore = this.calculateBrierScore(completed);
    
    // 2. Rolling Window Brier Score
    const rollingCompleted = completed.slice(-rollingWindow);
    const rollingBrierScore = this.calculateBrierScore(rollingCompleted);

    // 3. Compute overall win rate for selected highest-probability outcomes
    let successfulPredictionsCount = 0;
    let expectedProbabilitySum = 0;

    rollingCompleted.forEach(p => {
      const probs = p.predictedProbabilities;
      const maxProp = Math.max(probs.home, probs.draw, probs.away);
      let selectedOutcome: "home" | "draw" | "away" = "home";
      if (maxProp === probs.draw) selectedOutcome = "draw";
      if (maxProp === probs.away) selectedOutcome = "away";

      if (selectedOutcome === p.actualOutcome) {
        successfulPredictionsCount++;
      }
      expectedProbabilitySum += maxProp;
    });

    const overallWinRate = parseFloat(((successfulPredictionsCount / Math.max(1, rollingCompleted.length)) * 100).toFixed(1));
    const expectedAverageWinRate = (expectedProbabilitySum / Math.max(1, rollingCompleted.length)) * 100;
    const overconfidenceIndex = parseFloat((expectedAverageWinRate - overallWinRate).toFixed(1));

    // 4. Construct Calibration Curve Bins
    const binsConfig = [
      { min: 0.0, max: 0.35 },
      { min: 0.35, max: 0.50 },
      { min: 0.50, max: 0.65 },
      { min: 0.65, max: 0.80 },
      { min: 0.80, max: 1.00 }
    ];

    const calibrationCurve: CalibrationBin[] = binsConfig.map(bin => {
      const binMatches = completed.filter(p => {
        const probs = p.predictedProbabilities;
        const maxProb = Math.max(probs.home, probs.draw, probs.away);
        return maxProb >= bin.min && maxProb < bin.max;
      });

      if (binMatches.length === 0) {
        return {
          binMin: bin.min,
          binMax: bin.max,
          predictionCount: 0,
          expectedAvgProbability: parseFloat(((bin.min + bin.max) / 2).toFixed(3)),
          actualAccuracy: 0,
          calibrationGap: 0
        };
      }

      let correctCount = 0;
      let probSum = 0;

      binMatches.forEach(p => {
        const probs = p.predictedProbabilities;
        const maxProb = Math.max(probs.home, probs.draw, probs.away);
        let selection: "home" | "draw" | "away" = "home";
        if (maxProb === probs.draw) selection = "draw";
        if (maxProb === probs.away) selection = "away";

        if (selection === p.actualOutcome) {
          correctCount++;
        }
        probSum += maxProb;
      });

      const expectedAvgProbability = parseFloat((probSum / binMatches.length).toFixed(4));
      const actualAccuracy = parseFloat((correctCount / binMatches.length).toFixed(4));
      const calibrationGap = parseFloat((expectedAvgProbability - actualAccuracy).toFixed(4));

      return {
        binMin: bin.min,
        binMax: bin.max,
        predictionCount: binMatches.length,
        expectedAvgProbability,
        actualAccuracy,
        calibrationGap
      };
    });

    return {
      totalCompleted,
      overallWinRate,
      brierScore,
      rollingBrierScore,
      overconfidenceIndex,
      calibrationCurve
    };
  }

  private getEmptyCalibrationCurve(): CalibrationBin[] {
    const bins = [
      { min: 0.0, max: 0.35 },
      { min: 0.35, max: 0.50 },
      { min: 0.50, max: 0.65 },
      { min: 0.65, max: 0.80 },
      { min: 0.80, max: 1.00 }
    ];
    return bins.map(b => ({
      binMin: b.min,
      binMax: b.max,
      predictionCount: 0,
      expectedAvgProbability: parseFloat(((b.min + b.max) / 2).toFixed(3)),
      actualAccuracy: 0,
      calibrationGap: 0
    }));
  }

  /**
   * Core Calibrate Engine using Bayesian shrinkage and Brier adjustment curves.
   * Pulls back over-optimistic probabilities toward empirical priors when the model has displayed overconfidence.
   */
  public calibratePrediction(
    matchId: string | number,
    rawForecast: MathematicalForecast,
    history: HistoricalPrediction[]
  ): CalibratedConfidenceResult {
    const originalProbs = {
      home: rawForecast.homeWinProb / 100,
      draw: rawForecast.drawProb / 100,
      away: rawForecast.awayWinProb / 100
    };

    const stats = this.evaluateAccuracyStats(history);
    
    // Dynamic Prior: Standard Football league statistical base rates
    const empiricalPrior = { home: 0.45, draw: 0.27, away: 0.28 };

    // Apply Bayesian Shrinkage: Credibility Weight w = n / (n + k)
    // k represents the regularization coefficient. Higher k = faster shrinkage to prior.
    // If the model is heavily overconfident, we amplify k to severely penalize overconfident outcomes.
    let k = 10.0; // standard sample size prior threshold (e.g. Needs 10 samples to trust model 50/50 with prior)
    if (stats.overconfidenceIndex > 5.0) {
      k += stats.overconfidenceIndex * 0.8; // Penaliize overconfident models with heavier shrinkage
    }

    const n = stats.totalCompleted;
    // Credibility factor bounds [0.15 - 0.95] to prevent total erase on large samples and preserve model edge
    const rawWeight = n / (n + k);
    const w = n > 0 ? Math.max(0.15, Math.min(0.95, rawWeight)) : 0.75; // 0.75 fallback weight for unverified models

    // Calibrate individual probabilities
    let calibratedHome = w * originalProbs.home + (1 - w) * empiricalPrior.home;
    let calibratedDraw = w * originalProbs.draw + (1 - w) * empiricalPrior.draw;
    let calibratedAway = w * originalProbs.away + (1 - w) * empiricalPrior.away;

    // Post-calibration safety shrinkage: guarantee sum = 1.0
    const sum = calibratedHome + calibratedDraw + calibratedAway;
    calibratedHome /= sum;
    calibratedDraw /= sum;
    calibratedAway /= sum;

    // Convert back format %
    const calibratedHomePct = Math.min(99, Math.max(1, Math.round(calibratedHome * 100)));
    const calibratedAwayPct = Math.min(99, Math.max(1, Math.round(calibratedAway * 100)));
    const calibratedDrawPct = Math.max(1, 100 - calibratedHomePct - calibratedAwayPct);

    // Build the calibrated forecast payload
    const calibratedScorelines = rawForecast.poissonScorelines.map(sc => {
      // Re-evaluate scoreline probabilities proportional to calibrated outcomes
      const [hStr, aStr] = sc.score.split("-");
      const hStrGoals = parseInt(hStr);
      const aStrGoals = parseInt(aStr);
      
      let scalingRatio = 1.0;
      if (hStrGoals > aStrGoals) {
        scalingRatio = originalProbs.home > 0 ? calibratedHome / originalProbs.home : 1.0;
      } else if (aStrGoals > hStrGoals) {
        scalingRatio = originalProbs.away > 0 ? calibratedAway / originalProbs.away : 1.0;
      } else {
        scalingRatio = originalProbs.draw > 0 ? calibratedDraw / originalProbs.draw : 1.0;
      }

      return {
        score: sc.score,
        probability: parseFloat(Math.min(99, Math.max(0.01, sc.probability * scalingRatio)).toFixed(2))
      };
    }).sort((a, b) => b.probability - a.probability);

    // Re-normalize scorelines
    const scSum = calibratedScorelines.reduce((acc, curr) => acc + curr.probability, 0) || 1.0;
    calibratedScorelines.forEach(sc => {
      sc.probability = parseFloat(((sc.probability / scSum) * 100).toFixed(2));
    });

    const calibratedForecast: MathematicalForecast = {
      ...rawForecast,
      homeWinProb: calibratedHomePct,
      awayWinProb: calibratedAwayPct,
      drawProb: calibratedDrawPct,
      poissonScorelines: calibratedScorelines
    };

    // Calculate maximum uncalibrated vs calibrated confidence outcomes
    const uncalibratedConfidence = Math.max(rawForecast.homeWinProb, rawForecast.drawProb, rawForecast.awayWinProb);
    const calibratedConfidence = Math.max(calibratedHomePct, calibratedDrawPct, calibratedAwayPct);

    const uncertaintyIndex = this.calculateUncertaintyIndex({
      home: calibratedHome,
      draw: calibratedDraw,
      away: calibratedAway
    });

    // Determine Prediction Reliability Rating
    let reliabilityRating: "EXCELLENT" | "HIGH" | "MODERATE" | "LOW" | "UNVERIFIED" = "UNVERIFIED";

    if (n === 0) {
      reliabilityRating = "UNVERIFIED";
    } else {
      const bs = stats.brierScore;
      if (bs < 0.42 && n >= 15) {
        reliabilityRating = "EXCELLENT";
      } else if (bs < 0.52 && n >= 8) {
        reliabilityRating = "HIGH";
      } else if (bs < 0.65) {
        reliabilityRating = "MODERATE";
      } else {
        reliabilityRating = "LOW";
      }
    }

    const valueShift = uncalibratedConfidence - calibratedConfidence;
    const confidenceShrinkageApplied = Math.abs(valueShift) > 1.0;

    // Estimate Brier score improvement (from better calibration of tail probabilities)
    const brierImprovementEst = Math.max(0, parseFloat((stats.brierScore - (stats.brierScore * 0.95)).toFixed(4)));

    return {
      matchId,
      originalForecast: rawForecast,
      calibratedForecast,
      uncalibratedConfidence,
      calibratedConfidence,
      uncertaintyIndex,
      reliabilityRating,
      calibratedDrawProb: calibratedDrawPct,
      confidenceShrinkageApplied,
      brierImprovementEst
    };
  }
}
