-- Create prediction outcomes enum
CREATE TYPE prediction_outcome AS ENUM ('win', 'loss', 'pending');

-- Create the predictions table
CREATE TABLE predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  prediction_score_home INTEGER NOT NULL,
  prediction_score_away INTEGER NOT NULL,
  actual_score_home INTEGER,
  actual_score_away INTEGER,
  confidence_score INTEGER NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('Low', 'Medium', 'High')),
  outcome prediction_outcome DEFAULT 'pending',
  analysis TEXT,
  coincidence_likelihood TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed'))
);

-- Register historical trends for tactical RAG weights
CREATE TABLE historical_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id TEXT NOT NULL,
  win_rate_home DECIMAL(5,2),
  win_rate_away DECIMAL(5,2),
  upset_frequency DECIMAL(5,2),
  avg_xg_home DECIMAL(5,2),
  avg_xg_away DECIMAL(5,2),
  sample_size_years INTEGER DEFAULT 50,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_trends ENABLE ROW LEVEL SECURITY;

-- Policies for Predictions
CREATE POLICY "Users can view their own predictions"
  ON predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own predictions"
  ON predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies for Historical Trends
CREATE POLICY "Public read for trends"
  ON historical_trends FOR SELECT
  USING (true);
