import { randomUUID } from "crypto";

import type { Role } from "@/lib/rbac/roles";

export type User = {
  id: string;
  email: string;
  name?: string | null;
  passwordHash: string;
  role: Role;
  emailVerifiedAt: string | null;
  emailVerificationToken?: string | null;
  emailVerificationTokenExpiresAt?: string | null;
  blockedAt?: string | null;
  passwordResetAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = Omit<User, "passwordHash">;

export type NewUserInput = {
  email: string;
  passwordHash: string;
  name?: string | null;
  role?: Role;
  emailVerificationToken?: string | null;
  emailVerificationTokenExpiresAt?: string | null;
};

export function createUserRecord(input: NewUserInput): User {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    name: input.name?.trim() || null,
    passwordHash: input.passwordHash,
    role: input.role ?? "user",
    emailVerifiedAt: null,
    emailVerificationToken: input.emailVerificationToken ?? null,
    emailVerificationTokenExpiresAt: input.emailVerificationTokenExpiresAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
