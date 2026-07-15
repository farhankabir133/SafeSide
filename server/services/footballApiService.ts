import { ApiResponse } from "../types/api";

const FOOTBALL_API_CACHE = new globalThis.Map<string, { data: any; timestamp: number }>();
const PLACEHOLDER_KEYS = ["YOUR_KEY_HERE", "MY_API_KEY", "FOOTBALL_API_KEY", ""];

export class FootballApiService {
  private static instance: FootballApiService;
  private totalRequests = 0;
  private failedRequests = 0;

  private constructor() {}

  static getInstance(): FootballApiService {
    if (!FootballApiService.instance) {
      FootballApiService.instance = new FootballApiService();
    }
    return FootballApiService.instance;
  }

  async fetchWithCache(url: string, apiKey: string, ttlMs: number): Promise<any> {
    const now = Date.now();
    const cached = FOOTBALL_API_CACHE.get(url);

    if (cached && now - cached.timestamp < ttlMs) {
      return cached.data;
    }

    if (!apiKey || PLACEHOLDER_KEYS.includes(apiKey.trim())) {
      throw new Error("NO_DATA_AVAILABLE: API Key missing, static fallback simulation is blocked.");
    }

    this.totalRequests++;
    const response = await fetch(url, {
      headers: { "X-Auth-Token": apiKey, "Content-Type": "application/json" },
    });

    if (response.status === 429) {
      if (cached) return cached.data;
      throw new Error("NO_DATA_AVAILABLE: 429 Rate limit exhausted from primary football supplier and no cache exists.");
    }

    if (!response.ok) {
      this.failedRequests++;
      throw new Error(`NO_DATA_AVAILABLE: Provider returned failure status ${response.status}`);
    }

    const data = (await response.json()) as any;
    FOOTBALL_API_CACHE.set(url, { data, timestamp: now });
    return data;
  }

  getMetrics() {
    return { totalRequests: this.totalRequests, failedRequests: this.failedRequests };
  }
}
