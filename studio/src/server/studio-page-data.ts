import type { SpriteCraftProjectSummary } from "~/server/spritecraft-backend";
import {
  getSpriteCraftBaseUrl,
  getSpriteCraftBootstrap,
  getSpriteCraftHealth,
} from "~/server/spritecraft-backend";

export async function getStudioPageData() {
  const [bootstrap, health] = await Promise.all([
    getSpriteCraftBootstrap(),
    getSpriteCraftHealth(),
  ]);

  return {
    bootstrap,
    health,
    backendBaseUrl: getSpriteCraftBaseUrl(),
    recentProjects: (bootstrap?.recent ?? []).map((project) =>
      normalizeProjectSummary(project),
    ),
    bodyTypes: bootstrap?.catalog.bodyTypes ?? [],
    animations: bootstrap?.catalog.animations ?? [],
    categories: bootstrap?.catalog.categories ?? [],
    typeNames: bootstrap?.catalog.typeNames ?? [],
    tags: bootstrap?.catalog.tags ?? [],
    variants: bootstrap?.catalog.variants ?? [],
    exportPresets: (bootstrap?.exportPresets ?? []).map((option) => ({
      id: option.id,
      label: option.label,
      description: option.description ?? "",
    })),
    checks: health?.checks ?? [],
  };
}

function normalizeProjectSummary(
  project: {
    id: string;
    createdAt: string;
    bodyType: string;
    animation: string;
    [key: string]: unknown;
  },
): SpriteCraftProjectSummary {
  return {
    ...project,
    tags: Array.isArray(project.tags) ? (project.tags as string[]) : [],
    selections:
      project.selections && typeof project.selections === "object"
        ? (project.selections as Record<string, string>)
        : {},
    renderSettings:
      project.renderSettings && typeof project.renderSettings === "object"
        ? (project.renderSettings as Record<string, unknown>)
        : {},
    exportSettings:
      project.exportSettings && typeof project.exportSettings === "object"
        ? (project.exportSettings as Record<string, unknown>)
        : {},
    promptHistory: Array.isArray(project.promptHistory)
      ? (project.promptHistory as string[])
      : [],
    exportHistory: Array.isArray(project.exportHistory)
      ? (project.exportHistory as Record<string, unknown>[])
      : [],
  };
}
