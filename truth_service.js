import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

/**
 * SafeSide Truth Service
 * Automatically reconciles AI predictions with real-world results.
 */
async function reconcilePredictions() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );

  const { data: predictions, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('status', 'pending');

  if (error) {
    console.error('[TRUTH SERVICE] Database Error:', error.message);
    return;
  }

  console.log(`[TRUTH SERVICE] Initializing reconciliation for ${predictions.length} pending tactical operations...`);

  for (const pred of predictions) {
    try {
      const response = await fetch(`https://api.football-data.org/v4/matches/${pred.match_id}`, {
        headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY }
      });
      
      if (!response.ok) {
        console.warn(`[TRUTH SERVICE] Match ${pred.match_id} fetch failed: ${response.status}`);
        continue;
      }

      const match = await response.json();

      if (match.status === 'FINISHED') {
        const actualHome = match.score.fullTime.home;
        const actualAway = match.score.fullTime.away;
        
        let outcome = 'loss';
        const predictedWinner = pred.prediction_score_home > pred.prediction_score_away ? 'home' : 
                                pred.prediction_score_away > pred.prediction_score_home ? 'away' : 'draw';
        const actualWinner = actualHome > actualAway ? 'home' : 
                             actualAway > actualHome ? 'home' : 'draw';

        if (predictedWinner === actualWinner) outcome = 'win';

        const { error: updateError } = await supabase
          .from('predictions')
          .update({
            actual_score_home: actualHome,
            actual_score_away: actualAway,
            outcome: outcome,
            status: 'completed'
          })
          .eq('id', pred.id);

        if (updateError) {
          console.error(`[TRUTH SERVICE] Update failed for ${pred.id}:`, updateError.message);
        } else {
          console.log(`[VERIFIED] Match ${pred.match_id}: Expected ${pred.prediction_score_home}-${pred.prediction_score_away}, Actual ${actualHome}-${actualAway} -> ${outcome.toUpperCase()}`);
        }
      } else {
         console.log(`[PENDING] Match ${pred.match_id} status: ${match.status}. Skipping.`);
      }
    } catch (e) {
      console.error(`[TRUTH SERVICE] Fatal error during reconciliation of match ${pred.match_id}:`, e.message);
    }
  }
  
  console.log('[TRUTH SERVICE] Cycle complete.');
}

reconcilePredictions();
