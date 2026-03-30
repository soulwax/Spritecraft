"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import type { SpriteCraftRenderPreview } from "~/server/spritecraft-backend";

type SpriteFrameDiffPreviewProps = {
	currentPreview: SpriteCraftRenderPreview | null;
	comparedPreview: SpriteCraftRenderPreview | null;
};

type FrameLayout = {
	frameCount: number;
	columns: number;
	rows: number;
	tileWidth: number;
	tileHeight: number;
};

type DiffMode = "difference" | "blend";

type DiffStats = {
	changedPixels: number;
	totalPixels: number;
	changePercent: number;
};

const fpsOptions = [4, 6, 8, 12, 16, 24] as const;
const zoomOptions = [2, 4, 6] as const;

export function SpriteFrameDiffPreview({
	currentPreview,
	comparedPreview,
}: SpriteFrameDiffPreviewProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [frameIndex, setFrameIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [fps, setFps] = useState<(typeof fpsOptions)[number]>(8);
	const [zoom, setZoom] = useState<(typeof zoomOptions)[number]>(4);
	const [mode, setMode] = useState<DiffMode>("difference");
	const [diffStats, setDiffStats] = useState<DiffStats | null>(null);

	const currentLayout = useMemo(
		() => inferLayout(currentPreview),
		[currentPreview],
	);
	const comparedLayout = useMemo(
		() => inferLayout(comparedPreview),
		[comparedPreview],
	);

	const sharedLayout = useMemo(() => {
		return {
			frameCount: Math.min(currentLayout.frameCount, comparedLayout.frameCount),
			tileWidth: Math.min(currentLayout.tileWidth, comparedLayout.tileWidth),
			tileHeight: Math.min(currentLayout.tileHeight, comparedLayout.tileHeight),
		};
	}, [comparedLayout, currentLayout]);

	useEffect(() => {
		setFrameIndex((current) =>
			Math.min(current, Math.max(sharedLayout.frameCount - 1, 0)),
		);
	}, [sharedLayout.frameCount]);

	useEffect(() => {
		if (
			!currentPreview ||
			!comparedPreview ||
			sharedLayout.frameCount <= 1 ||
			!isPlaying
		) {
			return;
		}

		const interval = window.setInterval(() => {
			setFrameIndex((current) => (current + 1) % sharedLayout.frameCount);
		}, Math.max(1000 / fps, 40));

		return () => {
			window.clearInterval(interval);
		};
	}, [comparedPreview, currentPreview, fps, isPlaying, sharedLayout.frameCount]);

	useEffect(() => {
		if (!currentPreview || !comparedPreview) {
			setDiffStats(null);
			return;
		}

		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		let cancelled = false;

		async function renderDiff() {
			const [currentImage, comparedImage] = await Promise.all([
				loadImage(currentPreview.imageBase64),
				loadImage(comparedPreview.imageBase64),
			]);
			if (cancelled) {
				return;
			}

			const width = Math.max(sharedLayout.tileWidth, 1);
			const height = Math.max(sharedLayout.tileHeight, 1);
			canvas.width = width * zoom;
			canvas.height = height * zoom;

			const context = canvas.getContext("2d");
			if (!context) {
				return;
			}
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.imageSmoothingEnabled = false;

			const currentFrame = extractFrameImageData({
				image: currentImage,
				layout: currentLayout,
				frameIndex,
				width,
				height,
			});
			const comparedFrame = extractFrameImageData({
				image: comparedImage,
				layout: comparedLayout,
				frameIndex,
				width,
				height,
			});

			const scratch = document.createElement("canvas");
			scratch.width = width;
			scratch.height = height;
			const scratchContext = scratch.getContext("2d");
			if (!scratchContext) {
				return;
			}

			let changedPixels = 0;
			const totalPixels = width * height;

			if (mode === "blend") {
				scratchContext.putImageData(currentFrame, 0, 0);
				context.save();
				context.scale(zoom, zoom);
				context.globalAlpha = 0.5;
				context.drawImage(scratch, 0, 0);
				scratchContext.putImageData(comparedFrame, 0, 0);
				context.globalAlpha = 0.5;
				context.drawImage(scratch, 0, 0);
				context.restore();

				const currentData = currentFrame.data;
				const comparedData = comparedFrame.data;
				for (let index = 0; index < currentData.length; index += 4) {
					if (pixelDelta(currentData, comparedData, index) > 24) {
						changedPixels += 1;
					}
				}
			} else {
				const output = scratchContext.createImageData(width, height);
				const currentData = currentFrame.data;
				const comparedData = comparedFrame.data;

				for (let index = 0; index < currentData.length; index += 4) {
					const delta = pixelDelta(currentData, comparedData, index);
					if (delta > 24) {
						changedPixels += 1;
					}

					const normalized = Math.min(delta / 255, 1);
					output.data[index] = Math.round(255 * normalized);
					output.data[index + 1] = Math.round(160 * normalized);
					output.data[index + 2] = Math.round(84 * (1 - normalized));
					output.data[index + 3] = delta > 24 ? 255 : 36;
				}

				scratchContext.putImageData(output, 0, 0);
				context.save();
				context.scale(zoom, zoom);
				context.drawImage(scratch, 0, 0);
				context.restore();
			}

			setDiffStats({
				changedPixels,
				totalPixels,
				changePercent:
					totalPixels === 0 ? 0 : (changedPixels / totalPixels) * 100,
			});
		}

		void renderDiff();

		return () => {
			cancelled = true;
		};
	}, [
		comparedLayout,
		comparedPreview,
		currentLayout,
		currentPreview,
		frameIndex,
		mode,
		sharedLayout.tileHeight,
		sharedLayout.tileWidth,
		zoom,
	]);

	return (
		<div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
			<div className="mb-3 flex items-center justify-between gap-3">
				<div>
					<p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
						Sheet Diff
					</p>
					<h3 className="mt-2 text-lg font-semibold">
						Snapshot difference
					</h3>
				</div>
				<div className="flex flex-wrap gap-2">
					<Select
						onChange={(event) =>
							setMode(event.target.value as DiffMode)
						}
						value={mode}
					>
						<option value="difference">Difference</option>
						<option value="blend">Blend</option>
					</Select>
					<Select
						onChange={(event) =>
							setFps(
								Number.parseInt(event.target.value, 10) as (typeof fpsOptions)[number],
							)
						}
						value={String(fps)}
					>
						{fpsOptions.map((entry) => (
							<option key={`diff-fps-${entry}`} value={String(entry)}>
								{entry} fps
							</option>
						))}
					</Select>
					<Select
						onChange={(event) =>
							setZoom(
								Number.parseInt(event.target.value, 10) as (typeof zoomOptions)[number],
							)
						}
						value={String(zoom)}
					>
						{zoomOptions.map((entry) => (
							<option key={`diff-zoom-${entry}`} value={String(entry)}>
								{entry}x
							</option>
						))}
					</Select>
				</div>
			</div>
			{currentPreview && comparedPreview ? (
				<>
					<div className="mb-3 grid gap-3 md:grid-cols-[auto_auto_minmax(0,1fr)_auto]">
						<Button
							disabled={sharedLayout.frameCount <= 1}
							onClick={() => setIsPlaying((current) => !current)}
							type="button"
							variant="secondary"
						>
							{isPlaying ? "Pause" : "Play"}
						</Button>
						<Button
							disabled={frameIndex <= 0}
							onClick={() =>
								setFrameIndex((current) => Math.max(current - 1, 0))
							}
							type="button"
							variant="secondary"
						>
							Prev
						</Button>
						<input
							className="w-full accent-[color:var(--accent)]"
							disabled={sharedLayout.frameCount <= 1}
							max={Math.max(sharedLayout.frameCount - 1, 0)}
							min={0}
							onChange={(event) =>
								setFrameIndex(Number.parseInt(event.target.value, 10) || 0)
							}
							type="range"
							value={frameIndex}
						/>
						<Button
							disabled={frameIndex >= sharedLayout.frameCount - 1}
							onClick={() =>
								setFrameIndex((current) =>
									Math.min(current + 1, sharedLayout.frameCount - 1),
								)
							}
							type="button"
							variant="secondary"
						>
							Next
						</Button>
					</div>
					<div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--muted-foreground)]">
						<p>
							Frame {frameIndex + 1} / {sharedLayout.frameCount}
						</p>
						<p>
							{sharedLayout.tileWidth} x {sharedLayout.tileHeight}
						</p>
					</div>
					<div
						className="grid min-h-72 place-items-center rounded-2xl border border-[color:var(--border)] p-4"
						style={diffBackgroundStyle}
					>
						<canvas
							className="max-w-full [image-rendering:pixelated]"
							ref={canvasRef}
						/>
					</div>
					<div className="mt-3 grid gap-3 sm:grid-cols-3">
						<div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-3">
							<p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
								Diff mode
							</p>
							<p className="mt-2 text-sm font-medium">
								{mode === "difference"
									? "Hot pixels show changed regions."
									: "Current and compared frames are blended."}
							</p>
						</div>
						<div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-3">
							<p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
								Changed pixels
							</p>
							<p className="mt-2 text-xl font-semibold">
								{diffStats?.changedPixels ?? 0}
							</p>
						</div>
						<div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-3">
							<p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
								Change ratio
							</p>
							<p className="mt-2 text-xl font-semibold">
								{diffStats ? `${diffStats.changePercent.toFixed(1)}%` : "0.0%"}
							</p>
						</div>
					</div>
				</>
			) : (
				<p className="text-sm text-[color:var(--muted-foreground)]">
					Render both snapshots before using the sheet diff view.
				</p>
			)}
		</div>
	);
}

function inferLayout(preview: SpriteCraftRenderPreview | null): FrameLayout {
	const metadata = preview?.metadata ?? {};
	const rawLayout = (metadata.layout as Record<string, unknown> | undefined) ?? {};

	return {
		frameCount:
			typeof rawLayout.frameCount === "number" && rawLayout.frameCount > 0
				? rawLayout.frameCount
				: 1,
		columns:
			typeof rawLayout.columns === "number" && rawLayout.columns > 0
				? rawLayout.columns
				: 1,
		rows:
			typeof rawLayout.rows === "number" && rawLayout.rows > 0
				? rawLayout.rows
				: 1,
		tileWidth:
			typeof rawLayout.tileWidth === "number" && rawLayout.tileWidth > 0
				? rawLayout.tileWidth
				: preview?.width ?? 64,
		tileHeight:
			typeof rawLayout.tileHeight === "number" && rawLayout.tileHeight > 0
				? rawLayout.tileHeight
				: preview?.height ?? 64,
	};
}

async function loadImage(imageBase64: string) {
	return await new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Could not decode diff image."));
		image.src = `data:image/png;base64,${imageBase64}`;
	});
}

function extractFrameImageData(input: {
	image: HTMLImageElement;
	layout: FrameLayout;
	frameIndex: number;
	width: number;
	height: number;
}): ImageData {
	const scratch = document.createElement("canvas");
	scratch.width = input.width;
	scratch.height = input.height;
	const context = scratch.getContext("2d", { willReadFrequently: true });
	if (!context) {
		throw new Error("Could not create scratch canvas for diffing.");
	}

	const sx = (input.frameIndex % input.layout.columns) * input.layout.tileWidth;
	const sy =
		Math.floor(input.frameIndex / input.layout.columns) * input.layout.tileHeight;
	context.clearRect(0, 0, input.width, input.height);
	context.imageSmoothingEnabled = false;
	context.drawImage(
		input.image,
		sx,
		sy,
		input.layout.tileWidth,
		input.layout.tileHeight,
		0,
		0,
		input.width,
		input.height,
	);
	return context.getImageData(0, 0, input.width, input.height);
}

function pixelDelta(
	left: Uint8ClampedArray,
	right: Uint8ClampedArray,
	index: number,
) {
	const dr = Math.abs(left[index] - right[index]);
	const dg = Math.abs(left[index + 1] - right[index + 1]);
	const db = Math.abs(left[index + 2] - right[index + 2]);
	const da = Math.abs(left[index + 3] - right[index + 3]);
	return Math.max(dr, dg, db, da);
}

const diffBackgroundStyle: CSSProperties = {
	backgroundColor: "rgba(31, 35, 53, 0.45)",
	backgroundImage:
		"linear-gradient(rgba(223,215,197,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(223,215,197,0.08) 1px, transparent 1px)",
	backgroundSize: "16px 16px",
};
