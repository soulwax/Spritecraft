import { cache } from "react";
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SPRITECRAFT_API_BASE: z
    .string()
    .url()
    .default("http://127.0.0.1:8080"),
});

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
  projectName: z.string().optional().nullable(),
  prompt: z.string().optional().nullable(),
  bodyType: z.string(),
  animation: z.string(),
  tags: z.array(z.string()).optional().default([]),
  enginePreset: z.string().optional().nullable(),
  selections: z.record(z.string()).default({}),
  promptHistory: z.array(z.string()).optional().default([]),
  exportHistory: z.array(z.record(z.any())).optional().default([]),
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

type HealthPayload = z.infer<typeof healthSchema>;
type BootstrapPayload = z.infer<typeof bootstrapSchema>;

function getApiBase() {
  return envSchema.parse({
    NEXT_PUBLIC_SPRITECRAFT_API_BASE:
      process.env.NEXT_PUBLIC_SPRITECRAFT_API_BASE,
  }).NEXT_PUBLIC_SPRITECRAFT_API_BASE.replace(/\/$/, "");
}

async function fetchJson<T>(
  input: string,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const response = await fetch(`${getApiBase()}${input}`, {
    next: { revalidate: 0 },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${input} failed with ${response.status}`);
  }

  return schema.parse(await response.json());
}

export const getStudioHealth = cache(
  async (): Promise<HealthPayload | null> => {
    try {
      return await fetchJson("/health", healthSchema);
    } catch {
      return null;
    }
  },
);

export const getStudioBootstrap = cache(
  async (): Promise<BootstrapPayload | null> => {
    try {
      return await fetchJson("/api/studio/bootstrap", bootstrapSchema);
    } catch {
      return null;
    }
  },
);
