"use client";

import { useMemo, useState } from "react";

import { getTeamGroupLabel } from "@/lib/teams";
import type { TrainingExercise } from "@/lib/training-exercises";

type TrainingPlanExerciseBuilderProps = {
  exercises: TrainingExercise[];
};

type SelectedExercise = {
  id: string;
  durationMinutes: string;
  material: string;
  notes: string;
};

export function TrainingPlanExerciseBuilder({ exercises }: TrainingPlanExerciseBuilderProps) {
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const exercisesById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);
  const selectedIds = new Set(selectedExercises.map((exercise) => exercise.id));

  function toggleExercise(id: string, checked: boolean) {
    setSelectedExercises((current) => {
      if (checked) {
        return current.some((exercise) => exercise.id === id)
          ? current
          : [...current, { id, durationMinutes: "", material: "", notes: "" }];
      }

      return current.filter((exercise) => exercise.id !== id);
    });
  }

  function updateExercise(id: string, values: Partial<Omit<SelectedExercise, "id">>) {
    setSelectedExercises((current) =>
      current.map((exercise) => (exercise.id === id ? { ...exercise, ...values } : exercise)),
    );
  }

  function moveExercise(id: string, direction: -1 | 1) {
    setSelectedExercises((current) => {
      const index = current.findIndex((exercise) => exercise.id === id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function moveDraggedExercise(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      return;
    }

    setSelectedExercises((current) => {
      const draggedIndex = current.findIndex((exercise) => exercise.id === draggedId);
      const targetIndex = current.findIndex((exercise) => exercise.id === targetId);

      if (draggedIndex < 0 || targetIndex < 0) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  return (
    <div className="plan-builder">
      <div className="exercise-picker" aria-label="Uebungen auswaehlen">
        {exercises.map((exercise) => (
          <label className="exercise-picker-row" key={exercise.id}>
            <input
              type="checkbox"
              checked={selectedIds.has(exercise.id)}
              onChange={(event) => toggleExercise(exercise.id, event.currentTarget.checked)}
            />
            <span>
              <strong>{exercise.title}</strong>
              <small>
                {getTeamGroupLabel(exercise.team)} - {exercise.tags.join(", ") || "Keine Tags"}
              </small>
            </span>
          </label>
        ))}
      </div>

      {selectedExercises.length > 0 ? (
        <div className="selected-exercise-list" aria-label="Sortierte Uebungen">
          {selectedExercises.map((selectedExercise, index) => {
            const exercise = exercisesById.get(selectedExercise.id);

            if (!exercise) {
              return null;
            }

            return (
              <article
                className="selected-exercise-row"
                draggable
                key={selectedExercise.id}
                onDragStart={() => setDraggedId(selectedExercise.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => moveDraggedExercise(selectedExercise.id)}
              >
                <input type="hidden" name="exerciseIds" value={selectedExercise.id} />
                <div className="selected-exercise-heading">
                  <div>
                    <p className="upload-kind">Position {index + 1}</p>
                    <h3>{exercise.title}</h3>
                  </div>
                  <div className="selected-exercise-controls">
                    <button type="button" className="secondary-button" onClick={() => moveExercise(selectedExercise.id, -1)}>
                      Hoch
                    </button>
                    <button type="button" className="secondary-button" onClick={() => moveExercise(selectedExercise.id, 1)}>
                      Runter
                    </button>
                  </div>
                </div>
                <div className="selected-exercise-fields">
                  <label>
                    Dauer in Minuten
                    <input
                      min="1"
                      name={`durationMinutes:${selectedExercise.id}`}
                      type="number"
                      value={selectedExercise.durationMinutes}
                      onChange={(event) => updateExercise(selectedExercise.id, { durationMinutes: event.currentTarget.value })}
                    />
                  </label>
                  <label>
                    Material
                    <input
                      name={`material:${selectedExercise.id}`}
                      value={selectedExercise.material}
                      onChange={(event) => updateExercise(selectedExercise.id, { material: event.currentTarget.value })}
                      placeholder="Baelle, Huetchen, Leibchen"
                    />
                  </label>
                  <label className="selected-exercise-notes">
                    Coaching-Notizen
                    <textarea
                      name={`notes:${selectedExercise.id}`}
                      rows={2}
                      value={selectedExercise.notes}
                      onChange={(event) => updateExercise(selectedExercise.id, { notes: event.currentTarget.value })}
                      placeholder="Schwerpunkt, Varianten oder Belastung"
                    />
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="muted">Waehle Uebungen aus, um Reihenfolge, Dauer und Material festzulegen.</p>
      )}
    </div>
  );
}
