"use client";

import type { TrainingExercise } from "@/lib/training-exercises";

type CourtItem = {
  id?: string;
  label?: string;
  type?: "ball" | "cone" | "defender" | "player";
  x?: number;
  y?: number;
};

type CourtPath = {
  id?: string;
  type?: "pass" | "run" | "shot";
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
};

type CourtDiagram = {
  items?: CourtItem[];
  paths?: CourtPath[];
};

function parseCourtItems(value?: string): CourtItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as CourtDiagram;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function parseCourtPaths(value?: string): CourtPath[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as CourtDiagram;
    return Array.isArray(parsed.paths) ? parsed.paths : [];
  } catch {
    return [];
  }
}

function clampCoordinate(value: number | undefined): number {
  return Math.max(4, Math.min(96, value ?? 50));
}

export function CourtDiagramPreview({ exercise }: { exercise: TrainingExercise }) {
  const items = parseCourtItems(exercise.courtDiagram);
  const paths = parseCourtPaths(exercise.courtDiagram);

  if (items.length === 0 && paths.length === 0) {
    return null;
  }

  return (
    <div className="court-diagram court-diagram-preview" aria-label={`Court-Diagramm von ${exercise.title}`}>
      <div className="court-half court-top" />
      <div className="court-center-circle" />
      <div className="court-three-point court-three-point-top" />
      <div className="court-three-point court-three-point-bottom" />
      <div className="court-key court-key-top" />
      <div className="court-key court-key-bottom" />
      <div className="court-rim court-rim-top" />
      <div className="court-rim court-rim-bottom" />
      <svg className="court-path-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker id={`court-preview-arrow-run-${exercise.id}`} markerHeight="5" markerWidth="5" orient="auto" refX="4" refY="2.5">
            <path d="M0,0 L5,2.5 L0,5 Z" />
          </marker>
          <marker id={`court-preview-arrow-pass-${exercise.id}`} markerHeight="5" markerWidth="5" orient="auto" refX="4" refY="2.5">
            <path d="M0,0 L5,2.5 L0,5 Z" />
          </marker>
          <marker id={`court-preview-arrow-shot-${exercise.id}`} markerHeight="5" markerWidth="5" orient="auto" refX="4" refY="2.5">
            <path d="M0,0 L5,2.5 L0,5 Z" />
          </marker>
        </defs>
        {paths.map((path, index) => (
          <line
            className={`court-path court-path-${path.type ?? "run"}`}
            key={path.id ?? index}
            markerEnd={`url(#court-preview-arrow-${path.type ?? "run"}-${exercise.id})`}
            x1={clampCoordinate(path.fromX)}
            y1={clampCoordinate(path.fromY)}
            x2={clampCoordinate(path.toX)}
            y2={clampCoordinate(path.toY)}
          />
        ))}
      </svg>
      {items.map((item, index) => (
        <span
          className={`court-token court-token-${item.type ?? "player"}`}
          key={item.id ?? index}
          style={{ left: `${clampCoordinate(item.x)}%`, top: `${clampCoordinate(item.y)}%` }}
        >
          {item.label || "O"}
        </span>
      ))}
    </div>
  );
}
