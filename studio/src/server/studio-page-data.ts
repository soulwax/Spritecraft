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
    recentProjects: (bootstrap?.recent ?? []).map(normalizeProjectSummary),
    bodyTypes: bootstrap?.catalog.bodyTypes ?? [],
    animations: bootstrap?.catalog.animations ?? [],
    checks: health?.checks ?? [],
  };
}

function normalizeProjectSummary(
  project: SpriteCraftProjectSummary,
): SpriteCraftProjectSummary {
  return {
    ...project,
    tags: project.tags ?? [],
    selections: project.selections ?? {},
    renderSettings: project.renderSettings ?? {},
    exportSettings: project.exportSettings ?? {},
    promptHistory: project.promptHistory ?? [],
    exportHistory: project.exportHistory ?? [],
  };
}
