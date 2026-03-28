// File: spritecraft-web/src/app/_components/project-browser.tsx

"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  Download,
  ExternalLink,
  FolderSearch,
  History,
  PackagePlus,
  RefreshCw,
  Search,
  Save,
  Trash2,
} from "lucide-react";

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
import { buildStudioRestoreUrl } from "~/app/_components/project-launching";
import { workspaceLoadEventName } from "~/app/_components/web-workspace-bridge";
import type { SpriteCraftProjectSummary } from "~/server/spritecraft-backend";

type ProjectBrowserProps = {
  projects: SpriteCraftProjectSummary[];
};

type FeedbackState = {
  tone: "default" | "success" | "warning" | "destructive";
  message: string;
};

function formatProjectDate(value?: string) {
  if (!value) return "Unknown";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getProjectLabel(project: SpriteCraftProjectSummary) {
  return project.projectName ?? project.prompt ?? "Untitled project";
}

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}`);
  }
  return payload;
}

export function ProjectBrowser({
  projects: initialProjects,
}: ProjectBrowserProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sort, setSort] = useState<"newest" | "updated" | "layers" | "name">(
    "newest",
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProjects[0]?.id ?? null,
  );
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [importPath, setImportPath] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [editorProjectName, setEditorProjectName] = useState(
    initialProjects[0]?.projectName ?? "",
  );
  const [editorNotes, setEditorNotes] = useState(
    initialProjects[0]?.notes ?? "",
  );
  const [editorTags, setEditorTags] = useState(
    initialProjects[0]?.tags.join(", ") ?? "",
  );
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const terms = deferredSearch
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    const visible = projects.filter((project) => {
      if (!terms.length) return true;
      const haystack = [
        project.projectName ?? "",
        project.prompt ?? "",
        project.notes ?? "",
        project.bodyType,
        project.animation,
        ...project.tags,
        ...project.promptHistory,
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
          Object.keys(right.selections).length -
          Object.keys(left.selections).length
        );
      }

      if (sort === "name") {
        return getProjectLabel(left).localeCompare(getProjectLabel(right));
      }

      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });
  }, [deferredSearch, projects, sort]);

  const selectedProject =
    filtered.find((project) => project.id === selectedId) ??
    projects.find((project) => project.id === selectedId) ??
    filtered[0] ??
    projects[0] ??
    null;

  function syncEditorFromProject(project: SpriteCraftProjectSummary | null) {
    setEditorProjectName(project?.projectName ?? "");
    setEditorNotes(project?.notes ?? "");
    setEditorTags(project?.tags.join(", ") ?? "");
  }

  async function refreshProjects(options?: { keepMessage?: boolean }) {
    const history = await readJson<{ items: SpriteCraftProjectSummary[] }>(
      "/api/spritecraft/history",
    );
    startTransition(() => {
      setProjects(history.items);
      setSelectedId((current) =>
        history.items.some((item) => item.id === current)
          ? current
          : (history.items[0]?.id ?? null),
      );
      syncEditorFromProject(history.items[0] ?? null);
      if (!options?.keepMessage) {
        setFeedback({
          tone: "success",
          message: "Project browser refreshed from the Dart backend.",
        });
      }
    });
  }

  async function runAction<T>(
    key: string,
    action: () => Promise<T>,
    onSuccess: (value: T) => void,
  ) {
    setActiveAction(key);
    setFeedback(null);
    try {
      const value = await action();
      startTransition(() => {
        onSuccess(value);
      });
    } catch (error) {
      setFeedback({
        tone: "destructive",
        message:
          error instanceof Error
            ? error.message
            : "SpriteCraft Web could not complete that action.",
      });
    } finally {
      setActiveAction(null);
    }
  }

  function buildSavePayload(
    project: SpriteCraftProjectSummary,
    overrides?: Partial<{
      projectName: string;
      notes: string;
      tags: string[];
    }>,
  ) {
    return {
      projectName:
        overrides?.projectName ??
        editorProjectName.trim() ??
        project.projectName ??
        "",
      notes: overrides?.notes ?? editorNotes.trim() ?? project.notes ?? "",
      tags:
        overrides?.tags ??
        editorTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      enginePreset: project.enginePreset ?? "none",
      bodyType: project.bodyType,
      animation: project.animation,
      prompt: project.prompt ?? "",
      selections: project.selections,
      renderSettings: project.renderSettings ?? {},
      exportSettings: project.exportSettings ?? {},
      promptHistory: project.promptHistory ?? [],
      exportHistory: project.exportHistory ?? [],
    };
  }

  function loadProjectIntoWebWorkspace(project: SpriteCraftProjectSummary) {
    window.dispatchEvent(
      new CustomEvent<SpriteCraftProjectSummary>(workspaceLoadEventName, {
        detail: project,
      }),
    );
    setFeedback({
      tone: "success",
      message: `Loaded ${getProjectLabel(project)} into the web workspace below.`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Browser</CardTitle>
        <CardDescription>
          Searchable saved work, inspection, duplication, deletion, package
          export, and package import backed by the existing Dart server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="flex items-center gap-3 text-sm text-(--muted-foreground)">
            <Search className="size-4 shrink-0" />
            <Input
              className="border-0 bg-transparent px-0 shadow-none"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects, prompts, tags, or selected layers"
              value={search}
            />
          </label>
          <Select
            onChange={(event) =>
              setSort(
                event.target.value as "newest" | "updated" | "layers" | "name",
              )
            }
            value={sort}
          >
            <option value="newest">Newest</option>
            <option value="updated">Recently updated</option>
            <option value="layers">Most layers</option>
            <option value="name">Name A-Z</option>
          </Select>
          <Button
            onClick={() =>
              void runAction(
                "refresh",
                () => refreshProjects({ keepMessage: true }),
                () => {
                  setFeedback({
                    tone: "success",
                    message: "Project browser refreshed from the Dart backend.",
                  });
                },
              )
            }
            variant="secondary"
          >
            <RefreshCw
              className={`mr-2 size-4 ${
                activeAction === "refresh" ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(300px,0.7fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">
                  Visible
                </p>
                <p className="mt-2 text-2xl font-semibold">{filtered.length}</p>
              </div>
              <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">
                  Total
                </p>
                <p className="mt-2 text-2xl font-semibold">{projects.length}</p>
              </div>
              <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">
                  Snapshots
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {
                    projects.filter((item) => item.tags.includes("snapshot"))
                      .length
                  }
                </p>
              </div>
            </div>

            {feedback ? (
              <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4 text-sm">
                <Badge variant={feedback.tone}>{feedback.tone}</Badge>
                <p className="mt-3 text-(--muted-foreground)">
                  {feedback.message}
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                onChange={(event) => setImportPath(event.target.value)}
                placeholder="Paste a .spritecraft-project.json path to import"
                value={importPath}
              />
              <Button
                disabled={!importPath.trim()}
                onClick={() =>
                  void runAction(
                    "import",
                    () =>
                      readJson<SpriteCraftProjectSummary>(
                        "/api/spritecraft/history/import",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            packagePath: importPath.trim(),
                          }),
                        },
                      ),
                    (imported) => {
                      setProjects((current) => [imported, ...current]);
                      setSelectedId(imported.id);
                      setImportPath("");
                      setFeedback({
                        tone: "success",
                        message: `Imported ${getProjectLabel(imported)} from a SpriteCraft project package.`,
                      });
                    },
                  )
                }
                variant="secondary"
              >
                <PackagePlus className="mr-2 size-4" />
                Import Package
              </Button>
            </div>

            <div className="grid gap-4">
              {filtered.length ? (
                filtered.slice(0, 10).map((project) => {
                  const isSelected = project.id === selectedProject?.id;
                  return (
                    <button
                      className={`rounded-3xl border p-4 text-left transition ${
                        isSelected
                          ? "border-(--accent) bg-(--accent-soft) shadow-[0_0_0_1px_var(--accent-soft)]"
                          : "border-(--border) bg-(--surface-soft) hover:border-(--accent-soft) hover:bg-(--surface-strong)"
                      }`}
                      key={project.id}
                      onClick={() => {
                        setSelectedId(project.id);
                        syncEditorFromProject(project);
                      }}
                      type="button"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-medium">
                          {getProjectLabel(project)}
                        </h3>
                        <Badge>
                          {formatProjectDate(
                            project.updatedAt ?? project.createdAt,
                          )}
                        </Badge>
                      </div>
                      <p className="mb-3 text-sm text-(--muted-foreground)">
                        {(project.prompt ?? "No prompt saved").slice(0, 160)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{project.bodyType}</Badge>
                        <Badge>{project.animation}</Badge>
                        <Badge>
                          {Object.keys(project.selections).length} layers
                        </Badge>
                        {project.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-(--border) p-6 text-sm text-(--muted-foreground)">
                  No projects match the current search.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="bg-(--surface-strong)">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>
                    {selectedProject
                      ? getProjectLabel(selectedProject)
                      : "Project detail"}
                  </span>
                  {selectedProject ? (
                    <Badge>{selectedProject.animation}</Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  Deep-link style inspector for the current migration slice.
                  Builder restore is still owned by the existing Dart Studio for
                  now.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedProject ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">
                          Created
                        </p>
                        <p className="mt-2 text-sm">
                          {formatProjectDate(selectedProject.createdAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">
                          Updated
                        </p>
                        <p className="mt-2 text-sm">
                          {formatProjectDate(
                            selectedProject.updatedAt ??
                              selectedProject.createdAt,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">
                        Prompt
                      </p>
                      <p className="mt-3 text-sm text-(--foreground)">
                        {selectedProject.prompt ??
                          "No prompt stored for this project."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">
                        Notes
                      </p>
                      <p className="mt-3 text-sm text-(--muted-foreground)">
                        {selectedProject.notes ?? "No notes stored yet."}
                      </p>
                    </div>

                    <div className="grid gap-3">
                      <Input
                        onChange={(event) =>
                          setEditorProjectName(event.target.value)
                        }
                        placeholder="Project name"
                        value={editorProjectName}
                      />
                      <Input
                        onChange={(event) => setEditorTags(event.target.value)}
                        placeholder="Tags, comma separated"
                        value={editorTags}
                      />
                      <textarea
                        className="min-h-28 rounded-2xl border border-(--border) bg-(--surface-soft) px-4 py-3 text-sm text-(--foreground) outline-none transition focus-visible:ring-2 focus-visible:ring-(--ring)"
                        onChange={(event) => setEditorNotes(event.target.value)}
                        placeholder="Notes"
                        value={editorNotes}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge>{selectedProject.bodyType}</Badge>
                      <Badge>{selectedProject.animation}</Badge>
                      <Badge>
                        {Object.keys(selectedProject.selections).length} layers
                      </Badge>
                      {selectedProject.enginePreset ? (
                        <Badge>{selectedProject.enginePreset}</Badge>
                      ) : null}
                      {selectedProject.tags.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">
                        Selected layers
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(selectedProject.selections).length ? (
                          Object.keys(selectedProject.selections).map((key) => (
                            <Badge key={key}>{key}</Badge>
                          ))
                        ) : (
                          <Badge>No explicit layers</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">
                          Prompt memory
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-(--muted-foreground)">
                          {selectedProject.promptHistory
                            .slice(0, 4)
                            .map((entry) => (
                              <li key={entry}>{entry}</li>
                            ))}
                          {selectedProject.promptHistory.length === 0 ? (
                            <li>No saved prompt history.</li>
                          ) : null}
                        </ul>
                      </div>
                      <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">
                          Export activity
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-(--muted-foreground)">
                          {selectedProject.exportHistory
                            .slice(0, 4)
                            .map((entry, index) => (
                              <li key={`${selectedProject.id}-export-${index}`}>
                                {entry.baseName?.toString() ??
                                  entry.bundlePath?.toString() ??
                                  "Recorded export"}
                              </li>
                            ))}
                          {selectedProject.exportHistory.length === 0 ? (
                            <li>No exports recorded yet.</li>
                          ) : null}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => loadProjectIntoWebWorkspace(selectedProject)}
                        type="button"
                        variant="secondary"
                      >
                        <Save className="mr-2 size-4" />
                        Load Into Web Workspace
                      </Button>
                      <Button
                        onClick={() =>
                          void runAction(
                            `save-version-${selectedProject.id}`,
                            () =>
                              readJson<SpriteCraftProjectSummary>(
                                "/api/spritecraft/history/save",
                                {
                                  method: "POST",
                                  body: JSON.stringify(
                                    buildSavePayload(selectedProject),
                                  ),
                                },
                              ),
                            (saved) => {
                              setProjects((current) => [saved, ...current]);
                              setSelectedId(saved.id);
                              syncEditorFromProject(saved);
                              setFeedback({
                                tone: "success",
                                message: `Saved ${getProjectLabel(saved)} as a new project version.`,
                              });
                            },
                          )
                        }
                        variant="secondary"
                      >
                        <Save className="mr-2 size-4" />
                        Save Version
                      </Button>
                      <Button
                        onClick={() =>
                          void runAction(
                            `snapshot-${selectedProject.id}`,
                            () =>
                              readJson<SpriteCraftProjectSummary>(
                                "/api/spritecraft/history/save",
                                {
                                  method: "POST",
                                  body: JSON.stringify(
                                    buildSavePayload(selectedProject, {
                                      projectName:
                                        (editorProjectName.trim() ||
                                          getProjectLabel(selectedProject)) +
                                        " Snapshot",
                                      notes: [
                                        editorNotes.trim(),
                                        `Snapshot created from ${getProjectLabel(selectedProject)}.`,
                                      ]
                                        .filter(Boolean)
                                        .join("\n\n"),
                                      tags: Array.from(
                                        new Set([
                                          ...editorTags
                                            .split(",")
                                            .map((tag) => tag.trim())
                                            .filter(Boolean),
                                          "snapshot",
                                        ]),
                                      ),
                                    }),
                                  ),
                                },
                              ),
                            (snapshot) => {
                              setProjects((current) => [snapshot, ...current]);
                              setSelectedId(snapshot.id);
                              syncEditorFromProject(snapshot);
                              setFeedback({
                                tone: "success",
                                message: `Created snapshot ${getProjectLabel(snapshot)}.`,
                              });
                            },
                          )
                        }
                        variant="secondary"
                      >
                        <History className="mr-2 size-4" />
                        Create Snapshot
                      </Button>
                      <Button asChild>
                        <a
                          href={buildStudioRestoreUrl(selectedProject.id)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="mr-2 size-4" />
                          Restore In Studio
                        </a>
                      </Button>
                      <Button
                        onClick={() =>
                          void runAction(
                            `duplicate-${selectedProject.id}`,
                            () =>
                              readJson<SpriteCraftProjectSummary>(
                                `/api/spritecraft/history/${selectedProject.id}/duplicate`,
                                { method: "POST" },
                              ),
                            (duplicated) => {
                              setProjects((current) => [
                                duplicated,
                                ...current,
                              ]);
                              setSelectedId(duplicated.id);
                              setFeedback({
                                tone: "success",
                                message: `Duplicated ${getProjectLabel(selectedProject)}.`,
                              });
                            },
                          )
                        }
                        variant="secondary"
                      >
                        <FolderSearch className="mr-2 size-4" />
                        Duplicate
                      </Button>
                      <Button
                        onClick={() =>
                          void runAction(
                            `export-${selectedProject.id}`,
                            () =>
                              readJson<{
                                packagePath: string;
                                baseName: string;
                              }>(
                                `/api/spritecraft/history/${selectedProject.id}/export-package`,
                                { method: "POST" },
                              ),
                            (payload) => {
                              setFeedback({
                                tone: "success",
                                message: `Exported package ${payload.baseName} to ${payload.packagePath}.`,
                              });
                            },
                          )
                        }
                        variant="secondary"
                      >
                        <Download className="mr-2 size-4" />
                        Export Package
                      </Button>
                      <Button
                        onClick={() =>
                          void runAction(
                            `delete-${selectedProject.id}`,
                            () =>
                              readJson<{ deleted: string }>(
                                `/api/spritecraft/history/${selectedProject.id}`,
                                { method: "DELETE" },
                              ),
                            () => {
                              setProjects((current) =>
                                current.filter(
                                  (item) => item.id !== selectedProject.id,
                                ),
                              );
                              setSelectedId((current) =>
                                current === selectedProject.id ? null : current,
                              );
                              setFeedback({
                                tone: "warning",
                                message: `Deleted ${getProjectLabel(selectedProject)} from backend history.`,
                              });
                            },
                          )
                        }
                        variant="ghost"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-(--border) p-6 text-sm text-(--muted-foreground)">
                    Select a project to inspect its saved SpriteCraft metadata.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4 text-sm text-(--muted-foreground)">
              <p className="font-medium text-(--foreground)">
                Current migration boundary
              </p>
              <p className="mt-2">
                This web shell now owns browsing, restore handoff, saved-project
                versioning, snapshots, duplication, deletion, and package
                transfer. The Dart Studio remains the active live builder and
                renderer.
              </p>
              <Button asChild className="mt-4" variant="ghost">
                <a
                  href="http://127.0.0.1:8080"
                  rel="noreferrer"
                  target="_blank"
                >
                  Open the current Studio builder
                </a>
              </Button>
            </div>
          </div>
        </div>

        {isPending ? (
          <p className="text-sm text-(--muted-foreground)">
            Synchronizing with the Dart backend...
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
