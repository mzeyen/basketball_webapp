export const teamGroups = ["u10", "u12", "u14", "u16", "u19", "damen", "coaches"] as const;

export type TeamGroup = (typeof teamGroups)[number];

export function isTeamGroup(value: string): value is TeamGroup {
  return teamGroups.includes(value as TeamGroup);
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
