/**
 * SafeSide Truth Service
 * Automated Verification Node for Intelligence Calibration
 * 
 * Intended execution: Scheduled GitHub Action (Every 6 hours)
 */

import { createClient } from '@supabase/supabase-common'; // Note: In real environment use @supabase/supabase-js
import fetch from 'node-fetch';

// Environment variables required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FOOTBALL_DATA_API_KEY

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const footballApiKey = process.env.FOOTBALL_DATA_API_KEY;

if (!supabaseUrl || !supabaseKey || !footballApiKey) {
  console.error('[TRUTH_SERVICE] CRITICAL: Missing authentication credentials.');
  process.exit(1);
}

// Note: Using standard fetch for Supabase if library not available in JS context
async function updatePrediction(predictionId, actualHome, actualAway) {
  const outcome = (actualHome === actualAway) ? 'pending' : (actualHome > actualAway ? 'win' : 'loss');
  // Simple logic: if user predicted home win and it was a home win, it's a win.
  // Real logic should compare predicted scores vs actual outcomes.
  
  // Fetch prediction details first
  const getRes = await fetch(`${supabaseUrl}/rest/v1/predictions?id=eq.${predictionId}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const predictions = await getRes.json();
  const p = predictions[0];

  if (!p) return;

  const userPredictedWinner = p.prediction_score_home > p.prediction_score_away ? 'HOME_TEAM' : 
                             p.prediction_score_away > p.prediction_score_home ? 'AWAY_TEAM' : 'DRAW';
  
  const actualWinner = actualHome > actualAway ? 'HOME_TEAM' : 
                      actualAway > actualHome ? 'AWAY_TEAM' : 'DRAW';

  const finalOutcome = (userPredictedWinner === actualWinner) ? 'win' : 'loss';

  await fetch(`${supabaseUrl}/rest/v1/predictions?id=eq.${predictionId}`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      actual_score_home: actualHome,
      actual_score_away: actualAway,
      outcome: finalOutcome,
      status: 'completed'
    })
  });
}

async function runTruthService() {
  console.log('[TRUTH_SERVICE] Initializing automated verification sequence...');

  try {
    // 1. Fetch all pending predictions
    const res = await fetch(`${supabaseUrl}/rest/v1/predictions?status=eq.pending`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const pendingPredictions = await res.json();
    console.log(`[TRUTH_SERVICE] Located ${pendingPredictions.length} pending tactical nodes.`);

    for (const prediction of pendingPredictions) {
      const matchId = prediction.match_id;
      
      // 2. Fetch actual result from Football-Data.org
      const matchRes = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
        headers: { 'X-Auth-Token': footballApiKey }
      });

      if (matchRes.ok) {
        const matchData = await matchRes.json();
        
        if (matchData.status === 'FINISHED') {
          const actualHome = matchData.score.fullTime.home;
          const actualAway = matchData.score.fullTime.away;
          
          console.log(`[TRUTH_SERVICE] Verifying Match ${matchId}: Predicted ${prediction.prediction_score_home}-${prediction.prediction_score_away}, Actual ${actualHome}-${actualAway}`);
          
          // 3. Update Supabase
          await updatePrediction(prediction.id, actualHome, actualAway);
          console.log(`[TRUTH_SERVICE] Node ${prediction.id} calibrated.`);
        }
      }
      
      // Respect rate limits (Free tier: 10 requests per minute)
      await new Promise(r => setTimeout(r, 6000)); 
    }

    console.log('[TRUTH_SERVICE] Verification sequence complete.');
  } catch (error) {
    console.error('[TRUTH_SERVICE] Tactical error during verification:', error);
  }
}

runTruthService();
