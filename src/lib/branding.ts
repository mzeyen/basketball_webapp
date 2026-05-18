export const appBranding = {
  appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "CourtControl",
  productLabel: process.env.NEXT_PUBLIC_PRODUCT_LABEL?.trim() || "Vereinsplattform",
  logoAlt: process.env.NEXT_PUBLIC_CLUB_LOGO_ALT?.trim() || "Vereinslogo",
  logoSrc: process.env.NEXT_PUBLIC_CLUB_LOGO_SRC?.trim() || "/branding/club-logo.svg",
  heroTitle: process.env.NEXT_PUBLIC_HERO_TITLE?.trim() || "Organisiere Training, Termine und Unterlagen an einem Ort.",
  heroText:
    process.env.NEXT_PUBLIC_HERO_TEXT?.trim() ||
    "CourtControl bündelt Trainingspläne, Übungsbibliothek, Kalender, Tabellen, frei angelegte Teams und geschützte Dokumente für den Vereinsalltag.",
};
