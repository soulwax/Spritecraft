import Link from "next/link";
import { Bot, Boxes, Compass, PackageCheck } from "lucide-react";

import { CatalogScout } from "~/app/_components/catalog-scout";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getStudioPageData } from "~/server/studio-page-data";

export default async function BuilderPage() {
  const { bodyTypes, animations, bootstrap } = await getStudioPageData();

  return (
    <main className="flex flex-col gap-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_0.85fr]">
        <div className="rounded-[36px] border border-[color:var(--border-strong)] bg-[color:var(--hero-surface)] px-6 py-7 shadow-[0_28px_100px_rgba(0,0,0,0.26)] sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">Builder</Badge>
            <Badge>Preview, AI, export</Badge>
          </div>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-5xl">
            Compose the character here.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--hero-copy)]">
            Launch presets, restored projects, AI guidance, previews, and export
            all meet in this one working route.
          </p>
        </div>

        <div className="grid gap-4">
          {[
            {
              icon: Compass,
              title: "Catalog exploration",
              description:
                "Search the layered asset library with body-type and animation-aware context.",
            },
            {
              icon: Bot,
              title: "Guided building",
              description:
                bootstrap?.config.hasGemini
                    ? "Gemini-backed briefs can turn prompts into build paths and candidate layer sets."
                    : "The builder still works without Gemini and falls back to local recommendation logic.",
            },
            {
              icon: PackageCheck,
              title: "Export-aware workflow",
              description:
                "Keep export settings and engine presets close to the composition while you work.",
            },
          ].map((item) => (
            <Card
              className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/78"
              key={item.title}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="mt-0.5 flex size-12 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--accent)]">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-[color:var(--foreground)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                    {item.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/78">
            <CardContent className="p-5">
              <Link
                className="text-sm font-medium text-[color:var(--accent)] transition-opacity hover:opacity-80"
                href="/projects"
              >
                Open saved projects
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/72">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Boxes className="size-5 text-[color:var(--accent)]" />
            <span>Builder workspace</span>
          </CardTitle>
          <CardDescription className="text-base leading-7">
            Body types: {bodyTypes.length}. Animation targets: {animations.length}.
            This is the main working surface.
          </CardDescription>
        </CardHeader>
      </Card>

      <CatalogScout animations={animations} bodyTypes={bodyTypes} />
    </main>
  );
}
