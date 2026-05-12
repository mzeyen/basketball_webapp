import Link from "next/link";

import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/lib/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main>
      <AuthForm
        action={loginAction}
        title="Anmelden"
        submitLabel="Einloggen"
        helperText="Melde dich an, um geschützte Team-Bereiche zu öffnen."
        error={error}
      />
      <p className="muted" style={{ textAlign: "center" }}>
        Noch kein Konto? <Link href="/register">Jetzt registrieren</Link>
      </p>
    </main>
  );
}
