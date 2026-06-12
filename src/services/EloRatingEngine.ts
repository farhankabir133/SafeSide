import { Match, Team } from "../types";

export interface TeamEloProfile {
  teamId: number;
  teamName: string;
  globalRating: number;
  offensiveRating: number;
  defensiveRating: number;
  momentumHistory: number[]; // Rolling last 10 rating values
  momentumTrend: number;      // Performance slope/trend over recent matches (-20 to +20 typically)
  matchCount: number;
}

export interface EloAnalysis {
  globalRating: number;
  offensiveRating: number;
  defensiveRating: number;
  momentumTrend: number;
  attackStrengthIndex: number;   // Normalised Attack Coefficient for Poisson inputs (e.g., typically 0.5 to 2.5)
  defenseStrengthIndex: number;  // Normalised Defense Coefficient for Poisson inputs (e.g., typically 0.5 to 2.0)
}

export class EloRatingEngine {
  private static instance: EloRatingEngine;
  private teamRatings: Map<number, TeamEloProfile> = new Map();

  // Mathematical Parameters
  private readonly BASE_RATING = 1500;
  private readonly DEFAULT_HOME_ADVANTAGE = 80; // Elo points home advantage
  private readonly K_FACTOR_BASE = 30;
  private readonly GOAL_K_FACTOR = 15; // Speed of learning for offensive/defensive metrics
  private readonly LEAGUE_AVG_GOALS = 1.35; // Baseline expected goals per team per match

  private constructor() {}

  public static getInstance(): EloRatingEngine {
    if (!EloRatingEngine.instance) {
      EloRatingEngine.instance = new EloRatingEngine();
    }
    return EloRatingEngine.instance;
  }

  /**
   * Reset maps and clear team states (crucial for full historical recalculations)
   */
  public resetRegistry(): void {
    this.teamRatings.clear();
  }

  /**
   * Safe getter or initialiser for team ratings
   */
  public getOrCreateProfile(teamId: number, teamName: string): TeamEloProfile {
    let profile = this.teamRatings.get(teamId);
    if (!profile) {
      profile = {
        teamId,
        teamName,
        globalRating: this.BASE_RATING,
        offensiveRating: this.BASE_RATING,
        defensiveRating: this.BASE_RATING,
        momentumHistory: [this.BASE_RATING],
        momentumTrend: 0,
        matchCount: 0,
      };
      this.teamRatings.set(teamId, profile);
    }
    return profile;
  }

  /**
   * Fetches full normalised rating coefficients & indices for a team
   */
  public calculateTeamAnalysis(teamId: number, teamName = "Unknown"): EloAnalysis {
    const profile = this.getOrCreateProfile(teamId, teamName);
    
    // Convert offensive and defensive ratings into standard Poisson strength multipliers
    // Scaling: 1500 maps to 1.0. Every 100 rating points above/below maps to roughly +/- 15% strength adjustment
    const attackStrengthIndex = parseFloat(Math.max(0.2, Math.min(3.0, Math.pow(10, (profile.offensiveRating - this.BASE_RATING) / 600))).toFixed(3));
    const defenseStrengthIndex = parseFloat(Math.max(0.2, Math.min(3.0, Math.pow(10, (this.BASE_RATING - profile.defensiveRating) / 600))).toFixed(3));

    return {
      globalRating: Math.round(profile.globalRating),
      offensiveRating: Math.round(profile.offensiveRating),
      defensiveRating: Math.round(profile.defensiveRating),
      momentumTrend: parseFloat(profile.momentumTrend.toFixed(2)),
      attackStrengthIndex,
      defenseStrengthIndex,
    };
  }

  /**
   * Get K-Factor adjusted by competition importance & league-strength normalization
   */
  private getImportanceKFactor(competitionCode: string): number {
    const code = (competitionCode || "").toUpperCase();
    switch (code) {
      case "CL": // Champions League
      case "EC": // European Championship
      case "WC": // World Cup
        return this.K_FACTOR_BASE * 1.5; // K = 45
      case "PL": // Premier League
      case "BL1": // Bundesliga
      case "PD": // La Liga
      case "SA": // Serie A
        return this.K_FACTOR_BASE * 1.3; // K = 39
      case "FL1": // Ligue 1
      case "EL": // Europa League
        return this.K_FACTOR_BASE * 1.1; // K = 33
      default:
        return this.K_FACTOR_BASE; // K = 30
    }
  }

  /**
   * Get competition strength normalization multiplier
   */
  private getLeagueStrengthNorm(competitionCode: string): number {
    const code = (competitionCode || "").toUpperCase();
    switch (code) {
      case "CL": return 1.4;
      case "PL": return 1.35;
      case "BL1": return 1.25;
      case "PD": return 1.25;
      case "SA": return 1.2;
      case "FL1": return 1.1;
      case "EL": return 1.15;
      default: return 1.0;
    }
  }

  /**
   * Processes a single completed fixture and executes rolling rating updates
   */
  public updateRatingsFromMatch(match: Match): void {
    const { homeTeam, awayTeam, score, competition } = match;
    if (!homeTeam || !awayTeam || !score) return;

    const homeG = score.fullTime.home;
    const awayG = score.fullTime.away;

    // Only process completed matches with solid scores
    if (homeG === null || homeG === undefined || awayG === null || awayG === undefined) {
      return;
    }

    const homeProfile = this.getOrCreateProfile(homeTeam.id, homeTeam.name);
    const awayProfile = this.getOrCreateProfile(awayTeam.id, awayTeam.name);

    // 1. GLOBAL ELO RATING CALCULATIONS
    const compCode = competition?.code || "";
    const kFactorBase = this.getImportanceKFactor(compCode);
    const strengthNorm = this.getLeagueStrengthNorm(compCode);

    // Standard Expected Probability calculation with Home Advantage
    const deltaRating = (homeProfile.globalRating + this.DEFAULT_HOME_ADVANTAGE) - awayProfile.globalRating;
    const homeExpected = 1 / (Math.pow(10, -deltaRating / 400) + 1);
    const awayExpected = 1 - homeExpected;

    // Actual Outcome determination
    let homeActual = 0.5;
    let awayActual = 0.5;
    if (homeG > awayG) {
      homeActual = 1.0;
      awayActual = 0.0;
    } else if (awayG > homeG) {
      homeActual = 0.0;
      awayActual = 1.0;
    }

    // Goal Difference index scaling (to reward wider margin victories mathematically)
    const goalDiff = Math.abs(homeG - awayG);
    let gdMultiplier = 1.0;
    if (goalDiff === 2) {
      gdMultiplier = 1.5;
    } else if (goalDiff >= 3) {
      gdMultiplier = (11 + goalDiff) / 8;
    }

    // Dynamic scaled final K
    const finalK = kFactorBase * strengthNorm * gdMultiplier;

    // Ratings shift calculation
    const ratingShift = finalK * (homeActual - homeExpected);

    // Apply shifts
    homeProfile.globalRating += ratingShift;
    awayProfile.globalRating -= ratingShift;

    // 2. OFFENSIVE & DEFENSIVE RATING UPDATES
    // Expected Goals equations derived dynamically from ratings
    const homeAttackMult = Math.pow(10, (homeProfile.offensiveRating - this.BASE_RATING) / 600);
    const awayDefMult = Math.pow(10, (this.BASE_RATING - awayProfile.defensiveRating) / 600);
    const expectedHomeGoals = this.LEAGUE_AVG_GOALS * homeAttackMult * awayDefMult * 1.15; // Home advantage multiplier on xG

    const awayAttackMult = Math.pow(10, (awayProfile.offensiveRating - this.BASE_RATING) / 600);
    const homeDefMult = Math.pow(10, (this.BASE_RATING - homeProfile.defensiveRating) / 600);
    const expectedAwayGoals = this.LEAGUE_AVG_GOALS * awayAttackMult * homeDefMult * 0.85;

    // Shifts applied proportionally using GOAL_K_FACTOR
    const homeAttackShift = this.GOAL_K_FACTOR * (homeG - expectedHomeGoals);
    const awayDefShift = this.GOAL_K_FACTOR * (expectedHomeGoals - homeG); // If home scored more than expected, away defense drops
    
    const awayAttackShift = this.GOAL_K_FACTOR * (awayG - expectedAwayGoals);
    const homeDefShift = this.GOAL_K_FACTOR * (expectedAwayGoals - awayG);

    // Update profiles within solid bounds [800, 2200]
    homeProfile.offensiveRating = Math.max(800, Math.min(2200, homeProfile.offensiveRating + homeAttackShift));
    homeProfile.defensiveRating = Math.max(800, Math.min(2200, homeProfile.defensiveRating + homeDefShift));
    
    awayProfile.offensiveRating = Math.max(800, Math.min(2200, awayProfile.offensiveRating + awayAttackShift));
    awayProfile.defensiveRating = Math.max(800, Math.min(2200, awayProfile.defensiveRating + awayDefShift));

    // 3. TRACKING ROLLING MOMENTUM
    homeProfile.matchCount++;
    awayProfile.matchCount++;

    homeProfile.momentumHistory.push(homeProfile.globalRating);
    awayProfile.momentumHistory.push(awayProfile.globalRating);

    // Keep history bounded to 10 entries
    if (homeProfile.momentumHistory.length > 10) homeProfile.momentumHistory.shift();
    if (awayProfile.momentumHistory.length > 10) awayProfile.momentumHistory.shift();

    // Calculate Trend: simple regression/slope indicator over rolling entries
    homeProfile.momentumTrend = this.calculateSlope(homeProfile.momentumHistory);
    awayProfile.momentumTrend = this.calculateSlope(awayProfile.momentumHistory);
  }

  /**
   * Helper utility calculating the trend line slope of rating points
   */
  private calculateSlope(history: number[]): number {
    if (history.length < 2) return 0;
    const n = history.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += history[i];
      sumXY += i * history[i];
      sumXX += i * i;
    }

    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) return 0;

    return (n * sumXY - sumX * sumY) / denominator;
  }

  /**
   * Allows high-throughput recalculations of full historical sequences
   */
  public recalculateHistoricalRatings(matches: Match[]): void {
    this.resetRegistry();

    // Ensure we sort chronologically by match date/time to maintain proper state transition
    const sortedMatches = [...matches].sort((a, b) => {
      const dateA = new Date(a.utcDate).getTime();
      const dateB = new Date(b.utcDate).getTime();
      return dateA - dateB;
    });

    for (const match of sortedMatches) {
      if (match.status === "FINISHED" || match.status === "COMPLETED") {
        this.updateRatingsFromMatch(match);
      }
    }
  }
}
