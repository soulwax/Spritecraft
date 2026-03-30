import { NextResponse } from "next/server";

import { suggestSpriteCraftStyle } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as {
			prompt?: string;
			animation?: string;
			promptHistory?: string[];
			tags?: string[];
			notes?: string;
			selections?: Record<string, string>;
		};
		const result = await suggestSpriteCraftStyle({
			prompt: payload.prompt ?? "",
			animation: payload.animation ?? "idle",
			promptHistory: payload.promptHistory ?? [],
			tags: payload.tags ?? [],
			notes: payload.notes ?? "",
			selections: payload.selections ?? {},
		});
		return NextResponse.json(result);
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to create style helper suggestions.",
			},
			{ status: 502 },
		);
	}
}
