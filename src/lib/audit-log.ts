import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import type { Role } from "@/lib/rbac/roles";

const dataDirectory = path.join(process.cwd(), ".data");
const auditLogFile = path.join(dataDirectory, "audit-log.json");

export type AuditLogEntry = {
  id: string;
  action: "block-user" | "unblock-user" | "reset-password" | "change-role";
  actorEmail: string;
  actorId: string;
  createdAt: string;
  details: string;
  targetEmail: string;
  targetId: string;
};

type AuditLogDatabase = {
  entries: AuditLogEntry[];
};

async function readAuditLogDatabase(): Promise<AuditLogDatabase> {
  try {
    const raw = await readFile(auditLogFile, "utf8");
    return JSON.parse(raw) as AuditLogDatabase;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { entries: [] };
    }

    throw error;
  }
}

async function writeAuditLogDatabase(database: AuditLogDatabase): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(auditLogFile, JSON.stringify(database, null, 2));
}

export async function appendAuditLogEntry(input: Omit<AuditLogEntry, "id" | "createdAt">): Promise<AuditLogEntry> {
  const database = await readAuditLogDatabase();
  const entry: AuditLogEntry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  database.entries.push(entry);
  await writeAuditLogDatabase(database);

  return entry;
}

export async function listAuditLogEntries(): Promise<AuditLogEntry[]> {
  const database = await readAuditLogDatabase();
  return [...database.entries].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function getRoleLabel(role: Role): string {
  if (role === "superadmin") {
    return "SuperAdmin";
  }

  return role === "admin" ? "Admin" : "Nutzer";
}
