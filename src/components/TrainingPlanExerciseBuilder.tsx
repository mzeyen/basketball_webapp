"use client";

import { useMemo, useState } from "react";

import { CourtDiagramPreview } from "@/components/CourtDiagramPreview";
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

type PlanTemplate = {
  name: string;
  blocks: Array<{
    durationMinutes: string;
    matchTags: string[];
    notes: string;
  }>;
};

const planTemplates: PlanTemplate[] = [
  {
    name: "90 Minuten komplett",
    blocks: [
      { durationMinutes: "10", matchTags: ["warmup", "aufwaermen", "koordination"], notes: "Aktivierung, Ballhandling, Mobilität." },
      { durationMinutes: "20", matchTags: ["technik", "wurf", "passen"], notes: "Technikblock mit klarer Wiederholungszahl." },
      { durationMinutes: "25", matchTags: ["defense", "1gegen1", "closeout"], notes: "Schwerpunkt mit Coaching-Stopp nach Bedarf." },
      { durationMinutes: "25", matchTags: ["spiel", "scrimmage", "transition"], notes: "Anwendung im Spielformat." },
      { durationMinutes: "10", matchTags: ["cooldown", "freiwurf"], notes: "Frewürfe, kurze Reflexion, Auslaufen." },
    ],
  },
  {
    name: "Wurf-Fokus",
    blocks: [
      { durationMinutes: "12", matchTags: ["warmup", "ballhandling"], notes: "Ballhandling mit Fußarbeit." },
      { durationMinutes: "20", matchTags: ["wurf", "form"], notes: "Form shooting und Rhythmus." },
      { durationMinutes: "25", matchTags: ["wurf", "passen"], notes: "Wurf nach Pass und Bewegung." },
      { durationMinutes: "20", matchTags: ["spiel", "wurf"], notes: "Wurfentscheidungen unter Gegnerdruck." },
    ],
  },
  {
    name: "Defense-Fokus",
    blocks: [
      { durationMinutes: "12", matchTags: ["warmup", "defense"], notes: "Defensive Beinarbeit und Kommunikation." },
      { durationMinutes: "20", matchTags: ["closeout", "defense"], notes: "Closeout-Technik mit Korrektur." },
      { durationMinutes: "25", matchTags: ["1gegen1", "defense"], notes: "1-gegen-1 mit klarer Drive-Regel." },
      { durationMinutes: "25", matchTags: ["teamdefense", "spiel"], notes: "Übertragung in Help-Defense oder Scrimmage." },
    ],
  },
];

export function TrainingPlanExerciseBuilder({ exercises }: TrainingPlanExerciseBuilderProps) {
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const exercisesById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);
  const selectedIds = new Set(selectedExercises.map((exercise) => exercise.id));
  const filteredExercises = exercises.filter((exercise) => {
    const haystack = `${exercise.title} ${exercise.description} ${exercise.organization ?? ""} ${exercise.coachingPoints ?? ""} ${exercise.tags.join(" ")}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  function addExercise(id: string, defaults?: Partial<Omit<SelectedExercise, "id">>) {
    setSelectedExercises((current) => {
      if (current.some((exercise) => exercise.id === id)) {
        return current;
      }

      return [...current, { id, durationMinutes: defaults?.durationMinutes ?? "", material: defaults?.material ?? "", notes: defaults?.notes ?? "" }];
    });
  }

  function toggleExercise(id: string, checked: boolean) {
    if (checked) {
      addExercise(id);
      return;
    }

    setSelectedExercises((current) => current.filter((exercise) => exercise.id !== id));
  }

  function updateExercise(id: string, values: Partial<Omit<SelectedExercise, "id">>) {
    setSelectedExercises((current) => current.map((exercise) => (exercise.id === id ? { ...exercise, ...values } : exercise)));
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

  function applyTemplate(templateName: string) {
    const template = planTemplates.find((item) => item.name === templateName);

    if (!template) {
      return;
    }

    const next: SelectedExercise[] = [];
    const usedIds = new Set<string>();

    for (const block of template.blocks) {
      const match = exercises.find((exercise) => !usedIds.has(exercise.id) && block.matchTags.some((tag) => exercise.tags.includes(tag)));
      if (!match) {
        continue;
      }
      usedIds.add(match.id);
      next.push({
        id: match.id,
        durationMinutes: block.durationMinutes,
        material: "",
        notes: block.notes,
      });
    }

    setSelectedExercises(next);
  }

  return (
    <div className="plan-builder">
      <div className="plan-template-row">
        <label>
          Trainingsplan-Vorlage
          <select defaultValue="" onChange={(event) => applyTemplate(event.currentTarget.value)}>
            <option value="">Manuell zusammenstellen</option>
            {planTemplates.map((template) => (
              <option key={template.name} value={template.name}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Übung suchen
          <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Tag, Titel oder Coaching-Punkt" />
        </label>
      </div>

      <div className="plan-builder-layout">
        <div className="exercise-picker" aria-label="Übungen auswählen">
          {filteredExercises.map((exercise) => (
            <label
              className="exercise-picker-row"
              draggable
              key={exercise.id}
              onDragStart={() => setDraggedId(exercise.id)}
            >
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
                {exercise.templateName ? <small>Vorlage: {exercise.templateName}</small> : null}
                <CourtDiagramPreview exercise={exercise} />
              </span>
            </label>
          ))}
        </div>

        <div
          className="selected-exercise-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (draggedId && !selectedIds.has(draggedId)) {
              addExercise(draggedId);
            }
          }}
        >
          {selectedExercises.length > 0 ? (
            <div className="selected-exercise-list" aria-label="Sortierte Übungen">
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
                        <p className="muted">{exercise.organization || exercise.description}</p>
                        <CourtDiagramPreview exercise={exercise} />
                      </div>
                      <div className="selected-exercise-controls">
                        <button type="button" className="secondary-button" onClick={() => moveExercise(selectedExercise.id, -1)}>
                          Hoch
                        </button>
                        <button type="button" className="secondary-button" onClick={() => moveExercise(selectedExercise.id, 1)}>
                          Runter
                        </button>
                        <button type="button" className="danger-button" onClick={() => toggleExercise(selectedExercise.id, false)}>
                          Entfernen
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
                          placeholder="Bälle, Hütchen, Leibchen"
                        />
                      </label>
                      <label className="selected-exercise-notes">
                        Coaching-Notizen
                        <textarea
                          name={`notes:${selectedExercise.id}`}
                          rows={2}
                          value={selectedExercise.notes}
                          onChange={(event) => updateExercise(selectedExercise.id, { notes: event.currentTarget.value })}
                          placeholder={exercise.coachingPoints || "Schwerpunkt, Varianten oder Belastung"}
                        />
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted">Ziehe Übungen hierher oder wähle eine Vorlage aus.</p>
          )}
        </div>
      </div>
    </div>
  );
}
