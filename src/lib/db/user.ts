import { randomUUID } from "crypto";

import type { Role } from "@/lib/rbac/roles";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = Omit<User, "passwordHash">;

export type NewUserInput = {
  email: string;
  passwordHash: string;
  role?: Role;
};

export function createUserRecord(input: NewUserInput): User {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    role: input.role ?? "user",
    emailVerifiedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
