"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserSession } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/rbac/roles";
import { isTeamGroup } from "@/lib/teams";
import {
  createTrainingExercise,
  deleteTrainingExercise,
  findTrainingExerciseById,
  isAllowedTrainingExerciseFile,
  maxTrainingExerciseFileSize,
  normalizeExerciseTags,
} from "@/lib/training-exercises";

function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function uploadTrainingExerciseAction(formData: FormData): Promise<void> {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const team = getString(formData, "team");
  const tags = normalizeExerciseTags(getString(formData, "tags"));
  const file = formData.get("file");

  if (
    title.length < 3 ||
    tags.length === 0 ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > maxTrainingExerciseFileSize ||
    !isAllowedTrainingExerciseFile(file)
  ) {
    redirect("/training-exercises?error=invalid-upload");
  }

  await createTrainingExercise({
    title,
    description,
    team: isTeamGroup(team) ? team : null,
    tags,
    file,
    uploadedBy: session.userId,
  });

  revalidatePath("/training-exercises");
  redirect("/training-exercises?uploaded=1");
}

export async function deleteTrainingExerciseAction(formData: FormData): Promise<void> {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const exerciseId = getString(formData, "exerciseId");
  const exercise = exerciseId ? await findTrainingExerciseById(exerciseId) : null;

  if (!exercise) {
    redirect("/training-exercises?error=invalid-delete");
  }

  const canDelete = canAccessAdmin(session.role) || exercise.uploadedBy === session.userId;

  if (!canDelete) {
    redirect("/training-exercises?error=forbidden-delete");
  }

  await deleteTrainingExercise(exercise.id);
  revalidatePath("/training-exercises");
  redirect("/training-exercises?deleted=1");
}
