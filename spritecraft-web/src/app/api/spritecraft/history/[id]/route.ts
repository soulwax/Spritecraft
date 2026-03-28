import { NextResponse } from "next/server";

import { deleteSpriteCraftHistoryEntry, getSpriteCraftProject } from "~/server/spritecraft-backend";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
	try {
		const { id } = await context.params;
		const project = await getSpriteCraftProject(id);
		return NextResponse.json(project);
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unable to load SpriteCraft project." },
			{ status: 502 },
		);
	}
}

export async function DELETE(_request: Request, context: RouteContext) {
	try {
		const { id } = await context.params;
		const payload = await deleteSpriteCraftHistoryEntry(id);
		return NextResponse.json(payload);
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unable to delete SpriteCraft project." },
			{ status: 502 },
		);
	}
}
