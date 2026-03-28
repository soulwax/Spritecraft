import { NextResponse } from "next/server";

import { renderSpriteCraftPreview } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as {
			bodyType?: string;
			animation?: string;
			prompt?: string;
			selections?: Record<string, string>;
		};
		const preview = await renderSpriteCraftPreview({
			bodyType: payload.bodyType ?? "male",
			animation: payload.animation ?? "idle",
			prompt: payload.prompt ?? "",
			selections: payload.selections ?? {},
		});
		return NextResponse.json(preview);
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to render the SpriteCraft preview.",
			},
			{ status: 502 },
		);
	}
}
