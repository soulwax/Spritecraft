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

const consistencyIssueSchema = z.object({
	severity: z.enum(["warning", "error"]).default("warning"),
	code: z.string().default("consistency-issue"),
	message: z.string().default(""),
	itemId: z.string().nullable().optional(),
	itemName: z.string().nullable().optional(),
	suggestion: z.string().nullable().optional(),
});

const consistencyReportSchema = z.object({
	summary: z.string().default(""),
	hasBlockingIssues: z.boolean().default(false),
	issues: z.array(consistencyIssueSchema).default([]),
});

export type SpriteCraftConsistencyReport = z.infer<
	typeof consistencyReportSchema
>;

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

const briefPromptMemorySchema = z.object({
	summary: z.string().default(""),
	recentPrompts: z.array(z.string()).default([]),
	inferredTags: z.array(z.string()).default([]),
});

const namingOptionSchema = z.object({
	value: z.string().default(""),
	rationale: z.string().default(""),
});

const briefResponseSchema = z.object({
	plan: briefPlanSchema.nullable().optional(),
	promptMemory: briefPromptMemorySchema.nullable().optional(),
	buildPath: z.array(briefGuideStepSchema).default([]),
	categorySuggestions: z.array(briefCategorySuggestionSchema).default([]),
	candidateBuild: briefCandidateBuildSchema.nullable().optional(),
	recommendations: z.array(catalogItemSchema).default([]),
});

export type SpriteCraftBriefResponse = z.infer<typeof briefResponseSchema>;

const namingResponseSchema = z.object({
	summary: z.string().default(""),
	projectNames: z.array(namingOptionSchema).default([]),
	animationLabels: z.array(namingOptionSchema).default([]),
	exportStems: z.array(namingOptionSchema).default([]),
});

export type SpriteCraftNamingResponse = z.infer<typeof namingResponseSchema>;

const stylePaletteSchema = z.object({
	label: z.string().default(""),
	swatches: z.array(z.string()).default([]),
	rationale: z.string().default(""),
});

const styleHelperResponseSchema = z.object({
	summary: z.string().default(""),
	paletteDirections: z.array(stylePaletteSchema).default([]),
	styleTags: z.array(z.string()).default([]),
	guidance: z.array(z.string()).default([]),
	focusQueries: z.array(z.string()).default([]),
});

export type SpriteCraftStyleHelperResponse = z.infer<
	typeof styleHelperResponseSchema
>;

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

const exportJobSchema = z.object({
	jobId: z.string(),
	status: z.enum(["queued", "running", "completed", "failed"]),
	createdAt: z.string(),
	updatedAt: z.string(),
	pollPath: z.string(),
	result: exportResponseSchema.nullable().optional(),
	error: z.string().nullable().optional(),
});

export type SpriteCraftExportJob = z.infer<typeof exportJobSchema>;

const nonLpcImportSummarySchema = z.object({
	imagePath: z.string(),
	metadataPath: z.string().nullable().optional(),
	source: z.enum(["image-only", "image+metadata"]).default("image-only"),
	metadataFormat: z.string().default("none"),
	inferred: z
		.object({
			frameCount: z.boolean().default(false),
			columns: z.boolean().default(false),
			rows: z.boolean().default(false),
			tileWidth: z.boolean().default(false),
			tileHeight: z.boolean().default(false),
		})
		.default({
			frameCount: false,
			columns: false,
			rows: false,
			tileWidth: false,
			tileHeight: false,
		}),
	frameCount: z.number().default(1),
	columns: z.number().default(1),
	rows: z.number().default(1),
	tileWidth: z.number().default(0),
	tileHeight: z.number().default(0),
	frameNames: z.array(z.string()).default([]),
});

const nonLpcImportResponseSchema = z.object({
	imageBase64: z.string(),
	width: z.number(),
	height: z.number(),
	metadata: z.record(z.any()).default({}),
	summary: nonLpcImportSummarySchema,
});

export type SpriteCraftNonLpcImportResponse = z.infer<
	typeof nonLpcImportResponseSchema
>;

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
		hasStartupErrors: z.boolean().optional(),
	}),
	catalog: z.object({
		itemCount: z.number(),
		bodyTypes: z.array(z.string()),
		animations: z.array(z.string()),
		categories: z.array(z.string()).default([]),
		typeNames: z.array(z.string()).default([]),
		tags: z.array(z.string()).default([]),
		variants: z.array(z.string()).default([]),
		loadWarningCount: z.number().default(0),
	}),
	exportPresets: z
		.array(
			z.object({
				id: z.string(),
				label: z.string(),
				description: z.string().default(""),
			}),
		)
		.default([]),
	recent: z.array(historyEntrySchema).default([]),
});

export type SpriteCraftBootstrap = z.infer<typeof bootstrapSchema>;
export type SpriteCraftExportPresetOption = SpriteCraftBootstrap["exportPresets"][number];

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

export function getSpriteCraftBaseUrl() {
	return getBaseUrl();
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
	recolorGroups?: Record<string, string>;
	externalLayers?: Array<{ path: string; name: string; zPos: number }>;
}) {
	return fetchJson("/api/lpc/render", renderPreviewSchema, {
		method: "POST",
		body: JSON.stringify({
			bodyType: input.bodyType,
			animation: input.animation,
			prompt: input.prompt ?? "",
			selections: input.selections,
			recolorGroups: input.recolorGroups ?? {},
			externalLayers: input.externalLayers ?? [],
		}),
	});
}

export async function checkSpriteCraftConsistency(input: {
	bodyType: string;
	animation: string;
	prompt?: string;
	selections: Record<string, string>;
}) {
	return fetchJson("/api/lpc/consistency", consistencyReportSchema, {
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
	promptHistory?: string[];
	tags?: string[];
	notes?: string;
}) {
	return fetchJson("/api/ai/brief", briefResponseSchema, {
		method: "POST",
		body: JSON.stringify({
			prompt: input.prompt,
			bodyType: input.bodyType,
			animation: input.animation ?? "idle",
			promptHistory: input.promptHistory ?? [],
			tags: input.tags ?? [],
			notes: input.notes ?? "",
		}),
	});
}

export async function suggestSpriteCraftNames(input: {
	prompt: string;
	animation?: string;
	promptHistory?: string[];
	tags?: string[];
	notes?: string;
	selectionCount?: number;
}) {
	return fetchJson("/api/ai/naming", namingResponseSchema, {
		method: "POST",
		body: JSON.stringify({
			prompt: input.prompt,
			animation: input.animation ?? "idle",
			promptHistory: input.promptHistory ?? [],
			tags: input.tags ?? [],
			notes: input.notes ?? "",
			selectionCount: input.selectionCount ?? 0,
		}),
	});
}

export async function suggestSpriteCraftStyle(input: {
	prompt: string;
	animation?: string;
	promptHistory?: string[];
	tags?: string[];
	notes?: string;
	selections?: Record<string, string>;
}) {
	return fetchJson("/api/ai/style-helper", styleHelperResponseSchema, {
		method: "POST",
		body: JSON.stringify({
			prompt: input.prompt,
			animation: input.animation ?? "idle",
			promptHistory: input.promptHistory ?? [],
			tags: input.tags ?? [],
			notes: input.notes ?? "",
			selections: input.selections ?? {},
		}),
	});
}

type SpriteCraftExportInput = {
	projectName?: string;
	enginePreset?: string;
	exportSettings?: Record<string, unknown>;
	batchAnimations?: string[];
	variants?: Array<{
		name: string;
		bodyType?: string;
		prompt?: string;
		selections: Record<string, string>;
		externalLayers?: Array<{ path: string; name: string; zPos: number }>;
	}>;
	bodyType: string;
	animation: string;
	prompt?: string;
	selections: Record<string, string>;
	externalLayers?: Array<{ path: string; name: string; zPos: number }>;
};

export async function startSpriteCraftExportJob(input: SpriteCraftExportInput) {
	return fetchJson("/api/lpc/export", exportJobSchema, {
		method: "POST",
		body: JSON.stringify({
			async: true,
			projectName: input.projectName ?? "",
			enginePreset: input.enginePreset ?? "none",
			exportSettings: input.exportSettings ?? {},
			batchAnimations: input.batchAnimations ?? [],
			variants: input.variants ?? [],
			bodyType: input.bodyType,
			animation: input.animation,
			prompt: input.prompt ?? "",
			selections: input.selections,
			externalLayers: input.externalLayers ?? [],
		}),
	});
}

export async function getSpriteCraftExportJob(jobId: string) {
	return fetchJson(`/api/lpc/export/jobs/${jobId}`, exportJobSchema);
}

export async function importNonLpcSpritesheet(input: {
	imagePath: string;
	metadataPath?: string;
	tileWidth?: number;
	tileHeight?: number;
	frameCount?: number;
	columns?: number;
	rows?: number;
}) {
	return fetchJson("/api/non-lpc/import", nonLpcImportResponseSchema, {
		method: "POST",
		body: JSON.stringify({
			imagePath: input.imagePath,
			metadataPath: input.metadataPath ?? "",
			tileWidth: input.tileWidth,
			tileHeight: input.tileHeight,
			frameCount: input.frameCount,
			columns: input.columns,
			rows: input.rows,
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

