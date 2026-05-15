import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { requireUserSession } from "@/lib/auth/session";
import { findUserById, listUsers, toPublicUser } from "@/lib/db";
import { listTrainingExercises } from "@/lib/training-exercises";
import { listTrainingPlans } from "@/lib/training-plans";

type RecentUpload = {
  createdBy: string;
  kind: "Trainingsplan" | "Trainingsübung";
  title: string;
  uploadedAt: string;
};

export default async function DashboardPage() {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const [user, users, trainingPlans, trainingExercises] = await Promise.all([
    findUserById(session.userId),
    listUsers(),
    listTrainingPlans(),
    listTrainingExercises(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const publicUser = toPublicUser(user);
  const usersById = new Map(users.map((item) => [item.id, item]));
  const recentUploads: RecentUpload[] = [
    ...trainingPlans.map((plan) => ({
      createdBy: usersById.get(plan.uploadedBy)?.name || usersById.get(plan.uploadedBy)?.email || "Unbekannt",
      kind: "Trainingsplan" as const,
      title: plan.title,
      uploadedAt: plan.uploadedAt,
    })),
    ...trainingExercises.map((exercise) => ({
      createdBy: usersById.get(exercise.uploadedBy)?.name || usersById.get(exercise.uploadedBy)?.email || "Unbekannt",
      kind: "Trainingsübung" as const,
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
        <section className="dashboard-overview">
          <article className="card">
            <p className="eyebrow">Privater Bereich</p>
            <h1>Dashboard</h1>
            {recentUploads.length > 0 ? (
              <div className="dashboard-recent-list">
                {recentUploads.map((upload) => (
                  <article className="dashboard-recent-row" key={`${upload.kind}-${upload.title}-${upload.uploadedAt}`}>
                    <div>
                      <p className="upload-kind">{upload.kind}</p>
                      <h3>{upload.title}</h3>
                      <p className="muted">
                        Erstellt von {upload.createdBy} · {new Date(upload.uploadedAt).toLocaleString("de-DE")}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Noch keine Trainingspläne oder Übungen hochgeladen.</p>
            )}
          </article>

          <aside className="card account-summary">
            <h2>Konto</h2>
            <div className="account-summary-grid">
              <div>
                <h3>Rolle</h3>
                <p>{publicUser.role}</p>
              </div>
              <div>
                <h3>E-Mail verifiziert</h3>
                <p>{publicUser.emailVerifiedAt ?? "Noch nicht verifiziert"}</p>
              </div>
              <div>
                <h3>Erstellt</h3>
                <p>{new Date(publicUser.createdAt).toLocaleString("de-DE")}</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid">
          <article className="card">
            <h2>Profil</h2>
            <p className="muted">Kontodaten, letzte Uploads und Template Mode verwalten.</p>
            <a href="/profile" className="secondary-button">
              Profil öffnen
            </a>
          </article>
          <article className="card">
            <h2>Trainingspläne</h2>
            <p className="muted">PDF- und Word-Pläne zentral ablegen und für das Team anzeigen.</p>
            <a href="/training-plans" className="secondary-button">
              Pläne öffnen
            </a>
          </article>
          <article className="card">
            <h2>Trainingsübungen</h2>
            <p className="muted">Einzelne Übungen hochladen, taggen und gezielt wiederfinden.</p>
            <a href="/training-exercises" className="secondary-button">
              Übungen öffnen
            </a>
          </article>
        </section>
      </main>
    </>
  );
}
