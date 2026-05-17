import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { isTeamGroup, normalizeTeamGroups, normalizeTeamValue, teamGroups, type TeamGroup } from "@/lib/teams";

const dataDirectory = path.join(process.cwd(), ".data");
const teamGroupsFile = path.join(dataDirectory, "team-groups.json");

type TeamGroupsDatabase = {
  teams: TeamGroup[];
};

async function readTeamGroupsDatabase(): Promise<TeamGroupsDatabase> {
  try {
    const raw = await readFile(teamGroupsFile, "utf8");
    const parsed = JSON.parse(raw) as TeamGroupsDatabase;
    return { teams: normalizeTeamGroups(parsed.teams) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { teams: [] };
    }

    throw error;
  }
}

async function writeTeamGroupsDatabase(database: TeamGroupsDatabase): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(teamGroupsFile, JSON.stringify({ teams: normalizeTeamGroups(database.teams) }, null, 2));
}

export async function listTeamGroups(): Promise<TeamGroup[]> {
  const database = await readTeamGroupsDatabase();
  return [...new Set([...teamGroups, ...database.teams])].filter((team) => team !== "coaches");
}

export async function createTeamGroup(value: string): Promise<TeamGroup> {
  const team = normalizeTeamValue(value);

  if (!isTeamGroup(team)) {
    throw new Error("Invalid team");
  }

  const database = await readTeamGroupsDatabase();
  database.teams = [...new Set([...database.teams, team])];
  await writeTeamGroupsDatabase(database);

  return team;
}
