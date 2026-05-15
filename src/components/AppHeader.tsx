import Link from "next/link";

import { logoutAction } from "@/lib/auth/actions";
import type { Role } from "@/lib/rbac/roles";

type AppHeaderProps = {
  displayName?: string | null;
  email?: string;
  role?: Role;
};

export function AppHeader({ displayName, email, role }: AppHeaderProps) {
  const userLabel = displayName?.trim() || email;
  const roleInitial = role === "admin" || role === "superadmin" ? "A" : "U";

  return (
    <header className="app-header">
      <Link href="/" className="brand">
        🏀 CourtControl
      </Link>
      {email ? (
        <nav>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/training-plans">Trainingspläne</Link>
          <Link href="/training-exercises">Trainingsübungen</Link>
          {role === "admin" || role === "superadmin" ? <Link href="/admin">Admin</Link> : null}
        </nav>
      ) : null}
      <div className="app-header-actions">
        {email ? (
          <form action={logoutAction}>
            <Link href="/profile" className="user-badge" aria-label="Profil öffnen">
              <span className="user-badge-icon" aria-hidden="true">
                {roleInitial}
              </span>
              <span>{userLabel}</span>
            </Link>
            <button type="submit" className="secondary-button">
              Abmelden
            </button>
          </form>
        ) : (
          <Link href="/login" className="secondary-button">
            Anmelden
          </Link>
        )}
      </div>
    </header>
  );
}
