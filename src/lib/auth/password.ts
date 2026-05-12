import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const keyLength = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer;

  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [algorithm, salt, key] = passwordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !key) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer;
  const storedKey = Buffer.from(key, "hex");

  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}
