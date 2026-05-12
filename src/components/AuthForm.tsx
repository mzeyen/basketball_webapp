import type { ComponentProps } from "react";

type AuthFormProps = {
  action: ComponentProps<"form">["action"];
  title: string;
  submitLabel: string;
  helperText: string;
  error?: string;
};

const errorMessages: Record<string, string> = {
  "invalid-input": "Bitte gib eine gültige E-Mail und ein Passwort mit mindestens 8 Zeichen ein.",
  "email-taken": "Für diese E-Mail existiert bereits ein Konto.",
  "invalid-credentials": "E-Mail oder Passwort ist falsch.",
};

export function AuthForm({ action, title, submitLabel, helperText, error }: AuthFormProps) {
  return (
    <section className="card auth-card">
      <p className="eyebrow">Basketball Webapp</p>
      <h1>{title}</h1>
      <p className="muted">{helperText}</p>
      {error ? <p className="form-error">{errorMessages[error] ?? "Ein Fehler ist aufgetreten."}</p> : null}
      <form action={action} className="stack">
        <label>
          E-Mail
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Passwort
          <input name="password" type="password" autoComplete="current-password" minLength={8} required />
        </label>
        <button type="submit">{submitLabel}</button>
      </form>
    </section>
  );
}
