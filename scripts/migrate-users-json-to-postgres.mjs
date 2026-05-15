import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const usersPath = process.argv[2] ?? path.join(process.cwd(), ".data", "users.json");
const database = JSON.parse(await readFile(usersPath, "utf8"));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

await pool.query(`
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

for (const user of database.users ?? []) {
  await pool.query(
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
      ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          email_verified_at = EXCLUDED.email_verified_at,
          blocked_at = EXCLUDED.blocked_at,
          password_reset_at = EXCLUDED.password_reset_at,
          updated_at = EXCLUDED.updated_at
    `,
    [
      user.id,
      user.email,
      user.passwordHash,
      user.role,
      user.emailVerifiedAt ?? null,
      user.blockedAt ?? null,
      user.passwordResetAt ?? null,
      user.createdAt,
      user.updatedAt,
    ],
  );
}

const result = await pool.query("SELECT email, role, created_at FROM users ORDER BY created_at ASC");
console.table(result.rows);
await pool.end();
