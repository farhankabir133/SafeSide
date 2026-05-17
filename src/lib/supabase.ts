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

// For backward compatibility with existing imports if needed, but we should prefer getSupabase()
export const supabase = {
  from: (table: string) => {
    const client = getSupabase();
    if (!client) {
      // Return a dummy object that doesn't crash but does nothing
      return {
        select: () => ({ order: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }), eq: () => ({ order: () => Promise.resolve({ data: null, error: null }) }) }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
      } as any;
    }
    return client.from(table);
  },
  auth: () => getSupabase()?.auth,
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
