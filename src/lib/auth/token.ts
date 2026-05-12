import { isRole, type Role } from "@/lib/rbac/roles";

export const sessionCookieName = "basketball_session";

export type SessionPayload = {
  userId: string;
  role: Role;
  expiresAt: number;
};

export const sessionDurationMs = 1000 * 60 * 60 * 24 * 7;

function getSecret(): string {
  return process.env.AUTH_SECRET ?? "development-only-change-me";
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));

  return base64UrlEncode(signature);
}

export async function createSessionToken(userId: string, role: Role): Promise<string> {
  const payload: SessionPayload = {
    userId,
    role,
    expiresAt: Date.now() + sessionDurationMs,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || (await sign(encodedPayload)) !== signature) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

  if (!payload.userId || !isRole(payload.role) || payload.expiresAt < Date.now()) {
    return null;
  }

  return payload;
}
