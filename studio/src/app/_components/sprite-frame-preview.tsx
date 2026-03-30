"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import type { SpriteCraftRenderPreview } from "~/server/spritecraft-backend";

type SpriteFramePreviewProps = {
	preview: SpriteCraftRenderPreview | null;
	title: string;
	emptyMessage: string;
	editable?: boolean;
	pivotX?: number | null;
	pivotY?: number | null;
	onPivotChange?: ((pivot: { x: number; y: number }) => void) | undefined;
};

type BackgroundMode = "transparent" | "grid" | "slate" | "parchment" | "forest";

type ContentBounds = {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
};

type AnchorPreset = "center" | "feet" | "head" | "left" | "right";

type FrameLayout = {
	frameCount: number;
	columns: number;
	rows: number;
	tileWidth: number;
	tileHeight: number;
};

const zoomOptions = [1, 2, 4, 6] as const;

const anchorLabels: Record<AnchorPreset, string> = {
	center: "Center",
	feet: "Feet",
	head: "Head",
	left: "Left",
	right: "Right",
};

export function SpriteFramePreview({
	preview,
	title,
	emptyMessage,
	editable = false,
	pivotX,
	pivotY,
	onPivotChange,
}: SpriteFramePreviewProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [zoom, setZoom] = useState<(typeof zoomOptions)[number]>(4);
	const [backgroundMode, setBackgroundMode] =
		useState<BackgroundMode>("grid");
	const [frameIndex, setFrameIndex] = useState(0);
	const [onionSkin, setOnionSkin] = useState(false);
	const [showGuides, setShowGuides] = useState(true);
	const [contentBounds, setContentBounds] = useState<ContentBounds | null>(null);

	const layout = useMemo<FrameLayout>(() => {
		const metadata = preview?.metadata ?? {};
		const rawLayout =
			(metadata.layout as Record<string, unknown> | undefined) ?? {};
		const frameCount =
			typeof rawLayout.frameCount === "number" && rawLayout.frameCount > 0
				? rawLayout.frameCount
				: 1;
		const columns =
			typeof rawLayout.columns === "number" && rawLayout.columns > 0
				? rawLayout.columns
				: 1;
		const rows =
			typeof rawLayout.rows === "number" && rawLayout.rows > 0
				? rawLayout.rows
				: 1;
		const tileWidth =
			typeof rawLayout.tileWidth === "number" && rawLayout.tileWidth > 0
				? rawLayout.tileWidth
				: preview?.width ?? 64;
		const tileHeight =
			typeof rawLayout.tileHeight === "number" && rawLayout.tileHeight > 0
				? rawLayout.tileHeight
				: preview?.height ?? 64;

		return {
			frameCount,
			columns,
			rows,
			tileWidth,
			tileHeight,
		};
	}, [preview]);

	const activePivot = useMemo(() => {
		const resolvedX =
			typeof pivotX === "number" ? pivotX : Math.floor(layout.tileWidth / 2);
		const resolvedY =
			typeof pivotY === "number" ? pivotY : Math.floor(layout.tileHeight / 2);

		return {
			x: clamp(resolvedX, 0, Math.max(layout.tileWidth - 1, 0)),
			y: clamp(resolvedY, 0, Math.max(layout.tileHeight - 1, 0)),
		};
	}, [layout.tileHeight, layout.tileWidth, pivotX, pivotY]);

	useEffect(() => {
		setFrameIndex((current) =>
			Math.min(current, Math.max(layout.frameCount - 1, 0)),
		);
	}, [layout.frameCount]);

	useEffect(() => {
		if (!preview) {
			setContentBounds(null);
			return;
		}

		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		const image = new Image();
		image.onload = () => {
			const context = canvas.getContext("2d");
			if (!context) {
				return;
			}

			const currentFrame = frameIndex;
			const previousFrame =
				layout.frameCount > 1
					? (currentFrame - 1 + layout.frameCount) % layout.frameCount
					: 0;

			canvas.width = layout.tileWidth * zoom;
			canvas.height = layout.tileHeight * zoom;
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.imageSmoothingEnabled = false;

			if (onionSkin && layout.frameCount > 1) {
				drawFrame(
					context,
					image,
					layout.columns,
					layout.tileWidth,
					layout.tileHeight,
					previousFrame,
					zoom,
					0.28,
				);
			}

			drawFrame(
				context,
				image,
				layout.columns,
				layout.tileWidth,
				layout.tileHeight,
				currentFrame,
				zoom,
				1,
			);
			setContentBounds(
				computeFrameContentBounds(
					image,
					layout.columns,
					layout.tileWidth,
					layout.tileHeight,
					currentFrame,
				),
			);
		};
		image.src = `data:image/png;base64,${preview.imageBase64}`;
	}, [frameIndex, layout, onionSkin, preview, zoom]);

	function handleCanvasClick(event: MouseEvent<HTMLDivElement>) {
		if (!editable || !preview || !onPivotChange) {
			return;
		}

		const rect = event.currentTarget.getBoundingClientRect();
		const nextX = clamp(
			Math.round((event.clientX - rect.left) / zoom),
			0,
			Math.max(layout.tileWidth - 1, 0),
		);
		const nextY = clamp(
			Math.round((event.clientY - rect.top) / zoom),
			0,
			Math.max(layout.tileHeight - 1, 0),
		);
		onPivotChange({ x: nextX, y: nextY });
	}

	function handleCanvasKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (!editable || !preview || !onPivotChange) {
			return;
		}

		const offset =
			event.key === "ArrowLeft"
				? { x: -1, y: 0 }
				: event.key === "ArrowRight"
					? { x: 1, y: 0 }
					: event.key === "ArrowUp"
						? { x: 0, y: -1 }
						: event.key === "ArrowDown"
							? { x: 0, y: 1 }
							: null;
		if (!offset) {
			return;
		}

		event.preventDefault();
		onPivotChange({
			x: clamp(activePivot.x + offset.x, 0, Math.max(layout.tileWidth - 1, 0)),
			y: clamp(activePivot.y + offset.y, 0, Math.max(layout.tileHeight - 1, 0)),
		});
	}

	function applyAnchorPreset(preset: AnchorPreset) {
		if (!editable || !onPivotChange) {
			return;
		}

		const bounds = contentBounds ?? {
			left: 0,
			top: 0,
			right: Math.max(layout.tileWidth - 1, 0),
			bottom: Math.max(layout.tileHeight - 1, 0),
			width: layout.tileWidth,
			height: layout.tileHeight,
		};

		const horizontalCenter = Math.round((bounds.left + bounds.right) / 2);
		const verticalCenter = Math.round((bounds.top + bounds.bottom) / 2);
		const nextPivot = {
			center: { x: horizontalCenter, y: verticalCenter },
			feet: { x: horizontalCenter, y: bounds.bottom },
			head: { x: horizontalCenter, y: bounds.top },
			left: { x: bounds.left, y: verticalCenter },
			right: { x: bounds.right, y: verticalCenter },
		}[preset];

		onPivotChange({
			x: clamp(nextPivot.x, 0, Math.max(layout.tileWidth - 1, 0)),
			y: clamp(nextPivot.y, 0, Math.max(layout.tileHeight - 1, 0)),
		});
	}

	const guideRectStyle = contentBounds
		? {
				left: `${contentBounds.left * zoom}px`,
				top: `${contentBounds.top * zoom}px`,
				width: `${Math.max(contentBounds.width * zoom, 2)}px`,
				height: `${Math.max(contentBounds.height * zoom, 2)}px`,
			}
		: null;

	return (
		<div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
			<div className="mb-3 flex items-center justify-between gap-3">
				<div>
					<p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
						{title}
					</p>
					<h3 className="mt-2 text-lg font-semibold">Frame preview</h3>
				</div>
				<div className="flex flex-wrap gap-2">
					<Select
						onChange={(event) =>
							setBackgroundMode(event.target.value as BackgroundMode)
						}
						value={backgroundMode}
					>
						<option value="transparent">Transparent</option>
						<option value="grid">Grid</option>
						<option value="slate">Slate</option>
						<option value="parchment">Parchment</option>
						<option value="forest">Forest</option>
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
							<option key={`zoom-${entry}`} value={String(entry)}>
								{entry}x
							</option>
						))}
					</Select>
				</div>
			</div>
			<div className="mb-3 grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
				<Button
					disabled={!preview || frameIndex <= 0}
					onClick={() => setFrameIndex((current) => Math.max(current - 1, 0))}
					type="button"
					variant="secondary"
				>
					Prev
				</Button>
				<input
					className="w-full accent-[color:var(--accent)]"
					disabled={!preview || layout.frameCount <= 1}
					max={Math.max(layout.frameCount - 1, 0)}
					min={0}
					onChange={(event) =>
						setFrameIndex(Number.parseInt(event.target.value, 10) || 0)
					}
					type="range"
					value={frameIndex}
				/>
				<Button
					disabled={!preview || frameIndex >= layout.frameCount - 1}
					onClick={() =>
						setFrameIndex((current) =>
							Math.min(current + 1, layout.frameCount - 1),
						)
					}
					type="button"
					variant="secondary"
				>
					Next
				</Button>
				<label className="flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 px-3 py-2 text-sm text-[color:var(--muted-foreground)]">
					<input
						checked={onionSkin}
						disabled={!preview || layout.frameCount <= 1}
						onChange={(event) => setOnionSkin(event.target.checked)}
						type="checkbox"
					/>
					Onion skin
				</label>
			</div>
			<div className="mb-3 flex items-center justify-between gap-3 text-sm text-[color:var(--muted-foreground)]">
				<p>
					Frame {preview ? frameIndex + 1 : 0} / {preview ? layout.frameCount : 0}
				</p>
				<p>
					{layout.tileWidth} x {layout.tileHeight}
				</p>
			</div>
			<div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
				<div className="flex flex-wrap gap-2">
					<label className="flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 px-3 py-2 text-sm text-[color:var(--muted-foreground)]">
						<input
							checked={showGuides}
							disabled={!preview}
							onChange={(event) => setShowGuides(event.target.checked)}
							type="checkbox"
						/>
						Crop guides
					</label>
					{editable ? (
						<>
							{(["center", "feet", "head", "left", "right"] as const).map(
								(entry) => (
									<Button
										key={`anchor-${entry}`}
										disabled={!preview}
										onClick={() => applyAnchorPreset(entry)}
										type="button"
										variant="secondary"
									>
										{anchorLabels[entry]}
									</Button>
								),
							)}
						</>
					) : null}
				</div>
				{editable ? (
					<p className="text-sm text-[color:var(--muted-foreground)]">
						Click the frame to place the export pivot.
					</p>
				) : null}
			</div>
			<div
				className="grid min-h-72 place-items-center rounded-2xl border border-[color:var(--border)] p-4"
				style={backgroundStyle[backgroundMode]}
			>
				{preview ? (
					<div
						className={`relative ${editable ? "cursor-crosshair" : ""}`}
						onClick={handleCanvasClick}
						onKeyDown={editable ? handleCanvasKeyDown : undefined}
						role={editable ? "button" : undefined}
						style={{
							width: `${layout.tileWidth * zoom}px`,
							height: `${layout.tileHeight * zoom}px`,
						}}
						tabIndex={editable ? 0 : undefined}
					>
						<canvas
							className="max-w-full [image-rendering:pixelated]"
							ref={canvasRef}
						/>
						{showGuides && guideRectStyle ? (
							<div
								aria-hidden="true"
								className="pointer-events-none absolute rounded-sm border border-dashed border-[color:var(--accent)]/90 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
								style={guideRectStyle}
							/>
						) : null}
						{showGuides ? (
							<>
								<div
									aria-hidden="true"
									className="pointer-events-none absolute top-0 bottom-0 w-px bg-[color:var(--accent)]/75"
									style={{ left: `${activePivot.x * zoom}px` }}
								/>
								<div
									aria-hidden="true"
									className="pointer-events-none absolute left-0 right-0 h-px bg-[color:var(--accent)]/75"
									style={{ top: `${activePivot.y * zoom}px` }}
								/>
								<div
									aria-hidden="true"
									className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color:var(--background)] bg-[color:var(--accent)] shadow-lg"
									style={{
										left: `${activePivot.x * zoom}px`,
										top: `${activePivot.y * zoom}px`,
									}}
								/>
							</>
						) : null}
					</div>
				) : (
					<p className="text-sm text-[color:var(--muted-foreground)]">
						{emptyMessage}
					</p>
				)}
			</div>
			{preview && showGuides ? (
				<div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--muted-foreground)]">
					<p>
						Pivot: {activePivot.x}, {activePivot.y}
					</p>
					<p>
						{contentBounds
							? `Crop: ${contentBounds.left},${contentBounds.top} -> ${contentBounds.right},${contentBounds.bottom}`
							: "Crop: no opaque pixels detected"}
					</p>
				</div>
			) : null}
		</div>
	);
}

function drawFrame(
	context: CanvasRenderingContext2D,
	image: HTMLImageElement,
	columns: number,
	tileWidth: number,
	tileHeight: number,
	frameIndex: number,
	zoom: number,
	alpha: number,
) {
	const sx = (frameIndex % columns) * tileWidth;
	const sy = Math.floor(frameIndex / columns) * tileHeight;
	context.save();
	context.globalAlpha = alpha;
	context.drawImage(
		image,
		sx,
		sy,
		tileWidth,
		tileHeight,
		0,
		0,
		tileWidth * zoom,
		tileHeight * zoom,
	);
	context.restore();
}

function computeFrameContentBounds(
	image: HTMLImageElement,
	columns: number,
	tileWidth: number,
	tileHeight: number,
	frameIndex: number,
): ContentBounds | null {
	const sx = (frameIndex % columns) * tileWidth;
	const sy = Math.floor(frameIndex / columns) * tileHeight;
	const scratch = document.createElement("canvas");
	scratch.width = tileWidth;
	scratch.height = tileHeight;
	const context = scratch.getContext("2d", { willReadFrequently: true });
	if (!context) {
		return null;
	}

	context.drawImage(
		image,
		sx,
		sy,
		tileWidth,
		tileHeight,
		0,
		0,
		tileWidth,
		tileHeight,
	);
	const { data } = context.getImageData(0, 0, tileWidth, tileHeight);

	let left = tileWidth;
	let top = tileHeight;
	let right = -1;
	let bottom = -1;

	for (let y = 0; y < tileHeight; y += 1) {
		for (let x = 0; x < tileWidth; x += 1) {
			const alpha = data[(y * tileWidth + x) * 4 + 3];
			if (alpha === 0) {
				continue;
			}

			left = Math.min(left, x);
			top = Math.min(top, y);
			right = Math.max(right, x);
			bottom = Math.max(bottom, y);
		}
	}

	if (right < left || bottom < top) {
		return null;
	}

	return {
		left,
		top,
		right,
		bottom,
		width: right - left + 1,
		height: bottom - top + 1,
	};
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

const backgroundStyle: Record<BackgroundMode, CSSProperties> = {
	transparent: {
		backgroundColor: "rgba(0,0,0,0.02)",
	},
	grid: {
		backgroundColor: "rgba(31, 35, 53, 0.45)",
		backgroundImage:
			"linear-gradient(rgba(223,215,197,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(223,215,197,0.08) 1px, transparent 1px)",
		backgroundSize: "16px 16px",
	},
	slate: {
		background:
			"linear-gradient(180deg, rgba(54,64,84,0.9), rgba(31,35,53,0.92))",
	},
	parchment: {
		background:
			"linear-gradient(180deg, rgba(223,215,197,0.92), rgba(198,181,154,0.92))",
	},
	forest: {
		background:
			"linear-gradient(180deg, rgba(81,111,90,0.95), rgba(54,84,74,0.95))",
	},
};
