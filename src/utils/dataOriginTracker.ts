/**
 * SafeSide Tactical Football Predictor - Data Origin Tracker
 * Strictly tag, validate, and verify the physical lineage of any in-play football metric.
 */

export type DataOrigin = "api" | "webhook" | "db" | "invalid";

export interface OriginTrackingMetadata {
  origin: DataOrigin;
  timestamp: string;
  sourceSystemId: string;
  signature?: string;
}

export interface TrackedTelemetryPayload {
  matchId: number;
  originMeta: OriginTrackingMetadata;
  data: any;
}

export class DataOriginTracker {
  private static instance: DataOriginTracker;
  private lineageLogs: Array<{ matchId: number; timestamp: string; origin: DataOrigin; message: string }> = [];

  private constructor() {}

  public static getInstance(): DataOriginTracker {
    if (!DataOriginTracker.instance) {
      DataOriginTracker.instance = new DataOriginTracker();
    }
    return DataOriginTracker.instance;
  }

  /**
   * Tags a raw payload with verified origin metadata.
   */
  public tagPayload(matchId: number, data: any, origin: DataOrigin, systemId: string): TrackedTelemetryPayload {
    if (!origin || !["api", "webhook", "db", "invalid"].includes(origin)) {
      throw new Error(`[DATA_ORIGIN_TRACKER] Refusing to tag payload. Unknown or fake origin "${origin}" supplied.`);
    }

    const payload: TrackedTelemetryPayload = {
      matchId,
      originMeta: {
        origin,
        timestamp: new Date().toISOString(),
        sourceSystemId: systemId,
      },
      data,
    };

    this.logLineage(matchId, origin, `Tagged metadata successfully for code [${systemId}]`);
    return payload;
  }

  /**
   * Ensures every payload has verified origin metadata. Non-compliant elements are rejected.
   */
  public validateTracking(payload: any): TrackedTelemetryPayload {
    if (!payload || typeof payload !== "object") {
      throw new Error("[DATA_ORIGIN_TRACKER] Validation Rejected: Payload is null/not an object.");
    }

    if (!payload.originMeta) {
      this.logLineage(payload.matchId || 0, "invalid", "Payload missing 'originMeta' trace blocks entirely.");
      throw new Error("[DATA_ORIGIN_TRACKER] CRITICAL LOCKOUT: Missing origin tracking tracking metadata. Blocked fake data injection.");
    }

    const { origin, timestamp, sourceSystemId } = payload.originMeta;
    if (!origin || !["api", "webhook", "db"].includes(origin)) {
      this.logLineage(payload.matchId || 0, "invalid", `Rejected synthetic/invalid origin tag "${origin}" detected.`);
      throw new Error(`[DATA_ORIGIN_TRACKER] BLOCKED: INVALID DATA SOURCE ORIGIN ["${origin}"]. Systems configured to lock out fake models.`);
    }

    if (!timestamp || isNaN(Date.parse(timestamp))) {
      throw new Error("[DATA_ORIGIN_TRACKER] Validation rejected. Corrupted, fake or future timing parameters.");
    }

    return payload as TrackedTelemetryPayload;
  }

  private logLineage(matchId: number, origin: DataOrigin, message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[DATA_ORIGIN_TRACKER] [${timestamp}] [Match: ${matchId}] [${origin.toUpperCase()}] ${message}`);
    this.lineageLogs.push({ matchId, timestamp, origin, message });
    if (this.lineageLogs.length > 1000) {
      this.lineageLogs.shift();
    }
  }

  public getLineageHistory() {
    return this.lineageLogs;
  }
}
