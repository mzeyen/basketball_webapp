import { cookies } from "next/headers";

import { canAccessAdmin } from "@/lib/rbac/roles";
import { findUserById } from "@/lib/db";
import {
  createSessionToken,
  sessionCookieName,
  sessionDurationMs,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth/token";
import type { Role } from "@/lib/rbac/roles";

export async function setSessionCookie(userId: string, role: Role): Promise<void> {
  const token = await createSessionToken(userId, role);
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationMs / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    return null;
  }

  const user = await findUserById(session.userId);

  if (!user || user.blockedAt) {
    return null;
  }

  return {
    ...session,
    role: user.role,
  };
}

export async function requireUserSession(): Promise<SessionPayload> {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  return session;
}

export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await requireUserSession();

  if (!canAccessAdmin(session.role)) {
    throw new Error("Admin role required");
  }

  return session;
}
