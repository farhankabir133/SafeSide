const PLACEHOLDER_KEYS = ["YOUR_KEY_HERE", "MY_API_KEY", "FOOTBALL_API_KEY", ""];

export function resolveFootballApiKey(): string | undefined {
  const raw = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY;
  if (!raw) return undefined;
  if (PLACEHOLDER_KEYS.includes(raw.trim())) return undefined;
  return raw.trim();
}
