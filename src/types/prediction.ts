export interface PoissonOutcome {
  score: string;
  probability: number;
}

export interface MathematicalForecast {
  homeWinProb: number;
  awayWinProb: number;
  drawProb: number;
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  bttsProb: number;
  over25Prob: number;
  kellyPercentage: number;
  poissonScorelines: PoissonOutcome[];
}

export interface MarketCalibrationSummary {
  fairHomeOdds: number;
  fairDrawOdds: number;
  fairAwayOdds: number;
  bookmakerMargin: number;
  edgeHome: number;
  edgeDraw: number;
  edgeAway: number;
}

export interface AnomalyReport {
  anomalySeverityScore: number;
  volatilityIndex: number;
  isTrapGame: boolean;
  collapseRiskDetected: boolean;
  triggersIdentified: string[];
  upsetMitigationExplanation: string;
}

export interface CalibratedConfidenceResult {
  originalHighestProb: number;
  calibratedHighestProb: number;
  confidenceAdjustmentDelta: number;
  calibrationReasoning: string;
}

export interface QuantitativeReasoning {
  analysisTimestamp: string;
  modelDisagreementAnalysis: {
    disagreementLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    poissonVsDixonColesDelta: number;
    explanation: string;
  };
  marketInefficiencyDetail: {
    detectedInefficiencies: string[];
    estimatedVigImpact: number;
    underpricingTarget: 'home' | 'draw' | 'away' | 'NONE';
    edgeRationale: string;
  };
  tacticalMismatchSummary: {
    homeTeamMismatchRisk: string;
    awayTeamMismatchRisk: string;
    formationAsymmetryMetric: number;
    vulnerabilityExploited: string;
  };
  confidenceCalibrationLog: {
    originalHighestProb: number;
    calibratedHighestProb: number;
    confidenceAdjustmentDelta: number;
    calibrationReasoning: string;
  };
  anomalyAnalysisLog: {
    anomalySeverityScore: number;
    volatilityIndex: number;
    isTrapGame: boolean;
    collapseRiskDetected: boolean;
    triggersIdentified: string[];
    upsetMitigationExplanation: string;
  };
  evidenceChain: Array<{
    metricName: string;
    observedValueString: string;
    statisticalSignificance: 'NOTABLE' | 'CRITICAL' | 'NO_IMPACT';
    deducedImpact: string;
  }>;
  uncertaintyExplicitLog: string;
  tacticalRiskExposureScore: number;
  finalQuantitativeVerdict: 'VITAL' | 'STRATEGIC' | 'SPECULATIVE' | 'HOLD';
  verdictRationale: string;
}

export interface PredictedLineupEntry {
  name: string;
  position: string;
  shirtNumber?: string;
  isKeyPlayer?: boolean;
}

export interface PredictedLineup {
  formation: string;
  startingXi: PredictedLineupEntry[];
}

export interface MultiModelPrediction {
  matchId: string;
  poissonForecast: MathematicalForecast;
  dcForecast: MathematicalForecast;
  marketSummary: MarketCalibrationSummary;
  anomalyReport: AnomalyReport;
  calibrationResult: CalibratedConfidenceResult;
  quantitativeReasoning: QuantitativeReasoning;
  originMeta: any;
  generatedAt: string;
}
