import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { MatchAnalysis } from '@/src/services/geminiService';
import { MultiModelPrediction } from '@/src/types/prediction';

type PredictionRecord = MatchAnalysis | MultiModelPrediction;

export function usePredictions() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, PredictionRecord>>({});
  const [stats, setStats] = useState({ total: 0, accuracy: 0 });
  const [isDemo, setIsDemo] = useState(false);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; reset: number } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});
  const [globalCooldown, setGlobalCooldown] = useState<number | null>(null);
  const [hasAttemptedInitialAnalysis, setHasAttemptedInitialAnalysis] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('match_predictions_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const filtered: Record<string, PredictionRecord> = {};
        const now = Date.now();
        Object.entries(parsed).forEach(([id, data]: [string, any]) => {
          if (data && data._timestamp && now - data._timestamp < 1000 * 60 * 60 * 48) {
            filtered[id] = data;
          }
        });
        setPredictions(prev => ({ ...prev, ...filtered }));
      }
    } catch (e) {
      console.warn("Failed to load local predictions cache");
    }
  }, []);

  useEffect(() => {
    if (Object.keys(predictions).length > 0) {
      try {
        localStorage.setItem('match_predictions_cache', JSON.stringify(predictions));
      } catch (e) {}
    }
  }, [predictions]);

  useEffect(() => {
    fetchMatches();
    fetchStats();
    fetchHistoricalData();
    fetchPredictionsFromDb();
  }, [user]);

  const fetchPredictionsFromDb = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const storedPredictions: Record<string, PredictionRecord> = {};
        data.forEach(p => {
          if (p.full_analysis) {
            try {
              storedPredictions[p.match_id] = typeof p.full_analysis === 'string' 
                ? JSON.parse(p.full_analysis) 
                : p.full_analysis;
            } catch (e) {}
          }
        });
        setPredictions(prev => ({ ...prev, ...storedPredictions }));
        if (data.length > 0) setHasAttemptedInitialAnalysis(true);
      }
    } catch (e) {
      console.warn("Could not fetch predictions from DB:", (e as Error).message);
    }
  };

  useEffect(() => {
    if (matches.length > 0 && !hasAttemptedInitialAnalysis && !loading) {
      setHasAttemptedInitialAnalysis(true);
    }
  }, [matches.length, loading, hasAttemptedInitialAnalysis]);

  useEffect(() => {
    const liveStatus = ['IN_PLAY', 'PAUSED', 'LIVE'];
    const hasLiveMatches = matches.some(m => liveStatus.includes(m.status));
    const delay = hasLiveMatches ? 3000 : 15000;

    const interval = setInterval(() => {
      fetchMatches(true); 
    }, delay);

    return () => clearInterval(interval);
  }, [matches.length, matches.some(m => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status))]);

  const fetchStats = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, count, error } = await supabase
        .from('predictions')
        .select('*', { count: 'exact' });

      if (error) throw error;
      
      if (data) {
        const completed = data.filter(p => (p as any).status === 'completed');
        const accurate = completed.filter(p => {
          const actualDiff = ((p as any).actual_score_home ?? 0) - ((p as any).actual_score_away ?? 0);
          const predictedDiff = (p as any).prediction_score_home - (p as any).prediction_score_away;
          return Math.sign(actualDiff) === Math.sign(predictedDiff);
        });
        
        setStats({
          total: count || 0,
          accuracy: completed.length > 0 ? (accurate.length / completed.length) * 100 : 0
        });
      }
    } catch (e) {
      console.warn("Supabase stats fetch skipped:", (e as Error).message);
    }
  };

  const fetchMatches = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/matches');
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        let errorTxt = "Neural telemetry unaligned (Expected JSON but received HTML/Plaintext).";
        try {
          const bodyTxt = await res.text();
          if (bodyTxt.includes("NO_DATA_AVAILABLE")) {
            errorTxt = "Football Data API limits reached. System is verify-locked out.";
          }
        } catch (_) {}
        throw new Error(errorTxt);
      }

      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setIsDemo(!!data.isMock);
      if (data.requestsRemaining !== undefined) {
        setRateLimit({ 
          remaining: parseInt(data.requestsRemaining), 
          reset: parseInt(data.resetTime) 
        });
      }
      
      const relevant = (data.matches || []).filter((m: any) => 
        ['TIMED', 'SCHEDULED', 'LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED', 'AWARDED'].includes(m.status)
      );
      setMatches(relevant);
      setLastSyncedAt(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const runAnalysis = async (matchId: string) => {
    if (analyzingIds.has(matchId)) return;
    
    if (globalCooldown && Date.now() < globalCooldown) {
      const remainingSec = Math.ceil((globalCooldown - Date.now()) / 1000);
      if (remainingSec > 60) {
        throw new Error(`Neural processor cooling down. Retry in ${Math.ceil(remainingSec/60)}m.`);
      } else {
        throw new Error(`Neural processor cooling down. Retry in ${remainingSec}s.`);
      }
    }
    
    const lastAttempt = localStorage.getItem(`last_analysis_${matchId}`);
    if (lastAttempt && Date.now() - parseInt(lastAttempt) < 10000) {
       throw new Error("System processing. Please wait 10s.");
    }

    const match = matches.find(m => m.id.toString() === matchId);
    if (!match) return;

    try {
      localStorage.setItem(`last_analysis_${matchId}`, Date.now().toString());
      setAnalyzingIds(prev => new Set(prev).add(matchId));
      setAnalysisErrors(prev => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });

      const result: MultiModelPrediction = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: parseInt(matchId) })
      }).then(res => {
        if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
        return res.json();
      });

      const resultWithMeta = { ...result, _timestamp: Date.now() };
      
      setPredictions(prev => ({ ...prev, [matchId]: resultWithMeta }));
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });

      const poisson = result.poissonForecast;
      const mostLikelyScoreline = poisson.poissonScorelines.length > 0 
        ? poisson.poissonScorelines[0].score 
        : '0-0';
      const [h, a] = mostLikelyScoreline.split('-').map(n => parseInt(n.trim()));

      let legacyMatchAnalysis: MatchAnalysis;
      try {
        legacyMatchAnalysis = {
          match_id: matchId,
          prediction: {
            safe_side: result.quantitativeReasoning.finalQuantitativeVerdict,
            scoreline: mostLikelyScoreline,
            win_probability: {
              home: poisson.homeWinProb,
              away: poisson.awayWinProb,
              draw: poisson.drawProb
            },
            confidence_score: Math.round(result.calibrationResult.calibratedHighestProb * 100),
            volatility_index: result.anomalyReport.volatilityIndex,
            expected_goals: { home: poisson.expectedGoalsHome, away: poisson.expectedGoalsAway },
            btts_probability: poisson.bttsProb,
            over_2_5_probability: poisson.over25Prob,
            kelly_stake_percent: poisson.kellyPercentage,
            poisson_scorelines: poisson.poissonScorelines
          },
          risk_assessment: {
            level: result.anomalyReport.volatilityIndex > 70 ? 'High' : result.anomalyReport.volatilityIndex > 40 ? 'Medium' : 'Low',
            primary_risk: result.quantitativeReasoning.uncertaintyExplicitLog || 'Market variance',
            safety_buffer: result.anomalyReport.collapseRiskDetected ? 'Collapse risk detected' : 'Stable'
          },
          micro_events: result.quantitativeReasoning.evidenceChain.map(e => ({
            type: e.metricName,
            likelihood: e.statisticalSignificance === 'CRITICAL' ? 'High' : e.statisticalSignificance === 'NOTABLE' ? 'Med' : 'Low',
            reason: e.deducedImpact
          })),
          reasoning_summary: result.quantitativeReasoning.verdictRationale
        };
      } catch (adaptErr) {
        legacyMatchAnalysis = {
          match_id: matchId,
          prediction: {
            safe_side: 'HOLD',
            scoreline: mostLikelyScoreline,
            win_probability: { home: 33, away: 33, draw: 34 },
            confidence_score: 50,
            volatility_index: 50,
            expected_goals: { home: 1.2, away: 1.2 },
            btts_probability: 0.5,
            over_2_5_probability: 0.5,
            kelly_stake_percent: 0,
            poisson_scorelines: [{ score: mostLikelyScoreline, probability: 0.15 }]
          },
          risk_assessment: {
            level: 'Medium',
            primary_risk: 'Adaptation error',
            safety_buffer: 'Minimal'
          },
          micro_events: [],
          reasoning_summary: result.quantitativeReasoning?.verdictRationale || 'Analysis adaptation failed'
        };
      }

      try {
        if (isSupabaseConfigured()) {
          const payload: any = {
            match_id: matchId,
            home_team: match.homeTeam.name,
            away_team: match.awayTeam.name,
            competition_name: match.competition?.name || 'Unknown',
            prediction_score_home: isNaN(h) ? 0 : h,
            prediction_score_away: isNaN(a) ? 0 : a,
            confidence_score: legacyMatchAnalysis.prediction.confidence_score,
            volatility_index: result.anomalyReport.volatilityIndex,
            risk_level: legacyMatchAnalysis.risk_assessment.level,
            analysis: legacyMatchAnalysis.reasoning_summary,
            full_analysis: JSON.stringify(result),
            coincidence_likelihood: JSON.stringify(legacyMatchAnalysis.micro_events),
            status: 'pending'
          };

          if (user) {
            payload.user_id = user.id;
          }

          await supabase.from('predictions').upsert(payload, { onConflict: 'match_id' });
          await fetchStats();
        }
      } catch (dbError) {
        console.warn("Could not persist prediction to Supabase:", (dbError as Error).message);
      }
    } catch (e: any) {
      console.error("Analysis failed:", e);
      
      try {
        const message = e.message || "";
        let errData: any = null;
        
        const jsonMatch = message.match(/\{.*\}/);
        if (jsonMatch) {
          try {
            errData = JSON.parse(jsonMatch[0]);
          } catch (p) {
            console.warn("Soft parse failed:", p);
          }
        }
        
        if (errData && errData.isQuotaExceeded) {
          const cooldownDuration = errData.retryAfterMs || (10 * 60 * 1000);
          setGlobalCooldown(Date.now() + cooldownDuration);
          setAnalysisErrors(prev => ({ ...prev, [matchId]: errData.error || "Neural processor at capacity." }));
        } else {
          setAnalysisErrors(prev => ({ ...prev, [matchId]: errData?.error || e.message || "Unknown error" }));
        }
      } catch (parseError) {
        if (e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("capacity")) {
          setGlobalCooldown(Date.now() + 10 * 60 * 1000);
          setAnalysisErrors(prev => ({ ...prev, [matchId]: "Neural processor at capacity. Cooling down." }));
        } else {
          setAnalysisErrors(prev => ({ ...prev, [matchId]: e.message || "Unknown error" }));
        }
      }
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
      throw e;
    }
  };

  const fetchHistoricalData = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const grouped: Record<string, { total: number; correct: number }> = {};
        
        data.forEach(p => {
          const d = new Date((p as any).created_at);
          const date = d.toISOString().split('T')[0];
          if (!grouped[date]) grouped[date] = { total: 0, correct: 0 };
          
          grouped[date].total++;
          const actualDiff = ((p as any).actual_score_home ?? 0) - ((p as any).actual_score_away ?? 0);
          const predictedDiff = (p as any).prediction_score_home - (p as any).prediction_score_away;
          if (Math.sign(actualDiff) === Math.sign(predictedDiff)) {
            grouped[date].correct++;
          }
        });

        const timeline = Object.entries(grouped).map(([date, stats]) => ({
          date,
          accuracy: (stats.correct / stats.total) * 100,
          volume: stats.total
        }));

        setHistoricalData(timeline);
      }
    } catch (e) {
      console.warn("Historical data fetch skipped:", (e as Error).message);
    }
  };

  return { matches, loading, error, predictions, runAnalysis, stats, fetchMatches, isDemo, rateLimit, lastSyncedAt, historicalData, analyzingIds, analysisErrors, globalCooldown };
}
