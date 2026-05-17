import Link from "next/link";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { TrainingPlanExerciseBuilder } from "@/components/TrainingPlanExerciseBuilder";
import { requireUserSession } from "@/lib/auth/session";
import { findUserById, listUsers, toPublicUser } from "@/lib/db";
import {
  createTrainingPlanFromExercisesAction,
  deleteTrainingPlanAction,
  uploadTrainingPlanAction,
} from "@/lib/training-plan-actions";
import {
  listTrainingPlans,
  maxTrainingPlanFileSize,
  isTrainingPlanCategory,
  trainingPlanCategories,
  type TrainingPlanCategory,
} from "@/lib/training-plans";
import { listTrainingExercises } from "@/lib/training-exercises";
import { canAccessAdmin } from "@/lib/rbac/roles";
import { listTeamGroups } from "@/lib/team-store";
import { getTeamGroupLabel, isTeamGroup, type TeamGroup } from "@/lib/teams";

type TrainingPlansPageProps = {
  searchParams: Promise<{
    deleted?: string;
    error?: string;
    category?: string;
    q?: string;
    team?: string;
    uploadedBy?: string;
    uploaded?: string;
    created?: string;
  }>;
};

function formatFileSize(size: number): string {
  const megabytes = size / 1024 / 1024;
  return `${megabytes.toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
}

function formatMaxUploadSize(): string {
  return formatFileSize(maxTrainingPlanFileSize);
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType === "text/html") {
    return "Generiert";
  }

  return "Word";
}

function getCategoryLabel(category: TrainingPlanCategory | "uncategorized"): string {
  const labels: Record<TrainingPlanCategory | "uncategorized", string> = {
    u10: "U10",
    u12: "U12",
    u14: "U14",
    u16: "U16",
    u19: "U19",
    damen: "Damen",
    uncategorized: "Ohne Kategorie",
  };

  return labels[category];
}

export default async function TrainingPlansPage({ searchParams }: TrainingPlansPageProps) {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedCategory = isTrainingPlanCategory(params.category ?? "") ? params.category as TrainingPlanCategory : undefined;
  const selectedTeam = isTeamGroup(params.team ?? "") ? params.team as TeamGroup : undefined;
  const [user, trainingPlans, trainingExercises, users, teamGroups] = await Promise.all([
    findUserById(session.userId),
    listTrainingPlans({
      category: selectedCategory,
      query: params.q,
      team: selectedTeam,
      uploadedBy: params.uploadedBy,
    }),
    listTrainingExercises(),
    listUsers(),
    listTeamGroups(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const publicUser = toPublicUser(user);
  const usersById = new Map(users.map((item) => [item.id, item]));
  const categorizedTrainingPlans = [
    ...trainingPlanCategories.map((category) => ({
      category,
      plans: trainingPlans.filter((plan) => plan.category === category),
    })),
    {
      category: "uncategorized" as const,
      plans: trainingPlans.filter((plan) => !plan.category),
    },
  ].filter((group) => group.plans.length > 0);

  return (
    <>
      <AppHeader displayName={publicUser.name} email={publicUser.email} role={publicUser.role} />
      <main className="stack">
        <section className="card">
          <p className="eyebrow">Training</p>
          <h1>Trainingspläne</h1>
          <p className="muted">
            Lege Trainingspläne nach Altersklasse oder Team als PDF oder Word-Datei ab.
          </p>
        </section>

        <details className="card stack collapsible-card">
          <summary className="data-row-summary">
            <div>
              <h2>Plan hochladen</h2>
              <p className="muted">PDF- oder Word-Datei als Trainingsplan ablegen.</p>
            </div>
          </summary>
          <div className="data-row-body">
          <h2 className="visually-hidden">Plan hochladen</h2>
          {params.error === "invalid-upload" ? (
            <p className="form-error">
              Bitte lade eine PDF-, DOC- oder DOCX-Datei bis {formatMaxUploadSize()} mit Titel und Kategorie hoch.
            </p>
          ) : null}
          {params.error === "invalid-delete" ? (
            <p className="form-error">Der Trainingsplan konnte nicht gefunden werden.</p>
          ) : null}
          {params.error === "forbidden-delete" ? (
            <p className="form-error">Du kannst nur eigene Trainingspläne löschen.</p>
          ) : null}
          {params.error === "invalid-generated-plan" ? (
            <p className="form-error">Bitte wähle Titel, Kategorie und mindestens eine vorhandene Übung aus.</p>
          ) : null}
          {params.uploaded ? <p className="form-success">Trainingsplan wurde gespeichert.</p> : null}
          {params.created ? <p className="form-success">Trainingsplan wurde aus Übungen erstellt.</p> : null}
          {params.deleted ? <p className="form-success">Trainingsplan wurde gelöscht.</p> : null}
          <form action={uploadTrainingPlanAction} className="stack">
            <label>
              Titel
              <input name="title" minLength={3} required placeholder="z. B. Wurftraining U16" />
            </label>
            <label>
              Kategorie
              <select name="category" required defaultValue="">
                <option value="" disabled>
                  Kategorie wählen
                </option>
                {trainingPlanCategories.map((category) => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
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
            <label>
              Datei
              <input
                name="file"
                type="file"
                accept="application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                required
              />
            </label>
            <p className="muted">Maximale Dateigröße: {formatMaxUploadSize()}.</p>
            <button type="submit">Trainingsplan speichern</button>
          </form>
          </div>
        </details>

        <details className="card stack collapsible-card">
          <summary className="data-row-summary">
            <div>
              <h2>Plan aus Übungen erstellen</h2>
              <p className="muted">Vorhandene Übungen sortieren und als Trainingsplan generieren.</p>
            </div>
          </summary>
          <div className="data-row-body">
          <h2 className="visually-hidden">Plan aus Übungen erstellen</h2>
          {trainingExercises.length > 0 ? (
            <form action={createTrainingPlanFromExercisesAction} className="stack">
              <label>
                Titel
                <input name="title" minLength={3} required placeholder="z. B. Wurftraining U16" />
              </label>
              <label>
                Kategorie
                <select name="category" required defaultValue="">
                  <option value="" disabled>
                    Kategorie wählen
                  </option>
                  {trainingPlanCategories.map((category) => (
                    <option key={category} value={category}>
                      {getCategoryLabel(category)}
                    </option>
                  ))}
                </select>
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
              <TrainingPlanExerciseBuilder exercises={trainingExercises} />
              <button type="submit">Plan erstellen</button>
            </form>
          ) : (
            <p className="muted">Lege zuerst Übungen an, um daraus einen Trainingsplan zu erstellen.</p>
          )}
          </div>
        </details>

        <section className="card stack">
          <h2>Abgelegte Pläne</h2>
          <form action="/training-plans" className="filter-form">
            <label>
              Suche
              <input name="q" defaultValue={params.q ?? ""} placeholder="Titel oder Dateiname" />
            </label>
            <label>
              Kategorie
              <select name="category" defaultValue={params.category ?? ""}>
                <option value="">Alle Kategorien</option>
                {trainingPlanCategories.map((category) => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
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
          {trainingPlans.length > 0 ? (
            <div className="training-plan-category-list">
              {categorizedTrainingPlans.map((group) => (
                <div className="training-plan-category" key={group.category}>
                  <h3>{getCategoryLabel(group.category)}</h3>
                  <div className="training-plan-list">
                    {group.plans.map((plan) => (
                      <details className="training-plan-row data-details" key={plan.id}>
                        <summary className="data-row-summary">
                          <div>
                            <h4>{plan.title}</h4>
                            <p className="muted">
                              {getFileTypeLabel(plan.mimeType)} - {formatFileSize(plan.size)}
                            </p>
                          </div>
                        </summary>
                        <div className="training-plan-main data-row-body">
                          <div>
                            <h4>{plan.title}</h4>
                            <p className="muted">
                              {getFileTypeLabel(plan.mimeType)} · {formatFileSize(plan.size)} ·{" "}
                              {new Date(plan.uploadedAt).toLocaleString("de-DE")}
                            </p>
                            <p className="muted">
                              {getTeamGroupLabel(plan.team)} · Erstellt von{" "}
                              {usersById.get(plan.uploadedBy)?.name || usersById.get(plan.uploadedBy)?.email || "Unbekannt"}
                            </p>
                            {plan.sourceExerciseIds?.length ? (
                              <p className="muted">Erstellt aus {plan.sourceExerciseIds.length} Übungen.</p>
                            ) : null}
                            <p className="muted">{plan.originalFileName}</p>
                          </div>
                          <div className="training-plan-actions">
                            {canAccessAdmin(publicUser.role) || plan.uploadedBy === publicUser.id ? (
                              <form action={deleteTrainingPlanAction}>
                                <input type="hidden" name="planId" value={plan.id} />
                                <button type="submit" className="danger-button">
                                  Löschen
                                </button>
                              </form>
                            ) : null}
                            {plan.mimeType === "application/pdf" || plan.mimeType === "text/html" ? (
                              <details className="preview-toggle">
                                <summary>Vorschau</summary>
                                <iframe
                                  className="file-preview"
                                  src={`/training-plans/files/${plan.id}`}
                                  title={`Vorschau von ${plan.title}`}
                                />
                              </details>
                            ) : null}
                            <Link href={`/training-plans/files/${plan.id}`} className="secondary-button" target="_blank">
                              Anzeigen
                            </Link>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Noch keine Trainingspläne abgelegt.</p>
          )}
        </section>
      </main>
    </>
  );
}
