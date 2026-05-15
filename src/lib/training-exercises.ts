import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import type { TeamGroup } from "@/lib/teams";

const dataDirectory = path.join(process.cwd(), ".data");
const trainingExercisesDirectory = path.join(dataDirectory, "training-exercises");
const trainingExercisesFile = path.join(dataDirectory, "training-exercises.json");

const allowedFileTypes = new Map([
  ["application/pdf", ".pdf"],
  ["application/msword", ".doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
]);

export const maxTrainingExerciseFileSize = 25 * 1024 * 1024;
export const maxTrainingExerciseTags = 12;

export type TrainingExercise = {
  id: string;
  title: string;
  description: string;
  team?: TeamGroup | null;
  tags: string[];
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
};

type TrainingExercisesDatabase = {
  trainingExercises: TrainingExercise[];
};

export function isAllowedTrainingExerciseFile(file: File): boolean {
  return allowedFileTypes.has(file.type);
}

export function getTrainingExerciseExtension(file: File): string | null {
  return allowedFileTypes.get(file.type) ?? null;
}

export function getTrainingExerciseFilePath(exercise: TrainingExercise): string {
  return path.join(trainingExercisesDirectory, exercise.storedFileName);
}

export function getTrainingExerciseContentType(exercise: TrainingExercise): string {
  return exercise.mimeType;
}

export function normalizeExerciseTags(value: string): string[] {
  const tags = value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .map((tag) => tag.replace(/\s+/g, "-"));

  return [...new Set(tags)].slice(0, maxTrainingExerciseTags);
}

async function readTrainingExercisesDatabase(): Promise<TrainingExercisesDatabase> {
  try {
    const raw = await readFile(trainingExercisesFile, "utf8");
    return JSON.parse(raw) as TrainingExercisesDatabase;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { trainingExercises: [] };
    }

    throw error;
  }
}

async function writeTrainingExercisesDatabase(database: TrainingExercisesDatabase): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(trainingExercisesFile, JSON.stringify(database, null, 2));
}

export async function listTrainingExercises(filters?: string | {
  query?: string;
  tag?: string;
  team?: TeamGroup;
  uploadedBy?: string;
}): Promise<TrainingExercise[]> {
  const database = await readTrainingExercisesDatabase();
  const filterObject = typeof filters === "string" ? { tag: filters } : filters;
  const normalizedTag = filterObject?.tag ? normalizeExerciseTags(filterObject.tag)[0] : undefined;
  const query = filterObject?.query?.trim().toLowerCase();
  const exercises = database.trainingExercises.filter((exercise) => {
    if (normalizedTag && !exercise.tags.includes(normalizedTag)) {
      return false;
    }

    if (filterObject?.team && exercise.team !== filterObject.team) {
      return false;
    }

    if (filterObject?.uploadedBy && exercise.uploadedBy !== filterObject.uploadedBy) {
      return false;
    }

    if (query && !`${exercise.title} ${exercise.description} ${exercise.originalFileName} ${exercise.tags.join(" ")}`.toLowerCase().includes(query)) {
      return false;
    }

    return true;
  });

  return [...exercises].sort(
    (left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime(),
  );
}

export async function listTrainingExerciseTags(): Promise<string[]> {
  const database = await readTrainingExercisesDatabase();
  return [...new Set(database.trainingExercises.flatMap((exercise) => exercise.tags))].sort((left, right) =>
    left.localeCompare(right, "de"),
  );
}

export async function findTrainingExerciseById(id: string): Promise<TrainingExercise | null> {
  const database = await readTrainingExercisesDatabase();
  return database.trainingExercises.find((exercise) => exercise.id === id) ?? null;
}

export async function deleteTrainingExercise(id: string): Promise<TrainingExercise | null> {
  const database = await readTrainingExercisesDatabase();
  const exercise = database.trainingExercises.find((item) => item.id === id);

  if (!exercise) {
    return null;
  }

  database.trainingExercises = database.trainingExercises.filter((item) => item.id !== id);
  await writeTrainingExercisesDatabase(database);

  try {
    await unlink(getTrainingExerciseFilePath(exercise));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  return exercise;
}

export async function createTrainingExercise(input: {
  title: string;
  description: string;
  tags: string[];
  team?: TeamGroup | null;
  file: File;
  uploadedBy: string;
}): Promise<TrainingExercise> {
  const extension = getTrainingExerciseExtension(input.file);

  if (!extension) {
    throw new Error("Unsupported training exercise file type");
  }

  const id = randomUUID();
  const storedFileName = `${id}${extension}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const now = new Date().toISOString();
  const database = await readTrainingExercisesDatabase();
  const exercise: TrainingExercise = {
    id,
    title: input.title,
    description: input.description,
    team: input.team ?? null,
    tags: input.tags,
    originalFileName: input.file.name,
    storedFileName,
    mimeType: input.file.type,
    size: input.file.size,
    uploadedBy: input.uploadedBy,
    uploadedAt: now,
  };

  await mkdir(trainingExercisesDirectory, { recursive: true });
  await writeFile(path.join(trainingExercisesDirectory, storedFileName), buffer);

  database.trainingExercises.push(exercise);
  await writeTrainingExercisesDatabase(database);

  return exercise;
}
