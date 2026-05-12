import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { requireUserSession } from "@/lib/auth/session";
import { findUserById, toPublicUser } from "@/lib/db";

export default async function DashboardPage() {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
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
          <p className="eyebrow">Privater Bereich</p>
          <h1>Dashboard</h1>
          <p className="muted">
            Diese Route wird durch Middleware und eine serverseitige Session-Prüfung im Page-Handler geschützt.
          </p>
        </section>
        <section className="grid">
          <article className="card">
            <h2>Rolle</h2>
            <p>{publicUser.role}</p>
          </article>
          <article className="card">
            <h2>E-Mail verifiziert</h2>
            <p>{publicUser.emailVerifiedAt ?? "Noch nicht verifiziert"}</p>
          </article>
          <article className="card">
            <h2>Erstellt</h2>
            <p>{new Date(publicUser.createdAt).toLocaleString("de-DE")}</p>
          </article>
        </section>
      </main>
    </>
  );
}
