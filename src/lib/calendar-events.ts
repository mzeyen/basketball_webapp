import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { TeamGroup } from "@/lib/teams";

const dataDirectory = path.join(process.cwd(), ".data");
const calendarEventsFile = path.join(dataDirectory, "calendar-events.json");

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location: string;
  notes: string;
  team?: TeamGroup | null;
  trainingPlanId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type CalendarEventsDatabase = {
  events: CalendarEvent[];
};

async function readCalendarEventsDatabase(): Promise<CalendarEventsDatabase> {
  try {
    const raw = await readFile(calendarEventsFile, "utf8");
    return JSON.parse(raw) as CalendarEventsDatabase;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { events: [] };
    }

    throw error;
  }
}

async function writeCalendarEventsDatabase(database: CalendarEventsDatabase): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(calendarEventsFile, JSON.stringify(database, null, 2));
}

export async function listCalendarEvents(filters?: { from?: string; to?: string; team?: TeamGroup }): Promise<CalendarEvent[]> {
  const database = await readCalendarEventsDatabase();
  const fromTime = filters?.from ? new Date(filters.from).getTime() : null;
  const toTime = filters?.to ? new Date(filters.to).getTime() : null;

  return database.events
    .filter((event) => {
      const eventTime = new Date(event.startsAt).getTime();

      if (filters?.team && event.team !== filters.team) {
        return false;
      }

      if (fromTime !== null && eventTime < fromTime) {
        return false;
      }

      if (toTime !== null && eventTime > toTime) {
        return false;
      }

      return true;
    })
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

export async function findCalendarEventById(id: string): Promise<CalendarEvent | null> {
  const database = await readCalendarEventsDatabase();
  return database.events.find((event) => event.id === id) ?? null;
}

export async function createCalendarEvent(input: {
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location: string;
  notes: string;
  team?: TeamGroup | null;
  trainingPlanId?: string | null;
  createdBy: string;
}): Promise<CalendarEvent> {
  const database = await readCalendarEventsDatabase();
  const now = new Date().toISOString();
  const event: CalendarEvent = {
    id: randomUUID(),
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    location: input.location,
    notes: input.notes,
    team: input.team ?? null,
    trainingPlanId: input.trainingPlanId ?? null,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  database.events.push(event);
  await writeCalendarEventsDatabase(database);

  return event;
}

export async function deleteCalendarEvent(id: string): Promise<CalendarEvent | null> {
  const database = await readCalendarEventsDatabase();
  const event = database.events.find((item) => item.id === id);

  if (!event) {
    return null;
  }

  database.events = database.events.filter((item) => item.id !== id);
  await writeCalendarEventsDatabase(database);

  return event;
}
