import { FolderKanban, History, Search, Sparkles } from "lucide-react";
import Link from "next/link";

import { ProjectBrowser } from "~/app/_components/project-browser";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getStudioPageData } from "~/server/studio-page-data";

export default async function ProjectsPage() {
  const { recentProjects, bodyTypes, animations } = await getStudioPageData();

  return (
    <main className="flex flex-col gap-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_0.82fr]">
        <div className="rounded-[36px] border border-[color:var(--border-strong)] bg-[color:var(--hero-surface)] px-6 py-7 shadow-[0_28px_100px_rgba(0,0,0,0.26)] sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">Projects</Badge>
            <Badge>History and versions</Badge>
          </div>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-5xl">
            Saved characters, snapshots, and version history.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--hero-copy)]">
            Use this page when you want to inspect, organize, duplicate, or
            package saved work before jumping back into the builder.
          </p>
        </div>

        <div className="grid gap-4">
          {[
            {
              icon: FolderKanban,
              label: "Recent projects",
              value: `${recentProjects.length}`,
            },
            {
              icon: History,
              label: "Body targets",
              value: `${bodyTypes.length}`,
            },
            {
              icon: Sparkles,
              label: "Animation targets",
              value: `${animations.length}`,
            },
          ].map((item) => (
            <Card
              className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/78"
              key={item.label}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--accent)]">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                    {item.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/78">
            <CardContent className="p-5">
              <Link
                className="text-sm font-medium text-[color:var(--accent)] transition-opacity hover:opacity-80"
                href="/builder"
              >
                Go to builder
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/72">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Search className="size-5 text-[color:var(--accent)]" />
            <span>Project browser</span>
          </CardTitle>
          <CardDescription className="text-base leading-7">
            Restore into the builder, save versions, duplicate, delete, or
            export a packaged project.
          </CardDescription>
        </CardHeader>
      </Card>

      <ProjectBrowser projects={recentProjects} />
    </main>
  );
}
