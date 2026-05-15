import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Pool, type QueryResultRow } from "pg";

import { createUserRecord, type NewUserInput, type User } from "@/lib/db/user";
import type { Role } from "@/lib/rbac/roles";
import { isTeamGroup, type TeamGroup } from "@/lib/teams";

const dataDirectory = path.join(process.cwd(), ".data");
const usersFile = path.join(dataDirectory, "users.json");

type DatabaseShape = {
  users: User[];
};

let pool: Pool | null = null;
let initialized = false;

function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

function toUser(row: QueryResultRow): User {
  const email = String(row.email);
  const role = email === "admin@basketball.local" ? "superadmin" : row.role === "superadmin" || row.role === "admin" ? row.role : "user";

  return {
    id: String(row.id),
    email,
    name: row.name ? String(row.name) : null,
    team: row.team && isTeamGroup(String(row.team)) ? String(row.team) as TeamGroup : null,
    passwordHash: String(row.password_hash),
    role,
    emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at).toISOString() : null,
    emailVerificationToken: row.email_verification_token ? String(row.email_verification_token) : null,
    emailVerificationTokenExpiresAt: row.email_verification_token_expires_at
      ? new Date(row.email_verification_token_expires_at).toISOString()
      : null,
    blockedAt: row.blocked_at ? new Date(row.blocked_at).toISOString() : null,
    passwordResetAt: row.password_reset_at ? new Date(row.password_reset_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function ensureDatabase(): Promise<void> {
  if (initialized) {
    return;
  }

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NULL,
      team TEXT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'user')),
      email_verified_at TIMESTAMPTZ NULL,
      email_verification_token TEXT NULL,
      email_verification_token_expires_at TIMESTAMPTZ NULL,
      blocked_at TIMESTAMPTZ NULL,
      password_reset_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  await getPool().query("ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT NULL");
  await getPool().query("ALTER TABLE users ADD COLUMN IF NOT EXISTS team TEXT NULL");
  await getPool().query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT NULL");
  await getPool().query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_expires_at TIMESTAMPTZ NULL");
  await getPool().query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'users'
          AND constraint_name = 'users_role_check'
      ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
      END IF;

      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'user'));
    END $$;
  `);
  await getPool().query("UPDATE users SET role = 'superadmin' WHERE email = 'admin@basketball.local'");

  initialized = true;
}

async function readDatabase(): Promise<DatabaseShape> {
  try {
    const raw = await readFile(usersFile, "utf8");
    return JSON.parse(raw) as DatabaseShape;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { users: [] };
    }

    throw error;
  }
}

async function writeDatabase(database: DatabaseShape): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(usersFile, JSON.stringify(database, null, 2));
}

export async function findUserByEmail(email: string): Promise<User | null> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const result = await getPool().query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email.toLowerCase()]);
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.email === email.toLowerCase()) ?? null;
  return user ? normalizeUserRole(user) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const result = await getPool().query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === id) ?? null;
  return user ? normalizeUserRole(user) : null;
}

export async function listUsers(): Promise<User[]> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const result = await getPool().query("SELECT * FROM users ORDER BY created_at DESC");
    return result.rows.map(toUser);
  }

  const database = await readDatabase();
  return database.users.map(normalizeUserRole).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export async function createUser(input: NewUserInput): Promise<User> {
  const user = createUserRecord(input);

  if (hasDatabaseUrl()) {
    await ensureDatabase();
    await getPool().query(
      `
        INSERT INTO users (
          id,
          email,
          name,
          team,
          password_hash,
          role,
          email_verified_at,
          email_verification_token,
          email_verification_token_expires_at,
          blocked_at,
          password_reset_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        user.id,
        user.email,
        user.name ?? null,
        user.team ?? null,
        user.passwordHash,
        user.role,
        user.emailVerifiedAt,
        user.emailVerificationToken ?? null,
        user.emailVerificationTokenExpiresAt ?? null,
        user.blockedAt ?? null,
        user.passwordResetAt ?? null,
        user.createdAt,
        user.updatedAt,
      ],
    );

    return user;
  }

  const database = await readDatabase();
  database.users.push(user);
  await writeDatabase(database);

  return user;
}

function normalizeUserRole(user: User): User {
  if (user.email === "admin@basketball.local" && user.role !== "superadmin") {
    return { ...user, role: "superadmin" };
  }

  return user;
}

export async function findUserByEmailVerificationToken(token: string): Promise<User | null> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const result = await getPool().query("SELECT * FROM users WHERE email_verification_token = $1 LIMIT 1", [token]);
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.emailVerificationToken === token) ?? null;
  return user ? normalizeUserRole(user) : null;
}

export async function verifyUserEmail(userId: string): Promise<User | null> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const now = new Date().toISOString();
    const result = await getPool().query(
      `
        UPDATE users
        SET email_verified_at = $1,
            email_verification_token = NULL,
            email_verification_token_expires_at = NULL,
            updated_at = $1
        WHERE id = $2
        RETURNING *
      `,
      [now, userId],
    );

    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  const now = new Date().toISOString();
  user.emailVerifiedAt = now;
  user.emailVerificationToken = null;
  user.emailVerificationTokenExpiresAt = null;
  user.updatedAt = now;
  await writeDatabase(database);

  return normalizeUserRole(user);
}

export async function updateUserRole(userId: string, role: Role): Promise<User | null> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const now = new Date().toISOString();
    const result = await getPool().query(
      `
        UPDATE users
        SET role = $1,
            updated_at = $2
        WHERE id = $3
        RETURNING *
      `,
      [role, now, userId],
    );

    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  user.role = role;
  user.updatedAt = new Date().toISOString();
  await writeDatabase(database);

  return normalizeUserRole(user);
}

export async function updateUserName(userId: string, name: string | null): Promise<User | null> {
  const normalizedName = name?.trim() ? name.trim() : null;

  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const now = new Date().toISOString();
    const result = await getPool().query(
      `
        UPDATE users
        SET name = $1,
            updated_at = $2
        WHERE id = $3
        RETURNING *
      `,
      [normalizedName, now, userId],
    );

    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  user.name = normalizedName;
  user.updatedAt = new Date().toISOString();
  await writeDatabase(database);

  return user;
}

export async function updateUserEmail(userId: string, email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const now = new Date().toISOString();
    const result = await getPool().query(
      `
        UPDATE users
        SET email = $1,
            email_verified_at = NULL,
            email_verification_token = NULL,
            email_verification_token_expires_at = NULL,
            updated_at = $2
        WHERE id = $3
        RETURNING *
      `,
      [normalizedEmail, now, userId],
    );

    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  user.email = normalizedEmail;
  user.emailVerifiedAt = null;
  user.emailVerificationToken = null;
  user.emailVerificationTokenExpiresAt = null;
  user.updatedAt = new Date().toISOString();
  await writeDatabase(database);

  return normalizeUserRole(user);
}

export async function updateUserTeam(userId: string, team: TeamGroup | null): Promise<User | null> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const now = new Date().toISOString();
    const result = await getPool().query(
      `
        UPDATE users
        SET team = $1,
            updated_at = $2
        WHERE id = $3
        RETURNING *
      `,
      [team, now, userId],
    );

    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  user.team = team;
  user.updatedAt = new Date().toISOString();
  await writeDatabase(database);

  return normalizeUserRole(user);
}

export async function deleteUser(userId: string): Promise<User | null> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const result = await getPool().query("DELETE FROM users WHERE id = $1 RETURNING *", [userId]);
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  database.users = database.users.filter((item) => item.id !== userId);
  await writeDatabase(database);

  return normalizeUserRole(user);
}

export async function setUserBlocked(userId: string, blocked: boolean): Promise<User | null> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const now = new Date().toISOString();
    const result = await getPool().query(
      `
        UPDATE users
        SET blocked_at = $1,
            updated_at = $2
        WHERE id = $3
        RETURNING *
      `,
      [blocked ? now : null, now, userId],
    );

    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  const now = new Date().toISOString();
  user.blockedAt = blocked ? now : null;
  user.updatedAt = now;
  await writeDatabase(database);

  return user;
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<User | null> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const now = new Date().toISOString();
    const result = await getPool().query(
      `
        UPDATE users
        SET password_hash = $1,
            password_reset_at = $2,
            updated_at = $2
        WHERE id = $3
        RETURNING *
      `,
      [passwordHash, now, userId],
    );

    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  const now = new Date().toISOString();
  user.passwordHash = passwordHash;
  user.passwordResetAt = now;
  user.updatedAt = now;
  await writeDatabase(database);

  return user;
}

export { toPublicUser, type PublicUser, type User } from "@/lib/db/user";
