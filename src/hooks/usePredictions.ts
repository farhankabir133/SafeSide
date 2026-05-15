import { useState, useEffect } from 'react';
import { MatchAnalysis, analyzeMatch } from '@/src/services/geminiService';
import { supabase } from '@/src/lib/supabase';

export function usePredictions() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, MatchAnalysis>>({});
  const [stats, setStats] = useState({ total: 0, accuracy: 0 });
  const [isDemo, setIsDemo] = useState(false);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; reset: number } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    fetchMatches();
    fetchStats();
    fetchHistoricalData();

    // Set up real-time polling every 30 seconds for live updates
    const interval = setInterval(() => {
      const hasLiveMatches = matches.some(m => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status));
      // Poll every 30s if live matches exist, otherwise every 60s
      fetchMatches(true); 
    }, matches.some(m => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status)) ? 30000 : 60000);

    return () => clearInterval(interval);
  }, [matches.some(m => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status))]);

  const fetchStats = async () => {
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
    const match = matches.find(m => m.id.toString() === matchId);
    if (!match) return;

    try {
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

      const [h2hRes, homeStatsRes, awayStatsRes, weatherRes] = await Promise.allSettled([
        fetch(`/api/matches/${matchId}/head2head`),
        fetch(`/api/teams/${match.homeTeam.id}`),
        fetch(`/api/teams/${match.awayTeam.id}`),
        fetch(`/api/weather/${encodeURIComponent(city)}`)
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

      // Lineups usually not available via team/match proxy in free tier, but we'll try if endpoint exists
      let lineups = null;
      try {
        const lineupsRes = await fetch(`/api/matches/${matchId}/lineups`);
        if (lineupsRes.ok) lineups = await lineupsRes.json();
      } catch (e) {}

      const result: MatchAnalysis = await analyzeMatch(match, h2hData, teamStats, weatherData, lineups);
      
      setPredictions(prev => ({ ...prev, [matchId]: result }));
      
      // Parse scoreline "X-X"
      const [h, a] = result.prediction.scoreline.split('-').map(n => parseInt(n.trim()));

      // Record to Supabase (Optional for UI to function)
      try {
        await supabase.from('predictions').insert({
          match_id: matchId,
          home_team: match.homeTeam.name,
          away_team: match.awayTeam.name,
          prediction_score_home: isNaN(h) ? 0 : h,
          prediction_score_away: isNaN(a) ? 0 : a,
          confidence_score: result.prediction.confidence_score * 10,
          risk_level: result.risk_assessment.level,
          analysis: result.reasoning_summary,
          coincidence_likelihood: JSON.stringify(result.micro_events),
          status: 'pending'
        });
        await fetchStats();
      } catch (dbError) {
        console.warn("Could not persist prediction to Supabase:", (dbError as Error).message);
      }
    } catch (e) {
      console.error("Analysis failed:", e);
    }
  };

  const fetchHistoricalData = async () => {
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

  return { matches, loading, error, predictions, runAnalysis, stats, fetchMatches, isDemo, rateLimit, lastSyncedAt, historicalData };
}
