// File: studio/src/env.js

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
	},
	client: {
		NEXT_PUBLIC_SPRITECRAFT_API_BASE: z.string().url().optional(),
	},
	runtimeEnv: {
		NEXT_PUBLIC_SPRITECRAFT_API_BASE:
			process.env.NEXT_PUBLIC_SPRITECRAFT_API_BASE,
		NODE_ENV: process.env.NODE_ENV,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});

