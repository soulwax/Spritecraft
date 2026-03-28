import "server-only";

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
	bodyType: z.string(),
	animation: z.string(),
	tags: z.array(z.string()).default([]),
	enginePreset: z.string().nullable().optional(),
	selections: z.record(z.string()).default({}),
	promptHistory: z.array(z.string()).default([]),
	exportHistory: z.array(z.record(z.any())).default([]),
});

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

function getBaseUrl() {
	return (
		process.env.NEXT_PUBLIC_SPRITECRAFT_API_BASE?.replace(/\/$/, "") ??
		"http://127.0.0.1:8080"
	);
}

async function fetchJson<T>(path: string, schema: z.ZodSchema<T>) {
	const response = await fetch(`${getBaseUrl()}${path}`, {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`${path} failed with ${response.status}`);
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
		return await fetchJson("/api/studio/bootstrap", bootstrapSchema);
	} catch {
		return null;
	}
}
