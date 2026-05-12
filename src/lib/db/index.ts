import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { createUserRecord, type NewUserInput, type User } from "@/lib/db/user";

const dataDirectory = path.join(process.cwd(), ".data");
const usersFile = path.join(dataDirectory, "users.json");

type DatabaseShape = {
  users: User[];
};

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
  const database = await readDatabase();
  return database.users.find((user) => user.email === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const database = await readDatabase();
  return database.users.find((user) => user.id === id) ?? null;
}

export async function createUser(input: NewUserInput): Promise<User> {
  const database = await readDatabase();
  const user = createUserRecord(input);

  database.users.push(user);
  await writeDatabase(database);

  return user;
}

export { toPublicUser, type PublicUser, type User } from "@/lib/db/user";
