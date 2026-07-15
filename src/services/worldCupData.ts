export interface WorldCupMatch {
  id: number;
  homeTeam: { name: string; crest?: string };
  awayTeam: { name: string; crest?: string };
  competition: { name: string; code: string };
  competitionCode: string;
  utcDate: string;
  status: "TIMED" | "SCHEDULED" | "IN_PLAY" | "PAUSED" | "LIVE" | "FINISHED" | "AWARDED";
  score?: { fullTime: { home: number; away: number } };
  minute?: number;
  group?: string;
  stage: "Group Stage" | "Round of 32" | "Quarter-Final" | "Semi-Final" | "Third Place" | "Final";
  venue?: string;
  winProbability?: { home: number; draw: number; away: number };
}

const TEAM_FLAGS: Record<string, string> = {
  USA: "🇺🇸", MEX: "🇲🇽", CAN: "🇨🇦", NZL: "🇳🇿",
  ARG: "🇦🇷", MAR: "🇲🇦", CRO: "🇭🇷", ECU: "🇪🇨",
  FRA: "🇫🇷", DEN: "🇩🇰", TUN: "🇹🇳", URU: "🇺🇾",
  ESP: "🇪🇸", NED: "🇳🇱", JPN: "🇯🇵", COL: "🇨🇴",
  BRA: "🇧🇷", BEL: "🇧🇪", PAN: "🇵🇦", SUI: "🇨🇭",
  POR: "🇵🇹", POL: "🇵🇱", GHA: "🇬🇭", JAM: "🇯🇲",
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", SEN: "🇸🇳", KSA: "🇸🇦", AUS: "🇦🇺",
  GER: "🇩🇪", FIN: "🇫🇮", CMR: "🇨🇲", IRN: "🇮🇷",
  ITA: "🇮🇹", KOR: "🇰🇷", EGY: "🇪🇬", CRC: "🇨🇷",
  PAR: "🇵🇾", CHI: "🇨🇱", NGA: "🇳🇬", CIV: "🇨🇮",
};

export function flag(name: string): string {
  return TEAM_FLAGS[name] || "🌐";
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const WC_2026_GROUPS = [
  ["USA", "MEX", "CAN", "NZL"],
  ["ARG", "MAR", "CRO", "ECU"],
  ["FRA", "DEN", "TUN", "URU"],
  ["ESP", "NED", "JPN", "COL"],
  ["BRA", "BEL", "PAN", "SUI"],
  ["POR", "POL", "GHA", "JAM"],
  ["ENG", "SEN", "KSA", "AUS"],
  ["GER", "FIN", "CMR", "IRN"],
  ["ITA", "KOR", "EGY", "CRC"],
  ["PAR", "CHI", "NGA", "CIV"],
];

const WC_2026_KNOCKOUT = [
  { id: 301, home: "Winner Group A", away: "Runner-up Group B", date: "2026-07-03T18:00:00Z", stage: "Round of 32" as const, venue: "Los Angeles" },
  { id: 302, home: "Winner Group C", away: "Runner-up Group D", date: "2026-07-04T18:00:00Z", stage: "Round of 32" as const, venue: "Miami" },
  { id: 303, home: "Winner Group E", away: "Runner-up Group F", date: "2026-07-04T21:00:00Z", stage: "Round of 32" as const, venue: "Dallas" },
  { id: 304, home: "Winner Group G", away: "Runner-up Group H", date: "2026-07-05T18:00:00Z", stage: "Round of 32" as const, venue: "Houston" },
  { id: 305, home: "Winner Group I", away: "Runner-up Group J", date: "2026-07-05T21:00:00Z", stage: "Round of 32" as const, venue: "Vancouver" },
  { id: 306, home: "Winner Group B", away: "Runner-up Group A", date: "2026-07-06T18:00:00Z", stage: "Round of 32" as const, venue: "Atlanta" },
  { id: 307, home: "Winner Group D", away: "Runner-up Group C", date: "2026-07-06T21:00:00Z", stage: "Round of 32" as const, venue: "Boston" },
  { id: 308, home: "Winner Group F", away: "Runner-up Group E", date: "2026-07-07T18:00:00Z", stage: "Round of 32" as const, venue: "Philadelphia" },
  { id: 309, home: "Winner Group H", away: "Runner-up Group G", date: "2026-07-07T21:00:00Z", stage: "Round of 32" as const, venue: "Seattle" },
];

function generateGroupMatches(): WorldCupMatch[] {
  const matches: WorldCupMatch[] = [];
  let idCounter = 1;

  WC_2026_GROUPS.forEach((group, groupIdx) => {
    const groupLabel = String.fromCharCode(65 + groupIdx);
    const [t1, t2, t3, t4] = group;

    const pairings: [number, number][] = [
      [0, 1], [2, 3], // MD1: Jun 13-16
      [0, 2], [1, 3], // MD2: Jun 20-23
      [0, 3], [1, 2], // MD3: Jun 27-30
    ];

    const matchdayDays: number[][] = [
      [13, 14, 15, 16],    // MD1
      [20, 21, 22, 23],    // MD2
      [27, 28, 29, 30],    // MD3
    ];

    pairings.forEach((pair, i) => {
      const rand = seededRandom(groupIdx * 100 + i);
      const homeProb = 25 + rand() * 40;
      const drawProb = 15 + rand() * 20;
      const awayProb = 100 - homeProb - drawProb;

      const matchdayIdx = Math.floor(i / 2);
      const slotOffset = i % 2;
      const day = matchdayDays[matchdayIdx][slotOffset];
      const hour = 14 + ((groupIdx + i) % 6); 

      matches.push({
        id: idCounter++,
        homeTeam: { name: group[pair[0]] },
        awayTeam: { name: group[pair[1]] },
        competition: { name: "World Cup 2026", code: "WC" },
        competitionCode: "WC",
        utcDate: `2026-06-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:00:00Z`,
        status: "TIMED",
        group: `Group ${groupLabel}`,
        stage: "Group Stage",
        venue: "Host City",
        winProbability: {
          home: Math.round(homeProb),
          draw: Math.round(drawProb),
          away: Math.round(awayProb),
        },
      });
    });
  });

  return matches;
}

export function generateWorldCupFallback(now: Date = new Date()): WorldCupMatch[] {
  const groupMatches = generateGroupMatches();
  const knockoutMatches: WorldCupMatch[] = WC_2026_KNOCKOUT.map((k, i) => {
    const rand = seededRandom(1000 + i);
    const homeProb = 30 + rand() * 35;
    const drawProb = 20 + rand() * 15;
    return {
      ...k,
      id: k.id,
      homeTeam: { name: k.home, crest: undefined },
      awayTeam: { name: k.away, crest: undefined },
      competition: { name: "World Cup 2026", code: "WC" },
      competitionCode: "WC",
      utcDate: k.date,
      status: "TIMED" as const,
      minute: undefined,
      score: { fullTime: { home: 0, away: 0 } },
      winProbability: {
        home: Math.round(homeProb),
        draw: Math.round(drawProb),
        away: Math.round(100 - homeProb - drawProb),
      },
    };
  });

  const allMatches = [...groupMatches, ...knockoutMatches];

  const nowStr = now.toISOString();
  allMatches.forEach(m => {
    const matchDate = new Date(m.utcDate);
    const diffMs = matchDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < -1.5) {
      m.status = "FINISHED";
      const rand = seededRandom(m.id * 3);
      m.score = {
        fullTime: {
          home: Math.floor(rand() * 4),
          away: Math.floor(rand() * 3),
        }
      };
    } else if (diffHours < 0 && diffHours > -1.5) {
      m.status = Math.random() > 0.85 ? "PAUSED" : "IN_PLAY";
      m.minute = Math.floor(45 + Math.random() * 45);
      const rand = seededRandom(m.id * 3);
      m.score = {
        fullTime: {
          home: Math.floor(rand() * 3),
          away: Math.floor(rand() * 2),
        }
      };
    } else if (diffHours >= 0 && diffHours < 3) {
      m.status = "SCHEDULED";
    }
  });

  return allMatches;
}

export type TimeCategory = 'live' | 'upcoming' | 'past';

export function getTimeCategory(match: WorldCupMatch, now: Date = new Date()): TimeCategory {
  const matchDate = new Date(match.utcDate);
  const diffMs = matchDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (["IN_PLAY", "PAUSED", "LIVE"].includes(match.status)) return 'live';
  if (diffHours > -1.5) return 'upcoming';
  return 'past';
};
