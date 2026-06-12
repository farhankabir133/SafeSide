import { z } from "zod";
import { DataOriginTracker } from "../utils/dataOriginTracker";

// Zod validation schemas for robust runtime type safety
export const TeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortName: z.string().optional().nullable(),
  tla: z.string().optional().nullable(),
  crest: z.string().url().nullable().optional(),
});

export const MatchStatusSchema = z.enum([
  "SCHEDULED",
  "TIMED",
  "IN_PLAY",
  "PAUSED",
  "FINISHED",
  "POSTPONED",
  "SUSPENDED",
  "CANCELLED",
]);

export const ScoreDetailSchema = z.object({
  home: z.number().nullable(),
  away: z.number().nullable(),
});

export const MatchScoreSchema = z.object({
  winner: z.string().nullable().optional(),
  duration: z.string().optional(),
  fullTime: ScoreDetailSchema,
  halfTime: ScoreDetailSchema.optional(),
});

export const LiveMatchSchema = z.object({
  id: z.number(),
  status: MatchStatusSchema,
  minute: z.number().nullable().optional(),
  competition: z.object({
    id: z.number(),
    name: z.string(),
    code: z.string().optional().nullable(),
    emblem: z.string().nullable().optional(),
  }),
  homeTeam: TeamSchema,
  awayTeam: TeamSchema,
  score: MatchScoreSchema,
});

export type LiveMatch = z.infer<typeof LiveMatchSchema>;
export type Team = z.infer<typeof TeamSchema>;

export interface APICacheConfig {
  ttl: number; // Time to live in milliseconds
}

export class LiveFootballApiService {
  private static instance: LiveFootballApiService;
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private rateLimiter: { requests: number; windowStart: number } = {
    requests: 0,
    windowStart: Date.now(),
  };

  private readonly API_WINDOW_MS = 60000; // 1 minute window
  private readonly MAX_REQUESTS_PER_WINDOW = 30; // Max API calls per minute

  // Observability metrics for Phase 3 requirements
  private totalRequests = 0;
  private failedRequests = 0;
  private totalLatencyMs = 0;

  private constructor() {}

  public static getInstance(): LiveFootballApiService {
    if (!LiveFootballApiService.instance) {
      LiveFootballApiService.instance = new LiveFootballApiService();
    }
    return LiveFootballApiService.instance;
  }

  /**
   * Enforces API client-side rate limit protections to prevent ban-locking
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    if (now - this.rateLimiter.windowStart > this.API_WINDOW_MS) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.windowStart = now;
    }

    if (this.rateLimiter.requests >= this.MAX_REQUESTS_PER_WINDOW) {
      const waitTime = this.API_WINDOW_MS - (now - this.rateLimiter.windowStart);
      console.warn(`[SafeSide API] Rate limit bucket exhausted. Waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      
      this.rateLimiter.requests = 0;
      this.rateLimiter.windowStart = Date.now();
    }
    this.rateLimiter.requests++;
  }

  /**
   * Generic fetch wrapper incorporating Client Caching, Rate-Throttling, Zod Verification,
   * Latency Metrics, Failure Tracking, and strict fallback elimination.
   * SCHEMA IS REQUIRED AND PAYLOAD VALIDATION IS STRICT.
   */
  public async fetchWithCache<T>(
    endpoint: string,
    apiKey: string,
    ttl: number = 60000,
    schema: z.ZodType<T>
  ): Promise<T> {
    // Guard against invalid or mock placeholder API keys
    const invalidKeys = ["YOUR_KEY_HERE", "MY_API_KEY", "FOOTBALL_API_KEY", "PLACEHOLDER", ""];
    if (!apiKey || invalidKeys.includes(apiKey.trim())) {
      throw new Error("NO_DATA_AVAILABLE: Refusing to call external football provider because api_key is default, mock, or missing.");
    }

    const cacheKey = `${endpoint}`;
    const cachedEntry = this.cache.get(cacheKey);

    if (cachedEntry && cachedEntry.expiry > Date.now()) {
      return cachedEntry.data as T;
    }

    const tStart = Date.now();
    this.totalRequests++;

    console.log(`[SafeSide Live API Request] Sending payload query to endpoint: ${endpoint}`);

    try {
      await this.enforceRateLimit();

      const response = await fetch(endpoint, {
        headers: {
          "X-Auth-Token": apiKey,
          "Content-Type": "application/json",
        },
      });

      const latency = Date.now() - tStart;
      this.totalLatencyMs += latency;
      console.log(`[SafeSide Live API Response] Received from ${endpoint}. Duration: ${latency}ms.`);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();

      // Zod assertion for Live API response schema matching
      let validatedData: T;
      try {
        validatedData = schema.parse(rawData);
      } catch (zodErr: any) {
        console.error(`[SafeSide API Schema Validation Failure] Schema mismatch on endpoint: ${endpoint}`, zodErr.errors);
        throw new Error(`INCOMPLETE_OR_CORRUPT_PAYLOAD: Zod Schema verification failed. Details: ${JSON.stringify(zodErr.errors)}`);
      }

      // Tag using origin mechanism
      const tracker = DataOriginTracker.getInstance();
      const matchId = (validatedData as any)?.id || (validatedData as any)?.match?.id || 0;
      tracker.tagPayload(matchId, validatedData, "api", "LiveFootballApiService");

      // Cache validated output
      this.cache.set(cacheKey, {
        data: validatedData,
        expiry: Date.now() + ttl,
      });

      return validatedData;
    } catch (error: any) {
      this.failedRequests++;
      console.error(`[SafeSide API Error] Ingestion breakdown on '${endpoint}'. NO_SIMULATED_MOCKS LOCKOUT TRACE ACTIVATED.`, error.message);
      
      // Strict Fallback Elimination Lock - Throw Hard Failure
      throw new Error(`NO_DATA_AVAILABLE: ${error.message}`);
    }
  }

  /**
   * Retrieves active live engine telemetry KPIs
   */
  public getObservabilityMetrics() {
    return {
      totalRequests: this.totalRequests,
      failedRequests: this.failedRequests,
      failureRatePercent: this.totalRequests > 0 ? parseFloat(((this.failedRequests / this.totalRequests) * 100).toFixed(2)) : 0,
      averageLatencyMs: this.totalRequests > 0 ? parseFloat((this.totalLatencyMs / this.totalRequests).toFixed(2)) : 0,
    };
  }

  /**
   * Dynamic clear caches utility
   */
  public invalidateCache(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
    } else {
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    }
  }
}
