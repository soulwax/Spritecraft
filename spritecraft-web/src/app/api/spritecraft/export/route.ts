import { NextResponse } from "next/server";

import { exportSpriteCraftWorkspace } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as {
			projectName?: string;
			enginePreset?: string;
			bodyType?: string;
			animation?: string;
			prompt?: string;
			selections?: Record<string, string>;
		};
		const exported = await exportSpriteCraftWorkspace({
			projectName: payload.projectName ?? "",
			enginePreset: payload.enginePreset ?? "none",
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
