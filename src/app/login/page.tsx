import Link from "next/link";

import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/lib/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; registered?: string; verified?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, registered, verified } = await searchParams;

  return (
    <main>
      <AuthForm
        action={loginAction}
        title="Anmelden"
        submitLabel="Einloggen"
        helperText="Melde dich an, um geschützte Team-Bereiche zu öffnen."
        error={error}
      />
      {registered === "verify-email" ? (
        <p className="form-success auth-message">Konto erstellt. Bitte bestätige deine E-Mail-Adresse über den zugesendeten Link.</p>
      ) : null}
      {verified === "1" ? <p className="form-success auth-message">E-Mail-Adresse wurde bestätigt. Du kannst dich anmelden.</p> : null}
      <p className="muted" style={{ textAlign: "center" }}>
        Noch kein Konto? <Link href="/register">Jetzt registrieren</Link>
      </p>
    </main>
  );
}
