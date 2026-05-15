import { readFile } from "fs/promises";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  findTrainingExerciseById,
  getTrainingExerciseContentType,
  getTrainingExerciseFilePath,
} from "@/lib/training-exercises";

type TrainingExerciseFileRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: TrainingExerciseFileRouteProps) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await params;
  const exercise = await findTrainingExerciseById(id);

  if (!exercise) {
    return new NextResponse("Training exercise not found", { status: 404 });
  }

  const file = await readFile(getTrainingExerciseFilePath(exercise));
  const disposition = exercise.mimeType === "application/pdf" ? "inline" : "attachment";

  return new NextResponse(file, {
    headers: {
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(exercise.originalFileName)}"`,
      "Content-Length": String(exercise.size),
      "Content-Type": getTrainingExerciseContentType(exercise),
    },
  });
}
