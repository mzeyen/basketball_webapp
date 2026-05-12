export const roles = ["admin", "user"] as const;

export type Role = (typeof roles)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

export function canAccessAdmin(role: Role): boolean {
  return role === "admin";
}
