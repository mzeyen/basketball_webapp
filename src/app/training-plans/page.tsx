import Link from "next/link";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { requireUserSession } from "@/lib/auth/session";
import { findUserById, toPublicUser } from "@/lib/db";
import { deleteTrainingPlanAction, uploadTrainingPlanAction } from "@/lib/training-plan-actions";
import {
  listTrainingPlans,
  maxTrainingPlanFileSize,
  trainingPlanCategories,
  type TrainingPlanCategory,
} from "@/lib/training-plans";

type TrainingPlansPageProps = {
  searchParams: Promise<{
    deleted?: string;
    error?: string;
    uploaded?: string;
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

  const [user, trainingPlans, params] = await Promise.all([
    findUserById(session.userId),
    listTrainingPlans(),
    searchParams,
  ]);

  if (!user) {
    redirect("/login");
  }

  const publicUser = toPublicUser(user);
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
      <AppHeader email={publicUser.email} role={publicUser.role} />
      <main className="stack">
        <section className="card">
          <p className="eyebrow">Training</p>
          <h1>Trainingspläne</h1>
          <p className="muted">
            Lege Trainingspläne nach Altersklasse oder Team als PDF oder Word-Datei ab.
          </p>
        </section>

        <section className="card stack">
          <h2>Plan hochladen</h2>
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
          {params.uploaded ? <p className="form-success">Trainingsplan wurde gespeichert.</p> : null}
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
        </section>

        <section className="card stack">
          <h2>Abgelegte Pläne</h2>
          {trainingPlans.length > 0 ? (
            <div className="training-plan-category-list">
              {categorizedTrainingPlans.map((group) => (
                <div className="training-plan-category" key={group.category}>
                  <h3>{getCategoryLabel(group.category)}</h3>
                  <div className="training-plan-list">
                    {group.plans.map((plan) => (
                      <article className="training-plan-row" key={plan.id}>
                        <div className="training-plan-main">
                          <div>
                            <h4>{plan.title}</h4>
                            <p className="muted">
                              {getFileTypeLabel(plan.mimeType)} · {formatFileSize(plan.size)} ·{" "}
                              {new Date(plan.uploadedAt).toLocaleString("de-DE")}
                            </p>
                            <p className="muted">{plan.originalFileName}</p>
                          </div>
                          <div className="training-plan-actions">
                            {publicUser.role === "admin" || plan.uploadedBy === publicUser.id ? (
                              <form action={deleteTrainingPlanAction}>
                                <input type="hidden" name="planId" value={plan.id} />
                                <button type="submit" className="danger-button">
                                  Löschen
                                </button>
                              </form>
                            ) : null}
                            {plan.mimeType === "application/pdf" ? (
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
                      </article>
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
