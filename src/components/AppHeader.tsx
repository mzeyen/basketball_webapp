import Link from "next/link";

import { logoutAction } from "@/lib/auth/actions";
import type { Role } from "@/lib/rbac/roles";

type AppHeaderProps = {
  email?: string;
  role?: Role;
};

export function AppHeader({ email, role }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Link href="/" className="brand">
        🏀 CourtControl
      </Link>
      {email ? (
        <nav>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/training-plans">Trainingspläne</Link>
          {role === "admin" ? <Link href="/admin">Admin</Link> : null}
        </nav>
      ) : null}
      {email ? (
        <form action={logoutAction}>
          <span>{email}</span>
          <button type="submit" className="secondary-button">
            Abmelden
          </button>
        </form>
      ) : (
        <Link href="/login" className="secondary-button">
          Anmelden
        </Link>
      )}
    </header>
  );
}
