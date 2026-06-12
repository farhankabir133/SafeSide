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

const createDummyChain = (): any => {
  const dummy: any = () => dummy;
  dummy.then = (onfulfilled?: any) => Promise.resolve({ data: null, count: 0, error: null }).then(onfulfilled);
  return new Proxy(dummy, {
    get: (target, prop) => {
      if (prop === 'then') return target.then;
      return createDummyChain();
    }
  });
};

// For backward compatibility with existing imports if needed, but we should prefer getSupabase()
export const supabase = {
  from: (table: string) => {
    const client = getSupabase();
    if (!client) return createDummyChain();
    return client.from(table);
  },
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    signInWithOAuth: () => Promise.resolve({ data: null, error: null })
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
