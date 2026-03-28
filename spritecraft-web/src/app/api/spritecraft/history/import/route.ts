import { NextResponse } from "next/server";

import { importSpriteCraftHistoryPackage } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as { packagePath?: string };
		const imported = await importSpriteCraftHistoryPackage(payload.packagePath ?? "");
		return NextResponse.json(imported);
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unable to import project package." },
			{ status: 502 },
		);
	}
}
