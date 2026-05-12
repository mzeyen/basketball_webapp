import Link from "next/link";

import { AuthForm } from "@/components/AuthForm";
import { registerAction } from "@/lib/auth/actions";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams;

  return (
    <main>
      <AuthForm
        action={registerAction}
        title="Konto erstellen"
        submitLabel="Registrieren"
        helperText="Erstelle ein Benutzerkonto mit sicher gehashtem Passwort."
        error={error}
      />
      <p className="muted" style={{ textAlign: "center" }}>
        Schon registriert? <Link href="/login">Zur Anmeldung</Link>
      </p>
    </main>
  );
}
