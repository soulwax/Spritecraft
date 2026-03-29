// File: studio/src/app/page.tsx

import {
  AlertTriangle,
  Boxes,
  Compass,
  FolderKanban,
  HeartHandshake,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  SwatchBook,
} from "lucide-react";
import Link from "next/link";

import { CatalogScout } from "~/app/_components/catalog-scout";
import { ProjectBrowser } from "~/app/_components/project-browser";
import { ProjectLauncher } from "~/app/_components/project-launcher";
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
  getSpriteCraftBaseUrl,
  getSpriteCraftBootstrap,
  getSpriteCraftHealth,
} from "~/server/spritecraft-backend";

function statusVariant(
  status: string,
): "default" | "warning" | "destructive" | "success" {
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
  const backendBaseUrl = getSpriteCraftBaseUrl();
  const backendHealthUrl = `${backendBaseUrl}/health`;
  const backendBootstrapUrl = `${backendBaseUrl}/api/bootstrap`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-(--accent-soft) bg-transparent">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success">Web Migration</Badge>
              <Badge>Primary UI</Badge>
              <Badge>Kanagawa Wave</Badge>
            </div>
            <CardTitle className="max-w-3xl text-4xl leading-tight sm:text-5xl">
              SpriteCraft Studio
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Create your sprites in a smart way and export them for Unity, Godot Aseprite etc. Metadata comes with your sprites to power in-editor workflows and future AI-assisted features (ofc).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-(--muted-foreground)">
                  Phase 4
                </p>
                <p className="mt-2 text-lg font-semibold">Building export functionalities for various engines</p>
              </div>
              <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-(--muted-foreground)">
                  Live data
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {bootstrap?.recent?.length ?? 0} projects visible
                </p>
              </div>
              <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-(--muted-foreground)">
                  Theme
                </p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
                  <SwatchBook className="size-4 text-(--accent)" />
                  Kanagawa Wave
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href={backendHealthUrl} rel="noreferrer" target="_blank">
                  Open Backend Health
                </a>
              </Button>
              <Button asChild variant="secondary">
                <a href={backendBootstrapUrl} rel="noreferrer" target="_blank">
                  Backend Bootstrap
                </a>
              </Button>
            </div>
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
              <Badge>{bootstrap?.recent?.length ?? 0} recent projects</Badge>
            </div>
            <Separator />
            <div className="space-y-3 text-sm text-(--muted-foreground)">
              {health ? (
                health.checks.slice(0, 5).map((check) => (
                  <div
                    className="flex items-start justify-between gap-4 rounded-2xl border border-(--border) bg-(--surface-soft) px-4 py-3"
                    key={check.label}
                  >
                    <div>
                      <p className="font-medium text-(--foreground)">
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
                <div className="rounded-2xl border border-dashed border-(--accent-soft) bg-(--accent-soft)/50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-(--foreground)">
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

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          {
            icon: PlayCircle,
            title: "Start From Template",
            description:
              "Use the launch templates below to begin a project directly in the new web workspace.",
          },
          {
            icon: FolderKanban,
            title: "Continue Saved Work",
            description:
              "Use the project browser to restore, snapshot, version, duplicate, or package saved work.",
          },
          {
            icon: Compass,
            title: "Load Builder In Page",
            description:
              "Start a blank session from the launcher or load a saved project into the builder workspace on this page.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <item.icon className="size-5 text-(--accent)" />
                <span>{item.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-(--muted-foreground)">
              {item.description}
            </CardContent>
          </Card>
        ))}
      </section>

      <ProjectLauncher
        animations={bootstrap?.catalog.animations ?? []}
        bodyTypes={bootstrap?.catalog.bodyTypes ?? []}
      />

      <ProjectBrowser
        projects={(bootstrap?.recent ?? []).map((p) => ({
          ...p,
          tags: p.tags ?? [],
          selections: p.selections ?? {},
          renderSettings: p.renderSettings ?? {},
          exportSettings: p.exportSettings ?? {},
          promptHistory: p.promptHistory ?? [],
          exportHistory: p.exportHistory ?? [],
        }))}
      />

      <section id="builder" className="scroll-mt-6 space-y-4">
        <div className="rounded-3xl border border-(--accent-soft) bg-transparent p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">Builder Workspace</Badge>
            <Badge>In Page</Badge>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-(--foreground)">
            Build right here
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-(--muted-foreground)">
            Start from the launcher above or load any saved project from the
            browser into this workspace. Selection changes, preview, AI
            guidance, and export all happen on this page.
          </p>
        </div>
        <CatalogScout
          animations={bootstrap?.catalog.animations ?? []}
          bodyTypes={bootstrap?.catalog.bodyTypes ?? []}
        />
      </section>

			<section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Migration Slices</CardTitle>
            <CardDescription>
              We moved SpriteCraft deliberately instead of rewriting it in
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
                  "Selection, previews, AI, and export now live in the web app while the Dart process focuses on backend APIs.",
              },
            ].map((item) => (
              <div
                className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4"
                key={item.title}
              >
                <div className="mb-3 flex items-center gap-3">
                  <item.icon className="size-5 text-(--accent)" />
                  <h3 className="font-medium">{item.title}</h3>
                </div>
                <p className="text-sm text-(--muted-foreground)">
                  {item.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Launch Readiness</CardTitle>
            <CardDescription>
              What a creator can do right now based on the current backend
              state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="size-4 text-(--accent)" />
                <p className="font-medium text-(--foreground)">
                  Current capabilities
                </p>
              </div>
              <ul className="space-y-2 text-sm text-(--muted-foreground)">
                <li>
                  {health
                    ? "The backend is reachable, so the web app can load catalog, history, AI, render, and export flows."
                    : "Start the Dart backend first to unlock live project data and render/export APIs."}
                </li>
                <li>
                  {bootstrap?.config.hasDatabase
                    ? "Saved projects and package transfer are available."
                    : "History persistence is disabled until the Dart backend has DATABASE_URL configured."}
                </li>
                <li>
                  {bootstrap?.config.hasGemini
                    ? "AI-assisted brief generation is available in the web builder."
                    : "AI remains optional; the web builder still works without GEMINI_API_KEY."}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Why alongside</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-(--muted-foreground)">
            The Dart backend stays stable while the web app carries the full creator workflow.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Why This Stack</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-(--muted-foreground)">
            Next App Router, TypeScript, Tailwind, and shadcn-style components
            fit the product direction much better than a long-lived vanilla JS
            frontend.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Why now</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-3 text-sm text-(--muted-foreground)">
            <HeartHandshake className="mt-0.5 size-4 shrink-0 text-(--accent)" />
            The Dart backend and project model are finally stable enough that a
            parallel frontend can move quickly without guessing at domain shape.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}


