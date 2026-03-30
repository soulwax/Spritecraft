import Link from "next/link";
import {
  ChevronRight,
  FolderKanban,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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
import { getStudioPageData } from "~/server/studio-page-data";

function statusVariant(
  status: string,
): "default" | "warning" | "destructive" | "success" {
  if (status === "ok") return "success";
  if (status === "warning") return "warning";
  if (status === "error") return "destructive";
  return "default";
}

export default async function Home() {
  const {
    bootstrap,
    health,
    backendBaseUrl,
    recentProjects,
    bodyTypes,
    animations,
    checks,
  } = await getStudioPageData();

  const backendHealthUrl = `${backendBaseUrl}/health`;
  const readyChecks = checks.filter((check) => check.status === "ok").length;

  return (
    <main className="flex flex-col gap-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="overflow-hidden border-[color:var(--border-strong)] bg-[color:var(--hero-surface)]">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success">Create</Badge>
              <Badge>LPC workflow</Badge>
            </div>
            <CardTitle className="max-w-3xl text-4xl leading-tight sm:text-5xl">
              Start a character, keep iterating, and stay close to the builder.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 text-[color:var(--hero-copy)]">
              SpriteCraft is a working character creator first: launch from a
              template, reopen saved looks, then move straight into the builder.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Catalog
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {bootstrap?.catalog.itemCount ?? 0}
                </p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Saved projects
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {recentProjects.length}
                </p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Modes
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {bodyTypes.length}/{animations.length}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/82 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                Quick actions
              </p>
              <div className="mt-4 grid gap-3">
                <Button asChild>
                  <Link href="/builder">
                    Open builder
                    <ChevronRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/projects">
                    Browse projects
                    <ChevronRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-[color:var(--accent)]" />
              <span>Backend</span>
            </CardTitle>
            <CardDescription>
              Keep this compact. The creator should still work even if you
              rarely look at it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Status
              </p>
              <Badge variant={statusVariant(health?.status ?? "warning")}>
                {health?.status ?? "offline"}
              </Badge>
            </div>
            <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/72 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                Ready checks
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {readyChecks}/{checks.length}
              </p>
            </div>
            <Separator />
            <Button asChild size="sm" variant="ghost">
              <a href={backendHealthUrl} rel="noreferrer" target="_blank">
                Open health JSON
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <Card className="border-[color:var(--border-strong)] bg-[linear-gradient(180deg,rgba(31,31,40,0.86),rgba(22,22,29,0.94))]">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <PlayCircle className="size-5 text-[color:var(--accent)]" />
              <span>Launchpad</span>
            </CardTitle>
            <CardDescription className="text-base leading-7 text-[color:var(--hero-copy)]">
              Pick a template or shape a quick setup, then open the dedicated
              builder route.
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
                <FolderKanban className="size-5 text-[color:var(--accent)]" />
                <span>Recent work</span>
              </CardTitle>
              <CardDescription>
                Reopen a saved character or continue from the projects page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentProjects.slice(0, 4).map((project) => (
                <Link
                  className="block rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/72 px-4 py-4 transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-strong)]"
                  href={`/builder?restore=${encodeURIComponent(project.id)}`}
                  key={project.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[color:var(--foreground)]">
                      {project.projectName ?? project.prompt ?? "Untitled project"}
                    </p>
                    <Badge>{project.animation}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                    {Object.keys(project.selections).length} selected layers
                  </p>
                </Link>
              ))}
              {recentProjects.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[color:var(--border)] px-4 py-5 text-sm text-[color:var(--muted-foreground)]">
                  No saved projects yet.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Sparkles className="size-5 text-[color:var(--accent)]" />
                <span>Use the app like a tool</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
              <p>Overview: start fast or reopen recent work.</p>
              <p>Projects: inspect versions, duplicate, snapshot, import, export.</p>
              <p>Builder: compose, preview, guide with AI, and export.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
