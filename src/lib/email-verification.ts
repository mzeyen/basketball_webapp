import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const dataDirectory = path.join(process.cwd(), ".data");
const emailOutboxFile = path.join(dataDirectory, "email-outbox.json");

type EmailOutboxEntry = {
  createdAt: string;
  recipient: string;
  subject: string;
  text: string;
  verificationUrl: string;
};

type EmailOutboxDatabase = {
  emails: EmailOutboxEntry[];
};

async function readEmailOutboxDatabase(): Promise<EmailOutboxDatabase> {
  try {
    const raw = await readFile(emailOutboxFile, "utf8");
    return JSON.parse(raw) as EmailOutboxDatabase;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { emails: [] };
    }

    throw error;
  }
}

async function writeEmailOutboxDatabase(database: EmailOutboxDatabase): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(emailOutboxFile, JSON.stringify(database, null, 2));
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";
}

export function createVerificationUrl(token: string): string {
  return new URL(`/verify-email?token=${encodeURIComponent(token)}`, getBaseUrl()).toString();
}

export async function sendVerificationEmail(input: { email: string; token: string }): Promise<void> {
  const verificationUrl = createVerificationUrl(input.token);
  const subject = "CourtControl E-Mail bestätigen";
  const text = `Bitte bestätige deine E-Mail-Adresse über diesen Link: ${verificationUrl}`;

  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: input.email,
        subject,
        text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Verification email could not be sent: ${response.status}`);
    }

    return;
  }

  const database = await readEmailOutboxDatabase();
  database.emails.push({
    createdAt: new Date().toISOString(),
    recipient: input.email,
    subject,
    text,
    verificationUrl,
  });
  await writeEmailOutboxDatabase(database);
}
