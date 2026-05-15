import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import {
  blockUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  unblockUserAction,
  updateClubLogoAction,
  updateUserEmailAction,
  updateUserRoleAction,
  updateUserTeamAction,
} from "@/lib/admin/user-actions";
import { updateTeamStandingConfigsAction } from "@/lib/admin/standings-actions";
import { getRoleLabel, listAuditLogEntries } from "@/lib/audit-log";
import { requireAdminSession } from "@/lib/auth/session";
import { findUserById, listUsers, toPublicUser } from "@/lib/db";
import { canAccessSuperAdmin } from "@/lib/rbac/roles";
import { getBrandingState } from "@/lib/branding-store";
import { listTeamStandingConfigs } from "@/lib/team-standings";
import { getTeamGroupLabel, getTeamGroupLabels, teamGroups } from "@/lib/teams";

type AdminPageProps = {
  searchParams: Promise<{
    error?: string;
    updated?: string;
  }>;
};

function getMessage(params: Awaited<AdminPageProps["searchParams"]>): string | null {
  if (params.updated === "blocked") {
    return "Nutzer wurde gesperrt.";
  }

  if (params.updated === "unblocked") {
    return "Nutzer wurde entsperrt.";
  }

  if (params.updated === "password-reset") {
    return "Passwort wurde zurückgesetzt.";
  }

  if (params.updated === "role") {
    return "Rolle wurde geändert.";
  }

  if (params.updated === "email") {
    return "E-Mail-Adresse wurde geändert.";
  }

  if (params.updated === "deleted") {
    return "Nutzer wurde gelöscht.";
  }

  if (params.updated === "team") {
    return "Team wurde geändert.";
  }

  if (params.updated === "standings-config") {
    return "Tabellen-Liga-IDs wurden gespeichert.";
  }

  if (params.updated === "standings-config-partial") {
    return "Liga-IDs wurden gespeichert. Einige Tabellen konnten nicht aktualisiert werden; vorhandene gecachte Daten bleiben erhalten.";
  }

  if (params.updated === "logo") {
    return "Vereinslogo wurde aktualisiert.";
  }

  return null;
}

function getError(params: Awaited<AdminPageProps["searchParams"]>): string | null {
  if (params.error === "invalid-password-reset") {
    return "Das neue Passwort muss mindestens 8 Zeichen lang sein.";
  }

  if (params.error === "invalid-user-action") {
    return "Die Nutzeraktion konnte nicht ausgeführt werden.";
  }

  if (params.error === "invalid-email-update") {
    return "Die E-Mail-Adresse ist ungültig.";
  }

  if (params.error === "email-taken") {
    return "Diese E-Mail-Adresse wird bereits verwendet.";
  }

  if (params.error === "invalid-delete") {
    return "Zum Löschen muss die Bestätigung exakt „löschen“ lauten.";
  }

  if (params.error === "invalid-standings-config") {
    return "Liga-IDs duerfen nur aus Zahlen bestehen.";
  }

  if (params.error === "invalid-logo-upload") {
    return "Bitte lade ein gueltiges Bild hoch.";
  }

  return null;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/dashboard");
  }

  const [user, users, standingsConfigs, brandingState, params] = await Promise.all([
    findUserById(session.userId),
    listUsers(),
    listTeamStandingConfigs(),
    getBrandingState(),
    searchParams,
  ]);

  if (!user) {
    redirect("/login");
  }

  const publicUser = toPublicUser(user);
  const canViewAuditLog = canAccessSuperAdmin(publicUser.role);
  const auditLogEntries = canViewAuditLog ? await listAuditLogEntries() : [];
  const message = getMessage(params);
  const error = getError(params);

  return (
    <>
      <AppHeader displayName={publicUser.name} email={publicUser.email} role={publicUser.role} />
      <main className="stack">
        <section className="card">
          <p className="eyebrow">Admin</p>
          <h1>Nutzerverwaltung</h1>
          <p className="muted">
            Admins können existierende Nutzer prüfen, Konten sperren oder Passwörter zurücksetzen.
          </p>
        </section>

        {message ? <p className="form-success">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        {canViewAuditLog ? (
          <section className="card stack">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Branding</p>
                <h2>Vereinslogo</h2>
                <p className="muted">Superuser kÃ¶nnen hier ein neues Logo hochladen. Die Datei ersetzt das aktuelle Vereinslogo.</p>
              </div>
              <div className="admin-logo-preview">
                <img src={brandingState.logoSrc} alt={brandingState.logoAlt} />
              </div>
            </div>
            <form action={updateClubLogoAction} className="logo-upload-form" encType="multipart/form-data">
              <label>
                Logo-Datei
                <input name="logo" type="file" accept="image/*,.svg" required />
              </label>
              <label>
                Alt-Text
                <input name="logoAlt" type="text" defaultValue={brandingState.logoAlt} />
              </label>
              <button type="submit" className="secondary-button">Logo speichern</button>
            </form>
          </section>
        ) : null}

        <section className="card stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Thueringen</p>
              <h2>Tabellen-Liga-IDs</h2>
              <p className="muted">
                Speichere pro Team die Liga-ID aus basketball-bund.net. Die App ruft Tabellen ueber{" "}
                <code>https://www.basketball-bund.net/rest/competition/table/id/&lt;ID&gt;</code> ab und cached sie 48 Stunden.
              </p>
            </div>
          </div>
          <form action={updateTeamStandingConfigsAction} className="standings-config-form">
            {standingsConfigs.map((config) => (
              <label key={config.team}>
                {getTeamGroupLabel(config.team)}
                <input
                  name={`leagueId-${config.team}`}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Liga-ID"
                  defaultValue={config.leagueId}
                />
              </label>
            ))}
            <div className="standings-config-actions">
              <button type="submit" className="secondary-button">
                Liga-IDs speichern
              </button>
            </div>
          </form>
        </section>

        <section className="card stack">
          <h2>Existierende Nutzer</h2>
          <div className="user-list">
            {users.map((item) => {
              const isCurrentUser = item.id === session.userId;
              const isBlocked = Boolean(item.blockedAt);
              const assignedTeams = item.teams ?? (item.team ? [item.team] : []);

              return (
                <article className="user-row" key={item.id}>
                  <div className="user-row-main">
                    <div>
                      <h3>{item.email}</h3>
                      <p className="muted">
                        {getRoleLabel(item.role)} · {getTeamGroupLabels(assignedTeams)} · Erstellt{" "}
                        {new Date(item.createdAt).toLocaleString("de-DE")}
                      </p>
                      <p className={isBlocked ? "status-danger" : "status-ok"}>
                        {isBlocked
                          ? `Gesperrt seit ${new Date(item.blockedAt ?? "").toLocaleString("de-DE")}`
                          : "Aktiv"}
                      </p>
                      {item.passwordResetAt ? (
                        <p className="muted">
                          Passwort zuletzt zurückgesetzt: {new Date(item.passwordResetAt).toLocaleString("de-DE")}
                        </p>
                      ) : null}
                    </div>

                    <div className="user-actions">
                      {item.role !== "superadmin" ? (
                        <form action={updateUserEmailAction} className="email-update-form">
                          <input type="hidden" name="userId" value={item.id} />
                          <label>
                            E-Mail ändern
                            <input name="email" type="email" defaultValue={item.email} required />
                          </label>
                          <button type="submit" className="secondary-button">
                            E-Mail speichern
                          </button>
                        </form>
                      ) : null}

                      {item.role !== "superadmin" ? (
                        <form action={updateUserTeamAction} className="team-update-form">
                          <input type="hidden" name="userId" value={item.id} />
                          <label>
                            Teams
                            <select name="teams" multiple size={teamGroups.length} defaultValue={assignedTeams}>
                              {teamGroups.map((team) => (
                                <option key={team} value={team}>
                                  {getTeamGroupLabel(team)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <p className="muted team-multi-help">Mit Strg mehrere Teams markieren.</p>
                          <button type="submit" className="secondary-button">
                            Teams speichern
                          </button>
                        </form>
                      ) : null}

                      {item.role !== "superadmin" && !isCurrentUser ? (
                        <form action={updateUserRoleAction} className="role-update-form">
                          <input type="hidden" name="userId" value={item.id} />
                          <label>
                            Rolle
                            <select name="role" defaultValue={item.role}>
                              <option value="user">Nutzer</option>
                              <option value="admin">Admin</option>
                            </select>
                          </label>
                          <button type="submit" className="secondary-button">
                            Rolle speichern
                          </button>
                        </form>
                      ) : null}

                      {isBlocked ? (
                        <form action={unblockUserAction}>
                          <input type="hidden" name="userId" value={item.id} />
                          <button type="submit" className="secondary-button">
                            Entsperren
                          </button>
                        </form>
                      ) : (
                        <form action={blockUserAction}>
                          <input type="hidden" name="userId" value={item.id} />
                          <button type="submit" className="secondary-button" disabled={isCurrentUser}>
                            Sperren
                          </button>
                        </form>
                      )}

                      <form action={resetUserPasswordAction} className="password-reset-form">
                        <input type="hidden" name="userId" value={item.id} />
                        <label>
                          Neues Passwort
                          <input name="password" type="password" minLength={8} required placeholder="Mind. 8 Zeichen" />
                        </label>
                        <button type="submit">Passwort setzen</button>
                      </form>

                      {item.role !== "superadmin" && !isCurrentUser ? (
                        <form action={deleteUserAction} className="delete-user-form">
                          <input type="hidden" name="userId" value={item.id} />
                          <label>
                            Löschen bestätigen
                            <input name="confirmation" placeholder="löschen" />
                          </label>
                          <button type="submit" className="danger-button">
                            Nutzer löschen
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {canViewAuditLog ? (
          <section className="card stack">
            <h2>Änderungsprotokoll</h2>
            {auditLogEntries.length > 0 ? (
              <div className="audit-log-list">
                {auditLogEntries.map((entry) => (
                  <article className="audit-log-row" key={entry.id}>
                    <div>
                      <h3>{entry.details}</h3>
                      <p className="muted">
                        {entry.actorEmail} {"->"} {entry.targetEmail} · {new Date(entry.createdAt).toLocaleString("de-DE")}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Noch keine protokollierten Änderungen.</p>
            )}
          </section>
        ) : null}
      </main>
    </>
  );
}
