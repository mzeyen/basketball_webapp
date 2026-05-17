import Link from "next/link";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { requireUserSession } from "@/lib/auth/session";
import { findUserById, toPublicUser } from "@/lib/db";
import { updateProfileNameAction } from "@/lib/profile-actions";
import { listTrainingExercises } from "@/lib/training-exercises";
import { listTrainingPlans, type TrainingPlanCategory } from "@/lib/training-plans";
import type { Role } from "@/lib/rbac/roles";

type RecentUpload = {
  href: string;
  kind: "Trainingsplan" | "Trainingsübung";
  meta: string;
  originalFileName: string;
  title: string;
  uploadedAt: string;
};

type ProfilePageProps = {
  searchParams: Promise<{
    error?: string;
    updated?: string;
  }>;
};

function getMessage(params: Awaited<ProfilePageProps["searchParams"]>): string | null {
  if (params.updated === "name") {
    return "Name wurde gespeichert.";
  }

  return null;
}

function getError(params: Awaited<ProfilePageProps["searchParams"]>): string | null {
  if (params.error === "invalid-name") {
    return "Der Name darf maximal 80 Zeichen lang sein.";
  }

  return null;
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString("de-DE") : "Nicht vorhanden";
}

function getRoleLabel(role: Role): string {
  if (role === "superadmin") {
    return "SuperAdmin";
  }

  return role === "admin" ? "Admin" : "Nutzer";
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") {
    return "PDF";
  }

  return "Word";
}

function getCategoryLabel(category: TrainingPlanCategory | undefined): string {
  const labels: Record<TrainingPlanCategory, string> = {
    u10: "U10",
    u12: "U12",
    u14: "U14",
    u16: "U16",
    u19: "U19",
    damen: "Damen",
  };

  return category ? labels[category] : "Ohne Kategorie";
}

function formatFileSize(size: number): string {
  const megabytes = size / 1024 / 1024;
  return `${megabytes.toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const [user, trainingPlans, trainingExercises, params] = await Promise.all([
    findUserById(session.userId),
    listTrainingPlans(),
    listTrainingExercises(),
    searchParams,
  ]);

  if (!user) {
    redirect("/login");
  }

  const publicUser = toPublicUser(user);
  const message = getMessage(params);
  const error = getError(params);
  const recentUploads: RecentUpload[] = [
    ...trainingPlans
      .filter((plan) => plan.uploadedBy === publicUser.id)
      .map((plan) => ({
        href: `/training-plans/files/${plan.id}`,
        kind: "Trainingsplan" as const,
        meta: `${getCategoryLabel(plan.category)} · ${getFileTypeLabel(plan.mimeType)} · ${formatFileSize(plan.size)}`,
        originalFileName: plan.originalFileName,
        title: plan.title,
        uploadedAt: plan.uploadedAt,
      })),
    ...trainingExercises
      .filter((exercise) => exercise.uploadedBy === publicUser.id)
      .map((exercise) => ({
        href: `/training-exercises/files/${exercise.id}`,
        kind: "Trainingsübung" as const,
        meta: `${exercise.tags.slice(0, 3).join(", ") || "Ohne Tags"} · ${getFileTypeLabel(exercise.mimeType)} · ${formatFileSize(
          exercise.size,
        )}`,
        originalFileName: exercise.originalFileName,
        title: exercise.title,
        uploadedAt: exercise.uploadedAt,
      })),
  ]
    .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime())
    .slice(0, 4);

  return (
    <>
      <AppHeader displayName={publicUser.name} email={publicUser.email} role={publicUser.role} />
      <main className="stack">
        <section className="card">
          <p className="eyebrow">Profil</p>
          <h1>Mein Profil</h1>
          <p className="muted">Deine Kontodaten und letzten Uploads.</p>
        </section>

        <section className="card account-summary">
          <h2>Nutzerdaten</h2>
          {message ? <p className="form-success">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          <form action={updateProfileNameAction} className="profile-name-form">
            <label>
              Name
              <input name="name" maxLength={80} defaultValue={publicUser.name ?? ""} placeholder={publicUser.email} />
            </label>
            <button type="submit">Name speichern</button>
          </form>
          <div className="account-summary-grid">
            <div>
              <h3>Anzeigename</h3>
              <p>{publicUser.name || publicUser.email}</p>
            </div>
            <div>
              <h3>E-Mail</h3>
              <p>{publicUser.email}</p>
            </div>
            <div>
              <h3>Rolle</h3>
              <p>{getRoleLabel(publicUser.role)}</p>
            </div>
            <div>
              <h3>E-Mail verifiziert</h3>
              <p>{formatDate(publicUser.emailVerifiedAt)}</p>
            </div>
            <div>
              <h3>Konto erstellt</h3>
              <p>{formatDate(publicUser.createdAt)}</p>
            </div>
            <div>
              <h3>Zuletzt aktualisiert</h3>
              <p>{formatDate(publicUser.updatedAt)}</p>
            </div>
          </div>
        </section>

        <section className="card stack">
          <div className="section-heading">
            <div>
              <h2>Letzte Uploads</h2>
              <p className="muted">Deine vier zuletzt hochgeladenen Trainingspläne und Übungen.</p>
            </div>
          </div>

          {recentUploads.length > 0 ? (
            <div className="upload-overview-list">
              {recentUploads.map((upload) => (
                <details className="upload-overview-row data-details" key={`${upload.kind}-${upload.href}`}>
                  <summary className="data-row-summary">
                    <div>
                      <p className="upload-kind">{upload.kind}</p>
                      <h3>{upload.title}</h3>
                      <p className="muted">{upload.meta}</p>
                    </div>
                  </summary>
                  <div className="data-row-body">
                    <p className="upload-kind">{upload.kind}</p>
                    <p className="muted">
                      {upload.meta} · {new Date(upload.uploadedAt).toLocaleString("de-DE")}
                    </p>
                    <p className="muted">{upload.originalFileName}</p>
                  </div>
                  <Link href={upload.href} className="secondary-button" target="_blank">
                    Anzeigen
                  </Link>
                </details>
              ))}
            </div>
          ) : (
            <p className="muted">Du hast noch keine Dateien hochgeladen.</p>
          )}
        </section>
      </main>
    </>
  );
}
