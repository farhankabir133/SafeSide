import { useState, useEffect } from "react";
import { MathematicalForecast } from "../services/PoissonPredictor";
import { MarketCalibrationSummary } from "../services/MarketCalibrationService";
import { AnomalyReport } from "../services/AnomalyDetectionService";
import { CalibratedConfidenceResult } from "../services/ConfidenceCalibrationService";
import { QuantitativeReasoning } from "../services/tacticalAiService";

export interface IntegratedQuantitativeOutput {
  matchId: number;
  poissonForecast: MathematicalForecast;
  dcForecast: MathematicalForecast;
  marketSummary: MarketCalibrationSummary;
  anomalyReport: AnomalyReport;
  calibrationResult: CalibratedConfidenceResult;
  quantitativeReasoning: QuantitativeReasoning;
  originMeta: {
    origin: string;
    systemId: string;
    timestamp: number;
  };
}

export function useMatchPrediction(matchId: number | null, matchTelemetry?: any) {
  const [prediction, setPrediction] = useState<IntegratedQuantitativeOutput | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;

    let isActive = true;
    const fetchPrediction = async () => {
      setLoading(true);
      setError(null);
      try {
        // Enforce Phase 5 AI Input Sanity check. If telemetry is expected but missing or lacks validation details, flag an immediate client-side error.
        if (matchTelemetry) {
          if (!matchTelemetry.originMeta) {
            throw new Error("INSUFFICIENT_REAL_DATA: Missing data origin lineage tag. Analysis strictly blocked.");
          }
        }

        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: matchId,
            matchTelemetry: matchTelemetry || null
          })
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.reason || errBody.message || "Unable to contact Predictive Engine link.");
        }

        const data = await response.json();
        if (isActive) {
          setPrediction(data as IntegratedQuantitativeOutput);
        }
      } catch (err: any) {
        if (isActive) {
          setError(err.message || "Predictive models compiling error");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchPrediction();

    return () => {
      isActive = false;
    };
  }, [matchId, matchTelemetry]);

  return {
    prediction,
    loading,
    error
  };
}
