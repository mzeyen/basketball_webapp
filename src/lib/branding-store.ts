import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type BrandingState = {
  logoAlt: string;
  logoSrc: string;
};

const dataDirectory = path.join(process.cwd(), ".data");
const brandingStateFile = path.join(dataDirectory, "branding.json");

const defaultBrandingState: BrandingState = {
  logoAlt: "Basketball-Logo",
  logoSrc: "/branding/club-logo.svg",
};

async function readBrandingState(): Promise<BrandingState> {
  try {
    const raw = await readFile(brandingStateFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<BrandingState>;

    return {
      logoAlt: typeof parsed.logoAlt === "string" && parsed.logoAlt.trim() ? parsed.logoAlt.trim() : defaultBrandingState.logoAlt,
      logoSrc: typeof parsed.logoSrc === "string" && parsed.logoSrc.trim() ? parsed.logoSrc.trim() : defaultBrandingState.logoSrc,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultBrandingState;
    }

    throw error;
  }
}

async function writeBrandingState(state: BrandingState): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(brandingStateFile, JSON.stringify(state, null, 2));
}

export async function getBrandingState(): Promise<BrandingState> {
  return readBrandingState();
}

export async function setBrandingLogo(logoSrc: string, logoAlt = defaultBrandingState.logoAlt): Promise<BrandingState> {
  const nextState: BrandingState = {
    logoAlt: logoAlt.trim() || defaultBrandingState.logoAlt,
    logoSrc,
  };

  await writeBrandingState(nextState);
  return nextState;
}

export function getDefaultBrandingState(): BrandingState {
  return defaultBrandingState;
}
