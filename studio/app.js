// File: studio/app.js

const state = {
  bodyType: "male",
  animation: "idle",
  category: "all",
  selections: {},
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
  selectionCount: document.querySelector("#selectionCount"),
  renderNow: document.querySelector("#renderNow"),
  exportRender: document.querySelector("#exportRender"),
  catalogSearch: document.querySelector("#catalogSearch"),
  catalogFilters: null,
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
};

init().catch((error) => {
  console.error(error);
  elements.planOutput.textContent = `Startup failed: ${error.message}`;
  showToast(error.message, "error");
});

async function init() {
  ensureStatusPanel();
  const [bootstrap, health] = await Promise.all([
    api("/api/studio/bootstrap"),
    refreshHealth(),
  ]);
  hydrateSelect(elements.bodyType, bootstrap.catalog.bodyTypes);
  hydrateSelect(elements.animation, bootstrap.catalog.animations);
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
    state.bodyType = event.target.value;
    await refreshCatalog();
    await refreshRender();
  });

  elements.animation.addEventListener("change", async (event) => {
    state.animation = event.target.value;
    await refreshCatalog();
    await refreshRender();
  });

  elements.catalogSearch.addEventListener("input", debounce(refreshCatalog, 180));
  elements.renderNow.addEventListener("click", refreshRender);
  elements.aiSuggest.addEventListener("click", runAiBrief);
  elements.saveProject.addEventListener("click", saveProject);
  elements.exportRender.addEventListener("click", exportRender);
  elements.clearSelections.addEventListener("click", clearSelections);
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
    return;
  }

  try {
    const payload = await api("/api/lpc/render", {
      method: "POST",
      body: JSON.stringify(buildRequest()),
    });
    state.latestImageBase64 = payload.imageBase64;
    state.latestMetadata = payload.metadata;
    elements.previewImage.src = `data:image/png;base64,${payload.imageBase64}`;
    elements.previewMeta.textContent = `${payload.width} x ${payload.height} px, ${payload.usedLayers.length} layers`;
    renderCredits(payload.credits ?? []);
  } catch (error) {
    elements.previewMeta.textContent = error.message;
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
      const card = document.createElement("article");
      card.className = "item-card";
      const variantOptions = (item.variants?.length ? item.variants : ["default"])
        .map((variant) => `<option value="${escapeHtml(variant)}">${escapeHtml(variant)}</option>`)
        .join("");

      card.innerHTML = `
        <header>
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <div class="muted">${escapeHtml(item.typeName)} · ${escapeHtml(item.category)}</div>
          </div>
          <span class="chip">${escapeHtml(item.requiredBodyTypes.join(", "))}</span>
        </header>
        <div class="chips">
          ${(item.tags ?? []).slice(0, 4).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
          ${(item.animations ?? []).slice(0, 3).map((anim) => `<span class="chip">${escapeHtml(anim)}</span>`).join("")}
        </div>
        <div class="item-actions">
          <select class="variant-select">${variantOptions}</select>
          <button class="primary mini">Use</button>
        </div>
      `;

      const button = card.querySelector("button");
      const select = card.querySelector("select");
      button.addEventListener("click", async () => {
        state.selections[item.id] = select.value;
        renderSelections();
        await refreshRender();
      });

      grid.appendChild(card);
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
        <button class="mini ghost">Remove</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      delete state.selections[itemId];
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

  state.selections = {};
  renderSelections();
  elements.previewImage.removeAttribute("src");
  elements.previewMeta.textContent = "Pick some layers to render.";
  elements.creditsList.textContent = "Credits will appear after a render.";
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
    elements.bodyType.value = state.bodyType;
    elements.animation.value = state.animation;
    elements.prompt.value = restored.prompt ?? "";

    state.latestImageBase64 = payload.imageBase64;
    state.latestMetadata = payload.metadata;
    elements.previewImage.src = `data:image/png;base64,${payload.imageBase64}`;
    elements.previewMeta.textContent = `${payload.width} x ${payload.height} px, ${payload.usedLayers.length} layers · restored`;
    renderCredits(payload.credits ?? []);
    await refreshCatalog();
    renderSelections();
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
