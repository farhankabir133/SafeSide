-- Create the predictions table
CREATE TABLE predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  prediction_score_home INTEGER NOT NULL,
  prediction_score_away INTEGER NOT NULL,
  actual_score_home INTEGER,
  actual_score_away INTEGER,
  confidence_score INTEGER NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('Low', 'Medium', 'High')),
  analysis TEXT,
  coincidence_likelihood TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed'))
);

-- Enable Row Level Security (RLS)
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read (for the dashboard)
CREATE POLICY "Allow public read access"
  ON predictions FOR SELECT
  USING (true);

-- Create policy to allow public insert (for the demo)
-- In a real app, you'd restrict this to authenticated users or a backend role
CREATE POLICY "Allow public insert access"
  ON predictions FOR INSERT
  WITH CHECK (true);
