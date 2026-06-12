import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const isPlaceholder = (val: string | undefined | null) => 
    !val || 
    typeof val !== 'string' ||
    val.trim() === "" || 
    val.includes("YOUR_") || 
    val.includes("MY_") || 
    val === "undefined" || 
    val === "null" ||
    val.length < 10;

  if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
    return null;
  }

  // Ensure the URL looks like a valid Supabase URL
  if (!supabaseUrl?.startsWith('https://')) {
    console.warn("Invalid Supabase URL format. Must start with https://");
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!);
    return supabaseInstance;
  } catch (e) {
    console.error("Supabase client init failed:", e);
    return null;
  }
};

/**
 * Check if Supabase is properly configured with real credentials
 */
export const isSupabaseConfigured = (): boolean => {
  try {
    return getSupabase() !== null;
  } catch {
    return false;
  }
};

function getSeededPredictions(): Prediction[] {
  const now = Date.now();
  const pastDays = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  
  return [
    {
      id: "seed-p1",
      match_id: "450203",
      home_team: "Manchester City FC",
      away_team: "Arsenal FC",
      competition_name: "Premier League",
      prediction_score_home: 2,
      prediction_score_away: 1,
      actual_score_home: 3,
      actual_score_away: 1,
      confidence_score: 82,
      risk_level: "Low",
      outcome: "win",
      status: "completed",
      analysis: "Highly robust home conversion factors relative to Arsenal key defensive gaps.",
      coincidence_likelihood: JSON.stringify([{ type: "Early Booking", likelihood: "High", reason: "Intense midfield friction" }]),
      created_at: pastDays(3)
    },
    {
      id: "seed-p2",
      match_id: "BT-902",
      home_team: "Arsenal FC",
      away_team: "Chelsea FC",
      competition_name: "Premier League",
      prediction_score_home: 2,
      prediction_score_away: 1,
      actual_score_home: 2,
      actual_score_away: 1,
      confidence_score: 68,
      risk_level: "Medium",
      outcome: "win",
      status: "completed",
      analysis: "Stamford Bridge transition lag indicates clean sheet threat for Chelsea.",
      coincidence_likelihood: JSON.stringify([{ type: "Late Corner Goal", likelihood: "Med", reason: "Arsenal physical set piece density" }]),
      created_at: pastDays(2)
    },
    {
      id: "seed-p3",
      match_id: "BT-887",
      home_team: "Borussia Dortmund",
      away_team: "FC Bayern München",
      competition_name: "Bundesliga",
      prediction_score_home: 1,
      prediction_score_away: 3,
      actual_score_home: 2,
      actual_score_away: 2,
      confidence_score: 74,
      risk_level: "High",
      outcome: "loss",
      status: "completed",
      analysis: "Bayern Munich decadal dominance suggests high scoring away conversion index.",
      coincidence_likelihood: JSON.stringify([{ type: "Harry Kane Brace", likelihood: "High", reason: "Target physical box positioning" }]),
      created_at: pastDays(1)
    },
    {
      id: "seed-p4",
      match_id: "500100",
      home_team: "Bologna FC 1909",
      away_team: "FC Internazionale Milano",
      competition_name: "Serie A",
      prediction_score_home: 1,
      prediction_score_away: 2,
      confidence_score: 60,
      risk_level: "Medium",
      outcome: "pending",
      status: "pending",
      analysis: "Inter Milan physical fatigue limits high goal margins, expecting 1-2 hedge outcome.",
      coincidence_likelihood: JSON.stringify([{ type: "Late Substitute Goal", likelihood: "Low", reason: "Thuram rotations" }]),
      created_at: pastDays(0)
    }
  ];
}

class MockQueryBuilder {
  private table: string;
  private filters: Array<(item: any) => boolean> = [];
  private sortField: string | null = null;
  private sortAscending = true;
  private isSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: { count?: string }) {
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push(item => item[field] === value);
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.sortField = field;
    this.sortAscending = options?.ascending ?? true;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async upsert(values: any | any[], options?: { onConflict?: string }) {
    const tableData = this.getTableData();
    const rows = Array.isArray(values) ? values : [values];
    
    rows.forEach(row => {
      const conflictField = options?.onConflict || 'match_id';
      const existingIndex = tableData.findIndex(item => item[conflictField] === row[conflictField]);
      const newRow = { 
        id: row.id || Math.random().toString(36).substring(2, 11),
        created_at: row.created_at || new Date().toISOString(),
        ...row 
      };
      if (existingIndex > -1) {
        tableData[existingIndex] = { ...tableData[existingIndex], ...newRow };
      } else {
        tableData.push(newRow);
      }
    });

    this.saveTableData(tableData);
    return { data: rows, error: null };
  }

  private getTableData(): any[] {
    try {
      const data = localStorage.getItem(`mock_db_${this.table}`);
      if (!data) {
        if (this.table === 'predictions') {
          const seeded = getSeededPredictions();
          localStorage.setItem(`mock_db_predictions`, JSON.stringify(seeded));
          return seeded;
        }
        return [];
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private saveTableData(data: any[]) {
    try {
      localStorage.setItem(`mock_db_${this.table}`, JSON.stringify(data));
    } catch {}
  }

  async then(onfulfilled?: (value: any) => any) {
    let data = this.getTableData();
    
    // Apply filters
    for (const filter of this.filters) {
      data = data.filter(filter);
    }

    // Apply sorting
    if (this.sortField) {
      const field = this.sortField;
      const asc = this.sortAscending;
      data.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    }

    let result: any = { data, error: null, count: data.length };
    if (this.isSingle) {
      result = { data: data[0] || null, error: data[0] ? null : { message: 'Not found' } };
    }

    if (onfulfilled) {
      return Promise.resolve(result).then(onfulfilled);
    }
    return Promise.resolve(result);
  }
}

const mockAuth = {
  getSession: () => {
    try {
      const savedUserStr = localStorage.getItem('mock_user_session');
      if (savedUserStr) {
        const user = JSON.parse(savedUserStr);
        return Promise.resolve({ data: { session: { user, access_token: 'mock-token-xyz' } }, error: null });
      }
    } catch {}
    return Promise.resolve({ data: { session: null }, error: null });
  },
  onAuthStateChange: (callback: any) => {
    const listener = () => {
      try {
        const savedUserStr = localStorage.getItem('mock_user_session');
        const user = savedUserStr ? JSON.parse(savedUserStr) : null;
        callback(savedUserStr ? 'SIGNED_IN' : 'SIGNED_OUT', savedUserStr ? { user, access_token: 'mock-token-xyz' } : null);
      } catch {
        callback('SIGNED_OUT', null);
      }
    };
    window.addEventListener('mock_auth_change', listener);
    
    try {
      const savedUserStr = localStorage.getItem('mock_user_session');
      const user = savedUserStr ? JSON.parse(savedUserStr) : null;
      setTimeout(() => {
        callback(savedUserStr ? 'SIGNED_IN' : 'SIGNED_OUT', savedUserStr ? { user, access_token: 'mock-token-xyz' } : null);
      }, 0);
    } catch {}

    return { 
      data: { 
        subscription: { 
          unsubscribe: () => {
            window.removeEventListener('mock_auth_change', listener);
          } 
        } 
      } 
    };
  },
  signInWithPassword: ({ email }: { email: string }) => {
    const user = { id: 'mock-user-1234', email, role: 'authenticated', email_confirmed_at: new Date().toISOString() };
    localStorage.setItem('mock_user_session', JSON.stringify(user));
    window.dispatchEvent(new Event('mock_auth_change'));
    return Promise.resolve({ data: { user, session: { user, access_token: 'mock-token-xyz' } }, error: null });
  },
  signUp: ({ email }: { email: string }) => {
    const user = { id: 'mock-user-1234', email, role: 'authenticated', email_confirmed_at: new Date().toISOString() };
    localStorage.setItem('mock_user_session', JSON.stringify(user));
    window.dispatchEvent(new Event('mock_auth_change'));
    return Promise.resolve({ data: { user, session: { user, access_token: 'mock-token-xyz' } }, error: null });
  },
  signOut: () => {
    localStorage.removeItem('mock_user_session');
    window.dispatchEvent(new Event('mock_auth_change'));
    return Promise.resolve({ error: null });
  },
  signInWithOAuth: (options: any) => {
    const user = { id: 'mock-user-oauth', email: 'oauth-analyst@safeside.io', role: 'authenticated' };
    localStorage.setItem('mock_user_session', JSON.stringify(user));
    window.dispatchEvent(new Event('mock_auth_change'));
    if (options?.options?.redirectTo) {
      window.location.href = options.options.redirectTo;
    }
    return Promise.resolve({ data: { user, session: { user, access_token: 'mock-token-xyz' } }, error: null });
  }
};

// For backward compatibility with existing imports if needed, but we should prefer getSupabase()
export const supabase = {
  from: (table: string) => {
    const client = getSupabase();
    if (!client) return new MockQueryBuilder(table) as any;
    return client.from(table);
  },
  auth: {
    getSession: () => {
      const client = getSupabase();
      if (!client) return mockAuth.getSession();
      return client.auth.getSession();
    },
    onAuthStateChange: (callback: any) => {
      const client = getSupabase();
      if (!client) return mockAuth.onAuthStateChange(callback);
      return client.auth.onAuthStateChange(callback);
    },
    signInWithPassword: (credentials: any) => {
      const client = getSupabase();
      if (!client) return mockAuth.signInWithPassword(credentials);
      return client.auth.signInWithPassword(credentials);
    },
    signUp: (credentials: any) => {
      const client = getSupabase();
      if (!client) return mockAuth.signUp(credentials);
      return client.auth.signUp(credentials);
    },
    signOut: () => {
      const client = getSupabase();
      if (!client) return mockAuth.signOut();
      return client.auth.signOut();
    },
    signInWithOAuth: (options: any) => {
      const client = getSupabase();
      if (!client) return mockAuth.signInWithOAuth(options);
      return client.auth.signInWithOAuth(options);
    }
  } as any
};

export interface Prediction {
  id: string;
  match_id: string;
  user_id?: string;
  home_team: string;
  away_team: string;
  competition_name?: string;
  prediction_score_home: number;
  prediction_score_away: number;
  actual_score_home?: number;
  actual_score_away?: number;
  confidence_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  outcome: 'win' | 'loss' | 'pending';
  analysis: string;
  full_analysis?: string;
  coincidence_likelihood: string;
  created_at: string;
  status: 'pending' | 'completed';
}

export interface HistoricalTrend {
  id: string;
  league_id: string;
  win_rate_home: number;
  win_rate_away: number;
  upset_frequency: number;
  avg_xg_home: number;
  avg_xg_away: number;
  sample_size_years: number;
  updated_at: string;
}
