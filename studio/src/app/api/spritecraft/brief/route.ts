import { NextResponse } from "next/server";

import { briefSpriteCraftWorkspace } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as {
			prompt?: string;
			bodyType?: string;
			animation?: string;
			promptHistory?: string[];
			tags?: string[];
			notes?: string;
		};
		const brief = await briefSpriteCraftWorkspace({
			prompt: payload.prompt ?? "",
			bodyType: payload.bodyType ?? "male",
			animation: payload.animation ?? "idle",
			promptHistory: payload.promptHistory ?? [],
			tags: payload.tags ?? [],
			notes: payload.notes ?? "",
		});
		return NextResponse.json(brief);
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to create the SpriteCraft brief.",
			},
			{ status: 502 },
		);
	}
}
