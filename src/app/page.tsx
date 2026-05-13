import Link from "next/link";

import { AppHeader } from "@/components/AppHeader";
import { getCurrentSession } from "@/lib/auth/session";
import { findUserById, toPublicUser } from "@/lib/db";

export default async function HomePage() {
  const session = await getCurrentSession();
  const user = session ? await findUserById(session.userId) : null;
  const publicUser = user ? toPublicUser(user) : null;

  return (
    <>
      <AppHeader email={publicUser?.email} role={publicUser?.role} />
      <main>
        <section className="hero hero-single">
          <div>
            <p className="eyebrow">Team, Training, Taktik</p>
            <h1>Verwalte dein Basketball-Team sicher an einem Ort.</h1>
            <p className="muted">
              CourtControl bündelt Trainingspläne, geschützte Team-Bereiche und Rollenverwaltung für deinen Verein.
            </p>
            {publicUser ? (
              <div className="app-header" style={{ padding: "1.5rem 0", justifyContent: "flex-start" }}>
                <Link href="/dashboard" className="secondary-button">
                  Dashboard öffnen
                </Link>
              </div>
            ) : (
              <div className="app-header" style={{ padding: "1.5rem 0", justifyContent: "flex-start" }}>
                <Link href="/register" className="secondary-button">
                  Konto erstellen
                </Link>
                <Link href="/login">Anmelden</Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
