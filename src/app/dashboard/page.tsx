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
        <section className="dashboard-overview">
          <article className="card">
            <p className="eyebrow">Privater Bereich</p>
            <h1>Dashboard</h1>
            <p className="muted">
              Diese Route wird durch Middleware und eine serverseitige Session-Prüfung im Page-Handler geschützt.
            </p>
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
            <h2>Trainingspläne</h2>
            <p className="muted">PDF- und Word-Pläne zentral ablegen und für das Team anzeigen.</p>
            <a href="/training-plans" className="secondary-button">
              Pläne öffnen
            </a>
          </article>
        </section>
      </main>
    </>
  );
}
