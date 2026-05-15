import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fetch from "node-fetch";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy for Football-Data.org API to keep API key secure
  app.get("/api/matches", async (req, res) => {
    try {
      let apiKey = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY;
      
      // Check for common placeholders or empty strings
      const placeholders = ["YOUR_KEY_HERE", "MY_API_KEY", "FOOTBALL_API_KEY", ""];
      if (apiKey && placeholders.includes(apiKey.trim())) {
        apiKey = undefined;
      }
      
      if (!apiKey) {
        console.warn("FOOTBALL_API_KEY not found or placeholder. Returning mock data.");
        return res.json({
          isMock: true,
          matches: [
            {
              id: 202601,
              utcDate: "2026-06-11T20:00:00Z",
              status: "TIMED",
              competition: { name: "FIFA World Cup 2026", slug: "world-cup-2026", area: { name: "World" } },
              area: { name: "World" },
              homeTeam: { name: "USA" },
              awayTeam: { name: "TBD" },
              venue: "SoFi Stadium",
              note: "Opening Match (Simulated)"
            },
            {
              id: 101,
              utcDate: new Date(Date.now() + 86400000).toISOString(),
              status: "TIMED",
              competition: { name: "Premier League", slug: "premier-league", area: { name: "England" } },
              area: { name: "England" },
              homeTeam: { name: "Arsenal" },
              awayTeam: { name: "Manchester City" },
              venue: "Emirates Stadium"
            }
          ]
        });
      }

      // Calculate date range for next 7 days
      const dateFrom = new Date().toISOString().split('T')[0];
      const dateTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await fetch(`https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
        headers: { 
          "X-Auth-Token": apiKey,
          "Content-Type": "application/json"
        },
      });

      // Precise ES6 Throttling (as per Lead Dev request)
      const requestsRemaining = response.headers.get('x-requests-available-minute');
      const resetTime = response.headers.get('x-requestcounter-reset');

      if (requestsRemaining) {
        res.setHeader('X-Requests-Available', requestsRemaining);
      }

      if (!response.ok) {
        const errorData = (await response.json()) as any;
        let message = errorData.message || `API error: ${response.status}`;
        throw new Error(message);
      }

      const data = (await response.json()) as any;
      res.json({ ...data, requestsRemaining, resetTime });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch match data" });
    }
  });

  // Simple in-memory cache for AI responses to save quota
  const aiCache = new Map<string, { data: any, timestamp: number }>();
  const CHAT_CACHE = new Map<string, { data: any, timestamp: number }>(); 
  const INFLIGHT_REQUESTS = new Map<string, Promise<any>>();
  const CACHE_TTL = 1000 * 60 * 60 * 48; // 48 hours for match analysis
  let sharedCooldownUntil = 0;
  let lastGeminiRequestTime = 0;

  /**
   * Normalize prompt to increase cache hit rates and ensure uniformity across users.
   * Strips all non-essential data for match identification.
   */
  const normalizePrompt = (prompt: string): string => {
    if (!prompt) return "";
    
    // Look for Fixture and Competition patterns
    const matchMatch = prompt.match(/Fixture:\s*(.*)\s*vs\s*(.*)/i);
    
    if (matchMatch) {
       const normalizeName = (name: string) => name.toLowerCase()
         .replace(/f\.c\.|fc|club|real|united|city|rovers|hotspur|athletic|town|county|st\s|saint\s/g, '')
         .replace(/[^a-z0-9]/g, '')
         .trim();

       const teams = [normalizeName(matchMatch[1]), normalizeName(matchMatch[2])].sort();
       
       // Sort teams alphabetically so A vs B == B vs A in cache
       return `MATCH_ANALYSIS_V5_${teams[0]}_${teams[1]}`;
    }
    
    return "GENERIC_" + prompt.trim().toLowerCase().replace(/\s+/g, ' ').substring(0, 300);
  };

  /**
   * Strictly serialized request queue for Gemini to enforce RPM limits.
   * Free tier is 15 RPM, so we aim for ~6 RPM (10s delay) to be extremely safe.
   */
  let geminiRequestQueue: Promise<any> = Promise.resolve();
  const MIN_GEMINI_DELAY = 10000; // 10s for ~6 RPM (well under 15 RPM limit)

  const FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-3-flash-preview", "gemini-flash-latest", "gemini-3.1-flash-lite"];

  const enqueueGeminiRequest = <T>(requestFn: (modelName: string) => Promise<T>): Promise<T> => {
    const previous = geminiRequestQueue;
    const current = (async () => {
      try {
        await previous;
      } catch (e) {
        // Ignore previous failures
      }
      
      const executeWithRetry = async (modelIndex: number): Promise<T> => {
        const modelName = FALLBACK_MODELS[modelIndex];
        
        const now = Date.now();
        const elapsed = now - lastGeminiRequestTime;
        if (elapsed < MIN_GEMINI_DELAY) {
          const wait = MIN_GEMINI_DELAY - elapsed;
          console.log(`[Queue] Delaying Gemini call by ${wait}ms to respect free-tier RPM...`);
          await new Promise(resolve => setTimeout(resolve, wait));
        }
        
        lastGeminiRequestTime = Date.now();
        
        try {
          console.log(`[Queue] Attempting Gemini request with: ${modelName}`);
          return await requestFn(modelName);
        } catch (error: any) {
          const errorMessage = error.message || "";
          const isQuota = errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota");
          const isNotFound = errorMessage.includes("404") || errorMessage.toLowerCase().includes("not found");
          
          if ((isQuota || isNotFound) && modelIndex < FALLBACK_MODELS.length - 1) {
            console.warn(`[Queue] ${modelName} triggered fallback (Reason: ${isQuota ? "Quota" : "Not Found"}). Trying ${FALLBACK_MODELS[modelIndex + 1]}...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause before fallback
            return executeWithRetry(modelIndex + 1);
          }
          throw error;
        }
      };

      return await executeWithRetry(0);
    })();
    
    geminiRequestQueue = current.catch(() => {}); // Don't block queue on failure
    return current;
  };

  // AI Analysis Proxy (Server-side Gemini)
  app.post("/api/analyze", async (req, res) => {
    const { prompt } = req.body;
    const normalized = normalizePrompt(prompt);
    
    try {
      if (Date.now() < sharedCooldownUntil) {
        const remaining = Math.ceil((sharedCooldownUntil - Date.now()) / 1000);
        return res.status(429).json({ 
          error: `Neural processor at capacity. Global cooldown active for ${remaining}s. Intelligence node cooling.`,
          isQuotaExceeded: true,
          retryAfterMs: sharedCooldownUntil - Date.now()
        });
      }

      // Check cache
      const cached = aiCache.get(normalized);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Cache] Hit for: ${normalized}`);
        return res.json(cached.data);
      }

      // De-deduplicate concurrent requests
      if (INFLIGHT_REQUESTS.has(normalized)) {
        console.log(`[Cache] De-duped concurrent request for: ${normalized}`);
        const data = await INFLIGHT_REQUESTS.get(normalized);
        return res.json(data);
      }

      const requestPromise = enqueueGeminiRequest(async (modelName) => {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) throw new Error("GEMINI_API_KEY missing.");

        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const result = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { 
            responseMimeType: "application/json",
            temperature: 0.1
          }
        });

        const text = result.text;
        if (!text) throw new Error("Empty AI response.");
        
        const responseData = JSON.parse(text);
        aiCache.set(normalized, { data: responseData, timestamp: Date.now() });
        return responseData;
      });

      INFLIGHT_REQUESTS.set(normalized, requestPromise);
      
      try {
        const responseData = await requestPromise;
        res.json(responseData);
      } finally {
        INFLIGHT_REQUESTS.delete(normalized);
      }
    } catch (geminiError: any) {
      console.error("Gemini API Error (Analyze):", geminiError);
      const errorMessage = geminiError.message || "";
      
      if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("limit")) {
        const baseCooldown = 30 * 60 * 1000; // Increase to 30 min cooldown
        sharedCooldownUntil = Date.now() + baseCooldown;
        
        return res.status(429).json({ 
          error: "All Neural nodes at capacity. Quota exhausted across all available tiers. Global cooling active for 30 minutes.",
          isQuotaExceeded: true,
          retryAfterMs: baseCooldown 
        });
      }
      res.status(500).json({ error: errorMessage || "Tactical node sequence error." });
    }
  });


  // Generic AI Generation Proxy
  app.post("/api/ai/generate", async (req, res) => {
    const { prompt } = req.body;
    const normalized = normalizePrompt(prompt);
    try {
      if (Date.now() < sharedCooldownUntil) {
        return res.status(429).json({ 
          error: "Intelligence Node cooling down (429).",
          isQuotaExceeded: true,
          retryAfterMs: sharedCooldownUntil - Date.now()
        });
      }

      // Check cache
      const cached = aiCache.get(normalized);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json({ text: cached.data });
      }

      if (INFLIGHT_REQUESTS.has(normalized)) {
        const text = await INFLIGHT_REQUESTS.get(normalized);
        return res.json({ text });
      }

      const requestPromise = enqueueGeminiRequest(async (modelName) => {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) throw new Error("GEMINI_API_KEY missing.");

        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const result = await ai.models.generateContent({
          model: modelName,
          contents: prompt
        });

        const text = result.text;
        if (!text) throw new Error("Empty AI response.");
        
        aiCache.set(normalized, { data: text, timestamp: Date.now() });
        return text;
      });

      INFLIGHT_REQUESTS.set(normalized, requestPromise);

      try {
        const text = await requestPromise;
        res.json({ text });
      } finally {
        INFLIGHT_REQUESTS.delete(normalized);
      }
    } catch (geminiError: any) {
      console.error("Gemini API Error (Generate):", geminiError);
      const errorMessage = geminiError.message || "";
      if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("limit")) {
        sharedCooldownUntil = Date.now() + 30 * 60 * 1000;
        return res.status(429).json({ error: "Rate limit hit across all models.", isQuotaExceeded: true, retryAfterMs: 1800000 });
      }
      res.status(500).json({ error: errorMessage || "AI Engine failure." });
    }
  });

  // AI Chat Proxy (Stateless)
  app.post("/api/ai/chat", async (req, res) => {
    const { history, message } = req.body;
    try {
      if (Date.now() < sharedCooldownUntil) {
        return res.status(429).json({ 
          error: "Oracle temporarily disconnected. Recovery in progress.",
          isQuotaExceeded: true,
          retryAfterMs: sharedCooldownUntil - Date.now()
        });
      }

      const chatKey = JSON.stringify({ h: history.length, m: message });
      const cached = CHAT_CACHE.get(chatKey);
      if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
        return res.json(cached.data);
      }

      if (INFLIGHT_REQUESTS.has(chatKey)) {
        const data = await INFLIGHT_REQUESTS.get(chatKey);
        return res.json(data);
      }

      const requestPromise = enqueueGeminiRequest(async (modelName) => {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) throw new Error("GEMINI_API_KEY missing.");

        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const chat = ai.chats.create({
          model: modelName,
          config: {
            systemInstruction: "You are a tactical football analyst and predictive engine."
          }
        });
        
        const result = await chat.sendMessage({ message });
        const text = result.text;
        if (!text) throw new Error("Empty AI response.");
        
        const responseData = { text };
        
        CHAT_CACHE.set(chatKey, { data: responseData, timestamp: Date.now() });
        return responseData;
      });

      INFLIGHT_REQUESTS.set(chatKey, requestPromise);

      try {
        const responseData = await requestPromise;
        res.json(responseData);
      } finally {
        INFLIGHT_REQUESTS.delete(chatKey);
      }
    } catch (geminiError: any) {
      console.error("Gemini API Error (Chat):", geminiError);
      const errorMessage = geminiError.message || "";
      if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("limit")) {
        sharedCooldownUntil = Date.now() + 30 * 60 * 1000;
        return res.status(429).json({ 
          error: "Oracle temporarily disconnected. All Intelligence nodes at capacity.",
          isQuotaExceeded: true,
          retryAfterMs: 1800000 
        });
      }
      res.status(500).json({ error: errorMessage || "Tactical communication failed." });
    }
  });

  // Proxy for specific match details
  app.get("/api/matches/:id", async (req, res) => {
    try {
      let apiKey = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY;
      const { id } = req.params;
      
      const placeholders = ["YOUR_KEY_HERE", "MY_API_KEY", "FOOTBALL_API_KEY", ""];
      if (apiKey && placeholders.includes(apiKey.trim())) {
        apiKey = undefined;
      }
      
      if (!apiKey) {
        return res.json({ 
          id,
          venue: "Emirates Stadium (Mock)",
          referee: { name: "Michael Oliver (Mock)" },
          status: "TIMED",
          homeTeam: { 
            name: "Arsenal",
            crest: "https://crests.football-data.org/57.png"
          },
          awayTeam: { 
            name: "Manchester City",
            crest: "https://crests.football-data.org/65.png"
          },
          statistics: {
            possession: { home: "58%", away: "42%" },
            shots: { home: 14, away: 9 },
            shotsOnTarget: { home: 6, away: 3 },
            corners: { home: 7, away: 4 },
            fouls: { home: 11, away: 14 }
          }
        });
      }

      const response = await fetch(`https://api.football-data.org/v4/matches/${id}`, {
        headers: { 
          "X-Auth-Token": apiKey,
          "Content-Type": "application/json"
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch match details" });
    }
  });

  // Proxy for Head-to-Head data
  app.get("/api/matches/:id/head2head", async (req, res) => {
    try {
      let apiKey = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY;
      const { id } = req.params;
      
      const placeholders = ["YOUR_KEY_HERE", "MY_API_KEY", "FOOTBALL_API_KEY", ""];
      if (apiKey && placeholders.includes(apiKey.trim())) {
        apiKey = undefined;
      }
      
      if (!apiKey) {
        return res.json({ 
          matches: [
            {
              id: 901,
              utcDate: "2023-10-08T15:30:00Z",
              homeTeam: { name: "Arsenal" },
              awayTeam: { name: "Manchester City" },
              score: { fullTime: { home: 1, away: 0 } },
              competition: { name: "Premier League" }
            },
            {
              id: 902,
              utcDate: "2023-08-06T15:00:00Z",
              homeTeam: { name: "Manchester City" },
              awayTeam: { name: "Arsenal" },
              score: { fullTime: { home: 1, away: 1 } },
              competition: { name: "FA Cup" }
            },
            {
              id: 903,
              utcDate: "2023-04-26T19:00:00Z",
              homeTeam: { name: "Manchester City" },
              awayTeam: { name: "Arsenal" },
              score: { fullTime: { home: 4, away: 1 } },
              competition: { name: "Premier League" }
            },
            {
              id: 904,
              utcDate: "2023-02-15T19:30:00Z",
              homeTeam: { name: "Arsenal" },
              awayTeam: { name: "Manchester City" },
              score: { fullTime: { home: 1, away: 3 } },
              competition: { name: "Premier League" }
            },
            {
              id: 905,
              utcDate: "2023-01-27T19:00:00Z",
              homeTeam: { name: "Manchester City" },
              awayTeam: { name: "Arsenal" },
              score: { fullTime: { home: 1, away: 0 } },
              competition: { name: "FA Cup" }
            }
          ], 
          aggregates: { 
            numberOfMatches: 50, 
            homeTeam: { wins: 15, draws: 10, losses: 25 }, 
            awayTeam: { wins: 25, draws: 10, losses: 15 } 
          } 
        });
      }

      const response = await fetch(`https://api.football-data.org/v4/matches/${id}/head2head`, {
        headers: { 
          "X-Auth-Token": apiKey,
          "Content-Type": "application/json"
        },
      });

      // Throttling Check
      const requestsRemaining = response.headers.get('x-requests-available-minute');
      if (requestsRemaining && parseInt(requestsRemaining) < 2) {
        console.warn(`[Football API H2H] Rate limit low: ${requestsRemaining} left.`);
      }

      if (!response.ok) {
        const errorData = (await response.json()) as any;
        let message = errorData.message || "API error fetching H2H";
        if (message.includes("invalid") || response.status === 401) {
          message = "Football-Data.org API key is invalid or not provided. Please check your FOOTBALL_API_KEY in the Secrets panel.";
        }
        throw new Error(message);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch H2H data" });
    }
  });

  // League Standings Proxy
  app.get("/api/leagues/:id/standings", async (req, res) => {
    try {
      let apiKey = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY;
      const { id } = req.params;
      
      const placeholders = ["YOUR_KEY_HERE", "MY_API_KEY", "FOOTBALL_API_KEY", ""];
      if (apiKey && placeholders.includes(apiKey.trim())) {
        apiKey = undefined;
      }

      if (!apiKey) {
        // Provide realistic mock standings based on league ID
        const mockStandings: Record<string, any> = {
          "2021": [ // Premier League
            { position: 1, team: { id: 61, name: "Chelsea FC", crest: "https://crests.football-data.org/61.png" }, playedGames: 28, won: 18, draw: 6, lost: 4, points: 60, goalsFor: 52, goalsAgainst: 24, goalDifference: 28 },
            { position: 2, team: { id: 65, name: "Manchester City FC", crest: "https://crests.football-data.org/65.png" }, playedGames: 28, won: 17, draw: 7, lost: 4, points: 58, goalsFor: 58, goalsAgainst: 26, goalDifference: 32 },
            { position: 3, team: { id: 64, name: "Liverpool FC", crest: "https://crests.football-data.org/64.png" }, playedGames: 28, won: 17, draw: 5, lost: 6, points: 56, goalsFor: 55, goalsAgainst: 28, goalDifference: 27 },
            { position: 4, team: { id: 57, name: "Arsenal FC", crest: "https://crests.football-data.org/57.png" }, playedGames: 28, won: 16, draw: 6, lost: 6, points: 54, goalsFor: 50, goalsAgainst: 30, goalDifference: 20 },
            { position: 5, team: { id: 73, name: "Tottenham Hotspur FC", crest: "https://crests.football-data.org/73.png" }, playedGames: 28, won: 14, draw: 5, lost: 9, points: 47, goalsFor: 44, goalsAgainst: 38, goalDifference: 6 }
          ],
          "2014": [ // La Liga
            { position: 1, team: { id: 86, name: "Real Madrid CF", crest: "https://crests.football-data.org/86.png" }, playedGames: 27, won: 20, draw: 6, lost: 1, points: 66, goalsFor: 54, goalsAgainst: 18, goalDifference: 36 },
            { position: 2, team: { id: 78, name: "Club Atlético de Madrid", crest: "https://crests.football-data.org/78.png" }, playedGames: 27, won: 17, draw: 4, lost: 6, points: 55, goalsFor: 48, goalsAgainst: 24, goalDifference: 24 },
            { position: 3, team: { id: 81, name: "FC Barcelona", crest: "https://crests.football-data.org/81.png" }, playedGames: 27, won: 16, draw: 6, lost: 5, points: 54, goalsFor: 51, goalsAgainst: 29, goalDifference: 22 },
            { position: 4, team: { id: 298, name: "Girona FC", crest: "https://crests.football-data.org/298.png" }, playedGames: 27, won: 16, draw: 5, lost: 6, points: 53, goalsFor: 53, goalsAgainst: 32, goalDifference: 21 }
          ],
          "default": [
            { position: 1, team: { id: 1, name: "Simulated Leader", crest: "" }, playedGames: 20, won: 15, draw: 3, lost: 2, points: 48, goalsFor: 40, goalsAgainst: 15, goalDifference: 25 },
            { position: 2, team: { id: 2, name: "Challenger Node", crest: "" }, playedGames: 20, won: 12, draw: 4, lost: 4, points: 40, goalsFor: 35, goalsAgainst: 20, goalDifference: 15 }
          ]
        };

        return res.json({ 
          standings: [
            { table: mockStandings[id] || mockStandings["default"] }
          ] 
        });
      }

      const response = await fetch(`https://api.football-data.org/v4/competitions/${id}/standings`, {
        headers: { "X-Auth-Token": apiKey }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      res.json(await response.json());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // League Scorers Proxy
  app.get("/api/leagues/:id/scorers", async (req, res) => {
    try {
      let apiKey = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY;
      const { id } = req.params;
      if (!apiKey || apiKey.includes("YOUR_KEY")) return res.json({ scorers: [] });
      const response = await fetch(`https://api.football-data.org/v4/competitions/${id}/scorers`, {
        headers: { "X-Auth-Token": apiKey }
      });
      res.json(await response.json());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Team Detail Proxy
  app.get("/api/teams/:id", async (req, res) => {
    try {
      let apiKey = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY;
      const { id } = req.params;
      if (!apiKey || apiKey.includes("YOUR_KEY")) return res.json({ 
        id,
        name: "Mock Tactical Node", 
        crest: "",
        venue: "Digital Arena",
        founded: 1899,
        clubColors: "Black / Yellow",
        squad: [],
        statistics: {
          possession: 54,
          shots: 12.5,
          shotsOnTarget: 4.8,
          corners: 5.2,
          fouls: 11.2,
          yellowCards: 1.8,
          offsides: 2.1,
          freeKicks: 14.5
        }
      });
      const response = await fetch(`https://api.football-data.org/v4/teams/${id}`, {
        headers: { "X-Auth-Token": apiKey }
      });
      res.json(await response.json());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Team Matches Proxy
  app.get("/api/teams/:id/matches", async (req, res) => {
    try {
      let apiKey = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY;
      const { id } = req.params;
      const { status } = req.query;
      if (!apiKey || apiKey.includes("YOUR_KEY")) return res.json({ matches: [] });
      const response = await fetch(`https://api.football-data.org/v4/teams/${id}/matches?status=${status || 'SCHEDULED'}`, {
        headers: { "X-Auth-Token": apiKey }
      });
      res.json(await response.json());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Lineups Proxy
  app.get("/api/matches/:id/lineups", async (req, res) => {
    try {
      let apiKey = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY;
      const { id } = req.params;

      const placeholders = ["YOUR_KEY_HERE", "MY_API_KEY", "FOOTBALL_API_KEY", ""];
      if (apiKey && placeholders.includes(apiKey.trim())) apiKey = undefined;

      if (!apiKey) {
        // MOCK: realistic lineup data
        return res.json({
          mock: true,
          homeTeam: {
            formation: "4-3-3",
            startXI: [
              { id: 1, name: "David Raya", position: "GK", shirtNumber: 1, nationality: "Spain" },
              { id: 2, name: "Ben White", position: "RB", shirtNumber: 4, nationality: "England" },
              { id: 3, name: "William Saliba", position: "CB", shirtNumber: 12, nationality: "France" },
              { id: 4, name: "Gabriel Magalhães", position: "CB", shirtNumber: 6, nationality: "Brazil" },
              { id: 5, name: "Oleksandr Zinchenko", position: "LB", shirtNumber: 35, nationality: "Ukraine" },
              { id: 6, name: "Declan Rice", position: "CM", shirtNumber: 41, nationality: "England" },
              { id: 7, name: "Thomas Partey", position: "CM", shirtNumber: 5, nationality: "Ghana" },
              { id: 8, name: "Martin Ødegaard", position: "CAM", shirtNumber: 8, nationality: "Norway" },
              { id: 9, name: "Bukayo Saka", position: "RW", shirtNumber: 7, nationality: "England" },
              { id: 10, name: "Leandro Trossard", position: "LW", shirtNumber: 19, nationality: "Belgium" },
              { id: 11, name: "Kai Havertz", position: "ST", shirtNumber: 29, nationality: "Germany" }
            ],
            bench: [
              { id: 12, name: "Aaron Ramsdale", position: "GK", shirtNumber: 32 },
              { id: 13, name: "Kieran Tierney", position: "LB", shirtNumber: 3 },
              { id: 14, name: "Eddie Nketiah", position: "ST", shirtNumber: 14 },
            ]
          },
          awayTeam: {
            formation: "4-2-3-1",
            startXI: [
              { id: 31, name: "Ederson", position: "GK", shirtNumber: 31, nationality: "Brazil" },
              { id: 32, name: "Kyle Walker", position: "RB", shirtNumber: 2, nationality: "England" },
              { id: 33, name: "Rúben Dias", position: "CB", shirtNumber: 3, nationality: "Portugal" },
              { id: 34, name: "Manuel Akanji", position: "CB", shirtNumber: 25, nationality: "Switzerland" },
              { id: 35, name: "Joško Gvardiol", position: "LB", shirtNumber: 24, nationality: "Croatia" },
              { id: 36, name: "Rodri", position: "DM", shirtNumber: 16, nationality: "Spain" },
              { id: 37, name: "Kevin De Bruyne", position: "CM", shirtNumber: 17, nationality: "Belgium" },
              { id: 38, name: "Phil Foden", position: "CAM", shirtNumber: 47, nationality: "England" },
              { id: 39, name: "Bernardo Silva", position: "RW", shirtNumber: 20, nationality: "Portugal" },
              { id: 40, name: "Jack Grealish", position: "LW", shirtNumber: 10, nationality: "England" },
              { id: 41, name: "Erling Haaland", position: "ST", shirtNumber: 9, nationality: "Norway" }
            ],
            bench: [
              { id: 42, name: "Stefan Ortega", position: "GK", shirtNumber: 18 },
              { id: 43, name: "Mateo Kovacic", position: "CM", shirtNumber: 8 },
            ]
          }
        });
      }

      // football-data.org does not provide lineups on free tier
      return res.json({ message: "Lineup data requires paid football-data.org subscription", mock: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Odds Proxy
  app.get("/api/odds/:matchId", async (req, res) => {
    // Mock odds data — no external API needed for MVP
    return res.json({
      bookmakers: [
        {
          name: "Bet365",
          logo: null,
          markets: {
            h2h: { home: 1.95, draw: 3.40, away: 4.10 },
            over_under: { over: 1.85, under: 1.95 },
            btts: { yes: 1.75, no: 2.05 }
          },
          movement: "up"
        },
        {
          name: "Betfair",
          logo: null,
          markets: {
            h2h: { home: 1.98, draw: 3.45, away: 4.05 },
            over_under: { over: 1.87, under: 1.93 },
            btts: { yes: 1.78, no: 2.02 }
          },
          movement: "down"
        },
        {
          name: "Pinnacle",
          logo: null,
          markets: {
            h2h: { home: 1.92, draw: 3.50, away: 4.20 },
            over_under: { over: 1.88, under: 1.94 },
            btts: { yes: 1.80, no: 2.00 }
          },
          movement: "stable"
        }
      ],
      movementHistory: [
        { time: 'Open', home: 2.30, draw: 3.50, away: 3.20 },
        { time: '-12h', home: 2.20, draw: 3.45, away: 3.35 },
        { time: '-6h', home: 2.15, draw: 3.42, away: 3.50 },
        { time: '-3h', home: 2.05, draw: 3.40, away: 3.80 },
        { time: '-1h', home: 1.98, draw: 3.40, away: 4.00 },
        { time: 'Now', home: 1.95, draw: 3.40, away: 4.10 },
      ]
    });
  });

  // Weather Proxy
  app.get("/api/weather/:city", async (req, res) => {
    const { city } = req.params;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    const getWindDir = (deg: number) => {
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      return dirs[Math.round(deg / 45) % 8];
    };

    if (!apiKey || apiKey.includes("YOUR_KEY")) {
      // Return mock weather data
      return res.json({
        temp: 16,
        feelsLike: 14,
        description: "Partly Cloudy",
        icon: "02d",
        humidity: 68,
        windSpeed: 18,         // km/h
        windDirection: "NW",
        visibility: 10,        // km
        conditions: "overcast clouds",
        impact: "LOW"          // LOW / MEDIUM / HIGH pitch impact
      });
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
      );
      const data = (await response.json()) as any;

      const windSpeed = Math.round(data.wind?.speed * 3.6);  // m/s → km/h
      let impact = "LOW";
      if (windSpeed > 40 || data.weather?.[0]?.main === "Rain" || data.weather?.[0]?.main === "Snow") impact = "HIGH";
      else if (windSpeed > 25) impact = "MEDIUM";

      res.json({
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        description: data.weather?.[0]?.description,
        icon: data.weather?.[0]?.icon,
        humidity: data.main.humidity,
        windSpeed,
        windDirection: getWindDir(data.wind?.deg),
        visibility: Math.round((data.visibility || 10000) / 1000),
        conditions: data.weather?.[0]?.main,
        impact
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
