import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Pool, type QueryResultRow } from "pg";

import { createUserRecord, type NewUserInput, type User } from "@/lib/db/user";

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
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    role: row.role === "admin" ? "admin" : "user",
    emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at).toISOString() : null,
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
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      email_verified_at TIMESTAMPTZ NULL,
      blocked_at TIMESTAMPTZ NULL,
      password_reset_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

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
  return database.users.find((user) => user.email === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const result = await getPool().query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  const database = await readDatabase();
  return database.users.find((user) => user.id === id) ?? null;
}

export async function listUsers(): Promise<User[]> {
  if (hasDatabaseUrl()) {
    await ensureDatabase();
    const result = await getPool().query("SELECT * FROM users ORDER BY created_at DESC");
    return result.rows.map(toUser);
  }

  const database = await readDatabase();
  return [...database.users].sort(
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
          password_hash,
          role,
          email_verified_at,
          blocked_at,
          password_reset_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.role,
        user.emailVerifiedAt,
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
