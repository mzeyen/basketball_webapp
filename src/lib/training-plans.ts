import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getTeamGroupLabel, type TeamGroup } from "@/lib/teams";
import type { TrainingExercise } from "@/lib/training-exercises";

const dataDirectory = path.join(process.cwd(), ".data");
const trainingPlansDirectory = path.join(dataDirectory, "training-plans");
const trainingPlansFile = path.join(dataDirectory, "training-plans.json");

const allowedFileTypes = new Map([
  ["application/pdf", ".pdf"],
  ["application/msword", ".doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
]);

export const maxTrainingPlanFileSize = 25 * 1024 * 1024;
export const trainingPlanCategories = ["u10", "u12", "u14", "u16", "u19", "damen"] as const;

export type TrainingPlanCategory = (typeof trainingPlanCategories)[number];

export type TrainingPlan = {
  id: string;
  title: string;
  category?: TrainingPlanCategory;
  team?: TeamGroup | null;
  sourceExerciseIds?: string[];
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
};

type TrainingPlansDatabase = {
  trainingPlans: TrainingPlan[];
};

export function isAllowedTrainingPlanFile(file: File): boolean {
  return allowedFileTypes.has(file.type);
}

export function getTrainingPlanExtension(file: File): string | null {
  return allowedFileTypes.get(file.type) ?? null;
}

export function getTrainingPlanFilePath(plan: TrainingPlan): string {
  return path.join(trainingPlansDirectory, plan.storedFileName);
}

export function getTrainingPlanContentType(plan: TrainingPlan): string {
  return plan.mimeType;
}

export function isTrainingPlanCategory(value: string): value is TrainingPlanCategory {
  return trainingPlanCategories.includes(value as TrainingPlanCategory);
}

async function readTrainingPlansDatabase(): Promise<TrainingPlansDatabase> {
  try {
    const raw = await readFile(trainingPlansFile, "utf8");
    return JSON.parse(raw) as TrainingPlansDatabase;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { trainingPlans: [] };
    }

    throw error;
  }
}

async function writeTrainingPlansDatabase(database: TrainingPlansDatabase): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(trainingPlansFile, JSON.stringify(database, null, 2));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugifyFileName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[ä]/g, "ae")
    .replace(/[ö]/g, "oe")
    .replace(/[ü]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "trainingsplan";
}

function getTrainingPlanCategoryLabel(category: TrainingPlanCategory): string {
  const labels: Record<TrainingPlanCategory, string> = {
    u10: "U10",
    u12: "U12",
    u14: "U14",
    u16: "U16",
    u19: "U19",
    damen: "Damen",
  };

  return labels[category];
}

function buildGeneratedTrainingPlanHtml(input: {
  title: string;
  category: TrainingPlanCategory;
  team?: TeamGroup | null;
  exercises: TrainingExercise[];
  createdAt: string;
}): string {
  const exerciseItems = input.exercises
    .map((exercise, index) => {
      const tags = exercise.tags.length > 0 ? exercise.tags.map(escapeHtml).join(", ") : "Keine Tags";
      const description = exercise.description.trim()
        ? `<p>${escapeHtml(exercise.description).replaceAll("\n", "<br />")}</p>`
        : "<p>Keine Beschreibung hinterlegt.</p>";

      return `<section class="exercise">
        <p class="eyebrow">Übung ${index + 1}</p>
        <h2>${escapeHtml(exercise.title)}</h2>
        ${description}
        <dl>
          <div><dt>Team</dt><dd>${escapeHtml(getTeamGroupLabel(exercise.team))}</dd></div>
          <div><dt>Tags</dt><dd>${tags}</dd></div>
          <div><dt>Datei</dt><dd>${escapeHtml(exercise.originalFileName)}</dd></div>
        </dl>
      </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      body { color: #172033; font-family: Arial, sans-serif; line-height: 1.5; margin: 40px auto; max-width: 860px; padding: 0 24px; }
      h1, h2, p { margin: 0; }
      header { border-bottom: 2px solid #d8deea; margin-bottom: 28px; padding-bottom: 20px; }
      h1 { font-size: 32px; margin-bottom: 10px; }
      .muted, dd { color: #526076; }
      .eyebrow { color: #2156d9; font-size: 12px; font-weight: 700; letter-spacing: .08em; margin-bottom: 6px; text-transform: uppercase; }
      .exercise { border: 1px solid #d8deea; border-radius: 12px; margin: 16px 0; padding: 18px; break-inside: avoid; }
      .exercise h2 { font-size: 22px; margin-bottom: 10px; }
      .exercise p { margin-bottom: 14px; }
      dl { display: grid; gap: 8px; margin: 0; }
      dl div { display: grid; gap: 4px; grid-template-columns: 120px 1fr; }
      dt { font-weight: 700; }
      dd { margin: 0; }
      @media print { body { margin: 0 auto; } }
    </style>
  </head>
  <body>
    <header>
      <p class="eyebrow">Trainingsplan</p>
      <h1>${escapeHtml(input.title)}</h1>
      <p class="muted">${escapeHtml(getTrainingPlanCategoryLabel(input.category))} · ${escapeHtml(getTeamGroupLabel(input.team))} · ${new Date(input.createdAt).toLocaleString("de-DE")}</p>
    </header>
    ${exerciseItems}
  </body>
</html>`;
}

export async function listTrainingPlans(filters?: {
  category?: TrainingPlanCategory;
  query?: string;
  team?: TeamGroup;
  uploadedBy?: string;
}): Promise<TrainingPlan[]> {
  const database = await readTrainingPlansDatabase();
  const query = filters?.query?.trim().toLowerCase();
  const plans = database.trainingPlans.filter((plan) => {
    if (filters?.category && plan.category !== filters.category) {
      return false;
    }

    if (filters?.team && plan.team !== filters.team) {
      return false;
    }

    if (filters?.uploadedBy && plan.uploadedBy !== filters.uploadedBy) {
      return false;
    }

    if (query && !`${plan.title} ${plan.originalFileName}`.toLowerCase().includes(query)) {
      return false;
    }

    return true;
  });

  return [...plans].sort(
    (left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime(),
  );
}

export async function findTrainingPlanById(id: string): Promise<TrainingPlan | null> {
  const database = await readTrainingPlansDatabase();
  return database.trainingPlans.find((plan) => plan.id === id) ?? null;
}

export async function deleteTrainingPlan(id: string): Promise<TrainingPlan | null> {
  const database = await readTrainingPlansDatabase();
  const plan = database.trainingPlans.find((item) => item.id === id);

  if (!plan) {
    return null;
  }

  database.trainingPlans = database.trainingPlans.filter((item) => item.id !== id);
  await writeTrainingPlansDatabase(database);

  try {
    await unlink(getTrainingPlanFilePath(plan));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  return plan;
}

export async function createTrainingPlan(input: {
  title: string;
  category: TrainingPlanCategory;
  file: File;
  team?: TeamGroup | null;
  uploadedBy: string;
}): Promise<TrainingPlan> {
  const extension = getTrainingPlanExtension(input.file);

  if (!extension) {
    throw new Error("Unsupported training plan file type");
  }

  const id = randomUUID();
  const storedFileName = `${id}${extension}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const now = new Date().toISOString();
  const database = await readTrainingPlansDatabase();
  const plan: TrainingPlan = {
    id,
    title: input.title,
    category: input.category,
    team: input.team ?? null,
    originalFileName: input.file.name,
    storedFileName,
    mimeType: input.file.type,
    size: input.file.size,
    uploadedBy: input.uploadedBy,
    uploadedAt: now,
  };

  await mkdir(trainingPlansDirectory, { recursive: true });
  await writeFile(path.join(trainingPlansDirectory, storedFileName), buffer);

  database.trainingPlans.push(plan);
  await writeTrainingPlansDatabase(database);

  return plan;
}

export async function createTrainingPlanFromExercises(input: {
  title: string;
  category: TrainingPlanCategory;
  team?: TeamGroup | null;
  exercises: TrainingExercise[];
  uploadedBy: string;
}): Promise<TrainingPlan> {
  if (input.exercises.length === 0) {
    throw new Error("At least one training exercise is required");
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const html = buildGeneratedTrainingPlanHtml({
    title: input.title,
    category: input.category,
    team: input.team,
    exercises: input.exercises,
    createdAt: now,
  });
  const buffer = Buffer.from(html, "utf8");
  const storedFileName = `${id}.html`;
  const database = await readTrainingPlansDatabase();
  const plan: TrainingPlan = {
    id,
    title: input.title,
    category: input.category,
    team: input.team ?? null,
    sourceExerciseIds: input.exercises.map((exercise) => exercise.id),
    originalFileName: `${slugifyFileName(input.title)}.html`,
    storedFileName,
    mimeType: "text/html",
    size: buffer.byteLength,
    uploadedBy: input.uploadedBy,
    uploadedAt: now,
  };

  await mkdir(trainingPlansDirectory, { recursive: true });
  await writeFile(path.join(trainingPlansDirectory, storedFileName), buffer);

  database.trainingPlans.push(plan);
  await writeTrainingPlansDatabase(database);

  return plan;
}
