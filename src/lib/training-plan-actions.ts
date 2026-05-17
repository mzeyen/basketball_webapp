"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserSession } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/rbac/roles";
import { isTeamGroup } from "@/lib/teams";
import { findTrainingExerciseById, type TrainingExercise } from "@/lib/training-exercises";
import {
  createTrainingPlan,
  createTrainingPlanFromExercises,
  deleteTrainingPlan,
  findTrainingPlanById,
  isAllowedTrainingPlanFile,
  isTrainingPlanCategory,
  maxTrainingPlanFileSize,
} from "@/lib/training-plans";

function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function getStrings(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((value) => String(value).trim()).filter(Boolean);
}

function getOptionalPositiveInteger(formData: FormData, key: string): number | undefined {
  const value = Number(getString(formData, key));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

export async function uploadTrainingPlanAction(formData: FormData): Promise<void> {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const title = getString(formData, "title");
  const category = getString(formData, "category");
  const team = getString(formData, "team");
  const file = formData.get("file");

  if (
    !title ||
    !isTrainingPlanCategory(category) ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > maxTrainingPlanFileSize ||
    !isAllowedTrainingPlanFile(file)
  ) {
    redirect("/training-plans?error=invalid-upload");
  }

  await createTrainingPlan({
    title,
    category,
    file,
    team: isTeamGroup(team) ? team : null,
    uploadedBy: session.userId,
  });

  revalidatePath("/training-plans");
  redirect("/training-plans?uploaded=1");
}

export async function createTrainingPlanFromExercisesAction(formData: FormData): Promise<void> {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const title = getString(formData, "title");
  const category = getString(formData, "category");
  const team = getString(formData, "team");
  const exerciseIds = [...new Set(getStrings(formData, "exerciseIds"))];

  if (title.length < 3 || !isTrainingPlanCategory(category) || exerciseIds.length === 0) {
    redirect("/training-plans?error=invalid-generated-plan");
  }

  const exercises = (await Promise.all(exerciseIds.map((exerciseId) => findTrainingExerciseById(exerciseId)))).filter(
    (exercise): exercise is TrainingExercise => Boolean(exercise),
  );

  if (exercises.length !== exerciseIds.length) {
    redirect("/training-plans?error=invalid-generated-plan");
  }

  await createTrainingPlanFromExercises({
    title,
    category,
    team: isTeamGroup(team) ? team : null,
    exercises: exercises.map((exercise) => ({
      exercise,
      durationMinutes: getOptionalPositiveInteger(formData, `durationMinutes:${exercise.id}`),
      material: getString(formData, `material:${exercise.id}`) || undefined,
      notes: getString(formData, `notes:${exercise.id}`) || undefined,
    })),
    uploadedBy: session.userId,
  });

  revalidatePath("/training-plans");
  redirect("/training-plans?created=1");
}

export async function deleteTrainingPlanAction(formData: FormData): Promise<void> {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const planId = getString(formData, "planId");
  const plan = planId ? await findTrainingPlanById(planId) : null;

  if (!plan) {
    redirect("/training-plans?error=invalid-delete");
  }

  const canDelete = canAccessAdmin(session.role) || plan.uploadedBy === session.userId;

  if (!canDelete) {
    redirect("/training-plans?error=forbidden-delete");
  }

  await deleteTrainingPlan(plan.id);
  revalidatePath("/training-plans");
  redirect("/training-plans?deleted=1");
}
