import { Request, Response } from "express";
import { supabase, isSupabaseConfigured } from "../../src/lib/supabase";
import { FootballApiService } from "../services/footballApiService";

const footballApi = FootballApiService.getInstance();

export async function getAdminMetrics(req: Request, res: Response) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken && req.headers.authorization !== `Bearer ${adminToken}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const predictions = isSupabaseConfigured()
      ? await supabase.from('predictions').select('*', { count: 'exact' })
      : { data: [], count: 0, error: null };

    const completedPredictions = isSupabaseConfigured()
      ? await supabase.from('predictions').select('*').eq('status', 'completed')
      : { data: [], error: null };

    const accuracyMetrics = calculateAccuracy(completedPredictions.data || []);
    const apiMetrics = footballApi.getMetrics();

    res.json({
      predictions: {
        total: predictions.count || 0,
        completed: completedPredictions.data?.length || 0,
        accuracy: accuracyMetrics,
      },
      api: {
        totalRequests: apiMetrics.totalRequests,
        failedRequests: apiMetrics.failedRequests,
        failureRate: apiMetrics.totalRequests > 0 ? (apiMetrics.failedRequests / apiMetrics.totalRequests) * 100 : 0,
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(422).json({ error: "NO_DATA_AVAILABLE", message: err.message });
  }
}

function calculateAccuracy(predictions: any[]): { correct: number; total: number; accuracy: number } {
  const correct = predictions.filter(p => {
    const actualDiff = (p.actual_score_home ?? 0) - (p.actual_score_away ?? 0);
    const predictedDiff = (p.prediction_score_home || 0) - (p.prediction_score_away || 0);
    return Math.sign(actualDiff) === Math.sign(predictedDiff);
  }).length;
  
  return {
    correct,
    total: predictions.length,
    accuracy: predictions.length > 0 ? (correct / predictions.length) * 100 : 0,
  };
}
