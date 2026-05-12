import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { requireAdminSession } from "@/lib/auth/session";
import { findUserById, toPublicUser } from "@/lib/db";

export default async function AdminPage() {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/dashboard");
  }

  const user = await findUserById(session.userId);

  if (!user) {
    redirect("/login");
  }

  const publicUser = toPublicUser(user);

  return (
    <>
      <AppHeader email={publicUser.email} role={publicUser.role} />
      <main className="stack">
        <section className="card">
          <p className="eyebrow">Admin</p>
          <h1>Rollenverwaltung</h1>
          <p className="muted">
            Nur Admins erreichen diese Route. Die Prüfung läuft serverseitig über Session- und Rollenlogik.
          </p>
        </section>
        <section className="grid">
          <article className="card">
            <h2>Zugriff</h2>
            <p>Admin-Berechtigung bestätigt.</p>
          </article>
          <article className="card">
            <h2>Nächster Schritt</h2>
            <p>Hier können später Team-Mitglieder, Trainingspläne und Spieltermine verwaltet werden.</p>
          </article>
        </section>
      </main>
    </>
  );
}
