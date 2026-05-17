import Link from "next/link";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { requireUserSession } from "@/lib/auth/session";
import { findUserById, listUsers, toPublicUser } from "@/lib/db";
import { deleteTrainingExerciseAction, uploadTrainingExerciseAction } from "@/lib/training-exercise-actions";
import {
  listTrainingExercises,
  listTrainingExerciseTags,
  maxTrainingExerciseFileSize,
  maxTrainingExerciseMediaSize,
  maxTrainingExerciseTags,
} from "@/lib/training-exercises";
import { canAccessAdmin } from "@/lib/rbac/roles";
import { listTeamGroups } from "@/lib/team-store";
import { getTeamGroupLabel, isTeamGroup, type TeamGroup } from "@/lib/teams";

type TrainingExercisesPageProps = {
  searchParams: Promise<{
    deleted?: string;
    error?: string;
    q?: string;
    tag?: string;
    team?: string;
    uploadedBy?: string;
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

function getMediaTypeLabel(mimeType?: string): string {
  if (!mimeType) {
    return "Keine Medien";
  }

  if (mimeType.startsWith("image/")) {
    return "Bild";
  }

  if (mimeType.startsWith("video/")) {
    return "Video";
  }

  return "Medien";
}

export default async function TrainingExercisesPage({ searchParams }: TrainingExercisesPageProps) {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedTag = params.tag?.trim().toLowerCase();
  const selectedTeam = isTeamGroup(params.team ?? "") ? params.team as TeamGroup : undefined;
  const [user, trainingExercises, tags, users, teamGroups] = await Promise.all([
    findUserById(session.userId),
    listTrainingExercises({
      query: params.q,
      tag: selectedTag,
      team: selectedTeam,
      uploadedBy: params.uploadedBy,
    }),
    listTrainingExerciseTags(),
    listUsers(),
    listTeamGroups(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const publicUser = toPublicUser(user);
  const usersById = new Map(users.map((item) => [item.id, item]));

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

        <details className="card stack collapsible-card">
          <summary className="data-row-summary">
            <div>
              <h2>Übung hochladen</h2>
              <p className="muted">Datei, Beschreibung, Tags und optional Bild oder Video speichern.</p>
            </div>
          </summary>
          <div className="data-row-body">
          <h2 className="visually-hidden">Übung hochladen</h2>
          {params.error === "invalid-upload" ? (
            <p className="form-error">
              Bitte lade eine PDF-, DOC- oder DOCX-Datei bis {formatFileSize(maxTrainingExerciseFileSize)} mit Titel und
              mindestens einem Tag hoch. Bilder oder Videos duerfen maximal {formatFileSize(maxTrainingExerciseMediaSize)} gross sein.
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
            <label>
              Team
              <select name="team" defaultValue="">
                <option value="">Kein Team</option>
                {teamGroups.map((team) => (
                  <option key={team} value={team}>
                    {getTeamGroupLabel(team)}
                  </option>
                ))}
              </select>
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
            <label>
              Bild oder Video
              <input
                name="mediaFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
              />
            </label>
            <p className="muted">
              Maximale Dateigroesse: {formatFileSize(maxTrainingExerciseFileSize)}. Medien:{" "}
              {formatFileSize(maxTrainingExerciseMediaSize)}.
            </p>
            <button type="submit">Übung speichern</button>
          </form>
          </div>
        </details>

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
              Suche
              <input name="q" defaultValue={params.q ?? ""} placeholder="Titel, Beschreibung oder Datei" />
            </label>
            <label>
              Tag
              <input name="tag" defaultValue={selectedTag ?? ""} placeholder="z. B. defense" />
            </label>
            <label>
              Team
              <select name="team" defaultValue={params.team ?? ""}>
                <option value="">Alle Teams</option>
                {teamGroups.map((team) => (
                  <option key={team} value={team}>
                    {getTeamGroupLabel(team)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ersteller
              <select name="uploadedBy" defaultValue={params.uploadedBy ?? ""}>
                <option value="">Alle Ersteller</option>
                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.email}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="secondary-button">
              Filtern
            </button>
          </form>

          {trainingExercises.length > 0 ? (
            <div className="training-plan-list">
              {trainingExercises.map((exercise) => (
                <details className="training-plan-row data-details" key={exercise.id}>
                  <summary className="data-row-summary">
                    <div>
                      <h3>{exercise.title}</h3>
                      <p className="muted">
                        {getFileTypeLabel(exercise.mimeType)} - {formatFileSize(exercise.size)}
                      </p>
                    </div>
                  </summary>
                  <div className="training-plan-main data-row-body">
                    <div>
                      <h3>{exercise.title}</h3>
                      <p className="muted">
                        {getFileTypeLabel(exercise.mimeType)} · {formatFileSize(exercise.size)} ·{" "}
                        {new Date(exercise.uploadedAt).toLocaleString("de-DE")}
                      </p>
                      <p className="muted">
                        {getTeamGroupLabel(exercise.team)} · Erstellt von{" "}
                        {usersById.get(exercise.uploadedBy)?.name ||
                          usersById.get(exercise.uploadedBy)?.email ||
                          "Unbekannt"}
                      </p>
                      {exercise.description ? <p>{exercise.description}</p> : null}
                      <p className="muted">{exercise.originalFileName}</p>
                      {exercise.mediaOriginalFileName ? (
                        <p className="muted">
                          {getMediaTypeLabel(exercise.mediaMimeType)} - {formatFileSize(exercise.mediaSize ?? 0)} -{" "}
                          {exercise.mediaOriginalFileName}
                        </p>
                      ) : null}
                      {exercise.mediaMimeType?.startsWith("image/") ? (
                        <img
                          alt={`Medienvorschau von ${exercise.title}`}
                          className="exercise-media-preview"
                          src={`/training-exercises/media/${exercise.id}`}
                        />
                      ) : null}
                      {exercise.mediaMimeType?.startsWith("video/") ? (
                        <video className="exercise-media-preview" controls preload="metadata">
                          <source src={`/training-exercises/media/${exercise.id}`} type={exercise.mediaMimeType} />
                        </video>
                      ) : null}
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
                </details>
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
