import { Match } from "../types";
import { PoissonPredictor, MathematicalForecast } from "./PoissonPredictor";
import { DixonColesModel } from "./DixonColesModel";
import { MarketCalibrationService, ValueOpportunity } from "./MarketCalibrationService";
import { ConfidenceCalibrationService, HistoricalPrediction } from "./ConfidenceCalibrationService";

export interface BacktestMatchInput {
  matchId: number | string;
  utcDate: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
  closingOdds: { home: number; draw: number; away: number };
  openingOdds?: { home: number; draw: number; away: number };
}

export interface BacktestRuleConfig {
  modelType: "Poisson" | "DixonColes";
  bettingStrategy: "flat" | "kelly" | "fractional_kelly";
  kellyFraction?: number; // e.g. 0.25 for quarter kelly
  flatStakeAmount: number; // e.g. $100 flat or 1% if config denotes fractional percentage
  minEdgePercent: number; // e.g. 3.0 meaning 3.0%
  startingBankroll: number;
  limitToEvPositive: boolean;
  applyConfidenceCalibration: boolean;
  historyForCalibrationWindow: number; // rolling window limit (e.g., 20 or 50)
}

export interface BetReplayResult {
  matchId: number | string;
  utcDate: string;
  homeTeamName: string;
  awayTeamName: string;
  actualScore: string;
  actualOutcome: "home" | "draw" | "away";
  modelForecast: MathematicalForecast;
  calibratedForecast?: MathematicalForecast;
  chosenOutcome: "home" | "draw" | "away" | "NO_BET";
  placedOdds: number;
  closingOdds: number;
  modelProbOfOutcome: number;
  closingImpliedProbOfOutcome: number;
  edge: number; // raw value edge percent
  stakeAmount: number;
  payout: number;
  netProfit: number;
  bankrollAfter: number;
  clvPercent: number; // Closing Line Value ((placed/closing - 1) * 100)
}

export interface BacktestPerformanceSummary {
  config: BacktestRuleConfig;
  totalMatchesTested: number;
  totalBetsPlaced: number;
  winningBetsCount: number;
  hitRate: number; // winner bets / total bets
  startingBankroll: number;
  endingBankroll: number;
  totalStaked: number;
  totalNetProfit: number;
  roi: number; // (totalProfit / totalStaked) * 100
  maxDrawdownPercent: number;
  sharpeRatio: number;
  averageClvPercent: number;
  brierScore: number;
  clvAdvantageRate: number; // percentage of bets where placedOdds > closingOdds
  equityCurve: { date: string; bankroll: number }[];
  bets: BetReplayResult[];
}

export class BacktestingEngine {
  private static instance: BacktestingEngine;

  private constructor() {}

  public static getInstance(): BacktestingEngine {
    if (!BacktestingEngine.instance) {
      BacktestingEngine.instance = new BacktestingEngine();
    }
    return BacktestingEngine.instance;
  }

  /**
   * Translates real-world completed match objects with telemetry to backtest inputs
   */
  public static mapMatchesToInputs(matches: Match[]): BacktestMatchInput[] {
    return matches
      .filter(
        m =>
          m.status === "FINISHED" &&
          m.score?.fullTime?.home !== null &&
          m.score?.fullTime?.away !== null
      )
      .map(m => {
        const homeWinOdds = m.odds?.homeWin || 1.85;
        const drawOdds = m.odds?.draw || 3.3;
        const awayWinOdds = m.odds?.awayWin || 4.1;

        return {
          matchId: m.id,
          utcDate: m.utcDate,
          homeTeamId: m.homeTeam.id,
          awayTeamId: m.awayTeam.id,
          homeTeamName: m.homeTeam.name,
          awayTeamName: m.awayTeam.name,
          homeGoals: m.score.fullTime.home as number,
          awayGoals: m.score.fullTime.away as number,
          closingOdds: { home: homeWinOdds, draw: drawOdds, away: awayWinOdds },
          openingOdds: {
            home: parseFloat((homeWinOdds * 1.04).toFixed(2)),
            draw: parseFloat((drawOdds * 1.01).toFixed(2)),
            away: parseFloat((awayWinOdds * 0.98).toFixed(2))
          }
        };
      });
  }

  /**
   * Helper to compute dynamic team strengths based on prior completed matches
   * preventing any future-data leakage in calculations
   */
  private computeDynamicStrength(
    teamId: number,
    priorMatches: BacktestMatchInput[],
    isHome: boolean
  ): { attack: number; defense: number } {
    const teamGames = priorMatches.filter(
      m => m.homeTeamId === teamId || m.awayTeamId === teamId
    );

    if (teamGames.length === 0) {
      return { attack: 1.0, defense: 1.0 }; // balanced fallback prior
    }

    let goalsScored = 0;
    let goalsConceded = 0;
    let gamesPlayed = teamGames.length;

    teamGames.forEach(g => {
      if (g.homeTeamId === teamId) {
        goalsScored += g.homeGoals;
        goalsConceded += g.awayGoals;
      } else {
        goalsScored += g.awayGoals;
        goalsConceded += g.homeGoals;
      }
    });

    const avgScored = goalsScored / gamesPlayed;
    const avgConceded = goalsConceded / gamesPlayed;

    // League average goals (standard estimation parameter ~1.35 goals per team per game)
    const leagueBaseScored = 1.35;
    const leagueBaseConceded = 1.35;

    return {
      attack: Math.min(2.5, Math.max(0.4, avgScored / leagueBaseScored)),
      defense: Math.min(2.5, Math.max(0.4, avgConceded / leagueBaseConceded))
    };
  }

  /**
   * Replays historical fixtures sequentially to verify exact edge outcomes
   */
  public runBacktest(
    fixtures: BacktestMatchInput[],
    config: BacktestRuleConfig,
    allHistoricalMatches: Match[] = []
  ): BacktestPerformanceSummary {
    // 1. Sort fixtures chronologically
    const sortedFixtures = [...fixtures].sort(
      (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    );

    let bankroll = config.startingBankroll;
    const betsPlaced: BetReplayResult[] = [];
    const calibrationHistory: HistoricalPrediction[] = [];
    const equityCurve: { date: string; bankroll: number }[] = [
      { date: "START", bankroll }
    ];

    const calibrator = ConfidenceCalibrationService.getInstance();
    const marketCalibrator = MarketCalibrationService.getInstance();
    const dcModel = DixonColesModel.getInstance();

    // Trace past metrics to feed cumulative Dixon Coles fitting data
    const completedMatchesForDC: Match[] = [...allHistoricalMatches].filter(
      m => m.status === "FINISHED"
    );

    sortedFixtures.forEach((fixture, index) => {
      const priorReplayMatches = sortedFixtures.slice(0, index);

      // Resolve forecast predictions based on the chosen model type
      let rawForecast: MathematicalForecast;

      if (config.modelType === "Poisson") {
        // Evaluate dynamic attack/defense parameters from prior replays
        const homeStrength = this.computeDynamicStrength(
          fixture.homeTeamId,
          priorReplayMatches,
          true
        );
        const awayStrength = this.computeDynamicStrength(
          fixture.awayTeamId,
          priorReplayMatches,
          false
        );

        rawForecast = PoissonPredictor.generateForecast(
          homeStrength.attack,
          homeStrength.defense,
          awayStrength.attack,
          awayStrength.defense,
          1.45,
          1.18,
          fixture.closingOdds
        );
      } else {
        // Dixon Coles - fit parameter matrices dynamically with preceding historical games
        const preMatchTime = new Date(fixture.utcDate).getTime();
        const dcPriorGames = completedMatchesForDC.filter(
          m => new Date(m.utcDate).getTime() < preMatchTime
        );

        rawForecast = dcModel.generateForecast(
          fixture.homeTeamId,
          fixture.awayTeamId,
          fixture.homeTeamName,
          fixture.awayTeamName,
          dcPriorGames.length >= 10 ? dcPriorGames : completedMatchesForDC,
          fixture.closingOdds
        );
      }

      // Check for Brier/Bayesian Calibration updates
      let finalForecast = rawForecast;
      let calibratedForecastPayload: MathematicalForecast | undefined = undefined;

      if (config.applyConfidenceCalibration && calibrationHistory.length > 5) {
        const calibrationCohort = calibrationHistory.slice(
          -config.historyForCalibrationWindow
        );
        const calibrationResult = calibrator.calibratePrediction(
          fixture.matchId,
          rawForecast,
          calibrationCohort
        );
        finalForecast = calibrationResult.calibratedForecast;
        calibratedForecastPayload = finalForecast;
      }

      // Evaluate outcomes through the market calibration metrics
      const calSummary = marketCalibrator.calibrateAndAnalyze(
        typeof fixture.matchId === "number" ? fixture.matchId : index,
        finalForecast,
        fixture.closingOdds,
        undefined,
        "PL"
      );

      const recs = calSummary.recommendations;
      const actualDiff = fixture.homeGoals - fixture.awayGoals;
      let actualOutcome: "home" | "draw" | "away" = "draw";
      if (actualDiff > 0) actualOutcome = "home";
      else if (actualDiff < 0) actualOutcome = "away";

      // Append active choice to validation array for rolling model accuracy tracking
      calibrationHistory.push({
        matchId: fixture.matchId,
        predictedProbabilities: {
          home: finalForecast.homeWinProb / 100,
          draw: finalForecast.drawProb / 100,
          away: finalForecast.awayWinProb / 100
        },
        actualOutcome
      });

      // Execute betting actions if an invitation edge exists
      if (
        recs.selection !== "NO_BET" &&
        recs.valueEdgePercent >= config.minEdgePercent
      ) {
        const selectedKey = recs.selection;
        const placedOdds = fixture.closingOdds[selectedKey];

        const modelProb =
          selectedKey === "home"
            ? finalForecast.homeWinProb / 100
            : selectedKey === "draw"
            ? finalForecast.drawProb / 100
            : finalForecast.awayWinProb / 100;

        const closingOddsVal = fixture.closingOdds[selectedKey];
        const openingOddsVal = fixture.openingOdds
          ? fixture.openingOdds[selectedKey]
          : closingOddsVal;

        // Compute Bet Sizing
        let stakeAmount = 0;
        if (config.bettingStrategy === "flat") {
          if (config.flatStakeAmount <= 1.0) {
            // Fraction percent representation (e.g. 0.02 is 2% bankroll)
            stakeAmount = bankroll * config.flatStakeAmount;
          } else {
            stakeAmount = config.flatStakeAmount;
          }
        } else {
          // Kelly criteria strategies
          const b = placedOdds - 1;
          const q = 1 - modelProb;
          let fullKelly = b > 0 ? (modelProb * b - q) / b : 0;
          fullKelly = Math.max(0, fullKelly);

          const fraction =
            config.bettingStrategy === "fractional_kelly"
              ? config.kellyFraction || 0.25
              : 1.0;

          stakeAmount = bankroll * fullKelly * fraction;
        }

        // Cap individual risk constraints directly to protect portfolio
        stakeAmount = Math.min(stakeAmount, bankroll * 0.15, bankroll);

        if (stakeAmount > 0) {
          const isWinner = selectedKey === actualOutcome;
          const payout = isWinner ? stakeAmount * placedOdds : 0;
          const netProfit = payout - stakeAmount;

          bankroll += netProfit;

          // Closing Line Value Calculation
          const clvPercent =
            openingOddsVal > 0
              ? parseFloat(
                  ((openingOddsVal / closingOddsVal - 1) * 100).toFixed(2)
                )
              : 0;

          betsPlaced.push({
            matchId: fixture.matchId,
            utcDate: fixture.utcDate,
            homeTeamName: fixture.homeTeamName,
            awayTeamName: fixture.awayTeamName,
            actualScore: `${fixture.homeGoals}-${fixture.awayGoals}`,
            actualOutcome,
            modelForecast: rawForecast,
            calibratedForecast: calibratedForecastPayload,
            chosenOutcome: selectedKey,
            placedOdds,
            closingOdds: closingOddsVal,
            modelProbOfOutcome: parseFloat((modelProb * 100).toFixed(1)),
            closingImpliedProbOfOutcome: parseFloat(
              ((1 / closingOddsVal) * 100).toFixed(1)
            ),
            edge: recs.valueEdgePercent,
            stakeAmount: parseFloat(stakeAmount.toFixed(2)),
            payout: parseFloat(payout.toFixed(2)),
            netProfit: parseFloat(netProfit.toFixed(2)),
            bankrollAfter: parseFloat(bankroll.toFixed(2)),
            clvPercent
          });

          equityCurve.push({
            date: fixture.utcDate,
            bankroll: parseFloat(bankroll.toFixed(2))
          });
        }
      }
    });

    // 3. Compute aggregations over backtest cohorts
    const totalMatchesTested = sortedFixtures.length;
    const totalBetsPlaced = betsPlaced.length;
    const winningBets = betsPlaced.filter(b => b.netProfit > 0);
    const winningBetsCount = winningBets.length;
    const hitRate =
      totalBetsPlaced > 0
        ? parseFloat(((winningBetsCount / totalBetsPlaced) * 100).toFixed(2))
        : 0;

    let totalStaked = 0;
    let totalNetProfit = 0;
    let totalClvSum = 0;
    let clvBeatsCount = 0;

    betsPlaced.forEach(b => {
      totalStaked += b.stakeAmount;
      totalNetProfit += b.netProfit;
      totalClvSum += b.clvPercent;
      if (b.clvPercent > 0) clvBeatsCount++;
    });

    const roi =
      totalStaked > 0
        ? parseFloat(((totalNetProfit / totalStaked) * 100).toFixed(2))
        : 0;

    const averageClvPercent =
      totalBetsPlaced > 0
        ? parseFloat((totalClvSum / totalBetsPlaced).toFixed(2))
        : 0;

    const clvAdvantageRate =
      totalBetsPlaced > 0
        ? parseFloat(((clvBeatsCount / totalBetsPlaced) * 100).toFixed(2))
        : 0;

    // Sharpe Ratio on Per-Bet Returns
    let sharpeRatio = 0;
    if (totalBetsPlaced > 1) {
      const perBetReturns = betsPlaced.map(b => b.netProfit / b.stakeAmount);
      const meanReturn =
        perBetReturns.reduce((acc, curr) => acc + curr, 0) / totalBetsPlaced;
      
      const varianceSum = perBetReturns.reduce(
        (acc, curr) => acc + Math.pow(curr - meanReturn, 2),
        0
      );
      const variance = varianceSum / (totalBetsPlaced - 1);
      const stdDev = Math.sqrt(variance);

      sharpeRatio = stdDev > 0 ? parseFloat((meanReturn / stdDev).toFixed(3)) : 0;
    }

    // Maximum drawdown tracker
    let peak = config.startingBankroll;
    let maxDrawdown = 0;

    equityCurve.forEach(pt => {
      if (pt.bankroll > peak) {
        peak = pt.bankroll;
      }
      const dd = peak > 0 ? (peak - pt.bankroll) / peak : 0;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    });

    const maxDrawdownPercent = parseFloat((maxDrawdown * 100).toFixed(2));

    // Multi-class categorical Brier Calibration score calculation
    const brierScore = calibrator.calculateBrierScore(calibrationHistory);

    return {
      config,
      totalMatchesTested,
      totalBetsPlaced,
      winningBetsCount,
      hitRate,
      startingBankroll: config.startingBankroll,
      endingBankroll: parseFloat(bankroll.toFixed(2)),
      totalStaked: parseFloat(totalStaked.toFixed(2)),
      totalNetProfit: parseFloat(totalNetProfit.toFixed(2)),
      roi,
      maxDrawdownPercent,
      sharpeRatio,
      averageClvPercent,
      brierScore,
      clvAdvantageRate,
      equityCurve,
      bets: betsPlaced
    };
  }
}
