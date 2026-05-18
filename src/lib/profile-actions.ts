"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserSession } from "@/lib/auth/session";
import { updateUserName } from "@/lib/db";

function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function updateProfileNameAction(formData: FormData): Promise<void> {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const name = getString(formData, "name");

  if (name.length > 80) {
    redirect("/profile?error=invalid-name");
  }

  await updateUserName(session.userId, name || null);
  revalidatePath("/profile");
  revalidatePath("/");
  redirect("/profile?updated=name");
}
