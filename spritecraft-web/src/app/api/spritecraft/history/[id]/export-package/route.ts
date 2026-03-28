// File: spritecraft-web/src/app/api/spritecraft/history/[id]/export-package/route.ts

import { NextResponse } from "next/server";

import { exportSpriteCraftHistoryPackage } from "~/server/spritecraft-backend";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
	try {
		const { id } = await context.params;
		const payload = await exportSpriteCraftHistoryPackage(id);
		return NextResponse.json(payload);
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unable to export SpriteCraft project package." },
			{ status: 502 },
		);
	}
}
