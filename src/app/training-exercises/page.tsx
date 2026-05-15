import Link from "next/link";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { requireUserSession } from "@/lib/auth/session";
import { findUserById, toPublicUser } from "@/lib/db";
import { deleteTrainingExerciseAction, uploadTrainingExerciseAction } from "@/lib/training-exercise-actions";
import {
  listTrainingExercises,
  listTrainingExerciseTags,
  maxTrainingExerciseFileSize,
  maxTrainingExerciseTags,
} from "@/lib/training-exercises";
import { canAccessAdmin } from "@/lib/rbac/roles";

type TrainingExercisesPageProps = {
  searchParams: Promise<{
    deleted?: string;
    error?: string;
    tag?: string;
    uploaded?: string;
  }>;
};

function formatFileSize(size: number): string {
  const megabytes = size / 1024 / 1024;
  return `${megabytes.toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") {
    return "PDF";
  }

  return "Word";
}

export default async function TrainingExercisesPage({ searchParams }: TrainingExercisesPageProps) {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedTag = params.tag?.trim().toLowerCase();
  const [user, trainingExercises, tags] = await Promise.all([
    findUserById(session.userId),
    listTrainingExercises(selectedTag),
    listTrainingExerciseTags(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const publicUser = toPublicUser(user);

  return (
    <>
      <AppHeader displayName={publicUser.name} email={publicUser.email} role={publicUser.role} />
      <main className="stack">
        <section className="card">
          <p className="eyebrow">Training</p>
          <h1>Trainingsübungen</h1>
          <p className="muted">
            Lege einzelne Übungen mit Datei, Beschreibung und Tags ab, damit sie später gezielt gefunden werden.
          </p>
        </section>

        <section className="card stack">
          <h2>Übung hochladen</h2>
          {params.error === "invalid-upload" ? (
            <p className="form-error">
              Bitte lade eine PDF-, DOC- oder DOCX-Datei bis {formatFileSize(maxTrainingExerciseFileSize)} mit Titel und
              mindestens einem Tag hoch.
            </p>
          ) : null}
          {params.error === "invalid-delete" ? (
            <p className="form-error">Die Übung konnte nicht gefunden werden.</p>
          ) : null}
          {params.error === "forbidden-delete" ? (
            <p className="form-error">Du kannst nur eigene Übungen löschen.</p>
          ) : null}
          {params.uploaded ? <p className="form-success">Übung wurde gespeichert.</p> : null}
          {params.deleted ? <p className="form-success">Übung wurde gelöscht.</p> : null}
          <form action={uploadTrainingExerciseAction} className="stack">
            <label>
              Titel
              <input name="title" minLength={3} required placeholder="z. B. Closeout mit Wurfabschluss" />
            </label>
            <label>
              Tags
              <input name="tags" required placeholder="z. B. wurf, defense, u16" />
            </label>
            <p className="muted">
              Trenne Tags mit Kommas. Es werden maximal {maxTrainingExerciseTags} Tags pro Übung gespeichert.
            </p>
            <label>
              Beschreibung
              <textarea
                name="description"
                rows={4}
                placeholder="Organisation, Ablauf oder Coaching-Punkte zur Übung"
              />
            </label>
            <label>
              Datei
              <input
                name="file"
                type="file"
                accept="application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                required
              />
            </label>
            <p className="muted">Maximale Dateigröße: {formatFileSize(maxTrainingExerciseFileSize)}.</p>
            <button type="submit">Übung speichern</button>
          </form>
        </section>

        <section className="card stack">
          <div className="section-heading">
            <div>
              <h2>Übungen</h2>
              {selectedTag ? <p className="muted">Gefiltert nach Tag: {selectedTag}</p> : null}
            </div>
            {selectedTag ? (
              <Link href="/training-exercises" className="secondary-button">
                Filter entfernen
              </Link>
            ) : null}
          </div>

          {tags.length > 0 ? (
            <div className="tag-list" aria-label="Tags">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/training-exercises?tag=${encodeURIComponent(tag)}`}
                  className={tag === selectedTag ? "tag-pill tag-pill-active" : "tag-pill"}
                >
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}

          <form action="/training-exercises" className="tag-search-form">
            <label>
              Nach Tag suchen
              <input name="tag" defaultValue={selectedTag ?? ""} placeholder="z. B. defense" />
            </label>
            <button type="submit" className="secondary-button">
              Suchen
            </button>
          </form>

          {trainingExercises.length > 0 ? (
            <div className="training-plan-list">
              {trainingExercises.map((exercise) => (
                <article className="training-plan-row" key={exercise.id}>
                  <div className="training-plan-main">
                    <div>
                      <h3>{exercise.title}</h3>
                      <p className="muted">
                        {getFileTypeLabel(exercise.mimeType)} · {formatFileSize(exercise.size)} ·{" "}
                        {new Date(exercise.uploadedAt).toLocaleString("de-DE")}
                      </p>
                      {exercise.description ? <p>{exercise.description}</p> : null}
                      <p className="muted">{exercise.originalFileName}</p>
                      <div className="tag-list compact-tags">
                        {exercise.tags.map((tag) => (
                          <Link key={tag} href={`/training-exercises?tag=${encodeURIComponent(tag)}`} className="tag-pill">
                            {tag}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="training-plan-actions">
                      {canAccessAdmin(publicUser.role) || exercise.uploadedBy === publicUser.id ? (
                        <form action={deleteTrainingExerciseAction}>
                          <input type="hidden" name="exerciseId" value={exercise.id} />
                          <button type="submit" className="danger-button">
                            Löschen
                          </button>
                        </form>
                      ) : null}
                      {exercise.mimeType === "application/pdf" ? (
                        <details className="preview-toggle">
                          <summary>Vorschau</summary>
                          <iframe
                            className="file-preview"
                            src={`/training-exercises/files/${exercise.id}`}
                            title={`Vorschau von ${exercise.title}`}
                          />
                        </details>
                      ) : null}
                      <Link href={`/training-exercises/files/${exercise.id}`} className="secondary-button" target="_blank">
                        Anzeigen
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">Noch keine passenden Übungen abgelegt.</p>
          )}
        </section>
      </main>
    </>
  );
}
