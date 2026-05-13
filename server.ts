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
              competition: { name: "FIFA World Cup 2026", area: { name: "World" } },
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
              competition: { name: "Premier League", area: { name: "England" } },
              area: { name: "England" },
              homeTeam: { name: "Arsenal" },
              awayTeam: { name: "Manchester City" },
              venue: "Emirates Stadium"
            },
            {
              id: 102,
              utcDate: new Date(Date.now() + 172800000).toISOString(),
              status: "TIMED",
              competition: { name: "Champions League", area: { name: "Europe" } },
              area: { name: "Europe" },
              homeTeam: { name: "Real Madrid" },
              awayTeam: { name: "Bayern Munich" },
              venue: "Santiago Bernabéu"
            },
            {
              id: 103,
              utcDate: new Date(Date.now() + 259200000).toISOString(),
              status: "TIMED",
              competition: { name: "Primera Division", area: { name: "Spain" } },
              area: { name: "Spain" },
              homeTeam: { name: "Barcelona" },
              awayTeam: { name: "Atletico Madrid" },
              venue: "Camp Nou"
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

      if (requestsRemaining && parseInt(requestsRemaining) < 2) {
        console.warn(`[Football API] Rate limit critical: ${requestsRemaining} left. Resets in ${resetTime}s.`);
      }

      if (!response.ok) {
        const errorData = (await response.json()) as any;
        let message = errorData.message || `API error: ${response.status}`;
        if (message.includes("invalid") || response.status === 401) {
          message = "Football-Data.org API key is invalid or not provided. Please check your FOOTBALL_API_KEY in the Secrets panel.";
        }
        throw new Error(message);
      }

      const data = (await response.json()) as any;
      res.json({ ...data, requestsRemaining, resetTime });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Match Fetch Error:", errorMessage);
      res.status(500).json({ error: errorMessage || "Failed to fetch match data" });
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
      if (!apiKey || apiKey.includes("YOUR_KEY")) return res.json({ name: "Mock Team", crest: "" });
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
