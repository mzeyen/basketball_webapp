import { readFile } from "fs/promises";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  findTrainingExerciseById,
  getTrainingExerciseMediaContentType,
  getTrainingExerciseMediaPath,
} from "@/lib/training-exercises";

type TrainingExerciseMediaRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: TrainingExerciseMediaRouteProps) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await params;
  const exercise = await findTrainingExerciseById(id);
  const mediaPath = exercise ? getTrainingExerciseMediaPath(exercise) : null;
  const mediaContentType = exercise ? getTrainingExerciseMediaContentType(exercise) : null;

  if (!exercise || !mediaPath || !mediaContentType || !exercise.mediaSize || !exercise.mediaOriginalFileName) {
    return new NextResponse("Training exercise media not found", { status: 404 });
  }

  const file = await readFile(mediaPath);

  return new NextResponse(file, {
    headers: {
      "Content-Disposition": `inline; filename="${encodeURIComponent(exercise.mediaOriginalFileName)}"`,
      "Content-Length": String(exercise.mediaSize),
      "Content-Type": mediaContentType,
    },
  });
}
