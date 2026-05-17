import { useState, useEffect } from 'react';
import { MatchAnalysis, analyzeMatch } from '@/src/services/geminiService';
import { supabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';

export function usePredictions() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, MatchAnalysis>>({});
  const [stats, setStats] = useState({ total: 0, accuracy: 0 });
  const [isDemo, setIsDemo] = useState(false);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; reset: number } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});
  const [globalCooldown, setGlobalCooldown] = useState<number | null>(null);
  const [hasAttemptedInitialAnalysis, setHasAttemptedInitialAnalysis] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('match_predictions_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only keep predictions from the last 48 hours
        const filtered: Record<string, MatchAnalysis> = {};
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

  // Save to localStorage when predictions update
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
  }, [user]); // Re-fetch when user logs in/out

  const fetchPredictionsFromDb = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const storedPredictions: Record<string, MatchAnalysis> = {};
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

  // Automatic analysis for top upcoming matches removed to conserve Gemini API quota.
  // Users must now manually trigger analysis for matches that don't have predictions.
  useEffect(() => {
    if (matches.length > 0 && !hasAttemptedInitialAnalysis && !loading) {
      setHasAttemptedInitialAnalysis(true);
    }
  }, [matches.length, loading, hasAttemptedInitialAnalysis]);

  useEffect(() => {
    // Set up real-time polling every 10 seconds for live matches, 60s for upcoming
    const interval = setInterval(() => {
      const liveStatus = ['IN_PLAY', 'PAUSED', 'LIVE'];
      const hasLiveMatches = matches.some(m => liveStatus.includes(m.status));
      fetchMatches(true); 
    }, matches.some(m => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status)) ? 10000 : 60000);

    return () => clearInterval(interval);
  }, [matches.some(m => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status))]);

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
          // Simplified accuracy: correct winner or correct score
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
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setIsDemo(!!data.isMock);
      if (data.requestsRemaining !== undefined) {
        setRateLimit({ 
          remaining: parseInt(data.requestsRemaining), 
          reset: parseInt(data.resetTime) 
        });
      }
      
      // Filter for relevant matches (upcoming, live, and recently finished)
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
    
    // Check global cooldown (5 minute lockout if quota hit)
    if (globalCooldown && Date.now() < globalCooldown) {
      const remainingSec = Math.ceil((globalCooldown - Date.now()) / 1000);
      if (remainingSec > 60) {
        throw new Error(`Neural processor cooling down. Retry in ${Math.ceil(remainingSec/60)}m.`);
      } else {
        throw new Error(`Neural processor cooling down. Retry in ${remainingSec}s.`);
      }
    }
    
    // Individual user local throttle (don't allow clicking more than once every 10s per match)
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
      // Fetch H2H, Team Stats, and Weather concurrently for a high-fidelity scan
      const venueToCity: Record<string, string> = {
        "Emirates Stadium": "London",
        "Etihad Stadium": "Manchester",
        "Anfield": "Liverpool",
        "Camp Nou": "Barcelona",
        "Santiago Bernabéu": "Madrid",
        "Allianz Arena": "Munich",
      };
      const city = venueToCity[match.venue] || match.area?.name || 'London';

      const [h2hRes, homeStatsRes, awayStatsRes, weatherRes, oddsRes] = await Promise.allSettled([
        fetch(`/api/matches/${matchId}/head2head`),
        fetch(`/api/teams/${match.homeTeam.id}`),
        fetch(`/api/teams/${match.awayTeam.id}`),
        fetch(`/api/weather/${encodeURIComponent(city)}`),
        fetch(`/api/odds/${matchId}`)
      ]);

      let h2hData = null;
      if (h2hRes.status === 'fulfilled' && h2hRes.value.ok) h2hData = await h2hRes.value.json();

      let teamStats = undefined;
      if (homeStatsRes.status === 'fulfilled' && homeStatsRes.value.ok && 
          awayStatsRes.status === 'fulfilled' && awayStatsRes.value.ok) {
        teamStats = {
          home: await homeStatsRes.value.json(),
          away: await awayStatsRes.value.json()
        };
      }

      let weatherData = null;
      if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) weatherData = await weatherRes.value.json();

      let oddsData = null;
      if (oddsRes.status === 'fulfilled' && oddsRes.value.ok) oddsData = await oddsRes.value.json();

      // Fetch Historical Trends from Supabase for Predictive RAG
      let historicalTrends = null;
      try {
        if (isSupabaseConfigured() && match.competition?.id) {
          const { data: trendData } = await supabase
            .from('historical_trends')
            .select('*')
            .eq('league_id', match.competition.id.toString())
            .single();
          historicalTrends = trendData;
        }
      } catch (e) {
        console.warn("Trend retrieval node bypassed:", e);
      }

      // Lineups usually not available via team/match proxy in free tier, but we'll try if endpoint exists
      let lineups = null;
      try {
        const lineupsRes = await fetch(`/api/matches/${matchId}/lineups`);
        if (lineupsRes.ok) lineups = await lineupsRes.json();
      } catch (e) {}

      const result: MatchAnalysis = await analyzeMatch(match, h2hData, teamStats, weatherData, lineups, oddsData, historicalTrends);
      
      // Inject timestamp for cache invalidation
      const resultWithMeta = { ...result, _timestamp: Date.now() };
      
      setPredictions(prev => ({ ...prev, [matchId]: resultWithMeta }));
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
      
      // Parse scoreline "X-X"
      const [h, a] = result.prediction.scoreline.split('-').map(n => parseInt(n.trim()));

      // Record to Supabase (Optional for UI to function)
      try {
        if (isSupabaseConfigured()) {
          const payload: any = {
            match_id: matchId,
            home_team: match.homeTeam.name,
            away_team: match.awayTeam.name,
            competition_name: match.competition?.name || 'Unknown',
            prediction_score_home: isNaN(h) ? 0 : h,
            prediction_score_away: isNaN(a) ? 0 : a,
            confidence_score: result.prediction.confidence_score,
            volatility_index: result.prediction.volatility_index,
            risk_level: result.risk_assessment.level,
            analysis: result.reasoning_summary,
            full_analysis: JSON.stringify(result),
            coincidence_likelihood: JSON.stringify(result.micro_events),
            status: 'pending'
          };

          // Attach user context if authenticated
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
      
      // If it's a quota error, set global cooldown using retryAfterMs if available
      try {
        const message = e.message || "";
        let errData: any = null;
        
        // Try to find JSON block if it's embedded or the whole message
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
          setGlobalCooldown(Date.now() + 10 * 60 * 1000); // 10 minute fallback
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
      throw e; // Re-throw so caller (like triggerInitialAnalysis) knows to stop
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
        // Group by day and calculate accuracy
        const grouped: Record<string, { total: number; correct: number }> = {};
        
        data.forEach(p => {
          const d = new Date((p as any).created_at);
          const date = d.toISOString().split('T')[0]; // YYYY-MM-DD
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
