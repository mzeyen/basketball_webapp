export const teamGroups = ["u10", "u12", "u14", "u16", "u19", "damen"] as const;

export type TeamGroup = string;

export function normalizeTeamValue(value: string): string {
  return value.trim().toLowerCase();
}

export function isTeamGroup(value: string): value is TeamGroup {
  const normalizedValue = normalizeTeamValue(value);
  return normalizedValue !== "coaches" && /^[a-z0-9][a-z0-9-]{1,30}$/.test(normalizedValue);
}

export function normalizeTeamGroups(values: unknown): TeamGroup[] {
  const rawValues = Array.isArray(values) ? values : typeof values === "string" ? [values] : [];
  return [...new Set(rawValues.map(String).map(normalizeTeamValue).filter(isTeamGroup))];
}

export function getTeamGroupLabel(team: TeamGroup | null | undefined): string {
  const labels: Record<string, string> = {
    u10: "U10",
    u12: "U12",
    u14: "U14",
    u16: "U16",
    u19: "U19",
    damen: "Damen",
  };

  return team ? labels[team] ?? team.toUpperCase() : "Kein Team";
}

export function getTeamGroupLabels(teams: TeamGroup[] | null | undefined): string {
  const normalizedTeams = normalizeTeamGroups(teams).filter((team) => team !== "coaches");

  if (!normalizedTeams.length) {
    return "Kein Team";
  }

  return normalizedTeams.map(getTeamGroupLabel).join(", ");
}
