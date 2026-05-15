import Link from "next/link";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { requireUserSession } from "@/lib/auth/session";
import { createCalendarEventAction, deleteCalendarEventAction } from "@/lib/calendar-event-actions";
import { listCalendarEvents } from "@/lib/calendar-events";
import { findUserById, listUsers, toPublicUser } from "@/lib/db";
import { canAccessAdmin } from "@/lib/rbac/roles";
import { getTeamGroupLabel, isTeamGroup, teamGroups, type TeamGroup } from "@/lib/teams";
import { listTrainingPlans } from "@/lib/training-plans";

type CalendarPageProps = {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    error?: string;
    month?: string;
    team?: string;
  }>;
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getMonthRange(monthValue?: string): { from: Date; to: Date; label: string; value: string } {
  const now = new Date();
  const [yearPart, monthPart] = monthValue?.split("-") ?? [];
  const year = Number(yearPart) || now.getFullYear();
  const month = Number(monthPart) >= 1 && Number(monthPart) <= 12 ? Number(monthPart) - 1 : now.getMonth();
  const from = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

  return {
    from,
    to,
    label: from.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }),
    value: `${year}-${String(month + 1).padStart(2, "0")}`,
  };
}

function getMessage(params: Awaited<CalendarPageProps["searchParams"]>): string | null {
  if (params.created) {
    return "Termin wurde erstellt.";
  }

  if (params.deleted) {
    return "Termin wurde gelöscht.";
  }

  return null;
}

function getError(params: Awaited<CalendarPageProps["searchParams"]>): string | null {
  if (params.error === "invalid-event") {
    return "Der Termin konnte nicht erstellt werden. Bitte prüfe Titel, Datum und Trainingsplan.";
  }

  if (params.error === "invalid-delete") {
    return "Der Termin konnte nicht gefunden werden.";
  }

  if (params.error === "forbidden-delete") {
    return "Du kannst nur eigene Termine löschen.";
  }

  return null;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const session = await requireUserSession().catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedTeam = isTeamGroup(params.team ?? "") ? params.team as TeamGroup : undefined;
  const monthRange = getMonthRange(params.month);
  const [user, users, trainingPlans, events] = await Promise.all([
    findUserById(session.userId),
    listUsers(),
    listTrainingPlans(),
    listCalendarEvents({
      from: monthRange.from.toISOString(),
      to: monthRange.to.toISOString(),
      team: selectedTeam,
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  const publicUser = toPublicUser(user);
  const usersById = new Map(users.map((item) => [item.id, item]));
  const trainingPlansById = new Map(trainingPlans.map((plan) => [plan.id, plan]));
  const message = getMessage(params);
  const error = getError(params);

  return (
    <>
      <AppHeader displayName={publicUser.name} email={publicUser.email} role={publicUser.role} />
      <main className="stack">
        <section className="card">
          <p className="eyebrow">Kalender</p>
          <h1>Trainingstermine</h1>
          <p className="muted">Plane Termine und verknüpfe optional einen Trainingsplan.</p>
        </section>

        {message ? <p className="form-success">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        <section className="card stack">
          <h2>Termin erstellen</h2>
          <form action={createCalendarEventAction} className="calendar-event-form">
            <label>
              Titel
              <input name="title" minLength={3} required placeholder="z. B. U16 Wurftraining" />
            </label>
            <label>
              Start
              <input name="startsAt" type="datetime-local" required />
            </label>
            <label>
              Ende
              <input name="endsAt" type="datetime-local" />
            </label>
            <label>
              Ort
              <input name="location" placeholder="Halle 1" />
            </label>
            <label>
              Team
              <select name="team" defaultValue={publicUser.team ?? ""}>
                <option value="">Kein Team</option>
                {teamGroups.map((team) => (
                  <option key={team} value={team}>
                    {getTeamGroupLabel(team)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Trainingsplan
              <select name="trainingPlanId" defaultValue="">
                <option value="">Kein Trainingsplan</option>
                {trainingPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="calendar-notes-field">
              Notizen
              <textarea name="notes" rows={3} placeholder="Schwerpunkte, Material, Hinweise" />
            </label>
            <button type="submit">Termin speichern</button>
          </form>
        </section>

        <section className="card stack">
          <div className="section-heading">
            <div>
              <h2>{monthRange.label}</h2>
              <p className="muted">Alle passenden Termine im ausgewählten Zeitraum.</p>
            </div>
          </div>

          <form action="/calendar" className="filter-form">
            <label>
              Monat
              <input name="month" type="month" defaultValue={monthRange.value} />
            </label>
            <label>
              Team
              <select name="team" defaultValue={params.team ?? ""}>
                <option value="">Alle Teams</option>
                {teamGroups.map((team) => (
                  <option key={team} value={team}>
                    {getTeamGroupLabel(team)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="secondary-button">
              Kalender filtern
            </button>
          </form>

          {events.length > 0 ? (
            <div className="calendar-event-list">
              {events.map((event) => {
                const creator = usersById.get(event.createdBy);
                const trainingPlan = event.trainingPlanId ? trainingPlansById.get(event.trainingPlanId) : null;

                return (
                  <article className="calendar-event-row" key={event.id}>
                    <div>
                      <p className="upload-kind">{getTeamGroupLabel(event.team)}</p>
                      <h3>{event.title}</h3>
                      <p className="muted">
                        {formatDateTime(event.startsAt)}
                        {event.endsAt ? ` bis ${formatDateTime(event.endsAt)}` : ""} · Erstellt von{" "}
                        {creator?.name || creator?.email || "Unbekannt"}
                      </p>
                      {event.location ? <p>{event.location}</p> : null}
                      {event.notes ? <p className="muted">{event.notes}</p> : null}
                      {trainingPlan ? (
                        <Link href={`/training-plans/files/${trainingPlan.id}`} target="_blank">
                          Trainingsplan öffnen: {trainingPlan.title}
                        </Link>
                      ) : null}
                    </div>
                    {canAccessAdmin(publicUser.role) || event.createdBy === publicUser.id ? (
                      <form action={deleteCalendarEventAction}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button type="submit" className="danger-button">
                          Löschen
                        </button>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted">Für diesen Zeitraum sind keine Termine eingetragen.</p>
          )}
        </section>
      </main>
    </>
  );
}
