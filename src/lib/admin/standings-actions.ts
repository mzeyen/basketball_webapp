"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import { updateTeamStandingConfigsAndRefresh } from "@/lib/team-standings";
import { teamGroups, type TeamGroup } from "@/lib/teams";

function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function updateTeamStandingConfigsAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/dashboard?error=forbidden");
  }

  const leagueIds = Object.fromEntries(
    teamGroups.map((team) => [team, getString(formData, `leagueId-${team}`)]),
  ) as Partial<Record<TeamGroup, string>>;

  const hasInvalidId = Object.values(leagueIds).some((leagueId) => leagueId.length > 0 && !/^\d+$/.test(leagueId));

  if (hasInvalidId) {
    redirect("/admin?error=invalid-standings-config");
  }

  const result = await updateTeamStandingConfigsAndRefresh(leagueIds);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(result.failed.length > 0 ? "/admin?updated=standings-config-partial" : "/admin?updated=standings-config");
}
