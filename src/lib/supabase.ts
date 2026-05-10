import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
};

// For backward compatibility with existing imports if needed, but we should prefer getSupabase()
export const supabase = {
  from: (table: string) => getSupabase().from(table),
  auth: () => getSupabase().auth,
};

export interface Prediction {
  id: string;
  match_id: string;
  home_team: string;
  away_team: string;
  prediction_score_home: number;
  prediction_score_away: number;
  actual_score_home?: number;
  actual_score_away?: number;
  confidence_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  analysis: string;
  coincidence_likelihood: string;
  created_at: string;
  status: 'pending' | 'completed';
}
