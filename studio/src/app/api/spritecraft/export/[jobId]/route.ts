import { NextResponse } from "next/server";

import { getSpriteCraftExportJob } from "~/server/spritecraft-backend";

export async function GET(
	_request: Request,
	context: { params: Promise<{ jobId: string }> },
) {
	try {
		const { jobId } = await context.params;
		const job = await getSpriteCraftExportJob(jobId);
		return NextResponse.json(job);
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to read the SpriteCraft export job.",
			},
			{ status: 502 },
		);
	}
}
