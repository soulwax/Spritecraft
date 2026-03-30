import { NextResponse } from "next/server";

import { importNonLpcSpritesheet } from "~/server/spritecraft-backend";

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as {
			imagePath?: string;
			metadataPath?: string;
			tileWidth?: number;
			tileHeight?: number;
			frameCount?: number;
			columns?: number;
			rows?: number;
		};

		const imported = await importNonLpcSpritesheet({
			imagePath: payload.imagePath ?? "",
			metadataPath: payload.metadataPath ?? "",
			tileWidth: payload.tileWidth,
			tileHeight: payload.tileHeight,
			frameCount: payload.frameCount,
			columns: payload.columns,
			rows: payload.rows,
		});
		return NextResponse.json(imported);
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to import the non-LPC spritesheet.",
			},
			{ status: 502 },
		);
	}
}
