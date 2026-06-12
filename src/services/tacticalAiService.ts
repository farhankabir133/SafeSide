import { z } from "zod";
import { MatchTelemetry } from "./matchTelemetryService";
import { MathematicalForecast } from "./PoissonPredictor";
import { MarketCalibrationSummary } from "./MarketCalibrationService";
import { AnomalyReport } from "./AnomalyDetectionService";
import { CalibratedConfidenceResult } from "./ConfidenceCalibrationService";

// Legacy schema for backward compatibility
export const TacticalInsightSchema = z.object({
  analysisTimestamp: z.string(),
  tacticalShiftDetected: z.string(),
  bettingTrapWarning: z.boolean(),
  trapGameReason: z.string().optional(),
  probabilityShiftExplanation: z.string(),
  momentumGaugeExplanation: z.string(),
  formationEfficiencyHome: z.string(),
  formationEfficiencyAway: z.string(),
  expectedVsActualFlow: z.string(),
  recommendedInPlayFades: z.array(z.string()),
});

export type TacticalInsight = z.infer<typeof TacticalInsightSchema>;

// Brand New Quantitative Reasoning Schema
export const QuantitativeReasoningSchema = z.object({
  analysisTimestamp: z.string(),
  
  // Model Disagreements
  modelDisagreementAnalysis: z.object({
    disagreementLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
    poissonVsDixonColesDelta: z.number(), // Numerical percentage delta of variance
    explanation: z.string(), // Qualitative explanation of mathematical variance between Poisson and DixonColes
  }),

  // Market Inefficiencies
  marketInefficiencyDetail: z.object({
    detectedInefficiencies: z.array(z.string()), // list of mispriced outcomes
    estimatedVigImpact: z.number(), // The bookmaking vigor/margin percent
    underpricingTarget: z.enum(["home", "draw", "away", "NONE"]),
    edgeRationale: z.string(), // Rationale explaining the edge from market odds vs model fair odds
  }),

  // Tactical Mismatches
  tacticalMismatchSummary: z.object({
    homeTeamMismatchRisk: z.string(),
    awayTeamMismatchRisk: z.string(),
    formationAsymmetryMetric: z.number(), // Numerical score [0-100] for spatial/structural imbalance
    vulnerabilityExploited: z.string(), // Structural vulnerability exploited on the pitch
  }),

  // Confidence Changes
  confidenceCalibrationLog: z.object({
    originalHighestProb: z.number(),
    calibratedHighestProb: z.number(),
    confidenceAdjustmentDelta: z.number(), // Difference index introduced by Bayesian shrinkage
    calibrationReasoning: z.string(), // Verification of Brier penalties or shrinkage weight applied
  }),

  // Anomaly Triggers
  anomalyAnalysisLog: z.object({
    anomalySeverityScore: z.number(),
    volatilityIndex: z.number(),
    isTrapGame: z.boolean(),
    collapseRiskDetected: z.boolean(),
    triggersIdentified: z.array(z.string()),
    upsetMitigationExplanation: z.string(), // Quantitative plan for protecting stakes from sudden volatility
  }),

  // Structured Quantitative Evidence Chain
  evidenceChain: z.array(z.object({
    metricName: z.string(),
    observedValueString: z.string(),
    statisticalSignificance: z.enum(["NOTABLE", "CRITICAL", "NO_IMPACT"]),
    deducedImpact: z.string(),
  })),

  uncertaintyExplicitLog: z.string(), // Honest assessment of what is missing/unverified
  tacticalRiskExposureScore: z.number(), // Structured risk scoring [0 - 100]
  finalQuantitativeVerdict: z.enum(["VITAL", "STRATEGIC", "SPECULATIVE", "HOLD"]),
  verdictRationale: z.string(),
});

export type QuantitativeReasoning = z.infer<typeof QuantitativeReasoningSchema>;

export class TacticalAiService {
  private static instance: TacticalAiService;

  private constructor() {}

  public static getInstance(): TacticalAiService {
    if (!TacticalAiService.instance) {
      TacticalAiService.instance = new TacticalAiService();
    }
    return TacticalAiService.instance;
  }

  /**
   * Crafts a highly complex quantitative prompt based strictly on verified mathematical calculations,
   * telemetry indexes, and calibration outcomes. Disallows AI hallucination.
   */
  public buildQuantitativePrompt(
    matchInfo: { homeTeam: string; awayTeam: string; competition: string; score: string },
    telemetry: MatchTelemetry,
    poissonForecast: MathematicalForecast,
    dcForecast: MathematicalForecast,
    marketSummary: MarketCalibrationSummary,
    anomalyReport?: AnomalyReport,
    calibrationResult?: CalibratedConfidenceResult
  ): string {
    // 1. Calculate the raw structural disagreement between models
    const pHome = poissonForecast.homeWinProb;
    const pDraw = poissonForecast.drawProb;
    const pAway = poissonForecast.awayWinProb;

    const dHome = dcForecast.homeWinProb;
    const dDraw = dcForecast.drawProb;
    const dAway = dcForecast.awayWinProb;

    const maxDelta = parseFloat(
      Math.max(
        Math.abs(pHome - dHome),
        Math.abs(pDraw - dDraw),
        Math.abs(pAway - dAway)
      ).toFixed(2)
    );

    const disagreementLevelStr = maxDelta > 15 ? "HIGH" : maxDelta > 6 ? "MEDIUM" : "LOW";

    // 2. Identify the highest expected value outcome detected
    let underpricedTarget: "home" | "draw" | "away" | "NONE" = "NONE";
    const bestOpportunity = marketSummary.opportunities.sort((a, b) => b.rawEdgePercent - a.rawEdgePercent)[0];
    if (bestOpportunity && bestOpportunity.rawEdgePercent > 0) {
      underpricedTarget = bestOpportunity.outcome;
    }

    // 3. Match historical & real telemetry evidence chains
    const evidenceList = [
      { name: "Possession Ratio", val: `${telemetry.possessionHome}% H / ${telemetry.possessionAway}% A` },
      { name: "Live Shoot Density", val: `${telemetry.shotsHome} H / ${telemetry.shotsAway} A (${telemetry.shotsOnTargetHome} H / ${telemetry.shotsOnTargetAway} A on target)` },
      { name: "Live Expected Goals (xG)", val: `Home xG ${telemetry.computedXGHome} vs Away xG ${telemetry.computedXGAway}` },
      { name: "Momentum Dominance Index", val: `${telemetry.momentumIndex} (Scale -100 to +100)` }
    ];

    if (anomalyReport) {
      evidenceList.push({ name: "Anomaly Severity Rating", val: `${anomalyReport.anomalySeverityScore}/100` });
      evidenceList.push({ name: "Odds Volatility Index", val: `${anomalyReport.volatilityIndex}/100` });
    }

    if (calibrationResult) {
      evidenceList.push({ name: "Uncalibrated Max Forecast", val: `${calibrationResult.uncalibratedConfidence}%` });
      evidenceList.push({ name: "Bayesian Calibrated Confidence", val: `${calibrationResult.calibratedConfidence}%` });
    }

    // Build the instruction payload
    return `
You are the quantitative reasoning engine of the SafeSide Tactical Football Predictor.
Weigh the validated mathematical predictions and live telemetry coordinates to generate a structured quantitative assessment.

⚠️ CRITICAL DIRECTIVE: YOU ARE STRICTLY FORBIDDEN FROM HALLUCINATING OR RETURNING FICTIONAL TELEMETRY.
Every single insight must relate directly to the provided mathematical coordinates. No filler text or conversational pleasantries allowed.

---

[1. MATCH CONTEXT]
- Fixture: ${matchInfo.homeTeam} vs ${matchInfo.awayTeam} (${matchInfo.competition})
- Scoreboard Status: ${matchInfo.score} (Active Minute: ${telemetry.minute}')

[2. VERIFIED TELEMETRY DATASET]
- Possession: Home: ${telemetry.possessionHome}% | Away: ${telemetry.possessionAway}%
- Shooting Statistics: Home: ${telemetry.shotsHome} total (${telemetry.shotsOnTargetHome} on target) vs Away: ${telemetry.shotsAway} total (${telemetry.shotsOnTargetAway} on target)
- Yellow/Red Disciplinary Counters: Yellow: (H: ${telemetry.yellowCardsHome} / A: ${telemetry.yellowCardsAway}) | Red: (H: ${telemetry.redCardsHome} / A: ${telemetry.redCardsAway})
- Computed On-Pitch xG: Home: ${telemetry.computedXGHome} xG | Away: ${telemetry.computedXGAway} xG
- Momentum Index: ${telemetry.momentumIndex}
- Real-Time Live Events Log Depth: ${telemetry.events.length} logs detected

[3. SYSTEM MODEL EXPECTATIONS]
- Poisson Predictive Probabilities: Home Win: ${pHome}%, Draw: ${pDraw}%, Away Win: ${pAway}%
- Dixon Coles Model Probabilities: Home Win: ${dHome}%, Draw: ${dDraw}%, Away Win: ${dAway}%
- Variance Maximum Delta: ${maxDelta}%
- Disagreement Level: ${disagreementLevelStr}

[4. MARKET CALIBRATION SUMMARY]
- Market Implied Probabilities: Home: ${parseFloat(( (1 / marketSummary.calibration.impliedProbabilitiesWithVig.home) * 100 ).toFixed(1)) || 0}%, Draw: ${parseFloat(( (1 / marketSummary.calibration.impliedProbabilitiesWithVig.draw) * 100 ).toFixed(1)) || 0}%, Away: ${parseFloat(( (1 / marketSummary.calibration.impliedProbabilitiesWithVig.away) * 100 ).toFixed(1)) || 0}%
- Estimated Market Overround (Vig): ${parseFloat((marketSummary.calibration.marketMargin * 100).toFixed(2))}%
- Model Calibration Recommendation: Selection: ${marketSummary.recommendations.selection.toUpperCase()} | Value Edge: ${marketSummary.recommendations.valueEdgePercent}% | Recommended Stake: ${marketSummary.recommendations.recommendedStakePercent}%
- Underpriced Margin Target: ${underpricedTarget.toUpperCase()}

[5. CALIBRATION & SHRINKAGE INSIGHTS]
${
  calibrationResult
    ? `- Uncalibrated Highest Probability Model: ${calibrationResult.uncalibratedConfidence}%
- Bayesian Calibrated Probability: ${calibrationResult.calibratedConfidence}%
- Confidence Adjustment Delta (Original - Calibrated): ${parseFloat((calibrationResult.uncalibratedConfidence - calibrationResult.calibratedConfidence).toFixed(2))}%
- Reliability Rating: ${calibrationResult.reliabilityRating}
- Est. Brier Improvement Rating: ${calibrationResult.brierImprovementEst}`
    : "No persistent historical calibration dataset available. Running on default statistical priors (0.75 weight)."
}

[6. ANOMALY & RISK PARAMETERS]
${
  anomalyReport
    ? `- Anomaly Severity score: ${anomalyReport.anomalySeverityScore}/100
- Live Volatility index: ${anomalyReport.volatilityIndex}/100
- Risk of Home Collapse: ${anomalyReport.tacticalInstability.homeCollapseRisk ? "CRITICAL" : "STABLE"}
- Risk of Away Collapse: ${anomalyReport.tacticalInstability.awayCollapseRisk ? "CRITICAL" : "STABLE"}
- Is Marked Trap Game: ${anomalyReport.tacticalInstability.trapGameAlert ? "TRUE" : "FALSE"}
- Volatility Triggers: [${anomalyReport.tacticalInstability.triggers.join(", ")}]`
    : "No active anomaly reports triggered for this coordinate pipeline."
}

---

Directives for Response:
1. "modelDisagreementAnalysis": Compute the physical delta of Poisson vs DixonColes (derived from the math above: ${maxDelta}%). Explain whether this variance is due to Dixon Coles' low-scoring time-decay correction or Poisson's attack-defense scaling.
2. "marketInefficiencyDetail": Explain the math behind the edge of ${marketSummary.recommendations.valueEdgePercent}% and the bookmaking overround impact of ${parseFloat((marketSummary.calibration.marketMargin * 100).toFixed(2))}%. Highlight ${underpricedTarget.toUpperCase()} underpricing.
3. "tacticalMismatchSummary": Detail spatial or possession mismatches. Translate Home xG (${telemetry.computedXGHome}) vs Away xG (${telemetry.computedXGAway}) into concrete structural block vulnerabilities.
4. "confidenceCalibrationLog": Explain why confidence shrinkage was or was not applied to ${calibrationResult ? calibrationResult.uncalibratedConfidence : pHome}%, pulling it to ${calibrationResult ? calibrationResult.calibratedConfidence : "prior"}.
5. "anomalyAnalysisLog": Translate anomaly severity rating (${anomalyReport ? anomalyReport.anomalySeverityScore : 0}/100) and collapse risks into specific risk offsets.
6. "evidenceChain": Translate the items in the verified dataset: ${JSON.stringify(evidenceList)} into concrete logical steps. Each step must denote NOTABLE or CRITICAL statistical significance.
7. "uncertaintyExplicitLog": Explicitly state what data is omitted (such as missing home/away roster listings or unvalidated decadal trends).
8. "tacticalRiskExposureScore": Compute a numerical risk score [0-100] factoring volatility, collapse risks, and Poisson variance.
9. "finalQuantitativeVerdict": Output a clean option: VITAL, STRATEGIC, SPECULATIVE or HOLD, and outline the strict mathematical rationale.

You MUST respond strictly with a valid JSON document conforming to the following structure. No enclosing markdown tags, code blocks, backticks, comments, or prose. Just raw JSON string.

{
  "analysisTimestamp": "${new Date().toISOString()}",
  "modelDisagreementAnalysis": {
    "disagreementLevel": "${disagreementLevelStr}",
    "poissonVsDixonColesDelta": ${maxDelta},
    "explanation": "Quantitative explanation of the mathematical divergence..."
  },
  "marketInefficiencyDetail": {
    "detectedInefficiencies": [
      "Example inefficiency of bookmaker odds vs fair model odds"
    ],
    "estimatedVigImpact": ${parseFloat((marketSummary.calibration.marketMargin * 100).toFixed(2))},
    "underpricingTarget": "${underpricedTarget}",
    "edgeRationale": "Explanation of the calculated raw edge..."
  },
  "tacticalMismatchSummary": {
    "homeTeamMismatchRisk": "Spatial structural risk of home team...",
    "awayTeamMismatchRisk": "Spatial structural risk of away team...",
    "formationAsymmetryMetric": ${Math.round(Math.abs(telemetry.possessionHome - telemetry.possessionAway))},
    "vulnerabilityExploited": "Mismatch description..."
  },
  "confidenceCalibrationLog": {
    "originalHighestProb": ${calibrationResult ? calibrationResult.uncalibratedConfidence : Math.max(pHome, pDraw, pAway)},
    "calibratedHighestProb": ${calibrationResult ? calibrationResult.calibratedConfidence : Math.max(pHome, pDraw, pAway)},
    "confidenceAdjustmentDelta": ${calibrationResult ? parseFloat((calibrationResult.uncalibratedConfidence - calibrationResult.calibratedConfidence).toFixed(2)) : 0},
    "calibrationReasoning": "Bayesian shrinkage reasoning..."
  },
  "anomalyAnalysisLog": {
    "anomalySeverityScore": ${anomalyReport ? anomalyReport.anomalySeverityScore : 0},
    "volatilityIndex": ${anomalyReport ? anomalyReport.volatilityIndex : 0},
    "isTrapGame": ${anomalyReport ? anomalyReport.tacticalInstability.trapGameAlert : false},
    "collapseRiskDetected": ${anomalyReport ? (anomalyReport.tacticalInstability.homeCollapseRisk || anomalyReport.tacticalInstability.awayCollapseRisk) : false},
    "triggersIdentified": ${anomalyReport ? JSON.stringify(anomalyReport.tacticalInstability.triggers) : "[]"},
    "upsetMitigationExplanation": "Mitigation blueprint..."
  },
  "evidenceChain": [
    {
      "metricName": "Live Possession",
      "observedValueString": "${telemetry.possessionHome}% vs ${telemetry.possessionAway}%",
      "statisticalSignificance": "NOTABLE",
      "deducedImpact": "How this shifts momentum..."
    }
  ],
  "uncertaintyExplicitLog": "Documentation of unverified baseline decadal statistics or unobtained lineups...",
  "tacticalRiskExposureScore": ${anomalyReport ? Math.round((anomalyReport.anomalySeverityScore + anomalyReport.volatilityIndex) / 2) : 25},
  "finalQuantitativeVerdict": "${marketSummary.recommendations.actionRating}",
  "verdictRationale": "Final mathematical rationale supporting the actions..."
}
`;
  }

  /**
   * Safe parser to process structured quantitative output and guard against fake data injection.
   */
  public parseQuantitativeAnalysis(jsonText: string): QuantitativeReasoning {
    try {
      // Basic sanitization step (strips markdown code fencing block symbols if model ignored instructions)
      let cleanText = jsonText.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(cleanText);
      return QuantitativeReasoningSchema.parse(parsed);
    } catch (err: any) {
      console.error("[SafeSide Quantitative Reasoning Engine] failed to validate quantitative payload:", err);
      // Fallback empty but schema-compliant structured telemetry object targeting high transparency
      return {
        analysisTimestamp: new Date().toISOString(),
        modelDisagreementAnalysis: {
          disagreementLevel: "LOW",
          poissonVsDixonColesDelta: 0.0,
          explanation: "Quantitative pipeline link severed. Running on local core heuristics."
        },
        marketInefficiencyDetail: {
          detectedInefficiencies: ["Loss of external sensor metrics preventing edge mapping."],
          estimatedVigImpact: 0.0,
          underpricingTarget: "NONE",
          edgeRationale: "Zero external model alignment possible."
        },
        tacticalMismatchSummary: {
          homeTeamMismatchRisk: "Unavailable",
          awayTeamMismatchRisk: "Unavailable",
          formationAsymmetryMetric: 0,
          vulnerabilityExploited: "Unavailable"
        },
        confidenceCalibrationLog: {
          originalHighestProb: 0,
          calibratedHighestProb: 0,
          confidenceAdjustmentDelta: 0,
          calibrationReasoning: "Fallback telemetry used. Reliability index minimized."
        },
        anomalyAnalysisLog: {
          anomalySeverityScore: 0,
          volatilityIndex: 0,
          isTrapGame: false,
          collapseRiskDetected: false,
          triggersIdentified: [],
          upsetMitigationExplanation: "De-risk stakes completely until neural integrity restored."
        },
        evidenceChain: [
          {
            metricName: "Neural Link Status",
            observedValueString: "DISCONNECTED",
            statisticalSignificance: "CRITICAL",
            deducedImpact: "AI must temporarily downgrade capabilities to base mathematical rate predictors."
          }
        ],
        uncertaintyExplicitLog: "Loss of remote telemetry input validated.",
        tacticalRiskExposureScore: 100,
        finalQuantitativeVerdict: "HOLD",
        verdictRationale: "Incomplete real telemetry data detected. Aborting speculative execution models."
      };
    }
  }

  /**
   * Legacy buildTacticalAnalysisPrompt method preserved for safety & backward compatibility
   */
  public buildTacticalAnalysisPrompt(
    matchInfo: { homeTeam: string; awayTeam: string; competition: string; score: string },
    telemetry: MatchTelemetry
  ): string {
    return `
You are the world's leading quantitative sports math modeler and head tactical analyst.
Weigh current live telemetry data coordinates to deliver an explainable in-play RAG analysis.

Fixture: ${matchInfo.homeTeam} vs ${matchInfo.awayTeam} (${matchInfo.competition})
Current Scoreliner: ${matchInfo.score} at Minute ${telemetry.minute}'

Telemetry Coordinates:
- Possession Density: ${telemetry.possessionHome}% Home / ${telemetry.possessionAway}% Away
- Shot Matrix: Home: ${telemetry.shotsHome} total (${telemetry.shotsOnTargetHome} on target) vs Away: ${telemetry.shotsAway} total (${telemetry.shotsOnTargetAway} on target)
- Set Piece Corners: Home: ${telemetry.cornersHome} vs Away: ${telemetry.cornersAway}
- Foul/Card Infractions: Yellow cards (H: ${telemetry.yellowCardsHome} / A: ${telemetry.yellowCardsAway}), Red Cards (H: ${telemetry.redCardsHome} / A: ${telemetry.redCardsAway})
- Current Computed xG: Home: ${telemetry.computedXGHome} xG vs Away: ${telemetry.computedXGAway} xG
- Dynamic Momentum Dominance Index: ${telemetry.momentumIndex} (-100 Away dominance, +100 Home dominance)

Directives:
1. Detect any immediate in-play tactical shifts based on possession shifts and computed xG flow.
2. Flag betting traps (e.g. favorite underperforming baseline xG despite heavy possession dominance).
3. Explain why Poisson probabilities have shifted based on active minute decay.
4. Compare Expected vs Actual Goal Flow.
5. List high-probability recommended in-play fading options.

You MUST respond strictly with a valid JSON document conforming to this exact schema (no prose, markdown formatting blocks outside JSON, or hallucinations):
{
  "analysisTimestamp": "${new Date().toISOString()}",
  "tacticalShiftDetected": "Detailed text describing shift on the pitch",
  "bettingTrapWarning": true/false,
  "trapGameReason": "Reason if trap is flagged, or empty string",
  "probabilityShiftExplanation": "Explanation on win/draw/loss probability trends",
  "momentumGaugeExplanation": "Analytical breakdown of the momentum gauge metrics",
  "formationEfficiencyHome": "Formative structural rating",
  "formationEfficiencyAway": "Formative structural rating",
  "expectedVsActualFlow": "Breakdown of xG vs actual scoreboard statistics",
  "recommendedInPlayFades": ["Fade prediction 1", "Fade prediction 2"]
}
`;
  }
}
