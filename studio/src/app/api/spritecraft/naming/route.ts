import { NextResponse } from "next/server";

import { suggestSpriteCraftNames } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as {
			prompt?: string;
			animation?: string;
			promptHistory?: string[];
			tags?: string[];
			notes?: string;
			selectionCount?: number;
		};
		const naming = await suggestSpriteCraftNames({
			prompt: payload.prompt ?? "",
			animation: payload.animation ?? "idle",
			promptHistory: payload.promptHistory ?? [],
			tags: payload.tags ?? [],
			notes: payload.notes ?? "",
			selectionCount: payload.selectionCount ?? 0,
		});
		return NextResponse.json(naming);
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to create naming suggestions for this workspace.",
			},
			{ status: 502 },
		);
	}
}
