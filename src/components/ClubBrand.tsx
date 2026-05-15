import Image from "next/image";

import { appBranding } from "@/lib/branding";

type ClubBrandProps = {
  className?: string;
  iconOnly?: boolean;
  size?: "small" | "large";
};

export function ClubBrand({ className = "", iconOnly = false, size = "small" }: ClubBrandProps) {
  const classes = ["club-brand", `club-brand-${size}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      <Image className="club-brand-logo" src={appBranding.logoSrc} alt={iconOnly ? appBranding.logoAlt : ""} width={72} height={72} priority />
      {iconOnly ? null : <span className="club-brand-name">{appBranding.appName}</span>}
    </span>
  );
}
