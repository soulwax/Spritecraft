"use client";

import type { SpriteCraftProjectSummary } from "~/server/spritecraft-backend";

export type CatalogWorkspaceDraft = {
	name: string;
	query: string;
	notes: string;
	tags: string[];
	promptHistory: string[];
	sourceProjectId: string | null;
	sourceProjectLabel: string | null;
	bodyType: string;
	animation: string;
	category: string;
	tag: string;
	stagedSelections: Record<string, string>;
	variantChoices: Record<string, string>;
	savedAt: string;
};

export const workspaceStorageKey = "spritecraft-web.catalog-workspace";
export const workspacePresetsStorageKey =
	"spritecraft-web.catalog-workspace-presets";
export const workspaceLoadEventName = "spritecraft:load-web-workspace";

export function normalizeWorkspaceDraft(
	input: unknown,
): CatalogWorkspaceDraft | null {
	if (!input || typeof input !== "object") {
		return null;
	}

	const draft = input as Partial<CatalogWorkspaceDraft>;
	return {
		name:
			typeof draft.name === "string" && draft.name.trim()
				? draft.name
				: "Web Builder Workspace",
		query: typeof draft.query === "string" ? draft.query : "",
		notes: typeof draft.notes === "string" ? draft.notes : "",
		tags: Array.isArray(draft.tags)
			? draft.tags.filter((entry): entry is string => typeof entry === "string")
			: [],
		promptHistory: Array.isArray(draft.promptHistory)
			? draft.promptHistory.filter(
					(entry): entry is string => typeof entry === "string",
				)
			: [],
		sourceProjectId:
			typeof draft.sourceProjectId === "string" ? draft.sourceProjectId : null,
		sourceProjectLabel:
			typeof draft.sourceProjectLabel === "string"
				? draft.sourceProjectLabel
				: null,
		bodyType: typeof draft.bodyType === "string" ? draft.bodyType : "male",
		animation: typeof draft.animation === "string" ? draft.animation : "idle",
		category: typeof draft.category === "string" ? draft.category : "all",
		tag: typeof draft.tag === "string" ? draft.tag : "all",
		stagedSelections:
			draft.stagedSelections && typeof draft.stagedSelections === "object"
				? Object.fromEntries(
						Object.entries(draft.stagedSelections).filter(
							([key, value]) =>
								typeof key === "string" &&
								key &&
								typeof value === "string" &&
								value,
						),
					)
				: {},
		variantChoices:
			draft.variantChoices && typeof draft.variantChoices === "object"
				? Object.fromEntries(
						Object.entries(draft.variantChoices).filter(
							([key, value]) =>
								typeof key === "string" &&
								key &&
								typeof value === "string" &&
								value,
						),
					)
				: {},
		savedAt:
			typeof draft.savedAt === "string"
				? draft.savedAt
				: new Date().toISOString(),
	};
}

export function projectToWorkspaceDraft(
	project: SpriteCraftProjectSummary,
): CatalogWorkspaceDraft {
	const renderSettings = project.renderSettings ?? {};
	const category =
		typeof renderSettings.category === "string"
			? renderSettings.category
			: "all";
	const tag =
		typeof renderSettings.tagFilter === "string"
			? renderSettings.tagFilter
			: "all";
	const query = project.promptHistory[0] ?? project.prompt ?? "";

	return {
		name: project.projectName?.trim() || "Web Builder Workspace",
		query,
		notes: project.notes ?? "",
		tags: [...project.tags],
		promptHistory: [...project.promptHistory],
		sourceProjectId: project.id,
		sourceProjectLabel: project.projectName ?? project.prompt ?? "Saved project",
		bodyType: project.bodyType,
		animation: project.animation,
		category,
		tag,
		stagedSelections: { ...project.selections },
		variantChoices: { ...project.selections },
		savedAt: new Date().toISOString(),
	};
}
