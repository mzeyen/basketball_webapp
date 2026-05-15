import Image from "next/image";

import { getBrandingState } from "@/lib/branding-store";
import { appBranding } from "@/lib/branding";

type ClubBrandProps = {
  className?: string;
  iconOnly?: boolean;
  size?: "small" | "large";
};

export async function ClubBrand({ className = "", iconOnly = false, size = "small" }: ClubBrandProps) {
  const brandingState = await getBrandingState();
  const classes = ["club-brand", `club-brand-${size}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      <Image className="club-brand-logo" src={brandingState.logoSrc} alt={iconOnly ? brandingState.logoAlt : ""} width={72} height={72} priority />
      {iconOnly ? null : <span className="club-brand-name">{appBranding.appName}</span>}
    </span>
  );
}
