import { NextResponse } from "next/server";

import { exportSpriteCraftWorkspace } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as {
			projectName?: string;
			enginePreset?: string;
			exportSettings?: Record<string, unknown>;
			batchAnimations?: string[];
			variants?: Array<{
				name: string;
				bodyType?: string;
				prompt?: string;
				selections?: Record<string, string>;
			}>;
			bodyType?: string;
			animation?: string;
			prompt?: string;
			selections?: Record<string, string>;
		};
		const exported = await exportSpriteCraftWorkspace({
			projectName: payload.projectName ?? "",
			enginePreset: payload.enginePreset ?? "none",
			exportSettings: payload.exportSettings ?? {},
			batchAnimations: payload.batchAnimations ?? [],
			variants: (payload.variants ?? []).map((variant) => ({
				name: variant.name,
				bodyType: variant.bodyType,
				prompt: variant.prompt,
				selections: variant.selections ?? {},
			})),
			bodyType: payload.bodyType ?? "male",
			animation: payload.animation ?? "idle",
			prompt: payload.prompt ?? "",
			selections: payload.selections ?? {},
		});
		return NextResponse.json(exported);
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to export the SpriteCraft workspace.",
			},
			{ status: 502 },
		);
	}
}
