import { NextResponse } from "next/server";

import { getSpriteCraftHistory } from "~/server/spritecraft-backend";

export async function GET() {
	try {
		const payload = await getSpriteCraftHistory();
		return NextResponse.json(payload);
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unable to load SpriteCraft history." },
			{ status: 502 },
		);
	}
}
