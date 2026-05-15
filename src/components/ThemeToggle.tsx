"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const themeChangeEventName = "courtcontrol-theme-change";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function getInitialTheme(): Theme {
  if (typeof document !== "undefined" && document.documentElement.dataset.theme === "dark") {
    return "dark";
  }

  return "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
    window.dispatchEvent(new CustomEvent(themeChangeEventName, { detail: theme }));
  }, [theme]);

  useEffect(() => {
    function handleThemeChange(event: Event) {
      const nextTheme = event instanceof CustomEvent ? event.detail : null;

      if (isTheme(nextTheme)) {
        setTheme(nextTheme);
      }
    }

    function handleStorageChange(event: StorageEvent) {
      if (event.key === "theme" && isTheme(event.newValue)) {
        setTheme(event.newValue);
      }
    }

    window.addEventListener(themeChangeEventName, handleThemeChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(themeChangeEventName, handleThemeChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? "Light Mode" : "Dark Mode";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(nextTheme)}
      aria-label={`${label} aktivieren`}
      title={`${label} aktivieren`}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {theme === "dark" ? "L" : "D"}
      </span>
      <span>{label}</span>
    </button>
  );
}
