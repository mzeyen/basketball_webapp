"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserSession } from "@/lib/auth/session";
import { createCalendarEvent, deleteCalendarEvent, findCalendarEventById } from "@/lib/calendar-events";
import { findTrainingPlanById } from "@/lib/training-plans";
import { canAccessAdmin } from "@/lib/rbac/roles";
import { isTeamGroup } from "@/lib/teams";

function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function toIsoDateTime(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createCalendarEventAction(formData: FormData): Promise<void> {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const title = getString(formData, "title");
  const startsAt = toIsoDateTime(getString(formData, "startsAt"));
  const endsAt = toIsoDateTime(getString(formData, "endsAt"));
  const location = getString(formData, "location");
  const notes = getString(formData, "notes");
  const teamValue = getString(formData, "team");
  const trainingPlanId = getString(formData, "trainingPlanId");

  if (title.length < 3 || !startsAt || (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime())) {
    redirect("/calendar?error=invalid-event");
  }

  if (trainingPlanId) {
    const trainingPlan = await findTrainingPlanById(trainingPlanId);

    if (!trainingPlan) {
      redirect("/calendar?error=invalid-event");
    }
  }

  await createCalendarEvent({
    title,
    startsAt,
    endsAt,
    location,
    notes,
    team: isTeamGroup(teamValue) ? teamValue : null,
    trainingPlanId: trainingPlanId || null,
    createdBy: session.userId,
  });

  revalidatePath("/calendar");
  redirect("/calendar?created=1");
}

export async function deleteCalendarEventAction(formData: FormData): Promise<void> {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const eventId = getString(formData, "eventId");
  const event = eventId ? await findCalendarEventById(eventId) : null;

  if (!event) {
    redirect("/calendar?error=invalid-delete");
  }

  if (!canAccessAdmin(session.role) && event.createdBy !== session.userId) {
    redirect("/calendar?error=forbidden-delete");
  }

  await deleteCalendarEvent(event.id);
  revalidatePath("/calendar");
  redirect("/calendar?deleted=1");
}
