import { cookies } from "next/headers";
import { headers } from "next/headers";

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

async function shouldUseSecureCookie(): Promise<boolean> {
  if (process.env.COOKIE_SECURE === "true") {
    return true;
  }

  if (process.env.COOKIE_SECURE === "false") {
    return false;
  }

  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");

  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  return process.env.NODE_ENV === "production";
}

export async function setSessionCookie(userId: string, role: Role): Promise<void> {
  const token = await createSessionToken(userId, role);
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await shouldUseSecureCookie(),
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
