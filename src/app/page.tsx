import Link from "next/link";

import { AppHeader } from "@/components/AppHeader";
import { ClubBrand } from "@/components/ClubBrand";
import { getCurrentSession } from "@/lib/auth/session";
import { appBranding } from "@/lib/branding";
import { findUserById, toPublicUser } from "@/lib/db";
import { getFeatureContent } from "@/lib/features";

export default async function HomePage() {
  const [session, featureContent] = await Promise.all([getCurrentSession(), getFeatureContent()]);
  const user = session ? await findUserById(session.userId) : null;
  const publicUser = user ? toPublicUser(user) : null;

  return (
    <>
      <AppHeader displayName={publicUser?.name} email={publicUser?.email} role={publicUser?.role} />
      <main>
        <section className="hero hero-single">
          <div>
            <ClubBrand className="hero-brand" size="large" />
            <p className="eyebrow">Training, Kalender, Dokumente</p>
            <h1>{appBranding.heroTitle}</h1>
            <p className="muted">{appBranding.heroText}</p>
            {publicUser ? (
              <div className="hero-actions">
                <Link href="/dashboard" className="secondary-button">
                  Dashboard öffnen
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

        <details className="card stack collapsible-card">
          <summary className="data-row-summary">
            <div>
              <h2>Funktionsübersicht</h2>
              {featureContent.intro.map((paragraph) => (
                <p className="muted" key={paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>
          </summary>
          <div className="public-feature-sections">
            {featureContent.sections.map((section) => (
              <article className="public-feature-section" key={section.title}>
                <h3>{section.title}</h3>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </details>
      </main>
    </>
  );
}
