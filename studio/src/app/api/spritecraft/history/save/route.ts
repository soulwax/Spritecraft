// File: studio/src/app/api/spritecraft/history/save/route.ts

import { NextResponse } from "next/server";

import { saveSpriteCraftHistoryEntry } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as Record<string, unknown>;
		const saved = await saveSpriteCraftHistoryEntry(payload as never);
		return NextResponse.json(saved);
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unable to save SpriteCraft project." },
			{ status: 502 },
		);
	}
}

