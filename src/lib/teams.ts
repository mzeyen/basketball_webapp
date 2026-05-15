export const teamGroups = ["u10", "u12", "u14", "u16", "u19", "damen", "coaches"] as const;

export type TeamGroup = (typeof teamGroups)[number];

export function isTeamGroup(value: string): value is TeamGroup {
  return teamGroups.includes(value as TeamGroup);
}

export function normalizeTeamGroups(values: unknown): TeamGroup[] {
  const rawValues = Array.isArray(values) ? values : typeof values === "string" ? [values] : [];
  return [...new Set(rawValues.map(String).filter(isTeamGroup))];
}

export function getTeamGroupLabel(team: TeamGroup | null | undefined): string {
  const labels: Record<TeamGroup, string> = {
    u10: "U10",
    u12: "U12",
    u14: "U14",
    u16: "U16",
    u19: "U19",
    damen: "Damen",
    coaches: "Coaches",
  };

  return team ? labels[team] : "Kein Team";
}

export function getTeamGroupLabels(teams: TeamGroup[] | null | undefined): string {
  if (!teams?.length) {
    return "Kein Team";
  }

  return teams.map(getTeamGroupLabel).join(", ");
}
