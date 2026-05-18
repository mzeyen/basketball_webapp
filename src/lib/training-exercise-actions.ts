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
  isAllowedTrainingExerciseMedia,
  maxTrainingExerciseFileSize,
  maxTrainingExerciseMediaSize,
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
  const coachingPoints = getString(formData, "coachingPoints");
  const courtDiagram = getString(formData, "courtDiagram");
  const load = getString(formData, "load");
  const organization = getString(formData, "organization");
  const templateName = getString(formData, "templateName");
  const team = getString(formData, "team");
  const tags = normalizeExerciseTags(getString(formData, "tags"));
  const file = formData.get("file");
  const mediaFile = formData.get("mediaFile");
  const hasMediaFile = mediaFile instanceof File && mediaFile.size > 0;

  if (
    title.length < 3 ||
    tags.length === 0 ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > maxTrainingExerciseFileSize ||
    !isAllowedTrainingExerciseFile(file) ||
    (hasMediaFile && (mediaFile.size > maxTrainingExerciseMediaSize || !isAllowedTrainingExerciseMedia(mediaFile)))
  ) {
    redirect("/training-exercises?error=invalid-upload");
  }

  await createTrainingExercise({
    title,
    description,
    coachingPoints: coachingPoints || undefined,
    courtDiagram: courtDiagram || undefined,
    load: load || undefined,
    organization: organization || undefined,
    team: isTeamGroup(team) ? team : null,
    tags,
    templateName: templateName || undefined,
    file,
    mediaFile: hasMediaFile ? mediaFile : null,
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
