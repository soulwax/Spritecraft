"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import type { SpriteCraftProjectSummary } from "~/server/spritecraft-backend";

type ProjectBrowserProps = {
	projects: SpriteCraftProjectSummary[];
};

export function ProjectBrowser({ projects }: ProjectBrowserProps) {
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<"newest" | "updated" | "layers" | "name">(
		"newest",
	);

	const filtered = useMemo(() => {
		const terms = search
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter(Boolean);

		const visible = projects.filter((project) => {
			if (!terms.length) return true;
			const haystack = [
				project.projectName ?? "",
				project.prompt ?? "",
				project.bodyType,
				project.animation,
				...project.tags,
				...Object.keys(project.selections),
			]
				.join(" ")
				.toLowerCase();

			return terms.every((term) => haystack.includes(term));
		});

		return visible.sort((left, right) => {
			if (sort === "updated") {
				return (
					new Date(right.updatedAt ?? right.createdAt).getTime() -
					new Date(left.updatedAt ?? left.createdAt).getTime()
				);
			}

			if (sort === "layers") {
				return (
					Object.keys(right.selections).length - Object.keys(left.selections).length
				);
			}

			if (sort === "name") {
				return (left.projectName ?? left.prompt ?? "Untitled").localeCompare(
					right.projectName ?? right.prompt ?? "Untitled",
				);
			}

			return (
				new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
			);
		});
	}, [projects, search, sort]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Project Browser</CardTitle>
				<CardDescription>
					First migrated workflow slice inside the T3 app: searchable recent
					projects from the current Dart backend.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
					<label className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-white/5 px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
						<Search className="size-4 shrink-0" />
						<input
							className="w-full bg-transparent outline-none placeholder:text-[color:var(--muted-foreground)]"
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search projects, prompts, tags, or selected layers"
							value={search}
						/>
					</label>
					<select
						className="rounded-2xl border border-[color:var(--border)] bg-white/5 px-4 py-3 text-sm text-[color:var(--foreground)]"
						onChange={(event) =>
							setSort(event.target.value as "newest" | "updated" | "layers" | "name")
						}
						value={sort}
					>
						<option value="newest">Newest</option>
						<option value="updated">Recently updated</option>
						<option value="layers">Most layers</option>
						<option value="name">Name A-Z</option>
					</select>
				</div>

				<div className="grid gap-4">
					{filtered.length ? (
						filtered.slice(0, 8).map((project) => (
							<div
								className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4"
								key={project.id}
							>
								<div className="mb-2 flex flex-wrap items-center justify-between gap-3">
									<h3 className="font-medium">
										{project.projectName ?? project.prompt ?? "Untitled project"}
									</h3>
									<Badge>{new Date(project.createdAt).toLocaleString()}</Badge>
								</div>
								<p className="mb-3 text-sm text-[color:var(--muted-foreground)]">
									{(project.prompt ?? "No prompt saved").slice(0, 140)}
								</p>
								<div className="flex flex-wrap gap-2">
									<Badge>{project.bodyType}</Badge>
									<Badge>{project.animation}</Badge>
									<Badge>{Object.keys(project.selections).length} layers</Badge>
									{project.tags.slice(0, 3).map((tag) => (
										<Badge key={tag}>{tag}</Badge>
									))}
								</div>
							</div>
						))
					) : (
						<div className="rounded-2xl border border-dashed border-[color:var(--border)] p-6 text-sm text-[color:var(--muted-foreground)]">
							No projects match the current search.
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
