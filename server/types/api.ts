export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  detail?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page?: number;
  limit?: number;
  total?: number;
}

export interface MatchQuery {
  id?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  competition?: number;
  limit?: number;
}

export interface TeamQuery {
  id?: number;
  name?: string;
}

export interface LeagueQuery {
  id?: number;
}

export interface SSEEvent {
  event: string;
  data: string;
}

export interface TelemetryPayload {
  id: number;
  homeTeam: { name: string; crest: string };
  awayTeam: { name: string; crest: string };
  competition: string;
  minute: number;
  score: { home: number; away: number };
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
  events: any[];
  computedXGHome?: number;
  computedXGAway?: number;
  momentumIndex?: number;
  momentumHistory?: any[];
  xgHistory?: any[];
  originMeta?: any;
}

export interface AnalysisRequest {
  matchId?: number;
  matchTelemetry?: Partial<TelemetryPayload>;
  prompt?: string;
}

export interface ChatRequest {
  message: string;
  history?: Array<{ role: string; content?: string; parts?: Array<{ text: string }> }>;
}
