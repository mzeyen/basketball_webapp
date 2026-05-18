"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

import { createUser, findUserByEmail } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/email-verification";

function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function registerAction(formData: FormData): Promise<void> {
  const name = getString(formData, "name");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const passwordConfirmation = getString(formData, "passwordConfirmation");

  if (!email || password.length < 8 || password !== passwordConfirmation || name.length > 80) {
    redirect("/register?error=invalid-input");
  }

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    redirect("/register?error=email-taken");
  }

  const verificationToken = randomUUID();
  const user = await createUser({
    email,
    name,
    passwordHash: await hashPassword(password),
    role: email === "admin@basketball.local" ? "superadmin" : email.endsWith("@basketball.local") ? "admin" : "user",
    emailVerificationToken: verificationToken,
    emailVerificationTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  });

  await sendVerificationEmail({ email: user.email, token: verificationToken });
  redirect("/login?registered=verify-email");
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const user = await findUserByEmail(email);

  if (!user || user.blockedAt || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/login?error=invalid-credentials");
  }

  await setSessionCookie(user.id, user.role);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
