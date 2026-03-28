import { ArrowRight, Boxes, FolderKanban, HeartHandshake, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getStudioBootstrap, getStudioHealth } from "@/lib/spritecraft-api";

function statusVariant(status: string): "default" | "warning" | "destructive" | "success" {
  if (status === "ok") return "success";
  if (status === "warning") return "warning";
  if (status === "error") return "destructive";
  return "default";
}

export default async function HomePage() {
  const [bootstrap, health] = await Promise.all([
    getStudioBootstrap(),
    getStudioHealth(),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden bg-transparent">
          <CardHeader className="gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="success">Parallel T3 Migration</Badge>
              <Badge>Alongside Current Studio</Badge>
            </div>
            <CardTitle className="max-w-3xl text-4xl leading-tight">
              SpriteCraft Web is now scaffolded as a parallel Next App Router shell.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              This new surface is the safe migration lane for the existing Dart Studio.
              It mirrors live backend health and project data first, then we can move
              feature slices over without destabilizing the current app.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild={false}>
              <a href="http://127.0.0.1:8080" target="_blank" rel="noreferrer">
                Open Current Studio <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
            <Button variant="secondary" asChild={false}>
              <a
                href="https://create.t3.gg"
                target="_blank"
                rel="noreferrer"
              >
                T3 Reference
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Migration Status</CardTitle>
            <CardDescription>
              Live signal from the existing Dart backend while the T3 shell is being
              brought online.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant(health?.status ?? "warning")}>
                Backend {health?.status ?? "offline"}
              </Badge>
              <Badge>
                Catalog {bootstrap?.catalog.itemCount ?? 0} items
              </Badge>
              <Badge>{bootstrap?.recent.length ?? 0} recent projects</Badge>
            </div>
            <Separator />
            <div className="space-y-3 text-sm text-[color:var(--muted-foreground)]">
              {(health?.checks ?? []).slice(0, 5).map((check) => (
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
                  <Badge variant={statusVariant(check.status)}>{check.status}</Badge>
                </div>
              ))}
              {!health && (
                <p>
                  The backend is not reachable yet. Start the Dart Studio server and this
                  shell will begin reflecting live data.
                </p>
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
              The alongside plan keeps risk low by moving feature areas one by one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                icon: FolderKanban,
                title: "Project browser first",
                description:
                  "Live recent-project visibility is already available from the backend bootstrap payload.",
              },
              {
                icon: Boxes,
                title: "Health + shell layout",
                description:
                  "The new app already reflects backend status, making it a practical control surface.",
              },
              {
                icon: Sparkles,
                title: "Builder migration later",
                description:
                  "Selection, preview, and AI flows can move over in slices once this shell is stable.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4"
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
              First migration slice from the current backend: recent saved work, tags,
              prompts, and export activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(bootstrap?.recent ?? []).length > 0 ? (
              bootstrap!.recent.slice(0, 6).map((project) => (
                <div
                  key={project.id}
                  className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4"
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
                No backend project data is visible yet. Once the Dart Studio is running
                with history enabled, this panel will become a migration target for the
                richer T3 browser experience.
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
            We keep the current Studio shipping while the new web app earns trust.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Why T3</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[color:var(--muted-foreground)]">
            Next App Router, TypeScript, Tailwind, and a `shadcn`-style component base
            give us a stronger product surface for future UX work.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Why now</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-3 text-sm text-[color:var(--muted-foreground)]">
            <HeartHandshake className="mt-0.5 size-4 shrink-0 text-amber-300" />
            The Dart backend and project model are finally stable enough that a parallel
            frontend can move faster without guessing at the domain.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
