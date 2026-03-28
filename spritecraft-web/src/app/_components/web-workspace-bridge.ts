"use client";

import type { SpriteCraftProjectSummary } from "~/server/spritecraft-backend";

export type WorkspaceLinkedProject = {
	id: string;
	label: string;
	createdAt: string;
	updatedAt: string | null;
	tags: string[];
	animation: string;
	layerCount: number;
};

export type WorkspaceLoadPayload = {
	project: SpriteCraftProjectSummary;
	relatedProjects: WorkspaceLinkedProject[];
};

export type CatalogWorkspaceDraft = {
	name: string;
	query: string;
	notes: string;
	tags: string[];
	promptHistory: string[];
	sourceProjectId: string | null;
	sourceProjectLabel: string | null;
	relatedProjects: WorkspaceLinkedProject[];
	replaceByType: boolean;
	activeTypeFocus: string | null;
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
		relatedProjects: Array.isArray(draft.relatedProjects)
			? draft.relatedProjects.flatMap((entry) => {
					if (!entry || typeof entry !== "object") {
						return [];
					}

					const project = entry as Partial<WorkspaceLinkedProject>;
					if (typeof project.id !== "string" || !project.id) {
						return [];
					}

					return [
						{
							id: project.id,
							label:
								typeof project.label === "string" && project.label
									? project.label
									: "Saved project",
							createdAt:
								typeof project.createdAt === "string"
									? project.createdAt
									: new Date().toISOString(),
							updatedAt:
								typeof project.updatedAt === "string"
									? project.updatedAt
									: null,
							tags: Array.isArray(project.tags)
								? project.tags.filter(
										(value): value is string => typeof value === "string",
									)
								: [],
							animation:
								typeof project.animation === "string"
									? project.animation
									: "idle",
							layerCount:
								typeof project.layerCount === "number" ? project.layerCount : 0,
						},
					];
				})
			: [],
		replaceByType:
			typeof draft.replaceByType === "boolean" ? draft.replaceByType : true,
		activeTypeFocus:
			typeof draft.activeTypeFocus === "string" ? draft.activeTypeFocus : null,
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
		relatedProjects: [],
		replaceByType: true,
		activeTypeFocus: null,
		bodyType: project.bodyType,
		animation: project.animation,
		category,
		tag,
		stagedSelections: { ...project.selections },
		variantChoices: { ...project.selections },
		savedAt: new Date().toISOString(),
	};
}

export function summarizeLinkedProject(
	project: SpriteCraftProjectSummary,
): WorkspaceLinkedProject {
	return {
		id: project.id,
		label: project.projectName ?? project.prompt ?? "Saved project",
		createdAt: project.createdAt,
		updatedAt: project.updatedAt ?? null,
		tags: [...project.tags],
		animation: project.animation,
		layerCount: Object.keys(project.selections).length,
	};
}

export function getRelatedWorkspaceProjects(
	project: SpriteCraftProjectSummary,
	projects: SpriteCraftProjectSummary[],
): WorkspaceLinkedProject[] {
	const lineageIds = new Set(
		[
			project.id,
			typeof project.renderSettings?.sourceProjectId === "string"
				? project.renderSettings.sourceProjectId
				: null,
		].filter((value): value is string => Boolean(value)),
	);
	const projectLabel = project.projectName?.trim() ?? "";
	const projectPrompt = project.prompt?.trim() ?? "";

	return projects
		.filter((entry) => {
			const entryLineageId =
				typeof entry.renderSettings?.sourceProjectId === "string"
					? entry.renderSettings.sourceProjectId
					: null;
			if (
				lineageIds.has(entry.id) ||
				(entryLineageId ? lineageIds.has(entryLineageId) : false)
			) {
				return true;
			}

			if (projectLabel && entry.projectName?.trim() === projectLabel) {
				return true;
			}

			return Boolean(projectPrompt && entry.prompt?.trim() === projectPrompt);
		})
		.sort(
			(left, right) =>
				new Date(right.updatedAt ?? right.createdAt).getTime() -
				new Date(left.updatedAt ?? left.createdAt).getTime(),
		)
		.slice(0, 6)
		.map((entry) => summarizeLinkedProject(entry));
}
