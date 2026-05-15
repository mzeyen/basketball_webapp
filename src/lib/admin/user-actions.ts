"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hashPassword } from "@/lib/auth/password";
import { requireAdminSession } from "@/lib/auth/session";
import { appendAuditLogEntry, getRoleLabel } from "@/lib/audit-log";
import { deleteUser, findUserByEmail, findUserById, setUserBlocked, updateUserEmail, updateUserPassword, updateUserRole, updateUserTeams } from "@/lib/db";
import { canAccessSuperAdmin, isRole, type Role } from "@/lib/rbac/roles";
import { getTeamGroupLabels, normalizeTeamGroups } from "@/lib/teams";

function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function getStrings(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((value) => String(value).trim()).filter(Boolean);
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

  if (user.role === "superadmin") {
    redirect("/admin?error=invalid-user-action");
  }

  await setUserBlocked(userId, true);
  const actor = await findUserById(session.userId);

  if (actor) {
    await appendAuditLogEntry({
      action: "block-user",
      actorEmail: actor.email,
      actorId: actor.id,
      details: "Nutzer wurde gesperrt.",
      targetEmail: user.email,
      targetId: user.id,
    });
  }

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
  const actor = await findUserById(session.userId);

  if (actor) {
    await appendAuditLogEntry({
      action: "unblock-user",
      actorEmail: actor.email,
      actorId: actor.id,
      details: "Nutzer wurde entsperrt.",
      targetEmail: user.email,
      targetId: user.id,
    });
  }

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

  if (user.role === "superadmin") {
    redirect("/admin?error=invalid-user-action");
  }

  await updateUserPassword(userId, await hashPassword(password));
  const actor = await findUserById(session.userId);

  if (actor) {
    await appendAuditLogEntry({
      action: "reset-password",
      actorEmail: actor.email,
      actorId: actor.id,
      details: "Passwort wurde zurückgesetzt.",
      targetEmail: user.email,
      targetId: user.id,
    });
  }

  revalidatePath("/admin");
  redirect("/admin?updated=password-reset");
}

export async function updateUserRoleAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/dashboard?error=forbidden");
  }

  const userId = getString(formData, "userId");
  const roleValue = getString(formData, "role");

  if (!userId || !isRole(roleValue)) {
    redirect("/admin?error=invalid-user-action");
  }

  const actor = await findUserById(session.userId);
  const user = await findUserById(userId);

  if (!actor || !user || user.id === actor.id || user.role === "superadmin") {
    redirect("/admin?error=invalid-user-action");
  }

  const nextRole: Role = roleValue;

  if (nextRole === "superadmin" || (!canAccessSuperAdmin(actor.role) && nextRole !== "admin" && nextRole !== "user")) {
    redirect("/admin?error=invalid-user-action");
  }

  await updateUserRole(user.id, nextRole);
  await appendAuditLogEntry({
    action: "change-role",
    actorEmail: actor.email,
    actorId: actor.id,
    details: `Rolle geändert: ${getRoleLabel(user.role)} -> ${getRoleLabel(nextRole)}.`,
    targetEmail: user.email,
    targetId: user.id,
  });

  revalidatePath("/admin");
  redirect("/admin?updated=role");
}

export async function updateUserEmailAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/dashboard?error=forbidden");
  }

  const userId = getString(formData, "userId");
  const email = getString(formData, "email").toLowerCase();

  if (!userId || !email || !email.includes("@")) {
    redirect("/admin?error=invalid-email-update");
  }

  const actor = await findUserById(session.userId);
  const user = await findUserById(userId);

  if (!actor || !user || user.role === "superadmin") {
    redirect("/admin?error=invalid-user-action");
  }

  const existingUser = await findUserByEmail(email);

  if (existingUser && existingUser.id !== user.id) {
    redirect("/admin?error=email-taken");
  }

  await updateUserEmail(user.id, email);
  await appendAuditLogEntry({
    action: "change-email",
    actorEmail: actor.email,
    actorId: actor.id,
    details: `E-Mail geändert: ${user.email} -> ${email}.`,
    targetEmail: email,
    targetId: user.id,
  });

  revalidatePath("/admin");
  redirect("/admin?updated=email");
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/dashboard?error=forbidden");
  }

  const userId = getString(formData, "userId");
  const confirmation = getString(formData, "confirmation").toLowerCase();

  if (!userId || userId === session.userId || confirmation !== "löschen") {
    redirect("/admin?error=invalid-delete");
  }

  const actor = await findUserById(session.userId);
  const user = await findUserById(userId);

  if (!actor || !user || user.role === "superadmin") {
    redirect("/admin?error=invalid-user-action");
  }

  await deleteUser(user.id);
  await appendAuditLogEntry({
    action: "delete-user",
    actorEmail: actor.email,
    actorId: actor.id,
    details: "Nutzer wurde gelöscht.",
    targetEmail: user.email,
    targetId: user.id,
  });

  revalidatePath("/admin");
  redirect("/admin?updated=deleted");
}

export async function updateUserTeamAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/dashboard?error=forbidden");
  }

  const userId = getString(formData, "userId");
  const teamValues = getStrings(formData, "teams");

  if (!userId) {
    redirect("/admin?error=invalid-user-action");
  }

  const actor = await findUserById(session.userId);
  const user = await findUserById(userId);

  if (!actor || !user || user.role === "superadmin") {
    redirect("/admin?error=invalid-user-action");
  }

  const previousTeams = user.teams ?? (user.team ? [user.team] : []);
  const nextTeams = normalizeTeamGroups(teamValues);
  await updateUserTeams(user.id, nextTeams);
  await appendAuditLogEntry({
    action: "change-team",
    actorEmail: actor.email,
    actorId: actor.id,
    details: `Team geändert: ${getTeamGroupLabels(previousTeams)} -> ${getTeamGroupLabels(nextTeams)}.`,
    targetEmail: user.email,
    targetId: user.id,
  });

  revalidatePath("/admin");
  redirect("/admin?updated=team");
}
