import { Match } from "../types";
import { EloRatingEngine } from "./EloRatingEngine";
import { MathematicalForecast } from "./PoissonPredictor";

export interface TeamDCParameters {
  attack: number;
  defense: number;
}

export interface DCModelParameters {
  teams: Map<number, TeamDCParameters>;
  homeAdvantage: number;
  rho: number;
}

export class DixonColesModel {
  private static instance: DixonColesModel;
  private currentParams: DCModelParameters | null = null;

  private constructor() {}

  public static getInstance(): DixonColesModel {
    if (!DixonColesModel.instance) {
      DixonColesModel.instance = new DixonColesModel();
    }
    return DixonColesModel.instance;
  }

  /**
   * Evaluates the Dixon-Coles low-score dependency correction factor
   */
  public tauAdjustment(x: number, y: number, lambda: number, mu: number, rho: number): number {
    if (x === 0 && y === 0) {
      return Math.max(0.01, 1 - lambda * mu * rho);
    }
    if (x === 1 && y === 0) {
      return Math.max(0.01, 1 + mu * rho);
    }
    if (x === 0 && y === 1) {
      return Math.max(0.01, 1 + lambda * rho);
    }
    if (x === 1 && y === 1) {
      return Math.max(0.01, 1 - rho);
    }
    return 1.0;
  }

  /**
   * Analytical log-factorial function to prevent intermediate multiplication overflows
   */
  private logFactorial(n: number): number {
    let sum = 0;
    for (let i = 2; i <= n; i++) {
      sum += Math.log(i);
    }
    return sum;
  }

  /**
   * Helper standard factorial
   */
  private factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  /**
   * Standard Poisson probability helper
   */
  public calculatePoissonProb(k: number, mean: number): number {
    if (mean <= 0) return k === 0 ? 1.0 : 0.0;
    return (Math.pow(mean, k) * Math.exp(-mean)) / this.factorial(k);
  }

  /**
   * Performs likelihood optimization (coordinate descent & grid search) over historical data
   */
  public fitModel(matches: Match[], iterations = 12): DCModelParameters {
    const completedMatches = matches.filter(m => 
      (m.status === "FINISHED" || m.status === "COMPLETED") &&
      m.score?.fullTime?.home !== null && m.score?.fullTime?.home !== undefined &&
      m.score?.fullTime?.away !== null && m.score?.fullTime?.away !== undefined
    );

    const teamParams = new Map<number, TeamDCParameters>();
    const getOrInitTeam = (teamId: number) => {
      let p = teamParams.get(teamId);
      if (!p) {
        p = { attack: 1.0, defense: 1.0 };
        teamParams.set(teamId, p);
      }
      return p;
    };

    completedMatches.forEach(m => {
      getOrInitTeam(m.homeTeam.id);
      getOrInitTeam(m.awayTeam.id);
    });

    let homeAdvantage = 1.15;
    let rho = -0.08;

    if (completedMatches.length === 0) {
      const emptyParams = { teams: teamParams, homeAdvantage, rho };
      this.currentParams = emptyParams;
      return emptyParams;
    }

    // Temporal weight baseline: most recent match
    let maxTime = 0;
    completedMatches.forEach(m => {
      const t = new Date(m.utcDate).getTime();
      if (t > maxTime) maxTime = t;
    });
    const refDate = maxTime > 0 ? new Date(maxTime) : new Date();

    const matchesWithWeights = completedMatches.map(m => {
      const matchDate = new Date(m.utcDate);
      const diffTime = Math.abs(refDate.getTime() - matchDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      // Exponential decay: weights halve every 120 days
      const weight = Math.exp(-Math.log(2) * diffDays / 120);
      return {
        match: m,
        homeGoals: m.score.fullTime.home as number,
        awayGoals: m.score.fullTime.away as number,
        weight: Math.max(0.1, weight) // safety floor
      };
    });

    // Run iterative tuning algorithm
    for (let iter = 0; iter < iterations; iter++) {
      // 1. Attack parameters updates
      teamParams.forEach((params, teamId) => {
        let num = 0;
        let den = 0;

        matchesWithWeights.forEach(({ match, homeGoals, awayGoals, weight }) => {
          if (match.homeTeam.id === teamId) {
            const oppDefense = teamParams.get(match.awayTeam.id)?.defense ?? 1.0;
            num += homeGoals * weight;
            den += oppDefense * homeAdvantage * weight;
          } else if (match.awayTeam.id === teamId) {
            const oppDefense = teamParams.get(match.homeTeam.id)?.defense ?? 1.0;
            num += awayGoals * weight;
            den += oppDefense * weight;
          }
        });

        params.attack = den > 0 ? Math.max(0.2, num / den) : 1.0;
      });

      // 2. Defense parameters updates
      teamParams.forEach((params, teamId) => {
        let num = 0;
        let den = 0;

        matchesWithWeights.forEach(({ match, homeGoals, awayGoals, weight }) => {
          if (match.homeTeam.id === teamId) {
            const oppAttack = teamParams.get(match.awayTeam.id)?.attack ?? 1.0;
            num += awayGoals * weight;
            den += oppAttack * weight;
          } else if (match.awayTeam.id === teamId) {
            const oppAttack = teamParams.get(match.homeTeam.id)?.attack ?? 1.0;
            num += homeGoals * weight;
            den += oppAttack * homeAdvantage * weight;
          }
        });

        params.defense = den > 0 ? Math.max(0.2, num / den) : 1.0;
      });

      // 3. Home Advantage refinement
      let homeGoalsSum = 0;
      let expectedHomeGoalsSumDen = 0;
      matchesWithWeights.forEach(({ match, homeGoals, weight }) => {
        const homeAttack = teamParams.get(match.homeTeam.id)?.attack ?? 1.0;
        const awayDefense = teamParams.get(match.awayTeam.id)?.defense ?? 1.0;
        homeGoalsSum += homeGoals * weight;
        expectedHomeGoalsSumDen += homeAttack * awayDefense * weight;
      });
      homeAdvantage = expectedHomeGoalsSumDen > 0 ? Math.max(1.0, homeGoalsSum / expectedHomeGoalsSumDen) : 1.15;

      // 4. Normalization constraint: mean attack = 1.0 to guarantee identifiability
      let sumAttack = 0;
      teamParams.forEach(p => sumAttack += p.attack);
      const avgAttack = sumAttack / (teamParams.size || 1);
      if (avgAttack > 0) {
        teamParams.forEach(p => {
          p.attack /= avgAttack;
          p.defense *= avgAttack;
        });
      }
    }

    // 5. Rho draw calibration using 1D search
    let bestRho = -0.08;
    let maxLL = -Infinity;

    for (let testRho = -0.15; testRho <= 0.05; testRho += 0.01) {
      let currentLL = 0;
      let valid = true;

      for (const { match, homeGoals, awayGoals, weight } of matchesWithWeights) {
        const hAttack = teamParams.get(match.homeTeam.id)?.attack ?? 1.0;
        const aDefense = teamParams.get(match.awayTeam.id)?.defense ?? 1.0;
        const aAttack = teamParams.get(match.awayTeam.id)?.attack ?? 1.0;
        const hDefense = teamParams.get(match.homeTeam.id)?.defense ?? 1.0;

        const lambda = hAttack * aDefense * homeAdvantage;
        const mu = aAttack * hDefense;

        const tau = this.tauAdjustment(homeGoals, awayGoals, lambda, mu, testRho);
        if (tau <= 0) {
          valid = false;
          break;
        }

        const termHome = -lambda + homeGoals * Math.log(lambda) - this.logFactorial(homeGoals);
        const termAway = -mu + awayGoals * Math.log(mu) - this.logFactorial(awayGoals);
        const termTau = Math.log(tau);

        currentLL += (termHome + termAway + termTau) * weight;
      }

      if (valid && currentLL > maxLL) {
        maxLL = currentLL;
        bestRho = testRho;
      }
    }

    rho = bestRho;

    const finalParams = { teams: teamParams, homeAdvantage, rho };
    this.currentParams = finalParams;
    return finalParams;
  }

  /**
   * Hybrid lookup incorporating Elo strengths to smooth Dixon-Coles parameters for small samples
   */
  public getBlendedStrengths(
    teamId: number,
    teamName: string,
    modelParams: DCModelParameters,
    historicalMatches: Match[]
  ): TeamDCParameters {
    const eloEngine = EloRatingEngine.getInstance();
    const eloAnalysis = eloEngine.calculateTeamAnalysis(teamId, teamName);

    // Initial Elo-derived strengths as baseline
    const eloAttack = eloAnalysis.attackStrengthIndex;
    const eloDefense = eloAnalysis.defenseStrengthIndex;

    const fitted = modelParams.teams.get(teamId);
    if (!fitted) {
      return { attack: eloAttack, defense: eloDefense };
    }

    // Count completions for sample sizing
    const matchCount = historicalMatches.filter(m => 
      (m.status === "FINISHED" || m.status === "COMPLETED") &&
      (m.homeTeam.id === teamId || m.awayTeam.id === teamId)
    ).length;

    // Direct blending weighting: full Dixon-Coles params reached when matchCount >= 6
    const fittedWeight = Math.min(1.0, matchCount / 6.0);
    const blendAttack = fitted.attack * fittedWeight + eloAttack * (1 - fittedWeight);
    const blendDefense = fitted.defense * fittedWeight + eloDefense * (1 - fittedWeight);

    return {
      attack: parseFloat(blendAttack.toFixed(4)),
      defense: parseFloat(blendDefense.toFixed(4))
    };
  }

  /**
   * Generates a fully mathematically sound Dixon-Coles corrected Poisson forecast
   */
  public generateForecast(
    homeTeamId: number,
    awayTeamId: number,
    homeTeamName: string,
    awayTeamName: string,
    historicalMatches: Match[],
    marketOdds?: { home: number; draw: number; away: number }
  ): MathematicalForecast {
    // 1. Resolve parameters, fitting model if not done already
    let params = this.currentParams;
    if (!params) {
      params = this.fitModel(historicalMatches);
    }

    const homeStrengths = this.getBlendedStrengths(homeTeamId, homeTeamName, params, historicalMatches);
    const awayStrengths = this.getBlendedStrengths(awayTeamId, awayTeamName, params, historicalMatches);

    // 2. Expected goals (xG) calculation incorporating home advantage
    const baselineHomeGoals = 1.35;
    const baselineAwayGoals = 1.15;

    const lambdaHome = Math.max(0.1, homeStrengths.attack * awayStrengths.defense * params.homeAdvantage * baselineHomeGoals);
    const lambdaAway = Math.max(0.1, awayStrengths.attack * homeStrengths.defense * baselineAwayGoals);

    const maxGoals = 8;
    let homeWinSum = 0;
    let awayWinSum = 0;
    let drawSum = 0;
    let bttsSum = 0;
    let totalGoalsProbOver25 = 0;

    const scorelines: Array<{ score: string; probability: number }> = [];

    // 3. Assemble and apply Dixon-Coles corrected coordinate probability distribution
    for (let h = 0; h <= maxGoals; h++) {
      const pH = this.calculatePoissonProb(h, lambdaHome);
      for (let a = 0; a <= maxGoals; a++) {
        const pA = this.calculatePoissonProb(a, lambdaAway);
        const baselineJoint = pH * pA;

        // Apply low-score correlation adjustment
        const correction = this.tauAdjustment(h, a, lambdaHome, lambdaAway, params.rho);
        const jointProb = baselineJoint * correction;

        if (h > a) homeWinSum += jointProb;
        else if (a > h) awayWinSum += jointProb;
        else drawSum += jointProb;

        if (h > 0 && a > 0) bttsSum += jointProb;
        if (h + a > 2) totalGoalsProbOver25 += jointProb;

        scorelines.push({
          score: `${h}-${a}`,
          probability: jointProb
        });
      }
    }

    // Normalization safety logic (distribution totals can drift slightly due to cutoff at maxGoals)
    const rawTotal = homeWinSum + awayWinSum + drawSum || 1.0;
    
    const hWinNorm = homeWinSum / rawTotal;
    const aWinNorm = awayWinSum / rawTotal;
    const drawNorm = drawSum / rawTotal;

    const homeWinProb = Math.min(99, Math.max(1, Math.round(hWinNorm * 100)));
    const awayWinProb = Math.min(99, Math.max(1, Math.round(aWinNorm * 100)));
    const drawProb = Math.max(1, Math.round(drawNorm * 100));

    // Refined Kelly Criterion
    let kellyPercentage = 0;
    if (marketOdds) {
      const bestProb = Math.max(homeWinProb, awayWinProb) / 100;
      const matchingOdds = bestProb === homeWinProb / 100 ? marketOdds.home : marketOdds.away;
      if (matchingOdds > 1) {
        const valueRatio = (matchingOdds * bestProb - (1 - bestProb)) / matchingOdds;
        kellyPercentage = Math.max(0, Math.min(15, Math.round(valueRatio * 1000) / 100));
      }
    }

    // Convert scorelines to final percentages and rank them
    const formattedScorelines = scorelines
      .map(s => ({
        score: s.score,
        probability: parseFloat(((s.probability / rawTotal) * 100).toFixed(2))
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 8);

    return {
      homeWinProb,
      awayWinProb,
      drawProb,
      expectedGoalsHome: parseFloat(lambdaHome.toFixed(2)),
      expectedGoalsAway: parseFloat(lambdaAway.toFixed(2)),
      bttsProb: Math.round((bttsSum / rawTotal) * 100),
      over25Prob: Math.round((totalGoalsProbOver25 / rawTotal) * 100),
      kellyPercentage,
      poissonScorelines: formattedScorelines
    };
  }
}
