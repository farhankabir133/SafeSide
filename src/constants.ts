export const LEAGUES = [
  { id: 2021, code: 'PL', name: 'Premier League', slug: 'premier-league', area: 'England' },
  { id: 2001, code: 'CL', name: 'Champions League', slug: 'champions-league', area: 'Europe' },
  { id: 2014, code: 'PD', name: 'La Liga', slug: 'la-liga', area: 'Spain' },
  { id: 2002, code: 'BL1', name: 'Bundesliga', slug: 'bundesliga', area: 'Germany' },
  { id: 2019, code: 'SA', name: 'Serie A', slug: 'serie-a', area: 'Italy' },
  { id: 2000, code: 'WC', name: 'World Cup', slug: 'world-cup-2026', area: 'World' },
];

export const getLeagueBySlug = (slug: string) => LEAGUES.find(l => l.slug === slug);
export const getLeagueById = (id: number) => LEAGUES.find(l => l.id === id);
