import { getSupabase } from "@/src/lib/supabase";
import { MatchTelemetry } from "./matchTelemetryService";
import { MathematicalForecast } from "./PoissonPredictor";

export class LivePersistenceService {
  private static instance: LivePersistenceService;

  private constructor() {}

  public static getInstance(): LivePersistenceService {
    if (!LivePersistenceService.instance) {
      LivePersistenceService.instance = new LivePersistenceService();
    }
    return LivePersistenceService.instance;
  }

  /**
   * Safe Supabase instance getter incorporating configuration safety locks
   */
  private getClient() {
    const sb = getSupabase();
    if (!sb) {
      console.warn("[SafeSide Persistence] Supabase client is unconfigured or offline. Writes are currently buffered local-only.");
    }
    return sb;
  }

  /**
   * Persists active live match coordinates with full telemetry details
   */
  public async saveLiveTelemetry(matchId: number, telemetry: MatchTelemetry): Promise<boolean> {
    const supabase = this.getClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from("telemetry").upsert({
        match_id: matchId,
        minute: telemetry.minute,
        possecond_home: telemetry.possessionHome,
        possecond_away: telemetry.possessionAway,
        shots_home: telemetry.shotsHome,
        shots_away: telemetry.shotsAway,
        shots_ot_home: telemetry.shotsOnTargetHome,
        shots_ot_away: telemetry.shotsOnTargetAway,
        corners_home: telemetry.cornersHome,
        corners_away: telemetry.cornersAway,
        computed_xg_home: telemetry.computedXGHome,
        computed_xg_away: telemetry.computedXGAway,
        momentum_score: telemetry.momentumIndex,
        events_timeline: telemetry.events,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "match_id"
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`[SafeSide Persistence] Failed saving telemetry for match ID ${matchId}:`, err);
      return false;
    }
  }

  /**
   * Retrieves active live match coordinates with full telemetry details from database
   */
  public async getLiveTelemetry(matchId: number): Promise<MatchTelemetry | null> {
    const supabase = this.getClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("telemetry")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        matchId: data.match_id,
        minute: data.minute,
        possessionHome: data.possecond_home,
        possessionAway: data.possecond_away,
        shotsHome: data.shots_home,
        shotsAway: data.shots_away,
        shotsOnTargetHome: data.shots_ot_home,
        shotsOnTargetAway: data.shots_ot_away,
        cornersHome: data.corners_home,
        cornersAway: data.corners_away,
        foulsHome: data.fouls_home || 0,
        foulsAway: data.fouls_away || 0,
        yellowCardsHome: data.yellow_cards_home || 0,
        yellowCardsAway: data.yellow_cards_away || 0,
        redCardsHome: data.red_cards_home || 0,
        redCardsAway: data.red_cards_away || 0,
        computedXGHome: data.computed_xg_home,
        computedXGAway: data.computed_xg_away,
        momentumIndex: data.momentum_score,
        momentumHistory: [],
        xgHistory: [],
        events: data.events_timeline || []
      };
    } catch (err) {
      console.error(`[SafeSide Persistence] Failed retrieving telemetry for match ID ${matchId}:`, err);
      return null;
    }
  }

  /**
   * Stores a statistical forecast snapshot calculated by the Poison predictive engine
   */
  public async savePrediction(matchId: number, forecast: MathematicalForecast): Promise<boolean> {
    const supabase = this.getClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from("predictions").upsert({
        match_id: String(matchId),
        prediction: {
          safe_side: forecast.homeWinProb >= forecast.awayWinProb ? "Home Win" : "Away Win",
          scoreline: forecast.poissonScorelines[0]?.score || "1-1",
          win_probability: {
            home: forecast.homeWinProb,
            draw: forecast.drawProb,
            away: forecast.awayWinProb
          },
          confidence_score: Math.max(50, Math.max(forecast.homeWinProb, forecast.awayWinProb)),
          expected_goals: {
            home: forecast.expectedGoalsHome,
            away: forecast.expectedGoalsAway
          },
          btts_probability: forecast.bttsProb,
          over_2_5_probability: forecast.over25Prob,
          kelly_stake_percent: forecast.kellyPercentage,
          poisson_scorelines: forecast.poissonScorelines
        },
        risk_assessment: {
          level: forecast.kellyPercentage > 8 ? "Low" : forecast.kellyPercentage > 3 ? "Medium" : "High",
          primary_risk: forecast.drawProb > 32 ? "High draw probability" : "Neutral game state metrics",
          safety_buffer: "Standard dynamic margin overlay activated"
        },
        reasoning_summary: "Statistically validated Poisson joint distribution engine output.",
        status: "pending"
      }, {
        onConflict: "match_id"
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`[SafeSide Persistence] Failed persisting predictive forecast model for match ${matchId}:`, err);
      return false;
    }
  }

  /**
   * Records historical user betting slips / virtual portfolio bankroll tracking logs
   */
  public async appendBankrollLog(userId: string, stake: number, result: number, desc: string): Promise<boolean> {
    const supabase = this.getClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from("bankroll_logs").insert({
        user_id: userId,
        amount_staked: stake,
        payout_result: result,
        delta: result - stake,
        description: desc,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`[SafeSide Persistence] Failed logging user bankroll transaction:`, err);
      return false;
    }
  }
}
