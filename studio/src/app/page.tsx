import {
  Bot,
  Boxes,
  ChevronRight,
  FolderKanban,
  PlayCircle,
  ShieldCheck,
  SwatchBook,
  WandSparkles,
} from "lucide-react";

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

function statusLabel(status: string | undefined) {
  if (status === "ok") {
    return "Ready";
  }
  if (status === "warning") {
    return "Partial";
  }
  if (status === "error") {
    return "Needs attention";
  }
  return "Offline";
}

export default async function Home() {
  const [bootstrap, health] = await Promise.all([
    getSpriteCraftBootstrap(),
    getSpriteCraftHealth(),
  ]);

  const backendBaseUrl = getSpriteCraftBaseUrl();
  const backendHealthUrl = `${backendBaseUrl}/health`;
  const backendBootstrapUrl = `${backendBaseUrl}/api/bootstrap`;
  const recentProjects = bootstrap?.recent ?? [];
  const bodyTypes = bootstrap?.catalog.bodyTypes ?? [];
  const animations = bootstrap?.catalog.animations ?? [];
  const checks = health?.checks ?? [];

  const workflowSteps = [
    {
      icon: PlayCircle,
      eyebrow: "1. Start cleanly",
      title: "Launch from a template that already understands the job.",
      description:
        "Choose a player, portrait, NPC, or combat-ready starting point and open the builder with sensible defaults instead of a blank surface.",
    },
    {
      icon: FolderKanban,
      eyebrow: "2. Continue with context",
      title: "Saved projects stay close to the builder, not buried in admin chrome.",
      description:
        "Search history, reload versions, compare changes, and move straight back into editing without losing notes, tags, or export intent.",
    },
    {
      icon: WandSparkles,
      eyebrow: "3. Build with guidance",
      title: "Use AI and catalog tools as creative support, not as a detour.",
      description:
        "Preview, refine layers, generate guided briefs, and export engine-ready bundles from the same working page.",
    },
  ] as const;

  const productHighlights = [
    {
      icon: Boxes,
      title: "Engine-aware export",
      description:
        "Unity, Godot, Aseprite, generic metadata, credits, and batch export all live in the same workflow.",
    },
    {
      icon: Bot,
      title: "AI as a builder assistant",
      description:
        "Gemini-supported briefs turn prompts into build steps, category guidance, and candidate layer sets.",
    },
    {
      icon: ShieldCheck,
      title: "Dart backend stability",
      description:
        "The rendering and export engine stays strongly typed and deterministic while the web app focuses on creator experience.",
    },
  ] as const;

  return (
    <main className="studio-shell mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-10 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <section className="relative overflow-hidden rounded-[36px] border border-[color:var(--border-strong)] bg-[color:var(--hero-surface)] px-6 py-7 shadow-[0_32px_120px_rgba(0,0,0,0.32)] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,156,216,0.2),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(149,179,135,0.16),transparent_24%),linear-gradient(135deg,rgba(223,142,29,0.08),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] bg-[linear-gradient(180deg,rgba(31,31,40,0.04),rgba(31,31,40,0.42))] lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-end">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success">SpriteCraft Web</Badge>
              <Badge>Creator-first workspace</Badge>
              <Badge>Kanagawa Wave</Badge>
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">
              Sprite design, layered composition, engine export
            </p>
            <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold leading-[1.02] text-[color:var(--foreground)] sm:text-5xl lg:text-6xl">
              Build readable game characters without fighting the tool.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--hero-copy)] sm:text-lg">
              SpriteCraft keeps launch, project history, layered building, AI
              guidance, and engine export in one place so creators can stay in
              flow instead of bouncing between utilities.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#launchpad">
                  Open launchpad
                  <ChevronRight className="ml-2 size-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#builder">
                  Jump to builder
                  <ChevronRight className="ml-2 size-4" />
                </a>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/70 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Catalog
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {bootstrap?.catalog.itemCount ?? 0}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                  layered assets ready to search
                </p>
              </div>
              <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/70 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Saved work
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {recentProjects.length}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                  recent projects ready to reopen
                </p>
              </div>
              <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/70 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Builder modes
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {bodyTypes.length} / {animations.length}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                  body types and animation targets
                </p>
              </div>
            </div>
          </div>

          <aside className="relative rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/88 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Backend readiness
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                  {statusLabel(health?.status)}
                </h2>
              </div>
              <Badge variant={statusVariant(health?.status ?? "warning")}>
                {health?.status ?? "offline"}
              </Badge>
            </div>

            <Separator className="my-5" />

            <div className="space-y-3">
              {checks.length ? (
                checks.slice(0, 4).map((check) => (
                  <div
                    className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/70 px-4 py-3"
                    key={check.label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[color:var(--foreground)]">
                        {check.label}
                      </p>
                      <Badge variant={statusVariant(check.status)}>
                        {check.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                      {check.detail}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)]/50 px-4 py-4 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Start the Dart backend and this panel will reflect live
                  health, Gemini availability, and project history readiness.
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="sm" variant="secondary">
                <a href={backendHealthUrl} rel="noreferrer" target="_blank">
                  Backend health
                </a>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <a href={backendBootstrapUrl} rel="noreferrer" target="_blank">
                  Bootstrap JSON
                </a>
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {workflowSteps.map((step) => (
          <article
            className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/72 px-5 py-5"
            key={step.title}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--accent)]">
                <step.icon className="size-5" />
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                {step.eyebrow}
              </p>
            </div>
            <h2 className="mt-4 max-w-sm text-xl font-semibold leading-tight text-[color:var(--foreground)]">
              {step.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
              {step.description}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_0.88fr]">
        <Card
          className="overflow-hidden border-[color:var(--border-strong)] bg-[linear-gradient(180deg,rgba(31,31,40,0.86),rgba(22,22,29,0.94))]"
          id="launchpad"
        >
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success">Launchpad</Badge>
              <Badge>Start fast</Badge>
            </div>
            <CardTitle className="max-w-2xl text-3xl leading-tight">
              Begin with an informed setup, not a blank workspace.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              Templates and custom launch settings now sit right next to the
              builder so the starting decision is part of the same page, not a
              separate tool.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectLauncher animations={animations} bodyTypes={bodyTypes} />
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <SwatchBook className="size-5 text-[color:var(--accent)]" />
                <span>What the interface should feel like</span>
              </CardTitle>
              <CardDescription className="text-base leading-7">
                Calm structure, sharp hierarchy, and minimal friction while you
                move from concept to export.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {productHighlights.map((item) => (
                <div
                  className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/72 px-4 py-4"
                  key={item.title}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="size-5 text-[color:var(--accent)]" />
                    <h3 className="font-medium text-[color:var(--foreground)]">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
                    {item.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/80">
            <CardHeader>
              <CardTitle>Today in SpriteCraft</CardTitle>
              <CardDescription className="text-base leading-7">
                The workspace is already oriented around real creator jobs.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/72 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  AI assistance
                </p>
                <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
                  {bootstrap?.config.hasGemini ? "Enabled" : "Optional"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Guided briefs, category suggestions, and candidate builds when
                  Gemini is configured.
                </p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/72 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Project memory
                </p>
                <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
                  {bootstrap?.config.hasDatabase ? "Persistent" : "Limited"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Versioned saves, snapshots, and package transfer when the
                  database is available.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.88fr_minmax(0,1.12fr)]">
        <Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/78">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FolderKanban className="size-5 text-[color:var(--accent)]" />
              <span>Project browser</span>
            </CardTitle>
            <CardDescription className="text-base leading-7">
              Saved work should be one move away from the builder, with context
              visible before you commit to loading it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/72 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Recent
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {recentProjects.length}
                </p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/72 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Body targets
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {bodyTypes.length}
                </p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/72 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Animation targets
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {animations.length}
                </p>
              </div>
            </div>
            <p className="text-sm leading-7 text-[color:var(--muted-foreground)]">
              Search by prompt, tags, or selected layers, then move straight
              into the builder without losing notes, prompt memory, or export
              history.
            </p>
          </CardContent>
        </Card>

        <ProjectBrowser
          projects={recentProjects.map((project) => ({
            ...project,
            tags: project.tags ?? [],
            selections: project.selections ?? {},
            renderSettings: project.renderSettings ?? {},
            exportSettings: project.exportSettings ?? {},
            promptHistory: project.promptHistory ?? [],
            exportHistory: project.exportHistory ?? [],
          }))}
        />
      </section>

      <section className="space-y-5" id="builder">
        <div className="flex flex-col gap-4 rounded-[32px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,rgba(31,31,40,0.78),rgba(22,22,29,0.92))] px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">Builder workspace</Badge>
            <Badge>In page</Badge>
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_0.8fr] lg:items-end">
            <div>
              <h2 className="text-3xl font-semibold leading-tight text-[color:var(--foreground)]">
                Build, preview, guide, and export in one continuous surface.
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[color:var(--hero-copy)]">
                The builder is now the center of the page. Launch into it,
                restore into it, and keep AI recommendations and export settings
                alongside the actual composition work.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Builder promise
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Keep search, staging, AI support, and export intent close to
                  the sprite itself.
                </p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Best next move
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Start from the launchpad or load a saved project and continue
                  from the same scroll position.
                </p>
              </div>
            </div>
          </div>
        </div>

        <CatalogScout animations={animations} bodyTypes={bodyTypes} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "Readable first",
            description:
              "Every section has one job so creators can understand where to start in seconds.",
          },
          {
            title: "Context stays nearby",
            description:
              "Project history and launch setup now feed directly into the builder instead of acting like detached dashboards.",
          },
          {
            title: "Export remains practical",
            description:
              "The interface keeps engine-aware output visible without turning the product into an exporter-first utility.",
          },
        ].map((item) => (
          <Card
            className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/72"
            key={item.title}
          >
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-[color:var(--muted-foreground)]">
              {item.description}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
