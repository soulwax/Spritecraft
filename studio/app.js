const state = {
  bodyType: "male",
  animation: "idle",
  selections: {},
  latestImageBase64: null,
};

const elements = {
  prompt: document.querySelector("#prompt"),
  bodyType: document.querySelector("#bodyType"),
  animation: document.querySelector("#animation"),
  aiSuggest: document.querySelector("#aiSuggest"),
  saveProject: document.querySelector("#saveProject"),
  renderNow: document.querySelector("#renderNow"),
  downloadPng: document.querySelector("#downloadPng"),
  catalogSearch: document.querySelector("#catalogSearch"),
  catalogList: document.querySelector("#catalogList"),
  catalogCount: document.querySelector("#catalogCount"),
  selectedItems: document.querySelector("#selectedItems"),
  historyList: document.querySelector("#historyList"),
  previewImage: document.querySelector("#previewImage"),
  previewMeta: document.querySelector("#previewMeta"),
  creditsList: document.querySelector("#creditsList"),
  planOutput: document.querySelector("#planOutput"),
};

init().catch((error) => {
  console.error(error);
  elements.planOutput.textContent = `Startup failed: ${error.message}`;
});

async function init() {
  const bootstrap = await api("/api/studio/bootstrap");
  hydrateSelect(elements.bodyType, bootstrap.catalog.bodyTypes);
  hydrateSelect(elements.animation, bootstrap.catalog.animations);

  state.bodyType = bootstrap.defaults.bodyType ?? state.bodyType;
  state.animation = bootstrap.defaults.animation ?? state.animation;
  state.selections = bootstrap.defaults.selections ?? {};

  elements.bodyType.value = state.bodyType;
  elements.animation.value = state.animation;

  bindEvents();
  renderHistory(bootstrap.recent ?? []);
  renderSelections();
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
  elements.downloadPng.addEventListener("click", downloadPng);
}

async function refreshCatalog() {
  const query = new URLSearchParams({
    q: elements.catalogSearch.value,
    bodyType: state.bodyType,
    animation: state.animation,
  });
  const payload = await api(`/api/lpc/catalog?${query}`);
  renderCatalog(payload.items ?? []);
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
    elements.previewImage.src = `data:image/png;base64,${payload.imageBase64}`;
    elements.previewMeta.textContent = `${payload.width} x ${payload.height} px, ${payload.usedLayers.length} layers`;
    renderCredits(payload.credits ?? []);
  } catch (error) {
    elements.previewMeta.textContent = error.message;
  }
}

async function runAiBrief() {
  const prompt = elements.prompt.value.trim();
  if (!prompt) {
    elements.planOutput.textContent = "Write a creative brief first.";
    return;
  }

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
}

async function saveProject() {
  const payload = await api("/api/history/save", {
    method: "POST",
    body: JSON.stringify(buildRequest()),
  });
  const history = await api("/api/history");
  renderHistory(history.items ?? []);
  elements.planOutput.textContent = `Saved project ${payload.id}`;
}

function renderCatalog(items) {
  elements.catalogCount.textContent = `${items.length} results`;
  elements.catalogList.innerHTML = "";

  if (!items.length) {
    elements.catalogList.innerHTML = '<div class="muted">No catalog matches.</div>';
    return;
  }

  for (const item of items) {
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

    elements.catalogList.appendChild(card);
  }
}

function renderSelections() {
  elements.selectedItems.innerHTML = "";
  const entries = Object.entries(state.selections);
  if (!entries.length) {
    elements.selectedItems.innerHTML = '<div class="muted">No layers selected yet.</div>';
    return;
  }

  for (const [itemId, variant] of entries) {
    const card = document.createElement("article");
    card.className = "selected-card";
    card.innerHTML = `
      <header>
        <div>
          <h3>${escapeHtml(itemId)}</h3>
          <div class="muted">Variant: ${escapeHtml(variant)}</div>
        </div>
      </header>
      <div class="selected-actions">
        <button class="mini">Remove</button>
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
    `;
    elements.historyList.appendChild(card);
  }
}

function buildRequest() {
  return {
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

async function downloadPng() {
  if (!state.latestImageBase64) {
    return;
  }
  const link = document.createElement("a");
  link.href = `data:image/png;base64,${state.latestImageBase64}`;
  link.download = "sprite.png";
  link.click();
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "content-type": "application/json",
    },
    ...options,
  });
  const payload = await response.json();
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
