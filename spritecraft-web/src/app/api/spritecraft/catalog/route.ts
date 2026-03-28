import { NextRequest, NextResponse } from "next/server";

import { getSpriteCraftCatalog } from "~/server/spritecraft-backend";

export async function GET(request: NextRequest) {
	try {
		const payload = await getSpriteCraftCatalog({
			q: request.nextUrl.searchParams.get("q") ?? "",
			bodyType: request.nextUrl.searchParams.get("bodyType") ?? undefined,
			animation: request.nextUrl.searchParams.get("animation") ?? undefined,
		});
		return NextResponse.json(payload);
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to load the SpriteCraft catalog.",
			},
			{ status: 502 },
		);
	}
}
