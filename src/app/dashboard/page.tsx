import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { TeamStandingsWidget } from "@/components/TeamStandingsWidget";
import { requireUserSession } from "@/lib/auth/session";
import { listCalendarEvents } from "@/lib/calendar-events";
import { findUserById, listUsers, toPublicUser } from "@/lib/db";
import { getTeamStandings, listTeamStandingConfigs } from "@/lib/team-standings";
import { getTeamGroupLabel } from "@/lib/teams";
import { listTrainingExercises } from "@/lib/training-exercises";
import { listTrainingPlans } from "@/lib/training-plans";

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
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
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
                  <article className="calendar-widget-event" key={event.id}>
                    <div>
                      <p className="upload-kind">{getTeamGroupLabel(event.team)}</p>
                      <h3>{event.title}</h3>
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
                  </article>
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
