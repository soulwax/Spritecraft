import { NextResponse } from "next/server";

import { briefSpriteCraftWorkspace } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as {
			prompt?: string;
			bodyType?: string;
		};
		const brief = await briefSpriteCraftWorkspace({
			prompt: payload.prompt ?? "",
			bodyType: payload.bodyType ?? "male",
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
