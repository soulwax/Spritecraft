import { describe, expect, test } from "bun:test";

import {
  getProjectBrowserListEmptyState,
  getProjectDetailEmptyState,
  getRecentWorkEmptyState,
  getWorkspacePreviewEmptyMessage,
} from "./studio-empty-states";

describe("getRecentWorkEmptyState", () => {
  test("mentions onboarding when setup is still visible", () => {
    expect(
      getRecentWorkEmptyState({
        historyAvailable: true,
        onboardingVisible: true,
      }).description,
    ).toContain("onboarding");
  });

  test("explains degraded history mode", () => {
    expect(
      getRecentWorkEmptyState({
        historyAvailable: false,
        onboardingVisible: false,
      }).title,
    ).toContain("History is unavailable");
  });
});

describe("project browser empty states", () => {
  test("guides first-time users when no projects exist", () => {
    const state = getProjectBrowserListEmptyState({
      search: "",
      projectCount: 0,
    });

    expect(state.title).toBe("No saved projects yet.");
    expect(state.description).toContain("import");
  });

  test("guides search refinement when results are filtered out", () => {
    const state = getProjectBrowserListEmptyState({
      search: "ranger hood",
      projectCount: 8,
    });

    expect(state.title).toContain("match");
    expect(state.description).toContain("clear the search");
  });

  test("distinguishes between no projects and no selected project detail", () => {
    expect(getProjectDetailEmptyState(0).title).toContain("Nothing");
    expect(getProjectDetailEmptyState(3).title).toContain("Select");
  });
});

describe("getWorkspacePreviewEmptyMessage", () => {
  test("guides the user toward staging layers before first render", () => {
    expect(
      getWorkspacePreviewEmptyMessage({
        stagedLayerCount: 0,
        query: "wolf ranger",
      }),
    ).toContain("Stage");
  });
});
