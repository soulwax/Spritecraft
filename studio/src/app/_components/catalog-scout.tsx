"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  ExternalLink,
  PackageCheck,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  type WorkspaceLaunchPayload,
  type WorkspaceLinkedProject,
  type WorkspaceLoadPayload,
  getRelatedWorkspaceProjects,
  normalizeWorkspaceDraft,
  projectToWorkspaceDraft,
  type CatalogWorkspaceDraft,
  workspaceLaunchEventName,
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
  SpriteCraftBriefResponse,
  SpriteCraftCatalogItem,
  SpriteCraftExportResponse,
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

const defaultExportSettings = {
  namingStyle: "kebab",
  customStem: "",
  frameNamePrefix: "",
  marginPixels: 0,
  spacingPixels: 0,
  cropMode: "none",
  pivotX: null as number | null,
  pivotY: null as number | null,
};

export function CatalogScout({ bodyTypes, animations }: CatalogScoutProps) {
  const didHydrateFromUrl = useRef(false);
  const [workspaceName, setWorkspaceName] = useState("Web Builder Workspace");
  const [query, setQuery] = useState("");
  const [workspaceNotes, setWorkspaceNotes] = useState("");
  const [workspaceTags, setWorkspaceTags] = useState<string[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [sourceProjectId, setSourceProjectId] = useState<string | null>(null);
  const [sourceProjectLabel, setSourceProjectLabel] = useState<string | null>(
    null,
  );
  const [relatedProjects, setRelatedProjects] = useState<WorkspaceLinkedProject[]>(
    [],
  );
  const [replaceByType, setReplaceByType] = useState(true);
  const [activeTypeFocus, setActiveTypeFocus] = useState<string | null>(null);
  const [activeStagedItemId, setActiveStagedItemId] = useState<string | null>(
    null,
  );
  const [workspaceEnginePreset, setWorkspaceEnginePreset] = useState("none");
  const [workspaceExportSettings, setWorkspaceExportSettings] = useState(
    defaultExportSettings,
  );
  const [batchAnimationsText, setBatchAnimationsText] = useState("");
  const [batchVariantPresetNames, setBatchVariantPresetNames] = useState<
    string[]
  >([]);
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
  const [loadingRelatedProjectId, setLoadingRelatedProjectId] = useState<
    string | null
  >(null);
  const [comparingRelatedProjectId, setComparingRelatedProjectId] = useState<
    string | null
  >(null);
  const [comparedProject, setComparedProject] =
    useState<SpriteCraftProjectSummary | null>(null);
  const [branchingComparedProject, setBranchingComparedProject] = useState(false);
  const [comparedPreview, setComparedPreview] =
    useState<SpriteCraftRenderPreview | null>(null);
  const [comparedPreviewStatus, setComparedPreviewStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [comparedPreviewError, setComparedPreviewError] = useState("");
  const [briefStatus, setBriefStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [briefResult, setBriefResult] = useState<SpriteCraftBriefResponse | null>(
    null,
  );
  const [briefError, setBriefError] = useState("");
  const [exportStatus, setExportStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [exportResult, setExportResult] =
    useState<SpriteCraftExportResponse | null>(null);
  const [exportError, setExportError] = useState("");

  function applyWorkspaceDraft(draft: CatalogWorkspaceDraft) {
    setWorkspaceName(draft.name);
    setQuery(draft.query);
    setWorkspaceNotes(draft.notes);
    setWorkspaceTags(draft.tags);
    setPromptHistory(draft.promptHistory);
    setSourceProjectId(draft.sourceProjectId);
    setSourceProjectLabel(draft.sourceProjectLabel);
    setRelatedProjects(draft.relatedProjects);
    setReplaceByType(draft.replaceByType);
    setActiveTypeFocus(draft.activeTypeFocus);
    setActiveStagedItemId(
      Object.keys(draft.stagedSelections)[0] ?? draft.activeStagedItemId ?? null,
    );
    setWorkspaceEnginePreset(draft.enginePreset);
    setWorkspaceExportSettings(draft.exportSettings);
    setBatchAnimationsText(draft.batchAnimations.join(", "));
    setBatchVariantPresetNames(draft.batchVariantPresetNames);
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

  function applyLaunchParams(params: URLSearchParams) {
    const rawSelections = params.get("selections");
    let parsedSelections: Record<string, string> = {};
    if (rawSelections) {
      try {
        const parsed = JSON.parse(rawSelections) as unknown;
        if (parsed && typeof parsed === "object") {
          parsedSelections = Object.fromEntries(
            Object.entries(parsed).filter(
              ([key, value]) =>
                typeof key === "string" &&
                key &&
                typeof value === "string" &&
                value,
            ),
          );
        }
      } catch {}
    }

    const draft = normalizeWorkspaceDraft({
      name: params.get("projectName") ?? "Web Builder Workspace",
      query: params.get("catalogSearch") ?? params.get("prompt") ?? "",
      bodyType: params.get("bodyType") ?? bodyTypes[0] ?? "male",
      animation: params.get("animation") ?? animations[0] ?? "idle",
      enginePreset: params.get("enginePreset") ?? "none",
      exportSettings: { ...defaultExportSettings },
      batchAnimations: [],
      batchVariantPresetNames: [],
      category: params.get("category") ?? "all",
      tag: params.get("tagFilter") ?? "all",
      stagedSelections: parsedSelections,
      variantChoices: parsedSelections,
      savedAt: new Date().toISOString(),
    });

    if (!draft) {
      return;
    }

    applyWorkspaceDraft(draft);
    setWorkspaceFeedback({
      tone: "success",
      message: `Opened ${draft.name} in the web builder workspace.`,
    });
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
        "Could not restore SpriteCraft Studio catalog workspace.",
        error,
      );
    }
  }, [animations, bodyTypes]);

  useEffect(() => {
    function handleWorkspaceLoad(event: Event) {
      const detail = (event as CustomEvent<WorkspaceLoadPayload>).detail;
      if (!detail?.project) {
        return;
      }
      if (process.env.NODE_ENV !== "production") {
        console.info("[spritecraft] Workspace load event received", {
          id: detail.project.id,
          label: detail.project.projectName ?? "saved project",
        });
      }

      const draft = projectToWorkspaceDraft(detail.project);
      draft.relatedProjects = detail.relatedProjects;
      applyWorkspaceDraft(draft);
      setWorkspaceFeedback({
        tone: "success",
        message: `Loaded ${detail.project.projectName ?? "saved project"} into the web workspace.`,
      });
    }

    window.addEventListener(workspaceLoadEventName, handleWorkspaceLoad);
    return () => {
      window.removeEventListener(workspaceLoadEventName, handleWorkspaceLoad);
    };
  }, [animations, bodyTypes]);

  useEffect(() => {
    function handleWorkspaceLaunch(event: Event) {
      const detail = (event as CustomEvent<WorkspaceLaunchPayload>).detail;
      if (!detail?.config) {
        return;
      }
      if (process.env.NODE_ENV !== "production") {
        console.info("[spritecraft] Workspace launch event received", {
          config: detail.config,
        });
      }

      const draft = normalizeWorkspaceDraft({
        name: detail.config.projectName || "Web Builder Workspace",
        query: detail.config.catalogSearch ?? detail.config.prompt,
        bodyType: detail.config.bodyType,
        animation: detail.config.animation,
        enginePreset: detail.config.enginePreset,
        exportSettings: { ...defaultExportSettings },
        batchAnimations: [],
        batchVariantPresetNames: [],
        category: detail.config.category,
        tag: detail.config.tagFilter,
        stagedSelections: detail.config.seededSelections ?? {},
        variantChoices: detail.config.seededSelections ?? {},
        savedAt: new Date().toISOString(),
      });
      if (!draft) {
        return;
      }

      applyWorkspaceDraft(draft);
      setWorkspaceFeedback({
        tone: "success",
        message: `Loaded ${draft.name} into the builder workspace.`,
      });
    }

    window.addEventListener(workspaceLaunchEventName, handleWorkspaceLaunch);
    return () => {
      window.removeEventListener(
        workspaceLaunchEventName,
        handleWorkspaceLaunch,
      );
    };
  }, [animations, bodyTypes]);

  useEffect(() => {
    if (didHydrateFromUrl.current) {
      return;
    }
    didHydrateFromUrl.current = true;

    const params = new URLSearchParams(window.location.search);
    if (![...params.keys()].length) {
      return;
    }

    const restoreId = params.get("restore")?.trim();
    if (!restoreId) {
      applyLaunchParams(params);
      return;
    }

    let cancelled = false;

    async function hydrateFromRestore() {
      try {
        const [projectResponse, historyResponse] = await Promise.all([
          fetch(`/api/spritecraft/history/${restoreId}`, { cache: "no-store" }),
          fetch("/api/spritecraft/history", { cache: "no-store" }),
        ]);

        const projectPayload = (await projectResponse.json()) as
          | SpriteCraftProjectSummary
          | { error?: string };
        if (!projectResponse.ok) {
          throw new Error(
            "error" in projectPayload && projectPayload.error
              ? projectPayload.error
              : "Could not restore that SpriteCraft project into the web workspace.",
          );
        }

        const project = projectPayload as SpriteCraftProjectSummary;
        const draft = projectToWorkspaceDraft(project);

        if (historyResponse.ok) {
          const historyPayload = (await historyResponse.json()) as {
            items?: SpriteCraftProjectSummary[];
          };
          draft.relatedProjects = getRelatedWorkspaceProjects(
            project,
            historyPayload.items ?? [],
          );
        }

        if (cancelled) {
          return;
        }

        applyWorkspaceDraft(draft);
        setWorkspaceFeedback({
          tone: "success",
          message: `Restored ${project.projectName ?? "saved project"} into the web builder workspace.`,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setWorkspaceFeedback({
          tone: "destructive",
          message:
            error instanceof Error
              ? error.message
              : "Could not restore that SpriteCraft project into the web workspace.",
        });
      }
    }

    void hydrateFromRestore();

    return () => {
      cancelled = true;
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
        "Could not restore SpriteCraft Studio workspace presets.",
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
        relatedProjects,
        replaceByType,
        activeTypeFocus,
        activeStagedItemId,
        enginePreset: workspaceEnginePreset,
        exportSettings: workspaceExportSettings,
        batchAnimations: batchAnimationsText
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        batchVariantPresetNames,
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
      console.warn("Could not save SpriteCraft Studio catalog workspace.", error);
    }
  }, [
    animation,
    bodyType,
    category,
    activeStagedItemId,
    workspaceEnginePreset,
    workspaceExportSettings,
    batchAnimationsText,
    batchVariantPresetNames,
    promptHistory,
    query,
    relatedProjects,
    replaceByType,
    activeTypeFocus,
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
              "SpriteCraft Studio could not render the workspace preview.",
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
            : "SpriteCraft Studio could not render the workspace preview.",
        );
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [animation, bodyType, query, stagedSelections]);

  useEffect(() => {
    if (!comparedProject || !Object.keys(comparedProject.selections).length) {
      setComparedPreview(null);
      setComparedPreviewStatus("idle");
      setComparedPreviewError("");
      return;
    }

    let cancelled = false;

    async function loadComparedPreview() {
      setComparedPreviewStatus("loading");
      setComparedPreviewError("");

      try {
        const response = await fetch("/api/spritecraft/render", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            bodyType: comparedProject.bodyType,
            animation: comparedProject.animation,
            prompt: comparedProject.prompt ?? "",
            selections: comparedProject.selections,
          }),
          cache: "no-store",
        });
        const payload = (await response.json()) as SpriteCraftRenderPreview & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(
            payload.error ??
              "SpriteCraft Studio could not render the compared version preview.",
          );
        }
        if (cancelled) {
          return;
        }
        setComparedPreview(payload);
        setComparedPreviewStatus("idle");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setComparedPreview(null);
        setComparedPreviewStatus("error");
        setComparedPreviewError(
          error instanceof Error
            ? error.message
            : "SpriteCraft Studio could not render the compared version preview.",
        );
      }
    }

    void loadComparedPreview();

    return () => {
      cancelled = true;
    };
  }, [comparedProject]);

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
            payload.error ?? "SpriteCraft Studio could not scout the catalog.",
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
            : "SpriteCraft Studio could not scout the catalog.",
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

  const stagedItems = useMemo(
    () => items.filter((item) => Object.hasOwn(stagedSelections, item.id)),
    [items, stagedSelections],
  );

  const activeStagedItem =
    stagedItems.find((item) => item.id === activeStagedItemId) ??
    stagedItems[0] ??
    null;

  const activeStagedAlternatives = useMemo(() => {
    if (!activeStagedItem) {
      return [];
    }

    return items
      .filter(
        (item) =>
          item.id !== activeStagedItem.id &&
          item.typeName === activeStagedItem.typeName,
      )
      .slice(0, 6);
  }, [activeStagedItem, items]);

  const activeStagedWarnings = useMemo(() => {
    if (!activeStagedItem) {
      return [];
    }

    const warnings: string[] = [];
    const requiredBodyTypes = activeStagedItem.requiredBodyTypes ?? [];
    const supportedAnimations = activeStagedItem.animations ?? [];

    if (requiredBodyTypes.length && !requiredBodyTypes.includes(bodyType)) {
      warnings.push(
        `This layer targets ${requiredBodyTypes.join(", ")} body types, not the current ${bodyType} body type.`,
      );
    }

    if (supportedAnimations.length && !supportedAnimations.includes(animation)) {
      warnings.push(
        `This layer does not explicitly list support for the current ${animation} animation.`,
      );
    }

    if (activeStagedItem.matchBodyColor) {
      warnings.push(
        "This layer expects body-color matching, so palette mismatch is worth checking in the preview.",
      );
    }

    return warnings;
  }, [activeStagedItem, animation, bodyType]);

  const activeStagedRecommendations = useMemo(() => {
    if (!activeStagedItem) {
      return [];
    }

    const recommendations: string[] = [];
    if (replaceByType) {
      recommendations.push(
        `Staging another ${activeStagedItem.typeName} item will replace this one automatically.`,
      );
    }

    if (activeTypeFocus !== activeStagedItem.typeName) {
      recommendations.push(
        `Use Alternatives to browse only ${activeStagedItem.typeName} items ranked for the current workspace.`,
      );
    }

    if ((activeStagedItem.tags ?? []).length) {
      recommendations.push(
        `Look for matching tags like ${(activeStagedItem.tags ?? []).slice(0, 3).join(", ")} when refining adjacent layers.`,
      );
    }

    return recommendations;
  }, [activeStagedItem, activeTypeFocus, replaceByType]);

  useEffect(() => {
    if (!stagedItems.length) {
      if (activeStagedItemId !== null) {
        setActiveStagedItemId(null);
      }
      return;
    }

    if (
      activeStagedItemId === null ||
      !stagedItems.some((item) => item.id === activeStagedItemId)
    ) {
      setActiveStagedItemId(stagedItems[0]?.id ?? null);
    }
  }, [activeStagedItemId, stagedItems]);

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (category !== "all" && item.category !== category) {
        return false;
      }
      if (tag !== "all" && !(item.tags ?? []).includes(tag)) {
        return false;
      }
      if (activeTypeFocus && item.typeName !== activeTypeFocus) {
        return false;
      }
      return true;
    });

    const currentTags = new Set(workspaceTags);
    const currentPromptTerms = new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
    );

    return filtered.sort((left, right) => {
      const score = (item: SpriteCraftCatalogItem) => {
        let value = 0;

        if (activeTypeFocus && item.typeName === activeTypeFocus) {
          value += 40;
        }
        if (Object.hasOwn(stagedSelections, item.id)) {
          value += 18;
        }
        if (
          replaceByType &&
          stagedItems.some(
            (stagedItem) =>
              stagedItem.id !== item.id && stagedItem.typeName === item.typeName,
          )
        ) {
          value += 12;
        }
        if ((item.tags ?? []).some((entry) => currentTags.has(entry))) {
          value += 8;
        }
        if (
          currentPromptTerms.size &&
          [item.name, item.category, item.typeName, ...(item.tags ?? [])]
            .join(" ")
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .some((entry) => currentPromptTerms.has(entry))
        ) {
          value += 6;
        }
        if (item.requiredBodyTypes.includes(bodyType)) {
          value += 4;
        }
        if (item.animations.includes(animation)) {
          value += 4;
        }
        return value;
      };

      return score(right) - score(left);
    });
  }, [
    activeTypeFocus,
    animation,
    bodyType,
    category,
    items,
    query,
    replaceByType,
    stagedItems,
    stagedSelections,
    tag,
    workspaceTags,
  ]);

  function getVariantChoice(item: SpriteCraftCatalogItem) {
    return variantChoices[item.id] ?? item.variants[0] ?? "default";
  }

  function updateVariantChoice(itemId: string, value: string) {
    setVariantChoices((current) => ({
      ...current,
      [itemId]: value,
    }));
  }

  function applyStagedSelections(
    nextSelections: Record<string, string>,
    options?: {
      message?: string;
      merge?: boolean;
    },
  ) {
    const prepared = Object.fromEntries(
      Object.entries(nextSelections).filter(
        ([key, value]) => Boolean(key) && typeof value === "string" && Boolean(value),
      ),
    );
    if (!Object.keys(prepared).length) {
      return;
    }

    setStagedSelections((current) =>
      options?.merge ? { ...current, ...prepared } : prepared,
    );
    setVariantChoices((current) =>
      options?.merge ? { ...current, ...prepared } : prepared,
    );
    setActiveStagedItemId(Object.keys(prepared)[0] ?? null);
    if (options?.message) {
      setWorkspaceFeedback({
        tone: "success",
        message: options.message,
      });
    }
  }

  function stageItem(item: SpriteCraftCatalogItem) {
    const nextVariant = getVariantChoice(item);
    setActiveStagedItemId(item.id);
    setStagedSelections((current) => {
      if (!replaceByType) {
        return {
          ...current,
          [item.id]: nextVariant,
        };
      }

      const next = { ...current };
      for (const stagedItem of items) {
        if (
          stagedItem.id !== item.id &&
          stagedItem.typeName === item.typeName &&
          Object.hasOwn(next, stagedItem.id)
        ) {
          delete next[stagedItem.id];
        }
      }
      next[item.id] = nextVariant;
      return next;
    });
  }

  function unstageItem(itemId: string) {
    setActiveStagedItemId((current) => (current === itemId ? null : current));
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

  function focusTypeAlternatives(typeName: string) {
    setActiveTypeFocus(typeName);
    setWorkspaceFeedback({
      tone: "success",
      message: `Browsing alternatives for ${typeName}.`,
    });
  }

  function clearTypeFocus() {
    setActiveTypeFocus(null);
  }

  function clearWorkspace() {
    setWorkspaceName("Web Builder Workspace");
    setQuery("");
    setWorkspaceNotes("");
    setWorkspaceTags([]);
    setPromptHistory([]);
    setSourceProjectId(null);
    setSourceProjectLabel(null);
    setRelatedProjects([]);
    setReplaceByType(true);
    setActiveTypeFocus(null);
    setActiveStagedItemId(null);
    setWorkspaceEnginePreset("none");
    setWorkspaceExportSettings(defaultExportSettings);
    setBatchAnimationsText("");
    setBatchVariantPresetNames([]);
    setBodyType(bodyTypes[0] ?? "male");
    setAnimation(animations[0] ?? "idle");
    setCategory("all");
    setTag("all");
    setStagedSelections({});
    setVariantChoices({});
    try {
      window.localStorage.removeItem(workspaceStorageKey);
    } catch (error) {
      console.warn("Could not clear SpriteCraft Studio catalog workspace.", error);
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
      relatedProjects,
      replaceByType,
      activeTypeFocus,
      activeStagedItemId,
      enginePreset: workspaceEnginePreset,
      exportSettings: workspaceExportSettings,
      batchAnimations: batchAnimationsText
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
      batchVariantPresetNames,
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
      console.warn("Could not save SpriteCraft Studio workspace presets.", error);
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

  function applyBriefStepQuery(nextQuery: string) {
    setQuery(nextQuery);
    setCategory("all");
    setTag("all");
    setActiveTypeFocus(null);
    setWorkspaceFeedback({
      tone: "success",
      message: `Focused the catalog on "${nextQuery}" from the AI build path.`,
    });
  }

  function applyCandidateBuild() {
    if (!briefResult?.candidateBuild) {
      return;
    }

    applyStagedSelections(briefResult.candidateBuild.selections, {
      message: `Applied AI candidate build: ${briefResult.candidateBuild.label}.`,
    });
  }

  async function runAiBrief() {
    const prompt = query.trim();
    if (!prompt) {
      setWorkspaceFeedback({
        tone: "warning",
        message: "Write a creative brief before asking for AI guidance.",
      });
      return;
    }

    setBriefStatus("loading");
    setBriefError("");
    setBriefResult(null);

    try {
      const response = await fetch("/api/spritecraft/brief", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          bodyType,
          animation,
        }),
      });
      const payload = (await response.json()) as SpriteCraftBriefResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ?? "SpriteCraft Studio could not create the AI brief.",
        );
      }

      setBriefResult(payload);
      setBriefStatus("idle");
      commitPromptHistory(prompt);
    } catch (error) {
      setBriefStatus("error");
      setBriefError(
        error instanceof Error
          ? error.message
          : "SpriteCraft Studio could not create the AI brief.",
      );
    }
  }

  async function exportWorkspace() {
    if (!Object.keys(stagedSelections).length) {
      setWorkspaceFeedback({
        tone: "warning",
        message: "Stage at least one layer before exporting.",
      });
      return;
    }

    setExportStatus("loading");
    setExportError("");
    setExportResult(null);

    try {
      const batchAnimations = batchAnimationsText
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      const selectedVariantPresets = workspacePresets.filter((preset) =>
        batchVariantPresetNames.includes(preset.name),
      );
      const response = await fetch("/api/spritecraft/export", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectName: workspaceName.trim(),
          enginePreset: workspaceEnginePreset,
          exportSettings: workspaceExportSettings,
          batchAnimations,
          variants: [
            {
              name: workspaceName.trim() || "Current Workspace",
              bodyType,
              prompt: query.trim(),
              selections: stagedSelections,
            },
            ...selectedVariantPresets.map((preset) => ({
              name: preset.name,
              bodyType: preset.bodyType,
              prompt: preset.query,
              selections: preset.stagedSelections,
            })),
          ],
          bodyType,
          animation,
          prompt: query.trim(),
          selections: stagedSelections,
        }),
      });
      const payload = (await response.json()) as SpriteCraftExportResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ?? "SpriteCraft Studio could not export the workspace.",
        );
      }

      setExportResult(payload);
      setExportStatus("idle");
      setWorkspaceFeedback({
        tone: "success",
        message: payload.batch
          ? `Exported ${payload.jobs.length} batch jobs with ${payload.enginePreset} preset output.`
          : `Exported ${payload.baseName} with ${payload.enginePreset} preset output.`,
      });
    } catch (error) {
      setExportStatus("error");
      setExportError(
        error instanceof Error
          ? error.message
          : "SpriteCraft Studio could not export the workspace.",
      );
    }
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
        : "Created from the SpriteCraft Studio workspace.");

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
          enginePreset: workspaceEnginePreset,
          bodyType,
          animation,
          prompt: query.trim(),
          selections: stagedSelections,
          renderSettings: {
            previewMode: "single",
            category,
            animationFilter: "current",
            tagFilter: tag,
            source: "studio-workspace",
            sourceProjectId,
            versionMode: mode,
          },
          exportSettings: {
            enginePreset: workspaceEnginePreset,
            ...workspaceExportSettings,
            batchAnimations: batchAnimationsText
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean),
            batchVariantPresetNames,
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
            "SpriteCraft Studio could not save the current workspace as a project.",
        );
      }

      setSourceProjectId(payload.id);
      setSourceProjectLabel(payload.projectName ?? projectName);
      setWorkspaceTags(payload.tags ?? mergedTags);
      setPromptHistory(payload.promptHistory ?? mergedPromptHistory);
      setWorkspaceNotes(payload.notes ?? mergedNotes);
      setRelatedProjects((current) => {
        const nextEntry: WorkspaceLinkedProject = {
          id: payload.id,
          label: payload.projectName ?? projectName,
          createdAt: payload.createdAt,
          updatedAt: payload.updatedAt ?? null,
          tags: payload.tags ?? mergedTags,
          animation: payload.animation,
          layerCount: Object.keys(payload.selections).length,
        };

        return [
          nextEntry,
          ...current.filter((entry) => entry.id !== payload.id),
        ].slice(0, 6);
      });
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
            : "SpriteCraft Studio could not save the current workspace as a project.",
      });
    } finally {
      setIsSavingProject(false);
      setSaveMode(null);
    }
  }

  async function loadRelatedProject(entry: WorkspaceLinkedProject) {
    setLoadingRelatedProjectId(entry.id);
    setWorkspaceFeedback(null);

    try {
      const response = await fetch(`/api/spritecraft/history/${entry.id}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as SpriteCraftProjectSummary & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ??
            "SpriteCraft Studio could not load that related project.",
        );
      }

      const draft = projectToWorkspaceDraft(payload);
      draft.relatedProjects = [
        {
          id: payload.id,
          label: payload.projectName ?? payload.prompt ?? "Saved project",
          createdAt: payload.createdAt,
          updatedAt: payload.updatedAt ?? null,
          tags: payload.tags ?? [],
          animation: payload.animation,
          layerCount: Object.keys(payload.selections).length,
        },
        ...relatedProjects.filter((related) => related.id !== payload.id),
      ].slice(0, 6);
      setComparedProject(null);
      applyWorkspaceDraft(draft);
      setWorkspaceFeedback({
        tone: "success",
        message: `Loaded ${payload.projectName ?? "related project"} into the web workspace.`,
      });
    } catch (error) {
      setWorkspaceFeedback({
        tone: "destructive",
        message:
          error instanceof Error
            ? error.message
            : "SpriteCraft Studio could not load that related project.",
      });
    } finally {
      setLoadingRelatedProjectId(null);
    }
  }

  async function compareRelatedProject(entry: WorkspaceLinkedProject) {
    setComparingRelatedProjectId(entry.id);
    setWorkspaceFeedback(null);

    try {
      const response = await fetch(`/api/spritecraft/history/${entry.id}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as SpriteCraftProjectSummary & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ??
            "SpriteCraft Studio could not load that project for comparison.",
        );
      }

      setComparedProject(payload);
    } catch (error) {
      setWorkspaceFeedback({
        tone: "destructive",
        message:
          error instanceof Error
            ? error.message
            : "SpriteCraft Studio could not load that project for comparison.",
      });
    } finally {
      setComparingRelatedProjectId(null);
    }
  }

  function branchFromComparedProject() {
    if (!comparedProject) {
      return;
    }

    setBranchingComparedProject(true);
    try {
      const draft = projectToWorkspaceDraft(comparedProject);
      draft.relatedProjects = [
        {
          id: comparedProject.id,
          label:
            comparedProject.projectName ?? comparedProject.prompt ?? "Saved project",
          createdAt: comparedProject.createdAt,
          updatedAt: comparedProject.updatedAt ?? null,
          tags: comparedProject.tags ?? [],
          animation: comparedProject.animation,
          layerCount: Object.keys(comparedProject.selections).length,
        },
        ...relatedProjects.filter((entry) => entry.id !== comparedProject.id),
      ].slice(0, 6);
      applyWorkspaceDraft(draft);
      setComparedProject(null);
      setWorkspaceFeedback({
        tone: "success",
        message: `Branched the web workspace from ${comparedProject.projectName ?? "the compared version"}.`,
      });
    } finally {
      setBranchingComparedProject(false);
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

  function formatProjectDate(value: string | null) {
    if (!value) {
      return "Unknown";
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

  function relaunchBuilderWorkspace() {
    if (typeof window === "undefined") {
      return;
    }

    const config = {
      bodyType,
      animation,
      projectName:
        workspaceName.trim() ||
        (query.trim() ? `Scout ${query.trim()}` : "Scouted Project"),
      prompt: query.trim(),
      enginePreset: workspaceEnginePreset,
      previewMode: "single",
      category,
      animationFilter: "current",
      tagFilter: tag,
      catalogSearch: query.trim(),
      seededSelections: stagedSelections,
    };
    if (process.env.NODE_ENV !== "production") {
      console.info("[spritecraft] Relaunching current workspace into builder", {
        config,
      });
    }

    window.dispatchEvent(
      new CustomEvent<WorkspaceLaunchPayload>(workspaceLaunchEventName, {
        detail: { config },
      }),
    );
    const params = new URLSearchParams({
      bodyType: config.bodyType,
      animation: config.animation,
      projectName: config.projectName,
      prompt: config.prompt,
      enginePreset: config.enginePreset,
      previewMode: config.previewMode,
      category: config.category,
      animationFilter: config.animationFilter,
      tagFilter: config.tagFilter,
    });
    if (config.catalogSearch) {
      params.set("catalogSearch", config.catalogSearch);
    }
    if (Object.keys(config.seededSelections ?? {}).length) {
      params.set("selections", JSON.stringify(config.seededSelections));
    }
    window.history.replaceState({}, "", `/?${params.toString()}#builder`);
    window.requestAnimationFrame(() => {
      document
        .getElementById("builder")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const currentLayerIds = useMemo(
    () => Object.keys(stagedSelections),
    [stagedSelections],
  );
  const comparedLayerIds = useMemo(
    () => Object.keys(comparedProject?.selections ?? {}),
    [comparedProject],
  );
  const sharedLayerIds = useMemo(
    () => currentLayerIds.filter((entry) => comparedLayerIds.includes(entry)),
    [comparedLayerIds, currentLayerIds],
  );
  const currentOnlyLayerIds = useMemo(
    () => currentLayerIds.filter((entry) => !comparedLayerIds.includes(entry)),
    [comparedLayerIds, currentLayerIds],
  );
  const comparedOnlyLayerIds = useMemo(
    () => comparedLayerIds.filter((entry) => !currentLayerIds.includes(entry)),
    [comparedLayerIds, currentLayerIds],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Compass className="size-5 text-[color:var(--accent)]" />
          <span>Catalog Scout</span>
        </CardTitle>
          <CardDescription>
            Scout the LPC catalog from the web app, keep a small persistent
            selection workspace, and keep iterating in the web builder with
            that intent already applied.
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
                : "Saving here creates a real SpriteCraft project directly from the current web workspace."}
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
            <Button onClick={relaunchBuilderWorkspace} type="button">
              <ExternalLink className="mr-2 size-4" />
              Open In Builder
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
              <Select
                onChange={(event) => setWorkspaceEnginePreset(event.target.value)}
                value={workspaceEnginePreset}
              >
                <option value="none">No engine preset</option>
                <option value="godot">Godot</option>
                <option value="unity">Unity</option>
                <option value="both">Godot + Unity</option>
                <option value="aseprite">Aseprite JSON</option>
                <option value="generic">Generic JSON</option>
                <option value="all">All presets</option>
              </Select>
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
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                <div>
                  <p className="font-medium text-[color:var(--foreground)]">
                    Replace same layer type
                  </p>
                  <p className="mt-1">
                    When enabled, staging a new item replaces existing staged
                    items with the same type.
                  </p>
                </div>
                <button
                  aria-pressed={replaceByType}
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    replaceByType
                      ? "bg-[color:var(--accent)] text-[color:var(--background)]"
                      : "bg-[color:var(--surface-soft)] text-[color:var(--muted-foreground)]"
                  }`}
                  onClick={() => setReplaceByType((current) => !current)}
                  type="button"
                >
                  {replaceByType ? "On" : "Off"}
                </button>
              </label>
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

        {sourceProjectId ? (
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Related History
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  Nearby versions and snapshots
                </h3>
              </div>
              <Badge>{relatedProjects.length} entries</Badge>
            </div>
            {relatedProjects.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {relatedProjects.map((entry) => (
                  <div
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-3"
                    key={entry.id}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <strong>{entry.label}</strong>
                      <Badge>{entry.animation}</Badge>
                    </div>
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      {formatProjectDate(entry.updatedAt ?? entry.createdAt)}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      {entry.layerCount} layer
                      {entry.layerCount === 1 ? "" : "s"}
                    </p>
                    {entry.tags.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.tags.slice(0, 3).map((tag) => (
                          <Badge key={`${entry.id}-${tag}`}>{tag}</Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={loadingRelatedProjectId === entry.id}
                          onClick={() => void loadRelatedProject(entry)}
                          type="button"
                          variant={
                            entry.id === sourceProjectId
                              ? "default"
                              : "secondary"
                          }
                        >
                          {loadingRelatedProjectId === entry.id
                            ? "Loading..."
                            : entry.id === sourceProjectId
                              ? "Current Workspace Source"
                              : "Load Here"}
                        </Button>
                        <Button
                          disabled={comparingRelatedProjectId === entry.id}
                          onClick={() => void compareRelatedProject(entry)}
                          type="button"
                          variant="secondary"
                        >
                          {comparingRelatedProjectId === entry.id
                            ? "Comparing..."
                            : "Compare"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Load a saved project from the browser to bring its nearby
                version context into the web workspace.
              </p>
            )}
          </div>
        ) : null}

        {comparedProject ? (
          <div className="rounded-3xl border border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Version Compare
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  Current workspace vs {comparedProject.projectName ?? "selected version"}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={branchFromComparedProject}
                  type="button"
                >
                  {branchingComparedProject
                    ? "Branching..."
                    : "Branch From Compared"}
                </Button>
                <Button
                  onClick={() => setComparedProject(null)}
                  type="button"
                  variant="secondary"
                >
                  Close Compare
                </Button>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Current workspace
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {workspaceName.trim() || "Web Builder Workspace"}
                </p>
                <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
                  {query.trim() || "No prompt in the current workspace."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{bodyType}</Badge>
                  <Badge>{animation}</Badge>
                  <Badge>{currentLayerIds.length} layers</Badge>
                  {workspaceTags.slice(0, 3).map((entry) => (
                    <Badge key={`current-${entry}`}>{entry}</Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Compared version
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {comparedProject.projectName ?? "Saved project"}
                </p>
                <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
                  {comparedProject.prompt?.trim() ||
                    "No prompt in the compared project."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{comparedProject.bodyType}</Badge>
                  <Badge>{comparedProject.animation}</Badge>
                  <Badge>{comparedLayerIds.length} layers</Badge>
                  {comparedProject.tags.slice(0, 3).map((entry) => (
                    <Badge key={`compared-${entry}`}>{entry}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Shared layers
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {sharedLayerIds.length}
                </p>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  Present in both the current workspace and the compared
                  version.
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Current only
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {currentOnlyLayerIds.length}
                </p>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  Layers unique to the current web workspace.
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Compared only
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {comparedOnlyLayerIds.length}
                </p>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  Layers unique to the compared saved version.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Current-only layer ids
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentOnlyLayerIds.length ? (
                    currentOnlyLayerIds.slice(0, 12).map((entry) => (
                      <Badge key={`current-only-${entry}`}>{entry}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      No current-only layers.
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Compared-only layer ids
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {comparedOnlyLayerIds.length ? (
                    comparedOnlyLayerIds.slice(0, 12).map((entry) => (
                      <Badge key={`compared-only-${entry}`}>{entry}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      No compared-only layers.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                      Current Render
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {workspaceName.trim() || "Web Builder Workspace"}
                    </p>
                  </div>
                  <Badge>
                    {previewStatus === "loading"
                      ? "Rendering"
                      : preview
                        ? `${preview.width} x ${preview.height}`
                        : "Idle"}
                  </Badge>
                </div>
                <div className="grid min-h-56 place-items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/30 p-4">
                  {preview ? (
                    <img
                      alt="Current workspace render"
                      className="max-h-56 w-auto max-w-full [image-rendering:pixelated]"
                      src={`data:image/png;base64,${preview.imageBase64}`}
                    />
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      No current render available.
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                      Compared Render
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {comparedProject.projectName ?? "Selected version"}
                    </p>
                  </div>
                  <Badge>
                    {comparedPreviewStatus === "loading"
                      ? "Rendering"
                      : comparedPreview
                        ? `${comparedPreview.width} x ${comparedPreview.height}`
                        : "Idle"}
                  </Badge>
                </div>
                <div className="grid min-h-56 place-items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/30 p-4">
                  {comparedPreview ? (
                    <img
                      alt="Compared version render"
                      className="max-h-56 w-auto max-w-full [image-rendering:pixelated]"
                      src={`data:image/png;base64,${comparedPreview.imageBase64}`}
                    />
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      No compared render available.
                    </p>
                  )}
                </div>
                {comparedPreviewError ? (
                  <p className="mt-3 text-sm text-[color:var(--destructive)]">
                    {comparedPreviewError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

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

        {activeTypeFocus ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/30 px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
            <div>
              Focusing catalog alternatives for{" "}
              <span className="font-medium text-[color:var(--foreground)]">
                {activeTypeFocus}
              </span>
              . Results are also ranked toward current workspace tags, prompt
              terms, body type, and animation fit.
            </div>
            <Button onClick={clearTypeFocus} type="button" variant="secondary">
              Show all types
            </Button>
          </div>
        ) : null}

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
            <div className="flex flex-wrap gap-2">
              <Badge>{stagedItems.length} staged</Badge>
              <Badge variant={replaceByType ? "warning" : "default"}>
                {replaceByType ? "type replace on" : "stack freely"}
              </Badge>
            </div>
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
          {activeStagedItem ? (
            <div className="mb-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                    Selected Layer Detail
                  </p>
                  <h4 className="mt-2 text-lg font-semibold">
                    {activeStagedItem.name}
                  </h4>
                </div>
                <Badge>{activeStagedItem.typeName}</Badge>
              </div>
              <p className="text-sm text-[color:var(--muted-foreground)]">
                {activeStagedItem.category} · {activeStagedItem.requiredBodyTypes.join(", ") || "any body"} · current variant{" "}
                {stagedSelections[activeStagedItem.id]}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(activeStagedItem.tags ?? []).slice(0, 4).map((entry) => (
                  <Badge key={`${activeStagedItem.id}-detail-${entry}`}>
                    {entry}
                  </Badge>
                ))}
              </div>
              {activeStagedWarnings.length ? (
                <div className="mt-4 rounded-2xl border border-[color:var(--destructive)]/30 bg-[color:var(--background)]/20 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                    Compatibility warnings
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted-foreground)]">
                    {activeStagedWarnings.map((entry) => (
                      <li key={`${activeStagedItem.id}-warning-${entry}`}>
                        {entry}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {activeStagedRecommendations.length ? (
                <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                    Suggestions
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted-foreground)]">
                    {activeStagedRecommendations.map((entry) => (
                      <li key={`${activeStagedItem.id}-recommendation-${entry}`}>
                        {entry}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[color:var(--foreground)]">
                    Compatible alternatives
                  </p>
                  <Button
                    onClick={() => focusTypeAlternatives(activeStagedItem.typeName)}
                    type="button"
                    variant="secondary"
                  >
                    Browse all {activeStagedItem.typeName}
                  </Button>
                </div>
                {activeStagedAlternatives.length ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {activeStagedAlternatives.map((item) => (
                      <div
                        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
                        key={`alt-${item.id}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <strong>{item.name}</strong>
                          <Badge>{item.typeName}</Badge>
                        </div>
                        <p className="text-sm text-[color:var(--muted-foreground)]">
                          {item.category}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(item.tags ?? []).slice(0, 3).map((entry) => (
                            <Badge key={`${item.id}-${entry}`}>{entry}</Badge>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            onClick={() => stageItem(item)}
                            type="button"
                            variant="secondary"
                          >
                            Replace With This
                          </Button>
                          <Button
                            onClick={() => focusTypeAlternatives(item.typeName)}
                            type="button"
                            variant="secondary"
                          >
                            View in Catalog
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[color:var(--muted-foreground)]">
                    No same-type alternatives are visible in the current catalog
                    slice yet.
                  </p>
                )}
              </div>
            </div>
          ) : null}
          {stagedItems.length ? (
            <div className="grid gap-3">
              {stagedItems.map((item, index) => (
                <div
                  className={`rounded-2xl border p-3 ${
                    activeStagedItem?.id === item.id
                      ? "border-[color:var(--accent)] bg-[color:var(--surface-strong)]"
                      : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"
                  }`}
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
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
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
                    <Button
                      onClick={() => focusTypeAlternatives(item.typeName)}
                      type="button"
                      variant="secondary"
                    >
                      Alternatives
                    </Button>
                    <Button
                      onClick={() => setActiveStagedItemId(item.id)}
                      type="button"
                      variant="secondary"
                    >
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Stage a few candidate layers here, then keep refining them in
                the web builder workspace.
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
                    The web app now owns layer staging, preview, AI guidance,
                    and export for this workspace.
                  </p>
                )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  AI Brief
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  Web-side guidance
                </h3>
              </div>
              <Button onClick={() => void runAiBrief()} type="button">
                <Sparkles className="mr-2 size-4" />
                {briefStatus === "loading" ? "Thinking..." : "Run AI Brief"}
              </Button>
            </div>
            {briefResult?.plan ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4">
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  {briefResult.plan.concept || "AI concept ready"}
                </p>
                {briefResult.plan.styleTags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {briefResult.plan.styleTags.map((entry) => (
                      <Badge key={`style-${entry}`}>{entry}</Badge>
                    ))}
                  </div>
                ) : null}
                {briefResult.plan.framePrompts?.length ? (
                  <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted-foreground)]">
                    {briefResult.plan.framePrompts.slice(0, 5).map((entry) => (
                      <li key={`frame-${entry}`}>{entry}</li>
                    ))}
                  </ul>
                ) : null}
                {briefResult.candidateBuild ? (
                  <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                          Candidate Build
                        </p>
                        <p className="mt-1 text-sm font-medium text-[color:var(--foreground)]">
                          {briefResult.candidateBuild.label}
                        </p>
                      </div>
                      <Button
                        onClick={applyCandidateBuild}
                        type="button"
                        variant="secondary"
                      >
                        Apply Build
                      </Button>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      {briefResult.candidateBuild.summary}
                    </p>
                    {briefResult.candidateBuild.recommendations.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {briefResult.candidateBuild.recommendations
                          .slice(0, 5)
                          .map((item) => (
                            <Badge key={`candidate-build-${item.id}`}>
                              {item.name}
                            </Badge>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {briefResult.buildPath?.length ? (
                  <div className="mt-4 space-y-3">
                    {briefResult.buildPath.map((step, index) => (
                      <div
                        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/30 p-3"
                        key={`${step.slot}-${step.query}-${index + 1}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                              Step {index + 1}
                            </p>
                            <p className="mt-1 text-sm font-medium text-[color:var(--foreground)]">
                              {step.label}
                            </p>
                          </div>
                          <Badge>{step.slot}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                          {step.rationale}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge>{step.query}</Badge>
                          <Button
                            onClick={() => applyBriefStepQuery(step.query)}
                            type="button"
                            variant="secondary"
                          >
                            Focus Catalog
                          </Button>
                        </div>
                        {step.recommendations.length ? (
                          <div className="mt-3 grid gap-2">
                            {step.recommendations.slice(0, 3).map((item) => (
                              <div
                                className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 px-3 py-2"
                                key={`brief-step-${step.slot}-${item.id}`}
                              >
                                <div>
                                  <p className="text-sm font-medium text-[color:var(--foreground)]">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-[color:var(--muted-foreground)]">
                                    {item.category} · {item.typeName}
                                  </p>
                                </div>
                                <Button
                                  onClick={() => stageItem(item)}
                                  type="button"
                                  variant="secondary"
                                >
                                  Stage
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {briefResult.categorySuggestions?.length ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                      Category Suggestions
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {briefResult.categorySuggestions.map((suggestion) => (
                        <div
                          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/30 p-3"
                          key={`category-suggestion-${suggestion.category}-${suggestion.label}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <strong>{suggestion.label}</strong>
                            <Badge>{suggestion.category}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                            {suggestion.reason}
                          </p>
                          {suggestion.recommendations.length ? (
                            <div className="mt-3 space-y-2">
                              {suggestion.recommendations.map((item) => (
                                <div
                                  className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 px-3 py-2"
                                  key={`category-suggestion-item-${suggestion.category}-${item.id}`}
                                >
                                  <div>
                                    <p className="text-sm font-medium text-[color:var(--foreground)]">
                                      {item.name}
                                    </p>
                                    <p className="text-xs text-[color:var(--muted-foreground)]">
                                      {item.typeName}
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() => stageItem(item)}
                                    type="button"
                                    variant="secondary"
                                  >
                                    Stage
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Use the current workspace brief to get a coherent build path and
                recommended items inside the web app.
              </p>
            )}
            {briefResult?.recommendations?.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {briefResult.recommendations.slice(0, 6).map((item) => (
                  <div
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-3"
                    key={`ai-${item.id}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <strong>{item.name}</strong>
                      <Badge>{item.typeName}</Badge>
                    </div>
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      {item.category}
                    </p>
                    <div className="mt-3">
                      <Button
                        onClick={() => stageItem(item)}
                        type="button"
                        variant="secondary"
                      >
                        Stage Recommendation
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {briefError ? (
              <p className="mt-3 text-sm text-[color:var(--destructive)]">
                {briefError}
              </p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Export Bundle
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  Web-side export
                </h3>
              </div>
              <Button onClick={() => void exportWorkspace()} type="button">
                <PackageCheck className="mr-2 size-4" />
                {exportStatus === "loading" ? "Exporting..." : "Export"}
              </Button>
            </div>
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <Select
                onChange={(event) =>
                  setWorkspaceExportSettings((current) => ({
                    ...current,
                    namingStyle: event.target.value,
                  }))
                }
                value={workspaceExportSettings.namingStyle}
              >
                <option value="kebab">kebab-case filenames</option>
                <option value="snake">snake_case filenames</option>
                <option value="camel">camelCase filenames</option>
                <option value="pascal">PascalCase filenames</option>
              </Select>
              <Select
                onChange={(event) =>
                  setWorkspaceExportSettings((current) => ({
                    ...current,
                    cropMode: event.target.value,
                  }))
                }
                value={workspaceExportSettings.cropMode}
              >
                <option value="none">No crop</option>
                <option value="trim-transparent">Trim transparent bounds</option>
              </Select>
              <Input
                onChange={(event) =>
                  setWorkspaceExportSettings((current) => ({
                    ...current,
                    customStem: event.target.value,
                  }))
                }
                placeholder="Optional custom export stem"
                value={workspaceExportSettings.customStem}
              />
              <Input
                onChange={(event) =>
                  setWorkspaceExportSettings((current) => ({
                    ...current,
                    frameNamePrefix: event.target.value,
                  }))
                }
                placeholder="Frame name prefix"
                value={workspaceExportSettings.frameNamePrefix}
              />
              <Input
                onChange={(event) =>
                  setWorkspaceExportSettings((current) => ({
                    ...current,
                    marginPixels: Number.parseInt(event.target.value || "0", 10) || 0,
                  }))
                }
                placeholder="Margin pixels"
                type="number"
                value={String(workspaceExportSettings.marginPixels)}
              />
              <Input
                onChange={(event) =>
                  setWorkspaceExportSettings((current) => ({
                    ...current,
                    spacingPixels: Number.parseInt(event.target.value || "0", 10) || 0,
                  }))
                }
                placeholder="Spacing pixels"
                type="number"
                value={String(workspaceExportSettings.spacingPixels)}
              />
              <Input
                onChange={(event) =>
                  setWorkspaceExportSettings((current) => ({
                    ...current,
                    pivotX:
                      event.target.value.trim() === ""
                        ? null
                        : (Number.parseInt(event.target.value, 10) ?? null),
                  }))
                }
                placeholder="Pivot X override"
                type="number"
                value={workspaceExportSettings.pivotX?.toString() ?? ""}
              />
              <Input
                onChange={(event) =>
                  setWorkspaceExportSettings((current) => ({
                    ...current,
                    pivotY:
                      event.target.value.trim() === ""
                        ? null
                        : (Number.parseInt(event.target.value, 10) ?? null),
                  }))
                }
                placeholder="Pivot Y override"
                type="number"
                value={workspaceExportSettings.pivotY?.toString() ?? ""}
              />
            </div>
            <div className="mb-4 grid gap-3">
              <Input
                onChange={(event) => setBatchAnimationsText(event.target.value)}
                placeholder="Batch animations, comma separated"
                value={batchAnimationsText}
              />
              {workspacePresets.length ? (
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-3">
                  <p className="mb-2 text-sm font-medium text-[color:var(--foreground)]">
                    Include workspace presets as batch variants
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {workspacePresets.map((preset) => {
                      const selected = batchVariantPresetNames.includes(preset.name);
                      return (
                        <button
                          aria-pressed={selected}
                          className={`rounded-full border px-3 py-2 text-sm transition ${
                            selected
                              ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--background)]"
                              : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted-foreground)]"
                          }`}
                          key={`batch-preset-${preset.name}`}
                          onClick={() =>
                            setBatchVariantPresetNames((current) =>
                              current.includes(preset.name)
                                ? current.filter((entry) => entry !== preset.name)
                                : [...current, preset.name],
                            )
                          }
                          type="button"
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            {exportResult ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/20 p-4 text-sm text-[color:var(--muted-foreground)]">
                <p className="font-medium text-[color:var(--foreground)]">
                  {exportResult.baseName}
                </p>
                <p className="mt-2">PNG: {exportResult.imagePath}</p>
                <p>JSON: {exportResult.metadataPath}</p>
                <p>ZIP: {exportResult.bundlePath}</p>
                {exportResult.batch ? (
                  <p className="mt-2">
                    Batch jobs: {exportResult.jobs.length}
                  </p>
                ) : null}
                {exportResult.extraPaths.length ? (
                  <div className="mt-3 space-y-1">
                    {exportResult.extraPaths.map((entry) => (
                      <p key={`export-extra-${entry}`}>Preset: {entry}</p>
                    ))}
                  </div>
                ) : null}
                {exportResult.jobs.length ? (
                  <div className="mt-3 space-y-1">
                    {exportResult.jobs.map((job) => (
                      <p key={`export-job-${job.baseName}`}>
                        Job: {job.variant} · {job.animation} · {job.baseName}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Export the current workspace directly from the web app with the
                selected engine preset.
              </p>
            )}
            {exportError ? (
              <p className="mt-3 text-sm text-[color:var(--destructive)]">
                {exportError}
              </p>
            ) : null}
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
                <div className="flex flex-wrap gap-2">
                  <Badge>{item.typeName}</Badge>
                  {activeTypeFocus === item.typeName ? (
                    <Badge variant="warning">focused type</Badge>
                  ) : null}
                </div>
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
          This builder now carries the full primary SpriteCraft workflow in the
          web app while the Dart process focuses on backend APIs.
        </p>
      </CardContent>
    </Card>
  );
}


