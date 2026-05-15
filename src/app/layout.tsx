import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentSession } from "@/lib/auth/session";
import { appBranding } from "@/lib/branding";
import { canAccessAdmin } from "@/lib/rbac/roles";
import "./globals.css";

export const metadata: Metadata = {
  title: appBranding.appName,
  description: appBranding.heroText,
};

const themeScript = `
(() => {
  try {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : prefersDark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
`;

const hideNextDevToolsStyle = `
nextjs-portal {
  display: none !important;
}
`;

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getCurrentSession();
  const shouldHideNextDevTools = process.env.NODE_ENV === "development" && (!session || !canAccessAdmin(session.role));

  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {shouldHideNextDevTools ? <style dangerouslySetInnerHTML={{ __html: hideNextDevToolsStyle }} /> : null}
        {children}
        <footer className="app-footer">
          <ThemeToggle />
        </footer>
      </body>
    </html>
  );
}
