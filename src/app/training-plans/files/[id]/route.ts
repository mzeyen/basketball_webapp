import { readFile } from "fs/promises";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  findTrainingPlanById,
  getTrainingPlanContentType,
  getTrainingPlanFilePath,
} from "@/lib/training-plans";

type TrainingPlanFileRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: TrainingPlanFileRouteProps) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await params;
  const plan = await findTrainingPlanById(id);

  if (!plan) {
    return new NextResponse("Training plan not found", { status: 404 });
  }

  const file = await readFile(getTrainingPlanFilePath(plan));
  const disposition = plan.mimeType === "application/pdf" ? "inline" : "attachment";

  return new NextResponse(file, {
    headers: {
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(plan.originalFileName)}"`,
      "Content-Length": String(plan.size),
      "Content-Type": getTrainingPlanContentType(plan),
    },
  });
}
