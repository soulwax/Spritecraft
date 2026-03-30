import { cn } from "~/lib/utils";

type SpriteCraftBrandProps = {
	className?: string;
	compact?: boolean;
};

export function SpriteCraftBrand({
	className,
	compact = false,
}: SpriteCraftBrandProps) {
	return (
		<div className={cn("flex items-center gap-4", className)}>
			<div className="relative flex size-12 items-center justify-center rounded-2xl border border-[color:var(--border-strong)] bg-[linear-gradient(160deg,rgba(126,156,216,0.2),rgba(223,142,29,0.12))] shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
				<svg
					aria-label="SpriteCraft brand mark"
					className="size-8"
					role="img"
					viewBox="0 0 32 32"
					xmlns="http://www.w3.org/2000/svg"
				>
					<title>SpriteCraft</title>
					<defs>
						<linearGradient id="spritecraft-core" x1="0" x2="1" y1="0" y2="1">
							<stop offset="0%" stopColor="var(--brand-flame)" />
							<stop offset="100%" stopColor="var(--brand-gold)" />
						</linearGradient>
					</defs>
					<rect
						fill="var(--brand-ink)"
						height="18"
						rx="4"
						stroke="var(--brand-line)"
						strokeWidth="1.5"
						width="18"
						x="7"
						y="7"
					/>
					<path
						d="M16 4 L18.6 8.8 L24 10.4 L20 14.2 L20.8 19.8 L16 17.2 L11.2 19.8 L12 14.2 L8 10.4 L13.4 8.8 Z"
						fill="url(#spritecraft-core)"
						stroke="var(--brand-line)"
						strokeWidth="1"
					/>
					<rect fill="var(--brand-grid)" height="2" width="2" x="4" y="10" />
					<rect fill="var(--brand-grid)" height="2" width="2" x="4" y="14" />
					<rect fill="var(--brand-grid)" height="2" width="2" x="4" y="18" />
					<rect fill="var(--brand-grid)" height="2" width="2" x="26" y="10" />
					<rect fill="var(--brand-grid)" height="2" width="2" x="26" y="14" />
					<rect fill="var(--brand-grid)" height="2" width="2" x="26" y="18" />
				</svg>
			</div>
			{compact ? null : (
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-lg font-semibold tracking-[0.04em] text-[color:var(--foreground)]">
							SpriteCraft
						</p>
						<span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-100">
							Studio
						</span>
					</div>
					<p className="text-sm text-[color:var(--muted-foreground)]">
						Game-ready sprite building with layered composition and export-first tooling.
					</p>
				</div>
			)}
		</div>
	);
}
