// File: spritecraft-web/src/app/page.tsx

import Link from "next/link";
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

import { ProjectLauncher } from "~/app/_components/project-launcher";
import { ProjectBrowser } from "~/app/_components/project-browser";
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-(--accent-soft) bg-transparent">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success">T3 Migration</Badge>
              <Badge>Alongside Existing Studio</Badge>
              <Badge>Kanagawa Wave</Badge>
            </div>
            <CardTitle className="max-w-3xl text-4xl leading-tight sm:text-5xl">
              SpriteCraft Web is becoming the new Studio shell, one safe slice
              at a time.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              This app lives alongside the working Dart Studio so we can migrate
              project workflows without losing momentum. The current slice
              focuses on visibility, project browsing, and operational actions
              while the builder remains in the existing app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-(--muted-foreground)">
                  Phase 3.5
                </p>
                <p className="mt-2 text-lg font-semibold">Parallel migration</p>
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
                <Link href="http://127.0.0.1:8080" target="_blank">
                  Open Current Studio
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="https://create.t3.gg" target="_blank">
                  T3 Reference
                </Link>
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
              "Use the launch templates below to open the Dart builder with a project already framed.",
          },
          {
            icon: FolderKanban,
            title: "Continue Saved Work",
            description:
              "Use the project browser to restore, snapshot, version, duplicate, or package saved work.",
          },
          {
            icon: Compass,
            title: "Open Builder Directly",
            description:
              "Jump straight into the live Studio if you want a blank composition session without dashboard steps.",
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
                    ? "The backend is reachable, so web-to-builder handoff is live."
                    : "Start the Dart Studio backend first to unlock restore handoff and live project data."}
                </li>
                <li>
                  {bootstrap?.config.hasDatabase
                    ? "Saved projects and package transfer are available."
                    : "History persistence is disabled until DATABASE_URL is configured."}
                </li>
                <li>
                  {bootstrap?.config.hasGemini
                    ? "AI-assisted brief generation is available inside the builder."
                    : "AI remains optional; the builder still works without GEMINI_API_KEY."}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

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

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Why alongside</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-(--muted-foreground)">
            We keep the working Studio usable while the new web app earns trust.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Why T3</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-(--muted-foreground)">
            Next App Router, TypeScript, tRPC, Tailwind, and shadcn-style
            components fit the product direction much better than a long-lived
            vanilla JS frontend.
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
