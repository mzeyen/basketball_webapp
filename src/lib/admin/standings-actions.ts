"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import { createTeamGroup, listTeamGroups } from "@/lib/team-store";
import { updateTeamStandingConfigsAndRefresh } from "@/lib/team-standings";
import type { TeamGroup } from "@/lib/teams";

function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function updateTeamStandingConfigsAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/?error=forbidden");
  }

  const teamGroups = await listTeamGroups();
  const leagueIds = Object.fromEntries(
    teamGroups.map((team) => [team, getString(formData, `leagueId-${team}`)]),
  ) as Partial<Record<TeamGroup, string>>;

  const hasInvalidId = Object.values(leagueIds).some((leagueId) => Boolean(leagueId) && !/^\d+$/.test(String(leagueId)));

  if (hasInvalidId) {
    redirect("/admin?error=invalid-standings-config");
  }

  const result = await updateTeamStandingConfigsAndRefresh(leagueIds);

  revalidatePath("/admin");
  revalidatePath("/");
  redirect(result.failed.length > 0 ? "/admin?updated=standings-config-partial" : "/admin?updated=standings-config");
}

export async function createTeamGroupAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/?error=forbidden");
  }

  const team = getString(formData, "team");

  try {
    await createTeamGroup(team);
  } catch {
    redirect("/admin?error=invalid-team");
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/training-plans");
  revalidatePath("/training-exercises");
  redirect("/admin?updated=team-created");
}
