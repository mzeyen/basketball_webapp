import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

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

export async function listTrainingPlans(): Promise<TrainingPlan[]> {
  const database = await readTrainingPlansDatabase();
  return [...database.trainingPlans].sort(
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
