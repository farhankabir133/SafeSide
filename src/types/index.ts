export interface Area {
  id: number;
  name: string;
  code: string;
  flag: string | null;
}

export interface Competition {
  id: number;
  name: string;
  code: string;
  type: string;
  emblem: string | null;
  area?: Area;
}

export interface Team {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
  address?: string;
  website?: string;
  founded?: number;
  clubColors?: string;
  venue?: string;
}

export interface Score {
  winner: string | null;
  duration: string;
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface Match {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  group: string | null;
  lastUpdated: string;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
  competition: Competition;
  area: Area;
  odds?: {
    msg: string;
    homeWin: number;
    draw: number;
    awayWin: number;
  };
}

export interface MatchAnalysis {
  match_id: string;
  prediction: {
    safe_side: string;
    scoreline: string;
    win_probability: { home: number; away: number; draw: number };
    confidence_score: number;
    expected_goals?: { home: number; away: number };
    btts_probability?: number;
    over_2_5_probability?: number;
    kelly_stake_percent?: number;
    value_bet?: boolean;
    value_explanation?: string;
    trap_game_warning?: boolean;
    trap_game_reason?: string;
    poisson_scorelines?: Array<{ score: string; probability: number }>;
  };
  risk_assessment: {
    level: 'Low' | 'Medium' | 'High';
    primary_risk: string;
    safety_buffer: string;
    fatigue_index?: { home: number; away: number };
  };
  form_analysis?: { home: string; away: string };
  micro_events: Array<{
    type: string;
    likelihood: 'High' | 'Med' | 'Low';
    reason: string;
  }>;
  reasoning_summary: string;
}

export interface UserPrediction extends MatchAnalysis {
  id?: string;
  user_id: string;
  home_team: string;
  away_team: string;
  actual_score_home?: number;
  actual_score_away?: number;
  status: 'pending' | 'completed';
  outcome?: 'win' | 'loss' | 'partial';
  created_at?: string;
}
