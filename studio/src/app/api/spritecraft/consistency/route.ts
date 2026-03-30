import { NextResponse } from "next/server";

import { checkSpriteCraftConsistency } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as {
			bodyType?: string;
			animation?: string;
			prompt?: string;
			selections?: Record<string, string>;
		};
		const report = await checkSpriteCraftConsistency({
			bodyType: payload.bodyType ?? "male",
			animation: payload.animation ?? "idle",
			prompt: payload.prompt ?? "",
			selections: payload.selections ?? {},
		});
		return NextResponse.json(report);
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to evaluate SpriteCraft consistency.",
			},
			{ status: 502 },
		);
	}
}
