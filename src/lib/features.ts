import { readFile } from "fs/promises";
import path from "path";

export type FeatureSection = {
  items: string[];
  title: string;
};

export type FeatureContent = {
  intro: string[];
  sections: FeatureSection[];
};

const featuresFilePath = path.join(process.cwd(), "FEATURES.md");

export async function getFeatureContent(): Promise<FeatureContent> {
  const markdown = await readFile(featuresFilePath, "utf8");
  const intro: string[] = [];
  const sections: FeatureSection[] = [];
  let current: FeatureSection | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("# ")) {
      continue;
    }

    if (line.startsWith("## ")) {
      current = { title: line.slice(3).trim(), items: [] };
      sections.push(current);
      continue;
    }

    if (line.startsWith("- ") && current) {
      current.items.push(line.slice(2).trim());
      continue;
    }

    if (!current) {
      intro.push(line);
    }
  }

  return { intro, sections };
}
