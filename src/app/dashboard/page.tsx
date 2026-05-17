import { redirect } from "next/navigation";
import Link from "next/link";
import { readFile } from "fs/promises";
import path from "path";

import { AppHeader } from "@/components/AppHeader";
import { ClubBrand } from "@/components/ClubBrand";
import { getCurrentSession } from "@/lib/auth/session";
import { TeamStandingsWidget } from "@/components/TeamStandingsWidget";
import { listCalendarEvents } from "@/lib/calendar-events";
import { findUserById, listUsers, toPublicUser } from "@/lib/db";
import { getTeamStandings, listTeamStandingConfigs } from "@/lib/team-standings";
import { getTeamGroupLabel } from "@/lib/teams";
import { listTrainingExercises } from "@/lib/training-exercises";
import { listTrainingPlans } from "@/lib/training-plans";

type FeatureSection = {
  items: string[];
  title: string;
};

const featuresFilePath = path.join(process.cwd(), "FEATURES.md");

function parseFeatureSections(markdown: string): FeatureSection[] {
  const sections: FeatureSection[] = [];
  let current: FeatureSection | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.startsWith("## ")) {
      current = { title: line.slice(3).trim(), items: [] };
      sections.push(current);
      continue;
    }

    if (line.startsWith("- ") && current) {
      current.items.push(line.slice(2).trim());
    }
  }

  return sections;
}

type RecentUpload = {
  createdBy: string;
  kind: "Trainingsplan" | "Trainingsübung";
  title: string;
  uploadedAt: string;
};

function formatShortDate(value: Date): string {
  return value.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function formatWeekday(value: Date): string {
  return value.toLocaleDateString("de-DE", { weekday: "short" });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    const featureMarkdown = await readFile(featuresFilePath, "utf8");
    const featureSections = parseFeatureSections(featureMarkdown);

    return (
      <>
        <AppHeader />
        <main className="stack">
          <section className="card public-dashboard-hero">
            <div>
              <ClubBrand className="hero-brand" size="large" />
              <p className="eyebrow">CourtControl Dashboard</p>
              <h1>Alles für dein Basketballteam an einem Ort.</h1>
              <p className="muted">
                Plane Trainings, verwalte Übungen, organisiere Termine und halte Teams mit Tabellen und Dokumenten auf dem aktuellen Stand.
              </p>
              <div className="hero-actions">
                <Link href="/register" className="secondary-button">
                  Konto erstellen
                </Link>
                <Link href="/login">Anmelden</Link>
              </div>
            </div>
          </section>

          <section className="card stack">
            <div className="section-heading">
              <div>
                <p className="eyebrow">FEATURES.md</p>
                <h2>Funktionsübersicht</h2>
                <p className="muted">Die wichtigsten Inhalte der Feature-Datei in lesbarer Form.</p>
              </div>
            </div>
            <div className="public-feature-sections">
              {featureSections.map((section) => (
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
          </section>
        </main>
      </>
    );
  }

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setDate(now.getDate() + 30);
  const nextSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index);
    return date;
  });

  const [user, users, trainingPlans, trainingExercises, calendarEvents, standingsConfigs] = await Promise.all([
    findUserById(session.userId),
    listUsers(),
    listTrainingPlans(),
    listTrainingExercises(),
    listCalendarEvents({ from: now.toISOString(), to: nextMonth.toISOString() }),
    listTeamStandingConfigs(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const publicUser = toPublicUser(user);
  const configuredTeams = standingsConfigs.filter((config) => config.leagueId.trim().length > 0).map((config) => config.team);
  const standingsList = configuredTeams.length > 0 ? await Promise.all(configuredTeams.map((team) => getTeamStandings(team))) : [await getTeamStandings(null)];
  const usersById = new Map(users.map((item) => [item.id, item]));
  const trainingPlansById = new Map(trainingPlans.map((plan) => [plan.id, plan]));
  const upcomingEvents = calendarEvents.slice(0, 4);
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
                  <details className="dashboard-recent-row data-details" key={`${upload.kind}-${upload.title}-${upload.uploadedAt}`}>
                    <summary className="data-row-summary">
                      <div>
                        <p className="upload-kind">{upload.kind}</p>
                        <h3>{upload.title}</h3>
                      </div>
                    </summary>
                    <div className="data-row-body">
                      <p className="upload-kind">{upload.kind}</p>
                      <p className="muted">
                        Erstellt von {upload.createdBy} · {new Date(upload.uploadedAt).toLocaleString("de-DE")}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <p className="muted">Noch keine Trainingspläne oder Übungen hochgeladen.</p>
            )}
          </article>

        </section>

        <TeamStandingsWidget standingsList={standingsList} />

        <section className="card stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Kalender</p>
              <h2>Nächste Termine</h2>
            </div>
            <a href="/calendar" className="secondary-button">
              Kalender öffnen
            </a>
          </div>

          <div className="calendar-widget-days" aria-label="Nächste sieben Tage">
            {nextSevenDays.map((date) => {
              const eventCount = calendarEvents.filter((event) => {
                const eventDate = new Date(event.startsAt);
                return eventDate.toDateString() === date.toDateString();
              }).length;

              return (
                <div className={eventCount > 0 ? "calendar-widget-day calendar-widget-day-active" : "calendar-widget-day"} key={date.toISOString()}>
                  <span>{formatWeekday(date)}</span>
                  <strong>{formatShortDate(date)}</strong>
                  <small>{eventCount > 0 ? `${eventCount} Termin${eventCount === 1 ? "" : "e"}` : "frei"}</small>
                </div>
              );
            })}
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="calendar-widget-events">
              {upcomingEvents.map((event) => {
                const creator = usersById.get(event.createdBy);
                const trainingPlan = event.trainingPlanId ? trainingPlansById.get(event.trainingPlanId) : null;

                return (
                  <details className="calendar-widget-event data-details" key={event.id}>
                    <summary className="data-row-summary">
                      <div>
                        <p className="upload-kind">{getTeamGroupLabel(event.team)}</p>
                        <h3>{event.title}</h3>
                        <p className="muted">
                          {new Date(event.startsAt).toLocaleDateString("de-DE")} - {formatTime(event.startsAt)}
                        </p>
                      </div>
                    </summary>
                    <div className="data-row-body">
                      <p className="upload-kind">{getTeamGroupLabel(event.team)}</p>
                      <p className="muted">
                        {new Date(event.startsAt).toLocaleDateString("de-DE")} · {formatTime(event.startsAt)} ·{" "}
                        {creator?.name || creator?.email || "Unbekannt"}
                      </p>
                      {trainingPlan ? (
                        <a href={`/training-plans/files/${trainingPlan.id}`} target="_blank">
                          {trainingPlan.title}
                        </a>
                      ) : null}
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <p className="muted">In den nächsten 30 Tagen sind keine Termine geplant.</p>
          )}
        </section>

        <section className="grid">
          <article className="card">
            <h2>Kalender</h2>
            <p className="muted">Trainingstermine planen und mit Trainingsplänen verknüpfen.</p>
            <a href="/calendar" className="secondary-button">
              Kalender öffnen
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
