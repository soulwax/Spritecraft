"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, ExternalLink, Search } from "lucide-react";

import { buildStudioTemplateUrl } from "~/app/_components/project-launching";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import type { SpriteCraftCatalogItem } from "~/server/spritecraft-backend";

type CatalogScoutProps = {
	bodyTypes: string[];
	animations: string[];
};

type CatalogScoutResponse = {
	items: SpriteCraftCatalogItem[];
};

export function CatalogScout({
	bodyTypes,
	animations,
}: CatalogScoutProps) {
	const [query, setQuery] = useState("");
	const [bodyType, setBodyType] = useState(bodyTypes[0] ?? "male");
	const [animation, setAnimation] = useState(animations[0] ?? "idle");
	const [category, setCategory] = useState("all");
	const [tag, setTag] = useState("all");
	const [items, setItems] = useState<SpriteCraftCatalogItem[]>([]);
	const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		let cancelled = false;

		async function load() {
			setStatus("loading");
			setErrorMessage("");

			try {
				const params = new URLSearchParams({
					q: query,
					bodyType,
					animation,
				});
				const response = await fetch(`/api/spritecraft/catalog?${params.toString()}`, {
					cache: "no-store",
				});
				const payload = (await response.json()) as CatalogScoutResponse & {
					error?: string;
				};
				if (!response.ok) {
					throw new Error(
						payload.error ?? "SpriteCraft Web could not scout the catalog.",
					);
				}
				if (cancelled) {
					return;
				}
				setItems(payload.items ?? []);
				setStatus("idle");
			} catch (error) {
				if (cancelled) {
					return;
				}
				setItems([]);
				setStatus("error");
				setErrorMessage(
					error instanceof Error
						? error.message
						: "SpriteCraft Web could not scout the catalog.",
				);
			}
		}

		void load();

		return () => {
			cancelled = true;
		};
	}, [animation, bodyType, query]);

	const categories = useMemo(
		() =>
			Array.from(
				new Set(items.map((item) => item.category).filter(Boolean)),
			).sort(),
		[items],
	);

	const tags = useMemo(
		() =>
			Array.from(new Set(items.flatMap((item) => item.tags ?? []).filter(Boolean))).sort(),
		[items],
	);

	const visibleItems = useMemo(
		() =>
			items.filter((item) => {
				if (category !== "all" && item.category !== category) {
					return false;
				}
				if (tag !== "all" && !(item.tags ?? []).includes(tag)) {
					return false;
				}
				return true;
			}),
		[category, items, tag],
	);

	const studioScoutUrl = buildStudioTemplateUrl({
		bodyType,
		animation,
		projectName: query.trim() ? `Scout ${query.trim()}` : "Scouted Project",
		prompt: "",
		enginePreset: "none",
		previewMode: "single",
		category,
		animationFilter: "current",
		tagFilter: tag,
		catalogSearch: query.trim(),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-3">
					<Compass className="size-5 text-[color:var(--accent)]" />
					<span>Catalog Scout</span>
				</CardTitle>
				<CardDescription>
					Scout the LPC catalog from the web app, then open the Dart Studio with
					search and filter intent already applied.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
					<label className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4">
						<Search className="size-4 shrink-0 text-[color:var(--muted-foreground)]" />
						<Input
							className="border-0 bg-transparent px-0 shadow-none"
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Scout ranger, hood, mage, wolf, plate..."
							value={query}
						/>
					</label>
					<Select
						onChange={(event) => setBodyType(event.target.value)}
						value={bodyType}
					>
						{bodyTypes.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</Select>
					<Select
						onChange={(event) => setAnimation(event.target.value)}
						value={animation}
					>
						{animations.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</Select>
					<Button asChild>
						<a href={studioScoutUrl} rel="noreferrer" target="_blank">
							<ExternalLink className="mr-2 size-4" />
							Scout In Studio
						</a>
					</Button>
				</div>

				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
						<p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
							Matches
						</p>
						<p className="mt-2 text-2xl font-semibold">{visibleItems.length}</p>
					</div>
					<div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
						<p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
							Body type
						</p>
						<p className="mt-2 text-lg font-semibold">{bodyType}</p>
					</div>
					<div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
						<p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
							Animation
						</p>
						<p className="mt-2 text-lg font-semibold">{animation}</p>
					</div>
					<div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
						<p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
							Status
						</p>
						<p className="mt-2 text-lg font-semibold">
							{status === "loading" ? "Loading" : status === "error" ? "Needs attention" : "Ready"}
						</p>
					</div>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<Select onChange={(event) => setCategory(event.target.value)} value={category}>
						<option value="all">All categories</option>
						{categories.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</Select>
					<Select onChange={(event) => setTag(event.target.value)} value={tag}>
						<option value="all">All tags</option>
						{tags.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</Select>
				</div>

				{status === "error" ? (
					<div className="rounded-2xl border border-[color:var(--destructive)]/40 bg-[color:var(--surface-soft)] p-4 text-sm text-[color:var(--muted-foreground)]">
						{errorMessage}
					</div>
				) : null}

				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{visibleItems.slice(0, 9).map((item) => (
						<div
							className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
							key={item.id}
						>
							<div className="mb-3 flex items-center justify-between gap-3">
								<h3 className="font-medium">{item.name}</h3>
								<Badge>{item.typeName}</Badge>
							</div>
							<p className="mb-3 text-sm text-[color:var(--muted-foreground)]">
								{item.category} · {item.requiredBodyTypes.join(", ") || "any body"}
							</p>
							<div className="flex flex-wrap gap-2">
								{(item.tags ?? []).slice(0, 3).map((entry) => (
									<Badge key={`${item.id}-${entry}`}>{entry}</Badge>
								))}
								{item.matchBodyColor ? <Badge>match body color</Badge> : null}
							</div>
						</div>
					))}
				</div>

				<p className="text-sm text-[color:var(--muted-foreground)]">
					This is a scouting slice, not full web-side editing yet. Final layer
					selection still happens in the Dart Studio.
				</p>
			</CardContent>
		</Card>
	);
}
