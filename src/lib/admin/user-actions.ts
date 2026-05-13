"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hashPassword } from "@/lib/auth/password";
import { requireAdminSession } from "@/lib/auth/session";
import { findUserById, setUserBlocked, updateUserPassword } from "@/lib/db";

function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function blockUserAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/dashboard?error=forbidden");
  }

  const userId = getString(formData, "userId");

  if (!userId || userId === session.userId) {
    redirect("/admin?error=invalid-user-action");
  }

  const user = await findUserById(userId);

  if (!user) {
    redirect("/admin?error=invalid-user-action");
  }

  await setUserBlocked(userId, true);
  revalidatePath("/admin");
  redirect("/admin?updated=blocked");
}

export async function unblockUserAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/dashboard?error=forbidden");
  }

  const userId = getString(formData, "userId");

  if (!userId) {
    redirect("/admin?error=invalid-user-action");
  }

  const user = await findUserById(userId);

  if (!user) {
    redirect("/admin?error=invalid-user-action");
  }

  await setUserBlocked(userId, false);
  revalidatePath("/admin");
  redirect("/admin?updated=unblocked");
}

export async function resetUserPasswordAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/dashboard?error=forbidden");
  }

  const userId = getString(formData, "userId");
  const password = getString(formData, "password");

  if (!userId || password.length < 8) {
    redirect("/admin?error=invalid-password-reset");
  }

  const user = await findUserById(userId);

  if (!user) {
    redirect("/admin?error=invalid-user-action");
  }

  await updateUserPassword(userId, await hashPassword(password));
  revalidatePath("/admin");
  redirect("/admin?updated=password-reset");
}
