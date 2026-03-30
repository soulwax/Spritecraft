export type EmptyStateCopy = {
  title: string;
  description: string;
};

export function getRecentWorkEmptyState(options: {
  historyAvailable: boolean;
  onboardingVisible: boolean;
}): EmptyStateCopy {
  if (!options.historyAvailable) {
    return {
      title: "History is unavailable on this run.",
      description:
        "You can still launch a character from the builder now. Saved projects will appear here once database-backed history is enabled again.",
    };
  }

  if (options.onboardingVisible) {
    return {
      title: "No saved projects yet.",
      description:
        "Finish the onboarding checks, then open the builder or a template and save your first character to start building a recent-work trail.",
    };
  }

  return {
    title: "No saved projects yet.",
    description:
      "Open the builder or start from a launch template, then save the first version of your character to make this area useful.",
  };
}

export function getProjectBrowserListEmptyState(options: {
  search: string;
  projectCount: number;
}): EmptyStateCopy {
  if (options.projectCount === 0) {
    return {
      title: "No saved projects yet.",
      description:
        "Create something in the builder or import a .spritecraft-project.json package to start filling the project browser.",
    };
  }

  if (options.search.trim()) {
    return {
      title: "No projects match this search.",
      description:
        "Try a different tag, prompt keyword, animation, or selected layer id, or clear the search to return to the full history list.",
    };
  }

  return {
    title: "No visible projects right now.",
    description:
      "Refresh the browser to reload backend history or import a project package to repopulate the list.",
  };
}

export function getProjectDetailEmptyState(projectCount: number): EmptyStateCopy {
  if (projectCount === 0) {
    return {
      title: "Nothing to inspect yet.",
      description:
        "Once you save or import a project, its prompt memory, export history, and restore actions will appear here.",
    };
  }

  return {
    title: "Select a project to inspect.",
    description:
      "Choose a saved project from the list to review metadata, create a snapshot, package it, or reopen it in the builder.",
  };
}

export function getWorkspacePreviewEmptyMessage(options: {
  stagedLayerCount: number;
  query: string;
}): string {
  if (options.stagedLayerCount > 0) {
    return "SpriteCraft is waiting for a fresh render. Adjust the workspace or preview settings to generate the next frame set.";
  }

  if (options.query.trim()) {
    return "Search results are ready. Stage one or more layers from the catalog to render the first workspace preview here.";
  }

  return "Start with a search or a template, then stage a few layers to render the first workspace preview here.";
}
