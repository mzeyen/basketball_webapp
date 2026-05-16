import type { ComponentProps } from "react";

import { ClubBrand } from "@/components/ClubBrand";
import { appBranding } from "@/lib/branding";

type AuthFormProps = {
  action: ComponentProps<"form">["action"];
  title: string;
  submitLabel: string;
  helperText: string;
  error?: string;
  mode?: "login" | "register";
};

const errorMessages: Record<string, string> = {
  "invalid-input": "Bitte prüfe Name, E-Mail und Passwort. Das Passwort muss mindestens 8 Zeichen haben und übereinstimmen.",
  "email-taken": "Für diese E-Mail existiert bereits ein Konto.",
  "invalid-credentials": "E-Mail oder Passwort ist falsch.",
  "invalid-token": "Der Verifizierungslink ist ungültig oder abgelaufen.",
};

export function AuthForm({ action, title, submitLabel, helperText, error, mode = "login" }: AuthFormProps) {
  const isRegister = mode === "register";

  return (
    <section className="card auth-card">
      <div className="auth-brand">
        <ClubBrand size="large" />
        <p className="eyebrow">{appBranding.productLabel}</p>
      </div>
      <h1>{title}</h1>
      <p className="muted">{helperText}</p>
      {error ? <p className="form-error">{errorMessages[error] ?? "Ein Fehler ist aufgetreten."}</p> : null}
      <form action={action} className="stack">
        {isRegister ? (
          <label>
            Name
            <input name="name" autoComplete="name" maxLength={80} required />
          </label>
        ) : null}
        <label>
          E-Mail
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Passwort
          <input name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} required />
        </label>
        {isRegister ? (
          <label>
            Passwort bestätigen
            <input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} required />
          </label>
        ) : null}
        <button type="submit">{submitLabel}</button>
      </form>
    </section>
  );
}
