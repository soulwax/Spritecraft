import { NextResponse } from "next/server";

import { createSpriteCraftSupportBundle } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as { note?: string };
		const bundle = await createSpriteCraftSupportBundle(payload.note ?? "");
		return NextResponse.json(bundle);
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to create a SpriteCraft support bundle.",
			},
			{ status: 502 },
		);
	}
}
