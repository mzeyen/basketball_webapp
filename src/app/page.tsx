import Link from "next/link";

import { AppHeader } from "@/components/AppHeader";

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">Team, Training, Taktik</p>
            <h1>Verwalte dein Basketball-Team sicher an einem Ort.</h1>
            <p className="muted">
              CourtControl startet mit Authentifizierung, Rollen und serverseitig geschützten privaten Bereichen,
              damit zukünftige Team-Features auf einer stabilen Basis wachsen können.
            </p>
            <div className="app-header" style={{ padding: "1.5rem 0", justifyContent: "flex-start" }}>
              <Link href="/register" className="secondary-button">
                Konto erstellen
              </Link>
              <Link href="/login">Anmelden</Link>
            </div>
          </div>
          <aside className="card stack">
            <h2>Projektbasis</h2>
            <p>Next.js App Router, TypeScript und klare Trennung für UI, Auth, Datenbank und RBAC.</p>
            <p className="muted">Admin-Konten entstehen in der Demo mit E-Mails auf @basketball.local.</p>
          </aside>
        </section>
      </main>
    </>
  );
}
