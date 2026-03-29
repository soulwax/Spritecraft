// File: studio/src/server/spritecraft-backend.ts

import "server-only";

import { env } from "~/env";
import { z } from "zod";

const healthSchema = z.object({
	status: z.enum(["ok", "warning", "error"]),
	timestamp: z.string(),
	checks: z.array(
		z.object({
			label: z.string(),
			status: z.string(),
			detail: z.string(),
		}),
	),
});

const historyEntrySchema = z.object({
	id: z.string(),
	createdAt: z.string(),
	updatedAt: z.string().optional(),
	projectName: z.string().nullable().optional(),
	prompt: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	bodyType: z.string(),
	animation: z.string(),
	tags: z.array(z.string()).default([]),
	enginePreset: z.string().nullable().optional(),
	selections: z.record(z.string()).default({}),
	renderSettings: z.record(z.any()).default({}),
	exportSettings: z.record(z.any()).default({}),
	promptHistory: z.array(z.string()).default([]),
	exportHistory: z.array(z.record(z.any())).default([]),
});

export type SpriteCraftProjectSummary = z.infer<typeof historyEntrySchema>;

const catalogItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	typeName: z.string(),
	category: z.string(),
	path: z.array(z.string()).default([]),
	priority: z.number().nullable().optional(),
	requiredBodyTypes: z.array(z.string()).default([]),
	animations: z.array(z.string()).default([]),
	tags: z.array(z.string()).default([]),
	variants: z.array(z.string()).default([]),
	matchBodyColor: z.boolean().default(false),
});

const catalogResponseSchema = z.object({
	items: z.array(catalogItemSchema).default([]),
});

export type SpriteCraftCatalogItem = z.infer<typeof catalogItemSchema>;

const renderLayerSchema = z.object({
	itemId: z.string(),
	itemName: z.string(),
	typeName: z.string(),
	variant: z.string(),
	layerId: z.string(),
	zPos: z.number(),
	assetPath: z.string(),
});

const renderPreviewSchema = z.object({
	width: z.number(),
	height: z.number(),
	imageBase64: z.string(),
	metadata: z.record(z.any()).default({}),
	usedLayers: z.array(renderLayerSchema).default([]),
	credits: z.array(z.record(z.any())).default([]),
});

export type SpriteCraftRenderPreview = z.infer<typeof renderPreviewSchema>;

const briefPlanSchema = z.object({
	concept: z.string().default(""),
	styleTags: z.array(z.string()).default([]),
	framePrompts: z.array(z.string()).default([]),
	buildPath: z
		.array(
			z.object({
				slot: z.string().default("build-step"),
				label: z.string().default("Build step"),
				query: z.string().default(""),
				rationale: z.string().default(""),
			}),
		)
		.default([]),
}).passthrough();

const briefGuideStepSchema = z.object({
	slot: z.string().default("build-step"),
	label: z.string().default("Build step"),
	query: z.string().default(""),
	rationale: z.string().default(""),
	recommendations: z.array(catalogItemSchema).default([]),
});

const briefCategorySuggestionSchema = z.object({
	category: z.string().default("misc"),
	label: z.string().default("Suggested category"),
	reason: z.string().default(""),
	recommendations: z.array(catalogItemSchema).default([]),
});

const briefCandidateBuildSchema = z.object({
	label: z.string().default("Candidate build"),
	summary: z.string().default(""),
	selections: z.record(z.string()).default({}),
	recommendations: z.array(catalogItemSchema).default([]),
});

const briefResponseSchema = z.object({
	plan: briefPlanSchema.nullable().optional(),
	buildPath: z.array(briefGuideStepSchema).default([]),
	categorySuggestions: z.array(briefCategorySuggestionSchema).default([]),
	candidateBuild: briefCandidateBuildSchema.nullable().optional(),
	recommendations: z.array(catalogItemSchema).default([]),
});

export type SpriteCraftBriefResponse = z.infer<typeof briefResponseSchema>;

const exportResponseSchema = z.object({
	imagePath: z.string(),
	metadataPath: z.string(),
	bundlePath: z.string(),
	enginePreset: z.string().default("none"),
	extraPaths: z.array(z.string()).default([]),
	baseName: z.string(),
	batch: z.boolean().default(false),
	jobs: z
		.array(
			z.object({
				variant: z.string(),
				animation: z.string(),
				baseName: z.string(),
				imagePath: z.string(),
				metadataPath: z.string(),
				extraPaths: z.array(z.string()).default([]),
			}),
		)
		.default([]),
});

export type SpriteCraftExportResponse = z.infer<typeof exportResponseSchema>;

const saveRequestSchema = z.object({
	projectName: z.string().optional(),
	notes: z.string().optional(),
	tags: z.array(z.string()).default([]),
	enginePreset: z.string().optional(),
	bodyType: z.string(),
	animation: z.string(),
	prompt: z.string().optional(),
	selections: z.record(z.string()).default({}),
	renderSettings: z.record(z.any()).default({}),
	exportSettings: z.record(z.any()).default({}),
	promptHistory: z.array(z.string()).default([]),
	exportHistory: z.array(z.record(z.any())).default([]),
});

export type SpriteCraftSaveRequest = z.infer<typeof saveRequestSchema>;

const bootstrapSchema = z.object({
	config: z.object({
		hasGemini: z.boolean(),
		hasDatabase: z.boolean(),
		hasLpcProject: z.boolean(),
	}),
	catalog: z.object({
		itemCount: z.number(),
		bodyTypes: z.array(z.string()),
		animations: z.array(z.string()),
	}),
	recent: z.array(historyEntrySchema).default([]),
});

const historyListSchema = z.object({
	items: z.array(historyEntrySchema).default([]),
});

const deleteResultSchema = z.object({
	deleted: z.string(),
});

const packageExportSchema = z.object({
	id: z.string(),
	packagePath: z.string(),
	baseName: z.string(),
});

function getBaseUrl() {
	return (
		env.NEXT_PUBLIC_SPRITECRAFT_API_BASE?.replace(/\/$/, "") ??
		"http://127.0.0.1:8080"
	);
}

async function fetchJson<T>(path: string, schema: z.ZodSchema<T>, init?: RequestInit) {
	const response = await fetch(`${getBaseUrl()}${path}`, {
		headers: {
			"content-type": "application/json",
			...(init?.headers ?? {}),
		},
		cache: "no-store",
		...init,
	});

	if (!response.ok) {
		let detail = `${path} failed with ${response.status}`;
		try {
			const payload = (await response.json()) as { error?: string };
			if (payload.error) {
				detail = payload.error;
			}
		} catch {}
		throw new Error(detail);
	}

	return schema.parse(await response.json());
}

export async function getSpriteCraftHealth() {
	try {
		return await fetchJson("/health", healthSchema);
	} catch {
		return null;
	}
}

export async function getSpriteCraftBootstrap() {
	try {
		return await fetchJson("/api/bootstrap", bootstrapSchema);
	} catch {
		return null;
	}
}

export async function getSpriteCraftCatalog(input: {
	q?: string;
	bodyType?: string;
	animation?: string;
}) {
	const params = new URLSearchParams();
	if (input.q) {
		params.set("q", input.q);
	}
	if (input.bodyType) {
		params.set("bodyType", input.bodyType);
	}
	if (input.animation) {
		params.set("animation", input.animation);
	}

	return fetchJson(`/api/lpc/catalog?${params.toString()}`, catalogResponseSchema);
}

export async function renderSpriteCraftPreview(input: {
	bodyType: string;
	animation: string;
	prompt?: string;
	selections: Record<string, string>;
}) {
	return fetchJson("/api/lpc/render", renderPreviewSchema, {
		method: "POST",
		body: JSON.stringify({
			bodyType: input.bodyType,
			animation: input.animation,
			prompt: input.prompt ?? "",
			selections: input.selections,
		}),
	});
}

export async function briefSpriteCraftWorkspace(input: {
	prompt: string;
	bodyType: string;
	animation?: string;
}) {
	return fetchJson("/api/ai/brief", briefResponseSchema, {
		method: "POST",
		body: JSON.stringify({
			prompt: input.prompt,
			bodyType: input.bodyType,
			animation: input.animation ?? "idle",
		}),
	});
}

export async function exportSpriteCraftWorkspace(input: {
	projectName?: string;
	enginePreset?: string;
	exportSettings?: Record<string, unknown>;
	batchAnimations?: string[];
	variants?: Array<{
		name: string;
		bodyType?: string;
		prompt?: string;
		selections: Record<string, string>;
	}>;
	bodyType: string;
	animation: string;
	prompt?: string;
	selections: Record<string, string>;
}) {
	return fetchJson("/api/lpc/export", exportResponseSchema, {
		method: "POST",
		body: JSON.stringify({
			projectName: input.projectName ?? "",
			enginePreset: input.enginePreset ?? "none",
			exportSettings: input.exportSettings ?? {},
			batchAnimations: input.batchAnimations ?? [],
			variants: input.variants ?? [],
			bodyType: input.bodyType,
			animation: input.animation,
			prompt: input.prompt ?? "",
			selections: input.selections,
		}),
	});
}

export async function getSpriteCraftHistory() {
	return fetchJson("/api/history", historyListSchema);
}

export async function getSpriteCraftProject(id: string) {
	return fetchJson(`/api/history/${id}`, historyEntrySchema);
}

export async function duplicateSpriteCraftHistoryEntry(id: string) {
	return fetchJson(`/api/history/${id}/duplicate`, historyEntrySchema, {
		method: "POST",
	});
}

export async function deleteSpriteCraftHistoryEntry(id: string) {
	return fetchJson(`/api/history/${id}`, deleteResultSchema, {
		method: "DELETE",
	});
}

export async function exportSpriteCraftHistoryPackage(id: string) {
	return fetchJson(`/api/history/${id}/export-package`, packageExportSchema, {
		method: "POST",
	});
}

export async function importSpriteCraftHistoryPackage(packagePath: string) {
	return fetchJson("/api/history/import", historyEntrySchema, {
		method: "POST",
		body: JSON.stringify({ packagePath }),
	});
}

export async function saveSpriteCraftHistoryEntry(payload: SpriteCraftSaveRequest) {
	return fetchJson("/api/history/save", historyEntrySchema, {
		method: "POST",
		body: JSON.stringify(saveRequestSchema.parse(payload)),
	});
}

