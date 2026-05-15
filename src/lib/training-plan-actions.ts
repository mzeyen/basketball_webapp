"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserSession } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/rbac/roles";
import {
  createTrainingPlan,
  deleteTrainingPlan,
  findTrainingPlanById,
  isAllowedTrainingPlanFile,
  isTrainingPlanCategory,
  maxTrainingPlanFileSize,
} from "@/lib/training-plans";

function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function uploadTrainingPlanAction(formData: FormData): Promise<void> {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const title = getString(formData, "title");
  const category = getString(formData, "category");
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
    uploadedBy: session.userId,
  });

  revalidatePath("/training-plans");
  redirect("/training-plans?uploaded=1");
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
