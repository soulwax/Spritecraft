import Link from "next/link";
import { AlertTriangle, Boxes, FolderKanban, HeartHandshake, Sparkles } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
	getSpriteCraftBootstrap,
	getSpriteCraftHealth,
} from "~/server/spritecraft-backend";

function statusVariant(status: string): "default" | "warning" | "destructive" | "success" {
	if (status === "ok") return "success";
	if (status === "warning") return "warning";
	if (status === "error") return "destructive";
	return "default";
}

export default async function Home() {
	const [bootstrap, health] = await Promise.all([
		getSpriteCraftBootstrap(),
		getSpriteCraftHealth(),
	]);

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
			<section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
				<Card className="border-amber-300/10 bg-transparent">
					<CardHeader className="gap-4">
						<div className="flex flex-wrap items-center gap-3">
							<Badge variant="success">T3 Migration</Badge>
							<Badge>Alongside Existing Studio</Badge>
						</div>
						<CardTitle className="max-w-3xl text-4xl leading-tight sm:text-5xl">
							SpriteCraft Web is the new product shell for migrating the Studio
							into T3.
						</CardTitle>
						<CardDescription className="max-w-2xl text-base">
							This app lives alongside the working Dart Studio so we can move
							feature slices safely. The first slice is visibility: backend
							health, catalog readiness, and recent project activity.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-3">
						<Button asChild>
							<Link href="http://127.0.0.1:8080" target="_blank">
								Open Current Studio
							</Link>
						</Button>
						<Button asChild variant="secondary">
							<Link href="https://create.t3.gg" target="_blank">
								T3 Reference
							</Link>
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Backend Status</CardTitle>
						<CardDescription>
							Live signal from the existing Dart backend while the new web shell
							is being built.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap gap-2">
							<Badge variant={statusVariant(health?.status ?? "warning")}>
								Backend {health?.status ?? "offline"}
							</Badge>
							<Badge>Catalog {bootstrap?.catalog.itemCount ?? 0} items</Badge>
							<Badge>{bootstrap?.recent.length ?? 0} recent projects</Badge>
						</div>
						<Separator />
						<div className="space-y-3 text-sm text-[color:var(--muted-foreground)]">
							{health ? (
								health.checks.slice(0, 5).map((check) => (
									<div
										className="flex items-start justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-white/5 px-4 py-3"
										key={check.label}
									>
										<div>
											<p className="font-medium text-[color:var(--foreground)]">
												{check.label}
											</p>
											<p>{check.detail}</p>
										</div>
										<Badge variant={statusVariant(check.status)}>
											{check.status}
										</Badge>
									</div>
								))
							) : (
								<div className="rounded-2xl border border-dashed border-amber-300/20 bg-amber-300/5 p-4">
									<div className="mb-2 flex items-center gap-2 text-amber-100">
										<AlertTriangle className="size-4" />
										<span className="font-medium">Backend offline</span>
									</div>
									<p>
										Start <code>dart run bin/spritecraft.dart studio</code> and
										this page will begin reflecting live health data.
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</section>

			<section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
				<Card>
					<CardHeader>
						<CardTitle>Migration Slices</CardTitle>
						<CardDescription>
							We are moving the Studio deliberately instead of rewriting it in
							place.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{[
							{
								icon: FolderKanban,
								title: "Project browser first",
								description:
									"The backend already exposes recent projects, so the new app can start with a strong dashboard.",
							},
							{
								icon: Boxes,
								title: "Shared visual system",
								description:
									"A shadcn-style component base gives the Next app a durable UI foundation.",
							},
							{
								icon: Sparkles,
								title: "Builder migration later",
								description:
									"Selection, previews, AI, and export flows can move over slice by slice after the shell is stable.",
							},
						].map((item) => (
							<div
								className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4"
								key={item.title}
							>
								<div className="mb-3 flex items-center gap-3">
									<item.icon className="size-5 text-amber-300" />
									<h3 className="font-medium">{item.title}</h3>
								</div>
								<p className="text-sm text-[color:var(--muted-foreground)]">
									{item.description}
								</p>
							</div>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent Projects</CardTitle>
						<CardDescription>
							First live migration slice from the current backend: saved work,
							tags, prompts, and export activity.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{bootstrap?.recent.length ? (
							bootstrap.recent.slice(0, 6).map((project) => (
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
								No backend project data is visible yet. Once the Dart Studio is
								running with history enabled, this becomes the first meaningful T3
								workflow surface.
							</div>
						)}
					</CardContent>
				</Card>
			</section>

			<section className="grid gap-6 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Why alongside</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-[color:var(--muted-foreground)]">
						We keep the working Studio usable while the new web app earns trust.
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Why T3</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-[color:var(--muted-foreground)]">
						Next App Router, TypeScript, tRPC, Tailwind, and shadcn-style
						components fit the product direction much better than a long-lived
						vanilla JS frontend.
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Why now</CardTitle>
					</CardHeader>
					<CardContent className="flex items-start gap-3 text-sm text-[color:var(--muted-foreground)]">
						<HeartHandshake className="mt-0.5 size-4 shrink-0 text-amber-300" />
						The Dart backend and project model are finally stable enough that a
						parallel frontend can move quickly without guessing at domain shape.
					</CardContent>
				</Card>
			</section>
		</main>
	);
}
