// File: studio/src/app/api/spritecraft/history/[id]/duplicate/route.ts

import { NextResponse } from "next/server";

import { duplicateSpriteCraftHistoryEntry } from "~/server/spritecraft-backend";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
	try {
		const { id } = await context.params;
		const duplicated = await duplicateSpriteCraftHistoryEntry(id);
		return NextResponse.json(duplicated);
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unable to duplicate SpriteCraft project." },
			{ status: 502 },
		);
	}
}

