import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { teamGroups, type TeamGroup } from "@/lib/teams";

const dataDirectory = path.join(process.cwd(), ".data");
const standingsCacheFile = path.join(dataDirectory, "team-standings-cache.json");
const standingsConfigFile = path.join(dataDirectory, "team-standings-config.json");
const basketballBundTableUrl = "https://www.basketball-bund.net/rest/competition/table/id/";
const cacheTtlMs = 48 * 60 * 60 * 1000;

export type TeamStandingRow = {
  position: number | null;
  teamName: string;
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  points: string | null;
  scoreFor: number | null;
  scoreAgainst: number | null;
  scoreText: string | null;
};

export type TeamStandings = {
  configured: boolean;
  fetchedAt: string | null;
  leagueId?: string;
  sourceUrl?: string;
  team: TeamGroup | null;
  rows: TeamStandingRow[];
  stale: boolean;
  error?: string;
};

type CacheEntry = {
  fetchedAt: string;
  rows: TeamStandingRow[];
};

type CacheShape = {
  entries: Record<string, CacheEntry>;
};

export type TeamStandingConfig = {
  team: TeamGroup;
  leagueId: string;
};

type ConfigShape = {
  leagueIds: Partial<Record<TeamGroup, string>>;
};

function buildCacheKey(team: TeamGroup | null, sourceUrl: string): string {
  return `${sourceUrl}::${team ?? "all"}`;
}

async function readCache(): Promise<CacheShape> {
  try {
    const raw = await readFile(standingsCacheFile, "utf8");
    const parsed = JSON.parse(raw) as CacheShape;
    return { entries: parsed.entries ?? {} };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { entries: {} };
    }

    throw error;
  }
}

async function writeCache(cache: CacheShape): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(standingsCacheFile, JSON.stringify(cache, null, 2));
}

async function readConfig(): Promise<ConfigShape> {
  try {
    const raw = await readFile(standingsConfigFile, "utf8");
    const parsed = JSON.parse(raw) as ConfigShape;
    return { leagueIds: sanitizeLeagueIds(parsed.leagueIds ?? {}) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { leagueIds: {} };
    }

    throw error;
  }
}

async function writeConfig(config: ConfigShape): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(standingsConfigFile, JSON.stringify({ leagueIds: sanitizeLeagueIds(config.leagueIds) }, null, 2));
}

function sanitizeLeagueIds(input: Partial<Record<TeamGroup, string>>): Partial<Record<TeamGroup, string>> {
  return Object.fromEntries(
    teamGroups
      .map((team) => [team, String(input[team] ?? "").trim()] as const)
      .filter(([, leagueId]) => leagueId.length > 0),
  ) as Partial<Record<TeamGroup, string>>;
}

function getApiUrl(leagueId: string): string {
  return `${basketballBundTableUrl}${encodeURIComponent(leagueId)}`;
}

export async function listTeamStandingConfigs(): Promise<TeamStandingConfig[]> {
  const config = await readConfig();
  return teamGroups.map((team) => ({
    team,
    leagueId: config.leagueIds[team] ?? "",
  }));
}

export async function updateTeamStandingConfigs(leagueIds: Partial<Record<TeamGroup, string>>): Promise<void> {
  await writeConfig({ leagueIds });
}

function readNumber(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function readText(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readStandingValue(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const nestedData = record.data && typeof record.data === "object" && !Array.isArray(record.data) ? record.data as Record<string, unknown> : null;
  const nestedResult = record.result && typeof record.result === "object" && !Array.isArray(record.result) ? record.result as Record<string, unknown> : null;
  const candidates = [
    record.standings,
    record.table,
    record.rows,
    record.data,
    record.items,
    record.content,
    nestedData?.standings,
    nestedData?.table,
    nestedData?.rows,
    nestedData?.items,
    nestedResult?.standings,
    nestedResult?.table,
    nestedResult?.rows,
    nestedResult?.items,
  ];
  const match = candidates.find(Array.isArray);
  return match ?? [];
}

function normalizeRows(payload: unknown): TeamStandingRow[] {
  return extractRows(payload)
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((row, index) => ({
      position: readNumber(row, ["position", "rank", "place", "pos"]) ?? index + 1,
      teamName: readText(row, ["teamName", "team", "name", "club", "clubName", "mannschaft", "team_name"]) ?? "Unbekannt",
      played: readNumber(row, ["played", "games", "matches", "spiele", "anzahlSpiele", "sp"]),
      wins: readNumber(row, ["wins", "won", "siege", "gewonnen", "g"]),
      draws: readNumber(row, ["draws", "ties", "unentschieden", "u"]),
      losses: readNumber(row, ["losses", "lost", "niederlagen", "verloren", "v"]),
      points: readStandingValue(row, ["points", "pts", "punkte", "pkt"]),
      scoreFor: readNumber(row, ["scoreFor", "pointsFor", "for", "scored", "koerbeFuer", "korbfuer", "korbPunktePlus"]),
      scoreAgainst: readNumber(row, ["scoreAgainst", "pointsAgainst", "against", "conceded", "koerbeGegen", "korbgegen", "korbPunkteMinus"]),
      scoreText: readStandingValue(row, ["score", "scores", "baskets", "basket", "koerbe", "korbverhaeltnis", "korbpunkte"]),
    }));
}

async function fetchStandings(url: string): Promise<TeamStandingRow[]> {
  const headers: HeadersInit = { accept: "application/json" };

  if (process.env.STANDINGS_API_TOKEN) {
    headers.authorization = `Bearer ${process.env.STANDINGS_API_TOKEN}`;
  }

  const response = await fetch(url, { headers, cache: "no-store" });

  if (!response.ok) {
    throw new Error(`REST request failed with ${response.status}`);
  }

  return normalizeRows(await response.json());
}

export async function getTeamStandings(team: TeamGroup | null): Promise<TeamStandings> {
  const config = await readConfig();
  const leagueId = team ? config.leagueIds[team]?.trim() : undefined;

  if (!team || !leagueId) {
    return {
      configured: false,
      fetchedAt: null,
      leagueId,
      rows: [],
      stale: false,
      team,
    };
  }

  const sourceUrl = getApiUrl(leagueId);
  const cache = await readCache();
  const cacheKey = buildCacheKey(team, sourceUrl);
  const cachedEntry = cache.entries[cacheKey];
  const now = Date.now();

  if (cachedEntry && now - new Date(cachedEntry.fetchedAt).getTime() < cacheTtlMs) {
    return {
      configured: true,
      fetchedAt: cachedEntry.fetchedAt,
      leagueId,
      rows: cachedEntry.rows,
      sourceUrl,
      stale: false,
      team,
    };
  }

  try {
    const rows = await fetchStandings(sourceUrl);
    const fetchedAt = new Date().toISOString();
    cache.entries[cacheKey] = { fetchedAt, rows };
    await writeCache(cache);

    return {
      configured: true,
      fetchedAt,
      leagueId,
      rows,
      sourceUrl,
      stale: false,
      team,
    };
  } catch (error) {
    if (cachedEntry) {
      return {
        configured: true,
        error: error instanceof Error ? error.message : "REST request failed",
        fetchedAt: cachedEntry.fetchedAt,
        leagueId,
        rows: cachedEntry.rows,
        sourceUrl,
        stale: true,
        team,
      };
    }

    return {
      configured: true,
      error: error instanceof Error ? error.message : "REST request failed",
      fetchedAt: null,
      leagueId,
      rows: [],
      sourceUrl,
      stale: false,
      team,
    };
  }
}
