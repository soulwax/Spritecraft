"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Compass,
  ExternalLink,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";

import { buildStudioTemplateUrl } from "~/app/_components/project-launching";
import {
  normalizeWorkspaceDraft,
  projectToWorkspaceDraft,
  type CatalogWorkspaceDraft,
  workspaceLoadEventName,
  workspacePresetsStorageKey,
  workspaceStorageKey,
} from "~/app/_components/web-workspace-bridge";
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
import type {
  SpriteCraftCatalogItem,
  SpriteCraftProjectSummary,
  SpriteCraftRenderPreview,
} from "~/server/spritecraft-backend";

type CatalogScoutProps = {
  bodyTypes: string[];
  animations: string[];
};

type CatalogScoutResponse = {
  items: SpriteCraftCatalogItem[];
};

type WorkspaceFeedback = {
  tone: "success" | "warning" | "destructive";
  message: string;
};

export function CatalogScout({ bodyTypes, animations }: CatalogScoutProps) {
  const [workspaceName, setWorkspaceName] = useState("Web Builder Workspace");
  const [query, setQuery] = useState("");
  const [workspaceNotes, setWorkspaceNotes] = useState("");
  const [workspaceTags, setWorkspaceTags] = useState<string[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [sourceProjectId, setSourceProjectId] = useState<string | null>(null);
  const [sourceProjectLabel, setSourceProjectLabel] = useState<string | null>(
    null,
  );
  const [bodyType, setBodyType] = useState(bodyTypes[0] ?? "male");
  const [animation, setAnimation] = useState(animations[0] ?? "idle");
  const [category, setCategory] = useState("all");
  const [tag, setTag] = useState("all");
  const [items, setItems] = useState<SpriteCraftCatalogItem[]>([]);
  const [stagedSelections, setStagedSelections] = useState<
    Record<string, string>
  >({});
  const [variantChoices, setVariantChoices] = useState<Record<string, string>>(
    {},
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [workspaceSavedAt, setWorkspaceSavedAt] = useState<string | null>(null);
  const [preview, setPreview] = useState<SpriteCraftRenderPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [previewError, setPreviewError] = useState("");
  const [workspacePresets, setWorkspacePresets] = useState<
    CatalogWorkspaceDraft[]
  >([]);
  const [workspaceFeedback, setWorkspaceFeedback] =
    useState<WorkspaceFeedback | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [saveMode, setSaveMode] = useState<"fresh" | "version" | null>(null);

  function applyWorkspaceDraft(draft: CatalogWorkspaceDraft) {
    setWorkspaceName(draft.name);
    setQuery(draft.query);
    setWorkspaceNotes(draft.notes);
    setWorkspaceTags(draft.tags);
    setPromptHistory(draft.promptHistory);
    setSourceProjectId(draft.sourceProjectId);
    setSourceProjectLabel(draft.sourceProjectLabel);
    setBodyType(
      bodyTypes.includes(draft.bodyType)
        ? draft.bodyType
        : (bodyTypes[0] ?? "male"),
    );
    setAnimation(
      animations.includes(draft.animation)
        ? draft.animation
        : (animations[0] ?? "idle"),
    );
    setCategory(draft.category);
    setTag(draft.tag);
    setStagedSelections(draft.stagedSelections);
    setVariantChoices(draft.variantChoices);
    setWorkspaceSavedAt(draft.savedAt);
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(workspaceStorageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<CatalogWorkspaceDraft>;
      const normalized = normalizeWorkspaceDraft(parsed);
      if (!normalized) {
        return;
      }
      applyWorkspaceDraft(normalized);
    } catch (error) {
      console.warn(
        "Could not restore SpriteCraft Web catalog workspace.",
        error,
      );
    }
  }, [animations, bodyTypes]);

  useEffect(() => {
    function handleWorkspaceLoad(event: Event) {
      const detail = (event as CustomEvent<SpriteCraftProjectSummary>).detail;
      if (!detail) {
        return;
      }

      const draft = projectToWorkspaceDraft(detail);
      applyWorkspaceDraft(draft);
      setWorkspaceFeedback({
        tone: "success",
        message: `Loaded ${detail.projectName ?? "saved project"} into the web workspace.`,
      });
    }

    window.addEventListener(workspaceLoadEventName, handleWorkspaceLoad);
    return () => {
      window.removeEventListener(workspaceLoadEventName, handleWorkspaceLoad);
    };
  }, [animations, bodyTypes]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(workspacePresetsStorageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      setWorkspacePresets(
        parsed
          .map((entry) => normalizeWorkspaceDraft(entry))
          .filter((entry): entry is CatalogWorkspaceDraft => entry !== null),
      );
    } catch (error) {
      console.warn(
        "Could not restore SpriteCraft Web workspace presets.",
        error,
      );
    }
  }, []);

  useEffect(() => {
    try {
      const savedAt = new Date().toISOString();
      const payload: CatalogWorkspaceDraft = {
        name: workspaceName.trim() || "Web Builder Workspace",
        query,
        notes: workspaceNotes,
        tags: workspaceTags,
        promptHistory,
        sourceProjectId,
        sourceProjectLabel,
        bodyType,
        animation,
        category,
        tag,
        stagedSelections,
        variantChoices,
        savedAt,
      };
      window.localStorage.setItem(workspaceStorageKey, JSON.stringify(payload));
      setWorkspaceSavedAt(savedAt);
    } catch (error) {
      console.warn("Could not save SpriteCraft Web catalog workspace.", error);
    }
  }, [
    animation,
    bodyType,
    category,
    promptHistory,
    query,
    sourceProjectId,
    sourceProjectLabel,
    stagedSelections,
    tag,
    variantChoices,
    workspaceNotes,
    workspaceName,
    workspaceTags,
  ]);

  useEffect(() => {
    if (!Object.keys(stagedSelections).length) {
      setPreview(null);
      setPreviewStatus("idle");
      setPreviewError("");
      return;
    }

    let cancelled = false;

    async function loadPreview() {
      setPreviewStatus("loading");
      setPreviewError("");

      try {
        const response = await fetch("/api/spritecraft/render", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            bodyType,
            animation,
            prompt: query,
            selections: stagedSelections,
          }),
          cache: "no-store",
        });
        const payload = (await response.json()) as SpriteCraftRenderPreview & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(
            payload.error ??
              "SpriteCraft Web could not render the workspace preview.",
          );
        }
        if (cancelled) {
          return;
        }
        setPreview(payload);
        setPreviewStatus("idle");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setPreview(null);
        setPreviewStatus("error");
        setPreviewError(
          error instanceof Error
            ? error.message
            : "SpriteCraft Web could not render the workspace preview.",
        );
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [animation, bodyType, query, stagedSelections]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setErrorMessage("");

      try {
        const params = new URLSearchParams({
          q: query,
          bodyType,
          animation,
        });
        const response = await fetch(
          `/api/spritecraft/catalog?${params.toString()}`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as CatalogScoutResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(
            payload.error ?? "SpriteCraft Web could not scout the catalog.",
          );
        }
        if (cancelled) {
          return;
        }
        setItems(payload.items ?? []);
        setStatus("idle");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setItems([]);
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "SpriteCraft Web could not scout the catalog.",
        );
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [animation, bodyType, query]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.category).filter(Boolean)),
      ).sort(),
    [items],
  );

  const tags = useMemo(
    () =>
      Array.from(
        new Set(items.flatMap((item) => item.tags ?? []).filter(Boolean)),
      ).sort(),
    [items],
  );

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (category !== "all" && item.category !== category) {
          return false;
        }
        if (tag !== "all" && !(item.tags ?? []).includes(tag)) {
          return false;
        }
        return true;
      }),
    [category, items, tag],
  );

  const stagedItems = useMemo(
    () => items.filter((item) => Object.hasOwn(stagedSelections, item.id)),
    [items, stagedSelections],
  );

  function getVariantChoice(item: SpriteCraftCatalogItem) {
    return variantChoices[item.id] ?? item.variants[0] ?? "default";
  }

  function updateVariantChoice(itemId: string, value: string) {
    setVariantChoices((current) => ({
      ...current,
      [itemId]: value,
    }));
  }

  function stageItem(item: SpriteCraftCatalogItem) {
    const nextVariant = getVariantChoice(item);
    setStagedSelections((current) => ({
      ...current,
      [item.id]: nextVariant,
    }));
  }

  function unstageItem(itemId: string) {
    setStagedSelections((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  }

  function moveStagedItem(itemId: string, direction: -1 | 1) {
    setStagedSelections((current) => {
      const entries = Object.entries(current);
      const index = entries.findIndex(
        ([entryItemId]) => entryItemId === itemId,
      );
      if (index < 0) {
        return current;
      }

      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= entries.length) {
        return current;
      }

      const reordered = [...entries];
      const [moved] = reordered.splice(index, 1) as [[string, string]];
      reordered.splice(nextIndex, 0, moved);
      return Object.fromEntries(reordered);
    });
  }

  function clearWorkspace() {
    setWorkspaceName("Web Builder Workspace");
    setQuery("");
    setWorkspaceNotes("");
    setWorkspaceTags([]);
    setPromptHistory([]);
    setSourceProjectId(null);
    setSourceProjectLabel(null);
    setBodyType(bodyTypes[0] ?? "male");
    setAnimation(animations[0] ?? "idle");
    setCategory("all");
    setTag("all");
    setStagedSelections({});
    setVariantChoices({});
    try {
      window.localStorage.removeItem(workspaceStorageKey);
    } catch (error) {
      console.warn("Could not clear SpriteCraft Web catalog workspace.", error);
    }
    setWorkspaceSavedAt(null);
  }

  function buildWorkspaceDraft(): CatalogWorkspaceDraft {
    return {
      name: workspaceName.trim() || "Web Builder Workspace",
      query,
      notes: workspaceNotes,
      tags: workspaceTags,
      promptHistory,
      sourceProjectId,
      sourceProjectLabel,
      bodyType,
      animation,
      category,
      tag,
      stagedSelections,
      variantChoices,
      savedAt: new Date().toISOString(),
    };
  }

  function persistWorkspacePresets(nextPresets: CatalogWorkspaceDraft[]) {
    setWorkspacePresets(nextPresets);
    try {
      window.localStorage.setItem(
        workspacePresetsStorageKey,
        JSON.stringify(nextPresets),
      );
    } catch (error) {
      console.warn("Could not save SpriteCraft Web workspace presets.", error);
    }
  }

  function saveWorkspacePreset() {
    const draft = buildWorkspaceDraft();
    const nextPresets = [
      draft,
      ...workspacePresets.filter((entry) => entry.name !== draft.name),
    ].slice(0, 12);
    persistWorkspacePresets(nextPresets);
    setWorkspaceSavedAt(draft.savedAt);
  }

  function commitPromptHistory(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (!trimmed) {
      return;
    }

    setPromptHistory((current) => [
      trimmed,
      ...current.filter((entry) => entry !== trimmed),
    ].slice(0, 8));
  }

  function removePromptHistoryEntry(entryToRemove: string) {
    setPromptHistory((current) =>
      current.filter((entry) => entry !== entryToRemove),
    );
  }

  async function saveWorkspaceProject(mode: "fresh" | "version") {
    if (!Object.keys(stagedSelections).length) {
      setWorkspaceFeedback({
        tone: "warning",
        message:
          "Stage at least one layer before saving this workspace as a project.",
      });
      return;
    }

    setIsSavingProject(true);
    setSaveMode(mode);
    setWorkspaceFeedback(null);

    const projectName =
      workspaceName.trim() ||
      sourceProjectLabel ||
      "Web Builder Workspace";
    const mergedPromptHistory = Array.from(
      new Set([...(query.trim() ? [query.trim()] : []), ...promptHistory]),
    ).slice(0, 8);
    const mergedTags = Array.from(
      new Set([
        ...workspaceTags,
        "web-workspace",
        ...(sourceProjectId ? ["web-restored"] : ["migration-slice"]),
        ...(mode == "version" ? ["web-version"] : []),
      ]),
    );
    const mergedNotes =
      workspaceNotes.trim() ||
      (mode === "version" && sourceProjectLabel
        ? `Saved as a new web workspace version of ${sourceProjectLabel}.`
        : "Created from the SpriteCraft Web workspace before launching into the Dart Studio.");

    try {
      const response = await fetch("/api/spritecraft/history/save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectName,
          notes: mergedNotes,
          tags: mergedTags,
          enginePreset: "none",
          bodyType,
          animation,
          prompt: query.trim(),
          selections: stagedSelections,
          renderSettings: {
            previewMode: "single",
            category,
            animationFilter: "current",
            tagFilter: tag,
            source: "spritecraft-web-workspace",
            sourceProjectId,
            versionMode: mode,
          },
          exportSettings: {
            enginePreset: "none",
          },
          promptHistory: mergedPromptHistory,
          exportHistory: [],
        }),
      });
      const payload = (await response.json()) as SpriteCraftProjectSummary & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ??
            "SpriteCraft Web could not save the current workspace as a project.",
        );
      }

      setSourceProjectId(payload.id);
      setSourceProjectLabel(payload.projectName ?? projectName);
      setWorkspaceTags(payload.tags ?? mergedTags);
      setPromptHistory(payload.promptHistory ?? mergedPromptHistory);
      setWorkspaceNotes(payload.notes ?? mergedNotes);
      setWorkspaceFeedback({
        tone: "success",
        message:
          mode === "version"
            ? `Saved ${payload.projectName ?? "workspace project"} as a new version from the web workspace.`
            : `Saved ${payload.projectName ?? "workspace project"} to SpriteCraft history.`,
      });
    } catch (error) {
      setWorkspaceFeedback({
        tone: "destructive",
        message:
          error instanceof Error
            ? error.message
            : "SpriteCraft Web could not save the current workspace as a project.",
      });
    } finally {
      setIsSavingProject(false);
      setSaveMode(null);
    }
  }

  function loadWorkspacePreset(presetName: string) {
    const preset = workspacePresets.find((entry) => entry.name === presetName);
    if (!preset) {
      return;
    }

    applyWorkspaceDraft(preset);
  }

  function deleteWorkspacePreset(presetName: string) {
    persistWorkspacePresets(
      workspacePresets.filter((entry) => entry.name !== presetName),
    );
  }

  function formatSavedAt(value: string | null) {
    if (!value) {
      return "Not saved yet";
    }
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  const studioScoutUrl = buildStudioTemplateUrl({
    bodyType,
    animation,
    projectName:
      workspaceName.trim() ||
      (query.trim() ? `Scout ${query.trim()}` : "Scouted Project"),
    prompt: "",
    enginePreset: "none",
    previewMode: "single",
    category,
    animationFilter: "current",
    tagFilter: tag,
    catalogSearch: query.trim(),
    seededSelections: stagedSelections,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Compass className="size-5 text-[color:var(--accent)]" />
          <span>Catalog Scout</span>
        </CardTitle>
        <CardDescription>
          Scout the LPC catalog from the web app, keep a small persistent
          selection workspace, then open the Dart Studio with that intent
          already applied.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Input
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Workspace name"
            value={workspaceName}
          />
          <Button
            onClick={saveWorkspacePreset}
            type="button"
            variant="secondary"
          >
            <Save className="mr-2 size-4" />
            Save Preset
          </Button>
          <Button onClick={clearWorkspace} type="button" variant="secondary">
            <Trash2 className="mr-2 size-4" />
            Clear Workspace
          </Button>
          <div className="flex items-center rounded-2xl border border-(--border) bg-(--surface-soft) px-4 text-sm text-[color:var(--muted-foreground)]">
            <RotateCcw className="mr-2 size-4" />
            {formatSavedAt(workspaceSavedAt)}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[auto_auto_minmax(0,1fr)]">
          {sourceProjectId ? (
            <Button
              disabled={isSavingProject || !Object.keys(stagedSelections).length}
              onClick={() => void saveWorkspaceProject("version")}
              type="button"
              variant="secondary"
            >
              <Save className="mr-2 size-4" />
              {saveMode === "version"
                ? "Saving Version..."
                : "Save As New Version"}
            </Button>
          ) : null}
          <Button
            disabled={isSavingProject || !Object.keys(stagedSelections).length}
            onClick={() => void saveWorkspaceProject("fresh")}
            type="button"
          >
            <Save className="mr-2 size-4" />
            {saveMode === "fresh"
              ? "Saving Project..."
              : "Save Workspace As Project"}
          </Button>
          {workspaceFeedback ? (
            <div className="flex items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
              <Badge
                variant={
                  workspaceFeedback.tone === "success"
                    ? "success"
                    : workspaceFeedback.tone === "warning"
                      ? "warning"
                      : "destructive"
                }
              >
                {workspaceFeedback.tone}
              </Badge>
              <span className="ml-3">{workspaceFeedback.message}</span>
            </div>
          ) : (
            <div className="flex items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
              {sourceProjectId
                ? "This restored workspace can now save forward as a new version or branch off as a fresh project."
                : "Saving here creates a real SpriteCraft project from the current web workspace, even before opening Studio."}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                Workspace Presets
              </p>
              <h3 className="mt-2 text-lg font-semibold">
                Reusable named setups
              </h3>
            </div>
            <Badge>{workspacePresets.length} saved</Badge>
          </div>
          {workspacePresets.length ? (
            <div className="grid gap-3">
              {workspacePresets.map((preset) => (
                <div
                  className="grid gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"
                  key={preset.name}
                >
                  <div>
                    <strong>{preset.name}</strong>
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      {preset.bodyType} · {preset.animation} ·{" "}
                      {Object.keys(preset.stagedSelections).length} staged layer
                      {Object.keys(preset.stagedSelections).length === 1
                        ? ""
                        : "s"}
                    </p>
                  </div>
                  <Button
                    onClick={() => loadWorkspacePreset(preset.name)}
                    type="button"
                    variant="secondary"
                  >
                    Load
                  </Button>
                  <Button
                    onClick={() => deleteWorkspacePreset(preset.name)}
                    type="button"
                    variant="secondary"
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Save the current web workspace as a named preset to keep multiple
              builder setups around.
            </p>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4">
            <Search className="size-4 shrink-0 text-[color:var(--muted-foreground)]" />
            <Input
              className="border-0 bg-transparent px-0 shadow-none"
              onBlur={(event) => commitPromptHistory(event.target.value)}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Scout ranger, hood, mage, wolf, plate..."
              value={query}
            />
          </label>
          <Select
            onChange={(event) => setBodyType(event.target.value)}
            value={bodyType}
          >
            {bodyTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Select
            onChange={(event) => setAnimation(event.target.value)}
            value={animation}
          >
            {animations.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Button asChild>
            <a href={studioScoutUrl} rel="noreferrer" target="_blank">
              <ExternalLink className="mr-2 size-4" />
              Scout In Studio
            </a>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_0.9fr]">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Workspace Context
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  Notes, tags, and prompt memory
                </h3>
              </div>
              {sourceProjectLabel ? (
                <Badge variant="warning">Loaded from {sourceProjectLabel}</Badge>
              ) : (
                <Badge>Web-native draft</Badge>
              )}
            </div>
            <div className="grid gap-3">
              <Input
                onChange={(event) =>
                  setWorkspaceTags(
                    event.target.value
                      .split(",")
                      .map((entry) => entry.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="Tags, comma separated"
                value={workspaceTags.join(", ")}
              />
              <textarea
                className="min-h-24 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
                onChange={(event) => setWorkspaceNotes(event.target.value)}
                placeholder="Workspace notes"
                value={workspaceNotes}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Prompt Memory
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  Reusable intent trail
                </h3>
              </div>
              <Badge>{promptHistory.length} saved</Badge>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                onClick={() => commitPromptHistory(query)}
                type="button"
                variant="secondary"
              >
                Save Current Prompt
              </Button>
              <Button
                disabled={!promptHistory.length}
                onClick={() => setPromptHistory([])}
                type="button"
                variant="secondary"
              >
                Clear Prompt Memory
              </Button>
            </div>
            {promptHistory.length ? (
              <div className="grid gap-2">
                {promptHistory.map((entry) => (
                  <div
                    className="grid gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                    key={entry}
                  >
                    <button
                      className="px-2 py-1 text-left text-sm text-[color:var(--muted-foreground)] transition hover:text-[color:var(--foreground)]"
                      onClick={() => setQuery(entry)}
                      type="button"
                    >
                      {entry}
                    </button>
                    <Button
                      onClick={() => removePromptHistoryEntry(entry)}
                      type="button"
                      variant="secondary"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Save prompts here while iterating so restored web workspaces keep
                their creative context too.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
              Matches
            </p>
            <p className="mt-2 text-2xl font-semibold">{visibleItems.length}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
              Body type
            </p>
            <p className="mt-2 text-lg font-semibold">{bodyType}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
              Animation
            </p>
            <p className="mt-2 text-lg font-semibold">{animation}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
              Status
            </p>
            <p className="mt-2 text-lg font-semibold">
              {status === "loading"
                ? "Loading"
                : status === "error"
                  ? "Needs attention"
                  : "Ready"}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4 lg:col-span-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
              Staged layers
            </p>
            <p className="mt-2 text-lg font-semibold">{stagedItems.length}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option value="all">All categories</option>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Select onChange={(event) => setTag(event.target.value)} value={tag}>
            <option value="all">All tags</option>
            {tags.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>

        {status === "error" ? (
          <div className="rounded-2xl border border-[color:var(--destructive)]/40 bg-[color:var(--surface-soft)] p-4 text-sm text-[color:var(--muted-foreground)]">
            {errorMessage}
          </div>
        ) : null}

        <div className="rounded-3xl border border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                Web Workspace
              </p>
              <h3 className="mt-2 text-lg font-semibold">
                {workspaceName.trim() || "Web Builder Workspace"}
              </h3>
            </div>
            <Badge>{stagedItems.length} staged</Badge>
          </div>
          {(workspaceTags.length || workspaceNotes.trim() || sourceProjectLabel) ? (
            <div className="mb-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-3">
              {sourceProjectLabel ? (
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Restored from{" "}
                  <span className="font-medium text-[color:var(--foreground)]">
                    {sourceProjectLabel}
                  </span>
                  {sourceProjectId ? ` (${sourceProjectId})` : ""}.
                </p>
              ) : null}
              {workspaceNotes.trim() ? (
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  {workspaceNotes}
                </p>
              ) : null}
              {workspaceTags.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {workspaceTags.map((entry) => (
                    <Badge key={entry}>{entry}</Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {stagedItems.length ? (
            <div className="grid gap-3">
              {stagedItems.map((item, index) => (
                <div
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
                  key={item.id}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <strong>{item.name}</strong>
                      <p className="text-sm text-[color:var(--muted-foreground)]">
                        {item.typeName} · {item.category}
                      </p>
                    </div>
                    <Badge>{stagedSelections[item.id]}</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                    <Select
                      onChange={(event) => {
                        updateVariantChoice(item.id, event.target.value);
                        setStagedSelections((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }));
                      }}
                      value={stagedSelections[item.id]}
                    >
                      {(item.variants.length ? item.variants : ["default"]).map(
                        (variant) => (
                          <option
                            key={`${item.id}-staged-${variant}`}
                            value={variant}
                          >
                            {variant}
                          </option>
                        ),
                      )}
                    </Select>
                    <Button
                      disabled={index === 0}
                      onClick={() => moveStagedItem(item.id, -1)}
                      type="button"
                      variant="secondary"
                    >
                      Up
                    </Button>
                    <Button
                      disabled={index === stagedItems.length - 1}
                      onClick={() => moveStagedItem(item.id, 1)}
                      type="button"
                      variant="secondary"
                    >
                      Down
                    </Button>
                    <Button
                      onClick={() => unstageItem(item.id)}
                      type="button"
                      variant="secondary"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Stage a few candidate layers here, then open Studio with those
              selections already queued.
            </p>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Workspace Preview
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  Live render glimpse
                </h3>
              </div>
              <Badge>
                {previewStatus === "loading"
                  ? "Rendering"
                  : previewStatus === "error"
                    ? "Needs attention"
                    : preview
                      ? `${preview.width} x ${preview.height}`
                      : "Idle"}
              </Badge>
            </div>
            <div className="grid min-h-64 place-items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/40 p-4">
              {preview ? (
                <img
                  alt="SpriteCraft workspace preview"
                  className="max-h-64 w-auto max-w-full [image-rendering:pixelated]"
                  src={`data:image/png;base64,${preview.imageBase64}`}
                />
              ) : (
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Stage some layers to render a workspace preview here.
                </p>
              )}
            </div>
            {previewError ? (
              <p className="mt-3 text-sm text-[color:var(--destructive)]">
                {previewError}
              </p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Layer Stack
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  Resolved preview layers
                </h3>
              </div>
              <Badge>{preview?.usedLayers.length ?? 0} layers</Badge>
            </div>
            <div className="space-y-3">
              {preview?.usedLayers.length ? (
                preview.usedLayers.map((layer) => (
                  <div
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-3"
                    key={`${layer.itemId}-${layer.layerId}-${layer.zPos}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <strong>{layer.itemName}</strong>
                      <Badge>{layer.variant}</Badge>
                    </div>
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      {layer.typeName} · {layer.layerId} · z {layer.zPos}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  The web app can now preview a small selection workspace, but
                  full layer management still belongs to the Dart Studio.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.slice(0, 9).map((item) => (
            <div
              className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
              key={item.id}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-medium">{item.name}</h3>
                <Badge>{item.typeName}</Badge>
              </div>
              <p className="mb-3 text-sm text-[color:var(--muted-foreground)]">
                {item.category} ·{" "}
                {item.requiredBodyTypes.join(", ") || "any body"}
              </p>
              <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Select
                  onChange={(event) =>
                    updateVariantChoice(item.id, event.target.value)
                  }
                  value={getVariantChoice(item)}
                >
                  {(item.variants.length ? item.variants : ["default"]).map(
                    (variant) => (
                      <option key={`${item.id}-${variant}`} value={variant}>
                        {variant}
                      </option>
                    ),
                  )}
                </Select>
                <Button
                  onClick={() =>
                    Object.hasOwn(stagedSelections, item.id)
                      ? unstageItem(item.id)
                      : stageItem(item)
                  }
                  type="button"
                  variant={
                    Object.hasOwn(stagedSelections, item.id)
                      ? "secondary"
                      : "default"
                  }
                >
                  {Object.hasOwn(stagedSelections, item.id)
                    ? "Unstage"
                    : "Stage"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(item.tags ?? []).slice(0, 3).map((entry) => (
                  <Badge key={`${item.id}-${entry}`}>{entry}</Badge>
                ))}
                {item.matchBodyColor ? <Badge>match body color</Badge> : null}
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-(--muted-foreground)">
          This is still a narrow migration slice, not full web-side editing yet.
          But the web app now keeps a persistent working set of layer picks
          instead of acting like a disposable scout only.
        </p>
      </CardContent>
    </Card>
  );
}
