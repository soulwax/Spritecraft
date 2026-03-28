// File: studio/app.js

const state = {
  bodyType: "male",
  animation: "idle",
  category: "all",
  previewMode: "single",
  availableAnimations: [],
  selections: {},
  favoriteItems: [],
  pinnedItems: [],
  undoStack: [],
  redoStack: [],
  lastRenderedRequest: null,
  latestImageBase64: null,
  latestMetadata: null,
  catalogItemsById: {},
  health: null,
};

const elements = {
  projectName: document.querySelector("#projectName"),
  prompt: document.querySelector("#prompt"),
  bodyType: document.querySelector("#bodyType"),
  animation: document.querySelector("#animation"),
  enginePreset: document.querySelector("#enginePreset"),
  aiSuggest: document.querySelector("#aiSuggest"),
  saveProject: document.querySelector("#saveProject"),
  clearSelections: document.querySelector("#clearSelections"),
  builderActions: null,
  selectionCount: document.querySelector("#selectionCount"),
  renderNow: document.querySelector("#renderNow"),
  exportRender: document.querySelector("#exportRender"),
  catalogSearch: document.querySelector("#catalogSearch"),
  catalogFilters: null,
  quickAccess: null,
  catalogList: document.querySelector("#catalogList"),
  catalogCount: document.querySelector("#catalogCount"),
  selectedItems: document.querySelector("#selectedItems"),
  historyList: document.querySelector("#historyList"),
  previewImage: document.querySelector("#previewImage"),
  previewMeta: document.querySelector("#previewMeta"),
  creditsList: document.querySelector("#creditsList"),
  planOutput: document.querySelector("#planOutput"),
  toastContainer: document.querySelector("#toastContainer"),
  healthPanel: null,
  previewModes: null,
  comparisonGrid: null,
};

init().catch((error) => {
  console.error(error);
  elements.planOutput.textContent = `Startup failed: ${error.message}`;
  showToast(error.message, "error");
});

async function init() {
  ensureStatusPanel();
  ensureBuilderActions();
  ensurePreviewModes();
  ensureQuickAccess();
  loadStudioPreferences();
  const [bootstrap, health] = await Promise.all([
    api("/api/studio/bootstrap"),
    refreshHealth(),
  ]);
  hydrateSelect(elements.bodyType, bootstrap.catalog.bodyTypes);
  hydrateSelect(elements.animation, bootstrap.catalog.animations);
  state.availableAnimations = bootstrap.catalog.animations ?? [];
  state.health = health;

  state.bodyType = bootstrap.defaults.bodyType ?? state.bodyType;
  state.animation = bootstrap.defaults.animation ?? state.animation;
  state.selections = bootstrap.defaults.selections ?? {};

  elements.bodyType.value = state.bodyType;
  elements.animation.value = state.animation;

  bindEvents();
  renderHistory(bootstrap.recent ?? []);
  renderSelections();
  renderHealth();
  await refreshCatalog();
  await refreshRender();
}

function bindEvents() {
  elements.bodyType.addEventListener("change", async (event) => {
    pushUndoSnapshot();
    state.bodyType = event.target.value;
    state.redoStack = [];
    updateBuilderActionState();
    await refreshCatalog();
    await refreshRender();
  });

  elements.animation.addEventListener("change", async (event) => {
    pushUndoSnapshot();
    state.animation = event.target.value;
    state.redoStack = [];
    updateBuilderActionState();
    await refreshCatalog();
    await refreshRender();
  });

  elements.catalogSearch.addEventListener("input", debounce(refreshCatalog, 180));
  elements.renderNow.addEventListener("click", refreshRender);
  elements.aiSuggest.addEventListener("click", runAiBrief);
  elements.saveProject.addEventListener("click", saveProject);
  elements.exportRender.addEventListener("click", exportRender);
  elements.clearSelections.addEventListener("click", clearSelections);
  document.addEventListener("keydown", handleBuilderShortcuts);
}

async function refreshCatalog() {
  try {
    const query = new URLSearchParams({
      q: elements.catalogSearch.value,
      bodyType: state.bodyType,
      animation: state.animation,
    });
    const payload = await api(`/api/lpc/catalog?${query}`);
    for (const item of payload.items ?? []) {
      state.catalogItemsById[item.id] = item;
    }
    ensureCatalogFilters();
    syncCategoryOptions(payload.items ?? []);
    renderQuickAccess();
    renderCatalog(payload.items ?? []);
    renderSelections();
  } catch (error) {
    renderCatalog([]);
    elements.planOutput.textContent = actionableMessage(
      "Could not load the catalog.",
      error,
    );
    showToast(actionableMessage("Catalog refresh failed.", error), "error");
  }
}

async function refreshRender() {
  if (Object.keys(state.selections).length === 0) {
    elements.previewMeta.textContent = "Pick some layers to render.";
    elements.previewImage.removeAttribute("src");
    elements.creditsList.textContent = "Credits will appear after a render.";
    renderComparisonPreviews([]);
    return;
  }

  try {
    const comparisonAnimations = state.previewMode === "compare"
      ? getComparisonAnimations()
      : [];
    const requestedAnimations = [...new Set([state.animation, ...comparisonAnimations])];
    const payloads = await Promise.all(
      requestedAnimations.map((animation) => fetchRenderPayload(animation)),
    );
    const payload = payloads.find((item) => item.animation === state.animation) ?? payloads[0];
    state.latestImageBase64 = payload.imageBase64;
    state.latestMetadata = payload.metadata;
    state.lastRenderedRequest = snapshotRenderableState();
    updateBuilderActionState();
    elements.previewImage.src = `data:image/png;base64,${payload.imageBase64}`;
    elements.previewMeta.textContent = state.previewMode === "compare"
      ? `${payload.width} x ${payload.height} px, ${payload.usedLayers.length} layers · comparison mode`
      : `${payload.width} x ${payload.height} px, ${payload.usedLayers.length} layers`;
    renderCredits(payload.credits ?? []);
    renderComparisonPreviews(
      comparisonAnimations.map((animation) =>
        payloads.find((item) => item.animation === animation) ?? payload,
      ),
    );
  } catch (error) {
    elements.previewMeta.textContent = error.message;
    renderComparisonPreviews([]);
    showToast(error.message, "error");
  }
}

async function runAiBrief() {
  const prompt = elements.prompt.value.trim();
  if (!prompt) {
    elements.planOutput.textContent = "Write a creative brief first.";
    return;
  }

  try {
    const payload = await api("/api/ai/brief", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        bodyType: state.bodyType,
      }),
    });

    elements.planOutput.textContent = payload.plan
      ? JSON.stringify(payload.plan, null, 2)
      : "Gemini is unavailable, so recommendations were generated locally.";

    if (payload.plan?.framePrompts?.length) {
      elements.prompt.value = `${prompt}\n\nFrame ideas:\n- ${payload.plan.framePrompts.join("\n- ")}`;
    }

    renderCatalog(payload.recommendations ?? []);
  } catch (error) {
    const message = actionableMessage("AI brief generation failed.", error);
    elements.planOutput.textContent = message;
    showToast(message, "error");
  }
}

async function saveProject() {
  try {
    const payload = await api("/api/history/save", {
      method: "POST",
      body: JSON.stringify(buildRequest()),
    });
    const history = await api("/api/history");
    renderHistory(history.items ?? []);
    elements.planOutput.textContent = `Saved project ${payload.id}`;
    showToast("Project saved to history.");
  } catch (error) {
    const message = actionableMessage("Project save failed.", error);
    elements.planOutput.textContent = message;
    showToast(message, "error");
  }
}

function renderCatalog(items) {
  const groupedItems = groupCatalogItems(items);
  const visibleGroups = Object.entries(groupedItems).filter((entry) =>
    state.category === "all" ? true : entry[0] === state.category,
  );
  const visibleCount = visibleGroups.reduce(
    (total, [, groupItems]) => total + groupItems.length,
    0,
  );

  elements.catalogCount.textContent = `${visibleCount} results`;
  elements.catalogList.innerHTML = "";

  if (!visibleGroups.length) {
    elements.catalogList.innerHTML = '<div class="muted">No catalog matches.</div>';
    return;
  }

  for (const [groupName, groupItems] of visibleGroups) {
    const section = document.createElement("section");
    section.className = "catalog-group";
    section.innerHTML = `
      <header class="catalog-group-header">
        <div>
          <p class="eyebrow">Category</p>
          <h3>${escapeHtml(groupName)}</h3>
        </div>
        <span class="chip">${groupItems.length} item${groupItems.length === 1 ? "" : "s"}</span>
      </header>
    `;

    const grid = document.createElement("div");
    grid.className = "catalog-group-grid";

    for (const item of groupItems) {
      grid.appendChild(createCatalogCard(item));
    }

    section.appendChild(grid);
    elements.catalogList.appendChild(section);
  }
}

function renderSelections() {
  elements.selectedItems.innerHTML = "";
  const entries = Object.entries(state.selections);
  elements.selectionCount.textContent = `${entries.length}`;

  if (!entries.length) {
    elements.selectedItems.innerHTML = '<div class="muted">No layers selected yet.</div>';
    return;
  }

  for (const [itemId, variant] of entries) {
    const item = state.catalogItemsById[itemId];
    const title = item?.name ?? itemId;
    const subtitle = item
      ? `${item.typeName} · ${variant}`
      : `Variant: ${variant}`;
    const index = entries.findIndex(([entryItemId]) => entryItemId === itemId);
    const isFirst = index === 0;
    const isLast = index === entries.length - 1;
    const card = document.createElement("article");
    card.className = "selected-card";
    card.innerHTML = `
      <header>
        <div>
          <h3>${escapeHtml(title)}</h3>
          <div class="muted">${escapeHtml(subtitle)}</div>
        </div>
      </header>
      <div class="selected-actions">
        <button class="mini ghost" data-action="up" ${isFirst ? "disabled" : ""}>Up</button>
        <button class="mini ghost" data-action="down" ${isLast ? "disabled" : ""}>Down</button>
        <button class="mini ghost" data-action="remove">Remove</button>
      </div>
    `;
    card.querySelector('[data-action="up"]').addEventListener("click", async () => {
      await moveSelection(itemId, -1);
    });
    card.querySelector('[data-action="down"]').addEventListener("click", async () => {
      await moveSelection(itemId, 1);
    });
    card.querySelector('[data-action="remove"]').addEventListener("click", async () => {
      pushUndoSnapshot();
      delete state.selections[itemId];
      state.redoStack = [];
      updateBuilderActionState();
      renderSelections();
      await refreshRender();
    });
    elements.selectedItems.appendChild(card);
  }
}

function renderCredits(credits) {
  elements.creditsList.innerHTML = "";
  if (!credits.length) {
    elements.creditsList.textContent = "No credits resolved for this render.";
    return;
  }

  for (const credit of credits) {
    const card = document.createElement("article");
    card.className = "credit-card";
    card.innerHTML = `
      <strong>${escapeHtml(credit.file)}</strong>
      <div class="muted">${escapeHtml((credit.authors ?? []).join(", "))}</div>
      <div class="muted">${escapeHtml((credit.licenses ?? []).join(", "))}</div>
    `;
    elements.creditsList.appendChild(card);
  }
}

function renderHistory(items) {
  elements.historyList.innerHTML = "";
  if (!items.length) {
    elements.historyList.innerHTML = '<div class="muted">No saved renders yet.</div>';
    return;
  }

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "history-card";
    card.innerHTML = `
      <header>
        <div>
          <h3>${escapeHtml(item.prompt || "Saved look")}</h3>
          <div class="muted">${escapeHtml(item.bodyType)} · ${escapeHtml(item.animation)}</div>
        </div>
        <span class="chip">${new Date(item.createdAt).toLocaleString()}</span>
      </header>
      <div class="selected-actions">
        <button class="mini ghost" data-action="restore">Restore</button>
        <button class="mini ghost" data-action="delete">Delete</button>
      </div>
    `;
    card.querySelector('[data-action="restore"]').addEventListener("click", async () => {
      await restoreHistory(item.id);
    });
    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      await deleteHistory(item.id);
    });
    elements.historyList.appendChild(card);
  }
}

function buildRequest() {
  return {
    projectName: elements.projectName.value.trim(),
    enginePreset: elements.enginePreset.value,
    bodyType: state.bodyType,
    animation: state.animation,
    prompt: elements.prompt.value.trim(),
    selections: state.selections,
  };
}

function hydrateSelect(select, values) {
  select.innerHTML = "";
  for (const value of values ?? []) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

async function exportRender() {
  if (!state.latestImageBase64) {
    showToast("Render something first.");
    return;
  }
  try {
    const payload = await api("/api/lpc/export", {
      method: "POST",
      body: JSON.stringify(buildRequest()),
    });
    const extra = (payload.extraPaths ?? []).map((file) => `Preset: ${file}`).join("\n");
    elements.previewMeta.textContent = `${elements.previewMeta.textContent} · exported`;
    elements.planOutput.textContent =
      `Exported bundle (${payload.enginePreset || "none"} preset):\nPNG: ${payload.imagePath}\nJSON: ${payload.metadataPath}\nZIP: ${payload.bundlePath}` +
      (extra ? `\n${extra}` : "");
    showToast("Export bundle written to build/exports.");
  } catch (error) {
    const message = actionableMessage("Export failed.", error);
    elements.planOutput.textContent = message;
    showToast(message, "error");
  }
}

async function clearSelections() {
  if (!Object.keys(state.selections).length) {
    showToast("Selections are already empty.");
    return;
  }

  pushUndoSnapshot();
  state.selections = {};
  state.redoStack = [];
  renderSelections();
  elements.previewImage.removeAttribute("src");
  elements.previewMeta.textContent = "Pick some layers to render.";
  elements.creditsList.textContent = "Credits will appear after a render.";
  updateBuilderActionState();
  showToast("Selections cleared.");
}

async function refreshHealth() {
  try {
    const payload = await api("/health");
    state.health = payload;
    renderHealth();
    return payload;
  } catch (error) {
    state.health = {
      status: "error",
      checks: [
        {
          label: "Health endpoint",
          status: "error",
          detail: error.message,
        },
      ],
    };
    renderHealth();
    throw error;
  }
}

async function restoreHistory(id) {
  try {
    const payload = await api("/api/history/restore", {
      method: "POST",
      body: JSON.stringify({ id }),
    });

    const restored = payload.restored;
    state.bodyType = restored.bodyType;
    state.animation = restored.animation;
    state.selections = restored.selections ?? {};
    state.redoStack = [];
    syncBuilderInputsFromState({
      prompt: restored.prompt ?? "",
    });

    state.latestImageBase64 = payload.imageBase64;
    state.latestMetadata = payload.metadata;
    state.lastRenderedRequest = snapshotRenderableState();
    elements.previewImage.src = `data:image/png;base64,${payload.imageBase64}`;
    elements.previewMeta.textContent = `${payload.width} x ${payload.height} px, ${payload.usedLayers.length} layers · restored`;
    renderCredits(payload.credits ?? []);
    await refreshCatalog();
    renderSelections();
    updateBuilderActionState();
    showToast("History entry restored.");
  } catch (error) {
    const message = actionableMessage("Restore failed.", error);
    elements.planOutput.textContent = message;
    showToast(message, "error");
  }
}

async function deleteHistory(id) {
  try {
    await api(`/api/history/${id}`, {
      method: "DELETE",
    });
    const history = await api("/api/history");
    renderHistory(history.items ?? []);
    showToast("History entry deleted.");
  } catch (error) {
    const message = actionableMessage("Delete failed.", error);
    elements.planOutput.textContent = message;
    showToast(message, "error");
  }
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "content-type": "application/json",
    },
    ...options,
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { error: (await response.text()) || "Request failed" };
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

function debounce(fn, delay) {
  let handle = null;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function actionableMessage(prefix, error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("DATABASE_URL")) {
    return `${prefix} Configure DATABASE_URL if you want saved history, or keep working without persistence.`;
  }

  if (message.includes("GEMINI_API_KEY")) {
    return `${prefix} Add a valid GEMINI_API_KEY to enable AI suggestions.`;
  }

  if (
    message.includes("lpc-spritesheet-creator") ||
    message.includes("sheet definitions") ||
    message.includes("spritesheets")
  ) {
    return `${prefix} The LPC asset submodule looks incomplete. Run git submodule update --init --recursive and try again.`;
  }

  return `${prefix} ${message}`;
}

function ensureStatusPanel() {
  if (elements.healthPanel) {
    return;
  }

  const host = elements.previewMeta?.parentElement || elements.planOutput?.parentElement || document.body;
  const panel = document.createElement("section");
  panel.className = "status-panel";
  panel.innerHTML = `
    <div class="status-panel-header">
      <div>
        <p class="eyebrow">System status</p>
        <h2>Runtime health</h2>
      </div>
      <button class="mini ghost" type="button" data-action="refresh-health">Refresh</button>
    </div>
    <p class="muted" data-role="health-summary">Checking SpriteCraft services...</p>
    <div class="status-grid" data-role="health-checks"></div>
  `;

  host.prepend(panel);
  panel
    .querySelector('[data-action="refresh-health"]')
    .addEventListener("click", refreshHealth);

  elements.healthPanel = panel;
}

function ensureCatalogFilters() {
  if (elements.catalogFilters) {
    return;
  }

  const controls = document.createElement("div");
  controls.className = "catalog-filters";
  controls.innerHTML = `
    <button class="chip active" type="button" data-category="all">All</button>
  `;
  elements.catalogList.parentElement.insertBefore(controls, elements.catalogList);
  elements.catalogFilters = controls;
}

function ensureQuickAccess() {
  if (elements.quickAccess) {
    return;
  }

  const section = document.createElement("section");
  section.className = "quick-access";
  section.innerHTML = `
    <header class="catalog-group-header">
      <div>
        <p class="eyebrow">Quick access</p>
        <h3>Favorites and pinned items</h3>
      </div>
      <span class="chip" data-role="quick-count">0 items</span>
    </header>
    <div class="quick-access-grid" data-role="quick-grid">
      <div class="muted">Favorite or pin catalog items to keep them handy here.</div>
    </div>
  `;

  elements.catalogList.parentElement.insertBefore(section, elements.catalogList);
  elements.quickAccess = section;
}

function renderQuickAccess() {
  if (!elements.quickAccess) {
    return;
  }

  const grid = elements.quickAccess.querySelector('[data-role="quick-grid"]');
  const count = elements.quickAccess.querySelector('[data-role="quick-count"]');
  const orderedIds = [
    ...state.pinnedItems,
    ...state.favoriteItems.filter((itemId) => !state.pinnedItems.includes(itemId)),
  ];
  const items = orderedIds
    .map((itemId) => state.catalogItemsById[itemId])
    .filter(Boolean);

  count.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
  grid.innerHTML = "";

  if (!items.length) {
    grid.innerHTML = '<div class="muted">Favorite or pin catalog items to keep them handy here.</div>';
    return;
  }

  for (const item of items) {
    const card = createCatalogCard(item, { compact: true });
    card.classList.add("quick-access-card");
    grid.appendChild(card);
  }
}

function syncCategoryOptions(items) {
  if (!elements.catalogFilters) {
    return;
  }

  const categories = [...new Set(items.map((item) => normalizeCategoryLabel(item.category)))].sort();
  const filterMarkup = [
    `<button class="chip ${state.category === "all" ? "active" : ""}" type="button" data-category="all">All</button>`,
    ...categories.map((category) => {
      const isActive = state.category === category ? "active" : "";
      return `<button class="chip ${isActive}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`;
    }),
  ].join("");

  elements.catalogFilters.innerHTML = filterMarkup;
  for (const button of elements.catalogFilters.querySelectorAll("[data-category]")) {
    button.addEventListener("click", () => {
      state.category = button.dataset.category || "all";
      syncCategoryOptions(items);
      renderCatalog(items);
    });
  }

  if (
    state.category !== "all" &&
    !categories.includes(state.category)
  ) {
    state.category = "all";
    syncCategoryOptions(items);
  }
}

function groupCatalogItems(items) {
  const groups = {};
  for (const item of items) {
    const group = normalizeCategoryLabel(item.category);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
  }
  return Object.fromEntries(
    Object.entries(groups).sort(([left], [right]) => left.localeCompare(right)),
  );
}

async function moveSelection(itemId, direction) {
  const entries = Object.entries(state.selections);
  const index = entries.findIndex(([entryItemId]) => entryItemId === itemId);
  if (index < 0) {
    return;
  }

  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= entries.length) {
    return;
  }

  pushUndoSnapshot();
  const reordered = [...entries];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(nextIndex, 0, moved);
  state.selections = Object.fromEntries(reordered);
  state.redoStack = [];
  updateBuilderActionState();
  renderSelections();
  await refreshRender();
}

function createCatalogCard(item, { compact = false } = {}) {
  const card = document.createElement("article");
  card.className = "item-card";
  const variantOptions = (item.variants?.length ? item.variants : ["default"])
    .map((variant) => `<option value="${escapeHtml(variant)}">${escapeHtml(variant)}</option>`)
    .join("");
  const isFavorite = state.favoriteItems.includes(item.id);
  const isPinned = state.pinnedItems.includes(item.id);

  card.innerHTML = `
    <header>
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <div class="muted">${escapeHtml(item.typeName)} · ${escapeHtml(item.category)}</div>
      </div>
      <span class="chip">${escapeHtml(item.requiredBodyTypes.join(", "))}</span>
    </header>
    <div class="chips">
      ${(item.tags ?? []).slice(0, compact ? 2 : 4).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
      ${(item.animations ?? []).slice(0, compact ? 2 : 3).map((anim) => `<span class="chip">${escapeHtml(anim)}</span>`).join("")}
    </div>
    <div class="item-actions">
      <select class="variant-select">${variantOptions}</select>
      <button class="primary mini" data-action="use">Use</button>
    </div>
    <div class="item-actions secondary-actions">
      <button class="mini ghost ${isFavorite ? "active" : ""}" data-action="favorite">${isFavorite ? "Favorited" : "Favorite"}</button>
      <button class="mini ghost ${isPinned ? "active" : ""}" data-action="pin">${isPinned ? "Pinned" : "Pin"}</button>
    </div>
  `;

  const useButton = card.querySelector('[data-action="use"]');
  const favoriteButton = card.querySelector('[data-action="favorite"]');
  const pinButton = card.querySelector('[data-action="pin"]');
  const select = card.querySelector("select");

  useButton.addEventListener("click", async () => {
    pushUndoSnapshot();
    state.selections[item.id] = select.value;
    state.redoStack = [];
    updateBuilderActionState();
    renderSelections();
    await refreshRender();
  });

  favoriteButton.addEventListener("click", () => {
    toggleFavorite(item.id);
  });

  pinButton.addEventListener("click", () => {
    togglePinned(item.id);
  });

  return card;
}

function normalizeCategoryLabel(category) {
  if (!category) {
    return "Misc";
  }

  return String(category)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function loadStudioPreferences() {
  try {
    const raw = window.localStorage.getItem("spritecraft-preferences");
    if (!raw) {
      return;
    }

    const stored = JSON.parse(raw);
    state.favoriteItems = Array.isArray(stored.favoriteItems)
      ? stored.favoriteItems
      : [];
    state.pinnedItems = Array.isArray(stored.pinnedItems)
      ? stored.pinnedItems
      : [];
  } catch (error) {
    console.warn("Could not load SpriteCraft preferences.", error);
  }
}

function saveStudioPreferences() {
  try {
    window.localStorage.setItem(
      "spritecraft-preferences",
      JSON.stringify({
        favoriteItems: state.favoriteItems,
        pinnedItems: state.pinnedItems,
      }),
    );
  } catch (error) {
    console.warn("Could not save SpriteCraft preferences.", error);
  }
}

function toggleFavorite(itemId) {
  if (state.favoriteItems.includes(itemId)) {
    state.favoriteItems = state.favoriteItems.filter((entry) => entry !== itemId);
    showToast("Removed from favorites.");
  } else {
    state.favoriteItems = [itemId, ...state.favoriteItems].slice(0, 24);
    showToast("Added to favorites.");
  }

  saveStudioPreferences();
  renderQuickAccess();
  void refreshCatalog();
}

function togglePinned(itemId) {
  if (state.pinnedItems.includes(itemId)) {
    state.pinnedItems = state.pinnedItems.filter((entry) => entry !== itemId);
    showToast("Removed from pinned items.");
  } else {
    state.pinnedItems = [itemId, ...state.pinnedItems.filter((entry) => entry !== itemId)].slice(0, 12);
    if (!state.favoriteItems.includes(itemId)) {
      state.favoriteItems = [itemId, ...state.favoriteItems].slice(0, 24);
    }
    showToast("Pinned for quick access.");
  }

  saveStudioPreferences();
  renderQuickAccess();
  void refreshCatalog();
}

function renderHealth() {
  if (!elements.healthPanel) {
    return;
  }

  const summary = elements.healthPanel.querySelector('[data-role="health-summary"]');
  const checksHost = elements.healthPanel.querySelector('[data-role="health-checks"]');
  const health = state.health;
  const checks = health?.checks ?? [];
  const status = health?.status ?? "warning";
  const statusLabel = status === "ok" ? "ready" : status;

  summary.textContent =
    checks.length
      ? `SpriteCraft runtime is ${statusLabel}. ${checks.filter((check) => check.status !== "ok").length} attention item(s).`
      : "No health details are available yet.";

  checksHost.innerHTML = "";
  for (const check of checks) {
    const card = document.createElement("article");
    card.className = `status-card ${check.status || "warning"}`;
    card.innerHTML = `
      <header>
        <strong>${escapeHtml(check.label || "Check")}</strong>
        <span class="chip">${escapeHtml(check.status || "unknown")}</span>
      </header>
      <p>${escapeHtml(check.detail || "")}</p>
    `;
    checksHost.appendChild(card);
  }
}

function ensureBuilderActions() {
  if (elements.builderActions || !elements.clearSelections?.parentElement) {
    return;
  }

  const actions = document.createElement("div");
  actions.className = "builder-actions";
  actions.innerHTML = `
    <button class="mini ghost" type="button" data-action="undo">Undo</button>
    <button class="mini ghost" type="button" data-action="redo">Redo</button>
    <button class="mini ghost" type="button" data-action="restore-render">Restore Last Render</button>
  `;

  elements.clearSelections.parentElement.insertBefore(
    actions,
    elements.clearSelections.nextSibling,
  );
  elements.builderActions = actions;
  actions.querySelector('[data-action="undo"]').addEventListener("click", undoBuilderChange);
  actions.querySelector('[data-action="redo"]').addEventListener("click", redoBuilderChange);
  actions
    .querySelector('[data-action="restore-render"]')
    .addEventListener("click", restoreLastRender);
  updateBuilderActionState();
}

function ensurePreviewModes() {
  if (elements.previewModes || !elements.previewMeta?.parentElement) {
    return;
  }

  const controls = document.createElement("div");
  controls.className = "preview-modes";
  controls.innerHTML = `
    <button class="mini ghost active" type="button" data-preview-mode="single">Single Preview</button>
    <button class="mini ghost" type="button" data-preview-mode="compare">Compare Idle / Walk / Combat</button>
  `;

  const comparisonGrid = document.createElement("div");
  comparisonGrid.className = "comparison-grid hidden";

  const host = elements.previewMeta.parentElement;
  host.prepend(comparisonGrid);
  host.prepend(controls);

  elements.previewModes = controls;
  elements.comparisonGrid = comparisonGrid;

  for (const button of controls.querySelectorAll("[data-preview-mode]")) {
    button.addEventListener("click", async () => {
      const nextMode = button.dataset.previewMode || "single";
      if (nextMode === state.previewMode) {
        return;
      }

      state.previewMode = nextMode;
      syncPreviewModeButtons();
      await refreshRender();
    });
  }

  syncPreviewModeButtons();
}

function snapshotBuilderState() {
  return {
    bodyType: state.bodyType,
    animation: state.animation,
    selections: { ...state.selections },
  };
}

function snapshotRenderableState() {
  return {
    ...snapshotBuilderState(),
    prompt: elements.prompt?.value ?? "",
    projectName: elements.projectName?.value ?? "",
    enginePreset: elements.enginePreset?.value ?? "none",
  };
}

function pushUndoSnapshot() {
  const snapshot = snapshotBuilderState();
  const previous = state.undoStack[state.undoStack.length - 1];
  if (previous && builderStatesEqual(previous, snapshot)) {
    return;
  }

  state.undoStack.push(snapshot);
  if (state.undoStack.length > 40) {
    state.undoStack.shift();
  }
}

function builderStatesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function syncBuilderInputsFromState(overrides = {}) {
  const nextPrompt = overrides.prompt ?? elements.prompt?.value ?? "";
  const nextProjectName = overrides.projectName ?? elements.projectName?.value ?? "";
  const nextEnginePreset = overrides.enginePreset ?? elements.enginePreset?.value ?? "none";

  elements.bodyType.value = state.bodyType;
  elements.animation.value = state.animation;
  if (elements.prompt) {
    elements.prompt.value = nextPrompt;
  }
  if (elements.projectName) {
    elements.projectName.value = nextProjectName;
  }
  if (elements.enginePreset) {
    elements.enginePreset.value = nextEnginePreset;
  }
}

async function applyBuilderSnapshot(snapshot, { announce = "" } = {}) {
  state.bodyType = snapshot.bodyType;
  state.animation = snapshot.animation;
  state.selections = { ...(snapshot.selections ?? {}) };
  syncBuilderInputsFromState(snapshot);
  renderSelections();
  await refreshCatalog();
  if (Object.keys(state.selections).length) {
    await refreshRender();
  } else {
    elements.previewImage.removeAttribute("src");
    elements.previewMeta.textContent = "Pick some layers to render.";
    elements.creditsList.textContent = "Credits will appear after a render.";
  }
  updateBuilderActionState();
  if (announce) {
    showToast(announce);
  }
}

async function undoBuilderChange() {
  const snapshot = state.undoStack.pop();
  if (!snapshot) {
    showToast("Nothing to undo.");
    return;
  }

  state.redoStack.push(snapshotBuilderState());
  await applyBuilderSnapshot(snapshot, { announce: "Undid last change." });
}

async function redoBuilderChange() {
  const snapshot = state.redoStack.pop();
  if (!snapshot) {
    showToast("Nothing to redo.");
    return;
  }

  state.undoStack.push(snapshotBuilderState());
  await applyBuilderSnapshot(snapshot, { announce: "Redid change." });
}

async function restoreLastRender() {
  if (!state.lastRenderedRequest) {
    showToast("No previous render is available yet.");
    return;
  }

  pushUndoSnapshot();
  state.redoStack = [];
  await applyBuilderSnapshot(state.lastRenderedRequest, {
    announce: "Restored the last rendered look.",
  });
}

function updateBuilderActionState() {
  if (!elements.builderActions) {
    return;
  }

  const undoButton = elements.builderActions.querySelector('[data-action="undo"]');
  const redoButton = elements.builderActions.querySelector('[data-action="redo"]');
  const restoreButton = elements.builderActions.querySelector('[data-action="restore-render"]');
  undoButton.disabled = state.undoStack.length === 0;
  redoButton.disabled = state.redoStack.length === 0;
  restoreButton.disabled = !state.lastRenderedRequest;
}

function syncPreviewModeButtons() {
  if (!elements.previewModes) {
    return;
  }

  for (const button of elements.previewModes.querySelectorAll("[data-preview-mode]")) {
    button.classList.toggle(
      "active",
      button.dataset.previewMode === state.previewMode,
    );
  }
}

function getComparisonAnimations() {
  const preferred = [
    "idle",
    "walk",
    "slash",
    "attack",
    "shoot",
    "thrust",
    "cast",
    "spellcast",
  ];
  const matches = preferred.filter((animation) =>
    state.availableAnimations.includes(animation),
  );

  if (matches.length >= 3) {
    return matches.slice(0, 3);
  }

  const fallback = state.availableAnimations.filter(
    (animation) => !matches.includes(animation),
  );
  return [...matches, ...fallback].slice(0, 3);
}

async function fetchRenderPayload(animation) {
  const payload = await api("/api/lpc/render", {
    method: "POST",
    body: JSON.stringify({
      ...buildRequest(),
      animation,
    }),
  });
  return {
    ...payload,
    animation,
  };
}

function renderComparisonPreviews(payloads) {
  if (!elements.comparisonGrid) {
    return;
  }

  elements.comparisonGrid.innerHTML = "";
  const shouldShow = state.previewMode === "compare" && payloads.length > 0;
  elements.comparisonGrid.classList.toggle("hidden", !shouldShow);

  if (!shouldShow) {
    return;
  }

  for (const payload of payloads) {
    const card = document.createElement("article");
    card.className = "comparison-card";
    card.innerHTML = `
      <header>
        <strong>${escapeHtml(formatAnimationLabel(payload.animation))}</strong>
        <span class="chip">${escapeHtml(payload.width)} x ${escapeHtml(payload.height)}</span>
      </header>
      <img alt="${escapeHtml(payload.animation)} preview" src="data:image/png;base64,${payload.imageBase64}">
      <p class="muted">${escapeHtml(payload.usedLayers.length)} layers</p>
    `;
    elements.comparisonGrid.appendChild(card);
  }
}

function formatAnimationLabel(animation) {
  return String(animation)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function handleBuilderShortcuts(event) {
  const isModifier = event.ctrlKey || event.metaKey;
  if (!isModifier) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "z" && event.shiftKey) {
    event.preventDefault();
    void redoBuilderChange();
    return;
  }

  if (key === "z") {
    event.preventDefault();
    void undoBuilderChange();
    return;
  }

  if (key === "y") {
    event.preventDefault();
    void redoBuilderChange();
  }
}

function showToast(message, kind = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${kind}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("visible");
  });

  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 220);
  }, 2600);
}
