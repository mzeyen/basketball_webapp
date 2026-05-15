import Link from "next/link";

import { AppHeader } from "@/components/AppHeader";
import { ClubBrand } from "@/components/ClubBrand";
import { getCurrentSession } from "@/lib/auth/session";
import { appBranding } from "@/lib/branding";
import { findUserById, toPublicUser } from "@/lib/db";

export default async function HomePage() {
  const session = await getCurrentSession();
  const user = session ? await findUserById(session.userId) : null;
  const publicUser = user ? toPublicUser(user) : null;

  return (
    <>
      <AppHeader displayName={publicUser?.name} email={publicUser?.email} role={publicUser?.role} />
      <main>
        <section className="hero hero-single">
          <div>
            <ClubBrand className="hero-brand" size="large" />
            <p className="eyebrow">Team, Training, Taktik</p>
            <h1>{appBranding.heroTitle}</h1>
            <p className="muted">{appBranding.heroText}</p>
            {publicUser ? (
              <div className="hero-actions">
                <Link href="/dashboard" className="secondary-button">
                  Dashboard oeffnen
                </Link>
              </div>
            ) : (
              <div className="hero-actions">
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
