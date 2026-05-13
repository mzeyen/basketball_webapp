import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { blockUserAction, resetUserPasswordAction, unblockUserAction } from "@/lib/admin/user-actions";
import { requireAdminSession } from "@/lib/auth/session";
import { findUserById, listUsers, toPublicUser } from "@/lib/db";

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

  return null;
}

function getError(params: Awaited<AdminPageProps["searchParams"]>): string | null {
  if (params.error === "invalid-password-reset") {
    return "Das neue Passwort muss mindestens 8 Zeichen lang sein.";
  }

  if (params.error === "invalid-user-action") {
    return "Die Nutzeraktion konnte nicht ausgeführt werden.";
  }

  return null;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await requireAdminSession().catch(() => null);

  if (!session) {
    redirect("/dashboard");
  }

  const [user, users, params] = await Promise.all([findUserById(session.userId), listUsers(), searchParams]);

  if (!user) {
    redirect("/login");
  }

  const publicUser = toPublicUser(user);
  const message = getMessage(params);
  const error = getError(params);

  return (
    <>
      <AppHeader email={publicUser.email} role={publicUser.role} />
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

        <section className="card stack">
          <h2>Existierende Nutzer</h2>
          <div className="user-list">
            {users.map((item) => {
              const isCurrentUser = item.id === session.userId;
              const isBlocked = Boolean(item.blockedAt);

              return (
                <article className="user-row" key={item.id}>
                  <div className="user-row-main">
                    <div>
                      <h3>{item.email}</h3>
                      <p className="muted">
                        {item.role} · Erstellt {new Date(item.createdAt).toLocaleString("de-DE")}
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
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
