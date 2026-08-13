import {
  FAMILY_META,
  electronShells,
  formatDiscovery,
  formatElectronConfiguration,
  parsePubChem,
  slugify,
  tablePlaceholders,
} from "./model.js";
import { makeElementPattern } from "./pattern-data.js";
import { HERO_ELEMENT_STORIES, getStructuresForElement } from "./structure-data.js";
import { atomColor } from "./chemistry-colors.js";
import { getDefaultIsotope, getIsotopeOptions, makeNeutralAtomComposition } from "./isotope-data.js";

const DATA_URL = new URL("../data/pubchem-periodic-table.json", import.meta.url);
const FAMILY_COLORS = new Map(FAMILY_META.map(([, slug, color]) => [slug, color]));
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const state = {
  elements: [],
  elementMap: new Map(),
  selected: null,
  family: "all",
  query: "",
  mode: "atom",
  structureId: "dioxygen",
  isotope: null,
  motion: !reducedMotionQuery.matches,
  labels: true,
  renderToken: 0,
  searchIndex: -1,
};

const ui = {
  loading: document.querySelector("#loading-screen"),
  table: document.querySelector("#periodic-table"),
  elementPanel: document.querySelector("#element-panel"),
  inspector: document.querySelector("#inspector"),
  tableToggle: document.querySelector("#table-toggle"),
  panelClose: document.querySelector("#panel-close"),
  panelScrim: document.querySelector("#panel-scrim"),
  familyList: document.querySelector("#family-list"),
  visibleCount: document.querySelector("#visible-count"),
  searchShell: document.querySelector("#search-shell"),
  search: document.querySelector("#element-search"),
  searchResults: document.querySelector("#search-results"),
  reset: document.querySelector("#reset-button"),
  ticketSymbol: document.querySelector("#ticket-symbol"),
  ticketName: document.querySelector("#ticket-name"),
  ticketMeta: document.querySelector("#ticket-meta"),
  ticketState: document.querySelector("#ticket-state"),
  stageCard: document.querySelector("#stage-card"),
  stageColumn: document.querySelector(".stage-column"),
  sceneMount: document.querySelector("#scene-mount"),
  stageKicker: document.querySelector("#stage-kicker"),
  stageTitle: document.querySelector("#stage-title"),
  stageFormula: document.querySelector("#stage-formula"),
  stageSubtitle: document.querySelector("#stage-subtitle"),
  previousElement: document.querySelector("#previous-element"),
  nextElement: document.querySelector("#next-element"),
  elementPosition: document.querySelector("#element-position"),
  truthChip: document.querySelector("#truth-chip"),
  fallbackSymbol: document.querySelector("#fallback-symbol"),
  dragCue: document.querySelector("#drag-cue"),
  annotationLabel: document.querySelector("#annotation-label"),
  annotationCopy: document.querySelector("#annotation-copy"),
  modelHud: document.querySelector("#model-hud"),
  modelHudKicker: document.querySelector("#model-hud-kicker"),
  modelHudTitle: document.querySelector("#model-hud-title"),
  particleCounts: document.querySelector("#particle-counts"),
  protonCount: document.querySelector("#proton-count"),
  neutronCount: document.querySelector("#neutron-count"),
  electronCount: document.querySelector("#electron-count"),
  moleculeComposition: document.querySelector("#molecule-composition"),
  modelHudNote: document.querySelector("#model-hud-note"),
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  structureDock: document.querySelector("#structure-dock"),
  structureList: document.querySelector("#structure-list"),
  structureAvailability: document.querySelector("#structure-availability"),
  elementKicker: document.querySelector("#element-kicker"),
  elementName: document.querySelector("#element-name"),
  elementOrigin: document.querySelector("#element-origin"),
  symbolSeal: document.querySelector("#symbol-seal"),
  storyCard: document.querySelector("#story-card"),
  storyTitle: document.querySelector("#story-title"),
  storyCopy: document.querySelector("#story-copy"),
  isotopeCard: document.querySelector("#isotope-card"),
  isotopeList: document.querySelector("#isotope-list"),
  equationMass: document.querySelector("#equation-mass"),
  equationProtons: document.querySelector("#equation-protons"),
  equationNeutrons: document.querySelector("#equation-neutrons"),
  isotopeHeading: document.querySelector("#isotope-heading"),
  isotopeExplanation: document.querySelector("#isotope-explanation"),
  structureStudyCard: document.querySelector("#structure-study-card"),
  studyKicker: document.querySelector("#study-kicker"),
  studyName: document.querySelector("#study-name"),
  studyFormula: document.querySelector("#study-formula"),
  studyStatus: document.querySelector("#study-status"),
  studyComposition: document.querySelector("#study-composition"),
  studyMetrics: document.querySelector("#study-metrics"),
  studyFacts: document.querySelector("#study-facts"),
  studySource: document.querySelector("#study-source"),
  familyLabel: document.querySelector("#family-label"),
  atomicMassLabel: document.querySelector("#atomic-mass-label"),
  atomicMass: document.querySelector("#atomic-mass"),
  standardState: document.querySelector("#standard-state"),
  shellCounts: document.querySelector("#shell-counts"),
  electronConfig: document.querySelector("#electron-config"),
  electronegativity: document.querySelector("#electronegativity"),
  atomicRadius: document.querySelector("#atomic-radius"),
  ionizationEnergy: document.querySelector("#ionization-energy"),
  oxidationStates: document.querySelector("#oxidation-states"),
  oxidationStatesLabel: document.querySelector("#oxidation-states-label"),
  geometryHeading: document.querySelector("#geometry-heading"),
  geometryCopy: document.querySelector("#geometry-copy"),
  truthNoteCopy: document.querySelector("#truth-note-copy"),
  cameraReset: document.querySelector("#camera-reset"),
  motionToggle: document.querySelector("#motion-toggle"),
  labelsToggle: document.querySelector("#labels-toggle"),
  fullscreen: document.querySelector("#fullscreen-button"),
  selectionAnnouncer: document.querySelector("#selection-announcer"),
};

let stage;
let selectionSequence = 0;
let panelReturnFocus = null;

function getStructureViews(element) {
  if (!element) return [];
  const shells = electronShells(element, state.elementMap);
  const curatedStructures = getStructuresForElement(element.symbol);
  const conceptPattern = makeElementPattern(element, shells);
  return curatedStructures.length ? [...curatedStructures, conceptPattern] : [conceptPattern];
}

function elementSceneColor(element, fallback) {
  return /^[0-9a-f]{6}$/i.test(element?.cpkHexColor ?? "") ? `#${element.cpkHexColor}` : fallback;
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Dataset request failed (${response.status})`);
    state.elements = parsePubChem(await response.json());
    state.elementMap = new Map(state.elements.map((element) => [element.symbol, element]));

    renderFamilies();
    renderTable();
    bindEvents();

    // Commit a complete, accessible text state before the heavier Three.js
    // chunk loads so slow devices and assistive technology are never blocked.
    await selectElement(state.elementMap.get("O"), { preferredMode: "atom", structureId: "dioxygen" });
    ui.loading.classList.add("is-hidden");

    try {
      const { ElementStage } = await import("./scene.js");
      stage = new ElementStage(ui.sceneMount, {
        elementMap: state.elementMap,
        onFallback: () => activateSceneFallback("WebGL unavailable"),
      });
      stage.setMotion(state.motion);
      stage.setLabels(state.labels);
      await renderCurrentScene();
    } catch (sceneError) {
      console.warn("The interactive 3D layer could not load; continuing with the complete text explorer.", sceneError);
      activateSceneFallback("3D layer unavailable");
    }

  } catch (error) {
    console.error(error);
    ui.loading.innerHTML = `<p><strong>The atomic field could not load.</strong><br>${escapeHTML(error.message)}</p>`;
    ui.loading.classList.add("has-error");
  }
}

function activateSceneFallback(reason) {
  ui.sceneMount.classList.add("has-webgl-fallback");
  ui.truthChip.innerHTML = `<span aria-hidden="true">◇</span><span><strong>Accessible fallback</strong><small>${escapeHTML(reason)}</small></span>`;
  ui.cameraReset.disabled = true;
  ui.motionToggle.disabled = true;
  ui.labelsToggle.disabled = true;
  ui.fullscreen.disabled = true;
}

function renderFamilies() {
  const counts = new Map();
  state.elements.forEach((element) => counts.set(element.category, (counts.get(element.category) ?? 0) + 1));

  FAMILY_META.forEach(([label, slug, color]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "family-button";
    button.dataset.family = slug;
    button.setAttribute("aria-pressed", String(slug === "all"));
    const shortLabel = slug === "all" ? "All" : label.replace(" metal", "");
    button.innerHTML = `<span class="family-swatch" style="--swatch:${color}"></span><span>${shortLabel}</span><small>${slug === "all" ? 118 : counts.get(label) ?? 0}</small>`;
    ui.familyList.append(button);
  });
}

function renderTable() {
  state.elements.forEach((element) => {
    const family = slugify(element.category);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `element-cell family-${family}`;
    button.dataset.symbol = element.symbol;
    button.dataset.family = family;
    button.dataset.period = String(element.period);
    button.dataset.row = String(element.row);
    button.dataset.column = String(element.column);
    if (element.group) button.dataset.group = String(element.group);
    button.style.gridColumn = String(element.column);
    button.style.gridRow = String(element.row);
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", `${element.name}, ${element.symbol}, atomic number ${element.atomicNumber}`);
    button.tabIndex = element.symbol === "S" ? 0 : -1;
    button.innerHTML = `<small>${element.atomicNumber}</small><strong>${element.symbol}</strong><span>${element.name}</span>`;
    ui.table.append(button);
  });

  tablePlaceholders().forEach((placeholder) => {
    const marker = document.createElement("div");
    marker.className = `series-placeholder family-${placeholder.family}`;
    marker.style.gridColumn = String(placeholder.column);
    marker.style.gridRow = String(placeholder.row);
    marker.innerHTML = `<strong>${placeholder.label}</strong><span>${placeholder.sublabel}</span>`;
    ui.table.append(marker);
  });
}

function bindEvents() {
  ui.table.addEventListener("click", (event) => {
    const cell = event.target.closest("[data-symbol]");
    if (!cell) return;
    selectElement(state.elementMap.get(cell.dataset.symbol), { preferredMode: "atom" });
    closeElementPanel();
  });

  ui.table.addEventListener("keydown", handleTableKeys);

  ui.familyList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-family]");
    if (!button) return;
    state.family = button.dataset.family;
    ui.familyList.querySelectorAll("button").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
    applyFilters();
  });

  ui.search.addEventListener("input", () => {
    state.query = ui.search.value.trim().toLowerCase();
    state.searchIndex = -1;
    applyFilters();
    renderSearchResults();
  });

  ui.search.addEventListener("keydown", (event) => {
    const results = rankedSearchResults();
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!results.length) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      state.searchIndex = state.searchIndex < 0
        ? (direction > 0 ? 0 : results.length - 1)
        : (state.searchIndex + direction + results.length) % results.length;
      updateSearchHighlight();
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      if (!results.length) return;
      event.preventDefault();
      state.searchIndex = event.key === "Home" ? 0 : results.length - 1;
      updateSearchHighlight();
      return;
    }
    if (event.key === "Escape") {
      closeSearchResults();
      return;
    }
    if (event.key === "Tab") {
      closeSearchResults();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    const match = results[state.searchIndex] ?? results[0];
    if (match) chooseSearchResult(match);
  });

  ui.search.addEventListener("focus", renderSearchResults);

  ui.searchResults.addEventListener("pointerdown", (event) => event.preventDefault());
  ui.searchResults.addEventListener("click", (event) => {
    const option = event.target.closest("[data-search-symbol]");
    if (!option) return;
    chooseSearchResult(state.elementMap.get(option.dataset.searchSymbol));
  });

  ui.reset.addEventListener("click", resetExperience);
  ui.previousElement.addEventListener("click", () => selectRelativeElement(-1));
  ui.nextElement.addEventListener("click", () => selectRelativeElement(1));

  ui.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const requestedMode = button.dataset.mode;
      state.mode = requestedMode;
      if (requestedMode === "structure") {
        const views = getStructureViews(state.selected);
        if (!views.some((view) => view.id === state.structureId)) state.structureId = views[0]?.id ?? null;
      }
      updateModeButtons();
      renderCurrentScene();
    });
  });

  ui.structureList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-structure-id]");
    if (!card) return;
    ui.stageCard?.scrollTo({ top: 0, behavior: "auto" });
    state.structureId = card.dataset.structureId;
    state.mode = "structure";
    updateModeButtons();
    updateStructureCards();
    renderCurrentScene();
  });

  ui.isotopeList.addEventListener("change", (event) => {
    const input = event.target.closest("input[name=isotope]");
    if (!input || !state.selected) return;
    const selected = getIsotopeOptions(state.selected.symbol)
      .find((isotope) => isotope.massNumber === Number(input.value));
    if (!selected) return;
    state.isotope = selected;
    state.mode = "atom";
    updateModeButtons();
    renderIsotopePanel(state.selected);
    renderCurrentScene();
  });

  ui.cameraReset.addEventListener("click", () => stage?.resetCamera());
  ui.motionToggle.addEventListener("click", () => {
    state.motion = !state.motion;
    stage?.setMotion(state.motion);
    ui.motionToggle.setAttribute("aria-pressed", String(state.motion));
    ui.motionToggle.innerHTML = `<span aria-hidden="true">◌</span> Motion ${state.motion ? "on" : "off"}`;
  });
  ui.labelsToggle.addEventListener("click", () => {
    state.labels = !state.labels;
    stage?.setLabels(state.labels);
    ui.labelsToggle.setAttribute("aria-pressed", String(state.labels));
  });

  ui.fullscreen.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", updateFullscreenButton);

  ui.tableToggle.addEventListener("click", () => {
    if (ui.elementPanel.classList.contains("is-open")) closeElementPanel({ returnFocus: true });
    else openElementPanel();
  });
  ui.panelClose.addEventListener("click", () => closeElementPanel({ returnFocus: true }));
  ui.panelScrim.addEventListener("click", () => closeElementPanel({ returnFocus: true }));

  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => runCommand(button.dataset.command));
  });

  ui.sceneMount.addEventListener("pointerdown", () => ui.dragCue.classList.add("sr-only"), { once: true });

  document.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if (event.key === "/" && !typing) {
      event.preventDefault();
      ui.search.focus();
    }
    if (event.key === "Escape") {
      if (ui.elementPanel.classList.contains("is-open")) closeElementPanel({ returnFocus: true });
      else if (state.query || state.family !== "all") clearFilters();
    }
    if (event.key === "Tab" && ui.elementPanel.classList.contains("is-open")) {
      const focusable = [...ui.elementPanel.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])")]
        .filter((element) => element.getClientRects().length && !element.closest("[aria-hidden='true']"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!ui.searchShell.contains(event.target)) closeSearchResults();
  });

  reducedMotionQuery.addEventListener?.("change", (event) => {
    if (event.matches) {
      state.motion = false;
      stage?.setMotion(false);
      ui.motionToggle.setAttribute("aria-pressed", "false");
      ui.motionToggle.innerHTML = "<span aria-hidden=\"true\">◌</span> Motion off";
    }
  });
}

function handleTableKeys(event) {
  const cell = event.target.closest("[data-symbol]");
  if (!cell) return;

  if (["Enter", " "].includes(event.key)) {
    event.preventDefault();
    selectElement(state.elementMap.get(cell.dataset.symbol), { preferredMode: "atom" });
    return;
  }

  const direction = {
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
  }[event.key];
  if (!direction) return;
  event.preventDefault();

  if (window.matchMedia("(max-width: 620px)").matches) {
    const visibleCells = [...ui.table.querySelectorAll("[data-symbol]:not(.is-filtered)")];
    const index = visibleCells.indexOf(cell);
    const mobileColumns = 6;
    const offset = direction[1] || direction[0] * mobileColumns;
    const next = visibleCells[index + offset];
    if (next) setRovingFocus(next);
    return;
  }

  const currentRow = Number(cell.dataset.row);
  const currentColumn = Number(cell.dataset.column);
  const visibleCells = [...ui.table.querySelectorAll("[data-symbol]:not(.is-filtered)")];
  let candidates;

  if (direction[1]) {
    candidates = visibleCells.filter((candidate) => {
      const column = Number(candidate.dataset.column);
      return Number(candidate.dataset.row) === currentRow && Math.sign(column - currentColumn) === direction[1];
    });
    candidates.sort((a, b) => Math.abs(Number(a.dataset.column) - currentColumn) - Math.abs(Number(b.dataset.column) - currentColumn));
  } else {
    candidates = visibleCells.filter((candidate) => Math.sign(Number(candidate.dataset.row) - currentRow) === direction[0]);
    candidates.sort((a, b) => {
      const rowDistance = Math.abs(Number(a.dataset.row) - currentRow) - Math.abs(Number(b.dataset.row) - currentRow);
      return rowDistance || Math.abs(Number(a.dataset.column) - currentColumn) - Math.abs(Number(b.dataset.column) - currentColumn);
    });
  }

  const next = candidates[0];
  if (next) setRovingFocus(next);
}

function setRovingFocus(cell) {
  ui.table.querySelectorAll("[data-symbol]").forEach((item) => { item.tabIndex = item === cell ? 0 : -1; });
  cell.focus();
}

function matchingElements() {
  return state.elements.filter((element) => {
    const familyMatch = state.family === "all" || slugify(element.category) === state.family;
    const queryMatch = !state.query || elementSearchScore(element, state.query) < Number.POSITIVE_INFINITY;
    return familyMatch && queryMatch;
  });
}

function rankedSearchResults() {
  const query = ui.search.value.trim().toLowerCase();
  if (!query) return [];

  return state.elements
    .map((element) => ({ element, score: elementSearchScore(element, query) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => a.score - b.score || a.element.atomicNumber - b.element.atomicNumber)
    .slice(0, 7)
    .map(({ element }) => element);
}

function elementSearchScore(element, rawQuery) {
  const query = rawQuery.trim().toLowerCase().replaceAll("–", "-");
  if (!query) return 0;
  const symbol = element.symbol.toLowerCase();
  const name = element.name.toLowerCase();
  const number = String(element.atomicNumber);
  const structures = getStructuresForElement(element.symbol);
  const structureTerms = structures.flatMap((structure) => [structure.name, structure.formula])
    .join(" ")
    .toLowerCase();
  const haystack = [
    name,
    symbol,
    number,
    element.category,
    element.standardState,
    `period ${element.period}`,
    element.group ? `group ${element.group}` : "f block",
    structureTerms,
  ].filter(Boolean).join(" ").toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);

  if (symbol === query || name === query || number === query) return 0;
  if (symbol.startsWith(query) || name.startsWith(query)) return 1;
  if (tokens.every((token) => haystack.includes(token))) return structureTerms.includes(query) ? 3 : 2;
  return Number.POSITIVE_INFINITY;
}

function renderSearchResults() {
  const results = rankedSearchResults();
  ui.searchResults.replaceChildren();
  if (!results.length) {
    if (!ui.search.value.trim()) {
      closeSearchResults();
      return;
    }
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.innerHTML = "<strong>No matching element</strong><small>Try a name, symbol, atomic number, family, state, or a featured molecule such as water.</small>";
    ui.searchResults.append(empty);
    ui.searchResults.hidden = false;
    ui.search.setAttribute("aria-expanded", "true");
    ui.selectionAnnouncer.textContent = "No matching elements. Try another scientific term.";
    return;
  }

  results.forEach((element, index) => {
    const family = slugify(element.category);
    const option = document.createElement("button");
    option.type = "button";
    option.id = `search-option-${element.symbol}`;
    option.className = "search-result";
    option.dataset.searchSymbol = element.symbol;
    option.tabIndex = -1;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(index === state.searchIndex));
    option.innerHTML = `
      <span class="search-result-symbol family-${family}"><small>${element.atomicNumber}</small><strong>${element.symbol}</strong></span>
      <span class="search-result-copy"><strong>${element.name}</strong><small>${element.category} · period ${element.period}</small></span>
      <span class="search-result-action">View <span aria-hidden="true">↗</span></span>`;
    ui.searchResults.append(option);
  });

  ui.searchResults.hidden = false;
  ui.search.setAttribute("aria-expanded", "true");
  ui.selectionAnnouncer.textContent = `${results.length} search result${results.length === 1 ? "" : "s"}. Use arrow keys to review.`;
  updateSearchHighlight();
}

function updateSearchHighlight() {
  const options = [...ui.searchResults.querySelectorAll("[role=option]")];
  options.forEach((option, index) => {
    const active = index === state.searchIndex;
    option.classList.toggle("is-active", active);
    option.setAttribute("aria-selected", String(active));
  });
  const active = options[state.searchIndex];
  if (active) {
    ui.search.setAttribute("aria-activedescendant", active.id);
    active.scrollIntoView({ block: "nearest" });
  } else {
    ui.search.removeAttribute("aria-activedescendant");
  }
}

function closeSearchResults() {
  ui.searchResults.hidden = true;
  ui.search.setAttribute("aria-expanded", "false");
  ui.search.removeAttribute("aria-activedescendant");
  state.searchIndex = -1;
}

function chooseSearchResult(element) {
  if (!element) return;
  closeSearchResults();
  clearFilters();
  selectElement(element, { preferredMode: "atom" });
  closeElementPanel();
}

function applyFilters() {
  const matches = new Set(matchingElements().map((element) => element.symbol));
  ui.table.querySelectorAll("[data-symbol]").forEach((cell) => {
    const visible = matches.has(cell.dataset.symbol);
    cell.classList.toggle("is-filtered", !visible);
    cell.setAttribute("aria-hidden", String(!visible));
    if (!visible) cell.tabIndex = -1;
  });
  ui.visibleCount.textContent = String(matches.size);
  const visibleCells = [...ui.table.querySelectorAll("[data-symbol]:not(.is-filtered)")];
  const preferredCell = visibleCells.find((cell) => cell.dataset.symbol === state.selected?.symbol) ?? visibleCells[0];
  visibleCells.forEach((cell) => { cell.tabIndex = cell === preferredCell ? 0 : -1; });
}

function clearFilters() {
  state.family = "all";
  state.query = "";
  ui.search.value = "";
  ui.familyList.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.family === "all"));
  });
  applyFilters();
  closeSearchResults();
}

function selectRelativeElement(offset) {
  if (!state.selected || !state.elements.length) return;
  const currentIndex = state.elements.findIndex(({ atomicNumber }) => atomicNumber === state.selected.atomicNumber);
  const nextIndex = (currentIndex + offset + state.elements.length) % state.elements.length;
  selectElement(state.elements[nextIndex], { preferredMode: state.mode });
}

async function selectElement(element, options = {}) {
  if (!element) return;
  const requestId = ++selectionSequence;
  if (options.clearFilters) clearFilters();

  state.selected = element;
  state.isotope = options.massNumber
    ? getIsotopeOptions(element.symbol).find(({ massNumber }) => massNumber === options.massNumber) ?? getDefaultIsotope(element.symbol)
    : getDefaultIsotope(element.symbol);
  const structures = getStructureViews(element);
  if (options.preferredMode) state.mode = options.preferredMode;
  const defaultStructureId = structures.find(({ kind }) => kind !== "conceptual-pattern")?.id
    ?? structures[0]?.id
    ?? null;
  state.structureId = options.structureId
    ?? (structures.some((structure) => structure.id === state.structureId) ? state.structureId : structures[0]?.id)
    ?? defaultStructureId;
  if (!structures.some((structure) => structure.id === state.structureId)) state.structureId = defaultStructureId;

  const family = slugify(element.category);
  const accent = FAMILY_COLORS.get(family) || "#527fb0";
  document.documentElement.style.setProperty("--active", accent);
  document.documentElement.style.setProperty("--element-color", elementSceneColor(element, accent));

  updateSelectedCells(element);
  updateElementProfile(element, family);
  renderIsotopePanel(element);
  renderStructureCards(structures);
  updateModeButtons();
  await renderCurrentScene();

  if (requestId !== selectionSequence) return;

  const selectedCell = ui.table.querySelector(`[data-symbol="${CSS.escape(element.symbol)}"]`);
  if (selectedCell) ui.table.querySelectorAll("[data-symbol]").forEach((cell) => { cell.tabIndex = cell === selectedCell ? 0 : -1; });
  ui.selectionAnnouncer.textContent = `${element.name} selected. ${state.mode === "atom" ? `Neutral ${element.name}-${state.isotope.massNumber} atom with exact particle counts` : "Three-dimensional structure study"}.`;
}

function updateSelectedCells(element) {
  ui.table.querySelectorAll("[data-symbol]").forEach((cell) => {
    const samePeriod = Number(cell.dataset.period) === element.period;
    const sameGroup = element.group && Number(cell.dataset.group) === element.group;
    const selected = cell.dataset.symbol === element.symbol;
    cell.classList.toggle("is-related", Boolean(samePeriod || sameGroup));
    cell.classList.toggle("is-selected", selected);
    cell.setAttribute("aria-selected", String(selected));
  });
}

function updateElementProfile(element, family) {
  const shells = electronShells(element, state.elementMap);
  const groupText = element.group ? `group ${element.group}` : "f-block";
  const categoryText = element.category.toLowerCase();
  const familyClass = `family-${family}`;

  ui.ticketSymbol.className = `ticket-symbol ${familyClass}`;
  ui.ticketSymbol.innerHTML = `<small>${element.atomicNumber}</small><strong>${element.symbol}</strong>`;
  ui.ticketName.textContent = element.name;
  ui.ticketMeta.textContent = `period ${element.period} · ${groupText}`;
  ui.ticketState.textContent = element.standardState || "Unlisted";

  ui.elementKicker.textContent = `Element ${element.atomicNumber} · ${categoryText}`;
  ui.elementName.textContent = element.name;
  ui.elementOrigin.textContent = element.yearDiscovered
    ? formatDiscovery(element.yearDiscovered)
    : "Discovery date not listed";
  ui.symbolSeal.className = `symbol-seal ${familyClass}`;
  ui.symbolSeal.innerHTML = `<small>${element.atomicNumber}</small><strong>${element.symbol}</strong>`;
  ui.familyLabel.textContent = element.category;
  ui.elementPosition.textContent = `${String(element.atomicNumber).padStart(2, "0")} / 118`;

  const previous = state.elements[(element.atomicNumber - 2 + state.elements.length) % state.elements.length];
  const next = state.elements[element.atomicNumber % state.elements.length];
  ui.previousElement.setAttribute("aria-label", `Previous element: ${previous.name}, ${previous.symbol}`);
  ui.previousElement.title = `Previous: ${previous.name}`;
  ui.nextElement.setAttribute("aria-label", `Next element: ${next.name}, ${next.symbol}`);
  ui.nextElement.title = `Next: ${next.name}`;

  ui.atomicMassLabel.textContent = "PubChem atomic-mass entry";
  ui.atomicMass.textContent = valueWithUnit(element.atomicMass, "u");
  ui.standardState.textContent = element.standardState || "Not listed";
  ui.shellCounts.textContent = shells.join(" · ");
  ui.electronConfig.textContent = formatElectronConfiguration(element.electronConfiguration) || "Not listed";
  ui.electronegativity.textContent = element.electronegativity || "Not listed";
  ui.atomicRadius.textContent = valueWithUnit(element.atomicRadius, "pm");
  ui.ionizationEnergy.textContent = valueWithUnit(element.ionizationEnergy, "eV");
  const predictedConfiguration = /\(predicted\)/i.test(element.electronConfiguration);
  ui.oxidationStatesLabel.textContent = predictedConfiguration ? "Predicted oxidation states" : "Reported oxidation states";
  ui.oxidationStates.textContent = element.oxidationStates.replaceAll("-", "−") || "Not listed";
  ui.fallbackSymbol.textContent = element.symbol;

  const story = HERO_ELEMENT_STORIES[element.symbol];
  if (story) {
    ui.storyCard.hidden = false;
    ui.storyTitle.textContent = story.title;
    ui.storyCopy.textContent = story.summary;
  } else {
    ui.storyCard.hidden = true;
  }
}

function renderIsotopePanel(element) {
  delete ui.isotopeCard.dataset.viewContext;
  const isotopes = getIsotopeOptions(element.symbol);
  const selected = state.isotope ?? getDefaultIsotope(element.symbol);
  const composition = makeNeutralAtomComposition(element.atomicNumber, selected);
  ui.isotopeList.replaceChildren();
  const curatedNaturalSet = ["O", "S"].includes(element.symbol) && isotopes.length > 1;
  ui.isotopeHeading.textContent = curatedNaturalSet ? "Natural isotope examples" : "Representative isotope";
  ui.isotopeList.setAttribute("aria-label", curatedNaturalSet ? "Curated natural isotope examples" : "One curated representative isotope");

  isotopes.forEach((isotope) => {
    const label = document.createElement("label");
    label.className = "isotope-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "isotope";
    input.value = String(isotope.massNumber);
    input.checked = isotope.massNumber === selected.massNumber;
    input.setAttribute("aria-label", `${element.name}-${isotope.massNumber}${isotopeAbundanceLabel(isotope) ? `, ${isotopeAbundanceLabel(isotope)}` : ""}`);
    const choice = document.createElement("span");
    choice.className = "isotope-choice";
    choice.innerHTML = `<strong>${element.symbol}–${isotope.massNumber}</strong><small>${isotopeAbundanceLabel(isotope) || isotope.statusLabel || "reference isotope"}</small>`;
    label.append(input, choice);
    ui.isotopeList.append(label);
  });

  ui.equationMass.textContent = String(composition.massNumber);
  ui.equationProtons.textContent = String(composition.protons);
  ui.equationNeutrons.textContent = String(composition.neutrons);
  const abundance = isotopeAbundanceLabel(selected);
  const scopeNote = curatedNaturalSet
    ? "These stable natural isotopes are included for this lesson."
    : "One curated display isotope is included here; this is not a complete isotope inventory.";
  ui.isotopeExplanation.textContent = abundance
    ? `${element.name}-${selected.massNumber} has ${composition.protons} protons and ${composition.neutrons} neutrons. CIAAW terrestrial abundance interval: ${abundance}.`
    : `${element.name}-${selected.massNumber} is the bundled reference isotope for this teaching model. The neutral atom has ${composition.protons} protons, ${composition.neutrons} neutrons, and ${composition.electrons} electrons. ${scopeNote}`;
}

function isotopeAbundanceLabel(isotope) {
  if (!isotope) return "";
  if (isotope.naturalAbundance?.displayPercent) return `${isotope.naturalAbundance.displayPercent} natural abundance`;
  if (isotope.abundanceLabel) return isotope.abundanceLabel;
  if (typeof isotope.abundance === "number") {
    const percent = isotope.abundance * 100;
    return `${percent >= 1 ? percent.toFixed(2) : percent.toPrecision(2)}% representative abundance`;
  }
  return "";
}

function renderStructureCards(structures) {
  ui.structureList.replaceChildren();
  const conceptCount = structures.filter(({ kind }) => kind === "conceptual-pattern").length;
  const curatedCount = structures.length - conceptCount;
  ui.structureDock.dataset.scope = curatedCount ? "curated" : "concept-only";
  ui.structureAvailability.textContent = curatedCount
    ? `${curatedCount} molecule${curatedCount === 1 ? "" : "s"} · ${conceptCount} concept`
    : "Concept view available in Structures";
  const displayedStructures = curatedCount
    ? structures
    : [{
        ...structures[0],
        name: "Open concept view",
        formula: structures[0]?.element ?? state.selected.symbol,
      }];
  displayedStructures.forEach((structure) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "structure-card";
    button.dataset.previewKind = structure.kind === "conceptual-pattern" ? structure.visualFamily : "molecule";
    button.dataset.structureId = structure.id;
    button.setAttribute("aria-label", `Show ${structure.name}, ${structure.formula}, ${structure.kind === "conceptual-pattern" ? "concept model" : structure.geometry.label}`);
    const status = structure.kind === "conceptual-pattern"
      ? "Concept"
      : structure.status === "reference-geometry" ? "Reference" : "Idealized";
    button.innerHTML = `${structurePreviewMarkup(structure)}
      <span class="formula-pill">${structure.formula}</span>
      <span class="model-type-pill">${status}</span>
      <span class="structure-copy"><strong>${structure.name}</strong><small>${structure.kind === "conceptual-pattern" ? "Procedural concept" : structure.geometry.label}</small></span>`;
    ui.structureList.append(button);
  });
  updateStructureCards();
}

function structurePreviewMarkup(structure) {
  const previewPoints = structure.atoms?.length
    ? normalizedPreviewPoints(structure.atoms.map(({ position }) => position))
    : Array.from({ length: 7 }, (_, index) => {
        const angle = (index / 7) * Math.PI * 2 + (structure.seed ?? 1) * 0.07;
        const radius = index === 0 ? 0 : 24 + (index % 3) * 7;
        return [50 + Math.cos(angle) * radius, 47 + Math.sin(angle) * radius * 0.62, index % 2 ? 1 : -1];
      });
  const nodes = previewPoints.slice(0, 9).map(([x, y, z], index) => {
    const symbol = structure.atoms?.[index]?.symbol ?? structure.element;
    return `<i class="preview-node" data-symbol="${symbol}" style="--atom-color:${atomColor(symbol, state.elementMap)};--x:${x.toFixed(1)}%;--y:${y.toFixed(1)}%;--layer:${Math.round(5 + z)};--scale:${(1 + z * 0.08).toFixed(2)}"></i>`;
  }).join("");

  const previewBonds = structure.atoms?.length
    ? structure.bonds.map((bond) => {
        const fromIndex = structure.atoms.findIndex(({ id }) => id === bond.from);
        const toIndex = structure.atoms.findIndex(({ id }) => id === bond.to);
        return { bond, from: previewPoints[fromIndex], to: previewPoints[toIndex] };
      }).filter(({ from, to }) => from && to)
    : previewPoints.slice(1, 7).map((to) => ({ bond: { representation: "concept" }, from: previewPoints[0], to }));

  const bonds = previewBonds.map(({ bond, from, to }) => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const representation = bond.representation === "double" ? " is-double" : "";
    return `<b class="preview-bond${representation}" style="--start-x:${from[0].toFixed(1)}%;--start-y:${from[1].toFixed(1)}%;--length:${length.toFixed(1)}%;--angle:${angle.toFixed(1)}deg"></b>`;
  }).join("");
  return `<span class="structure-preview" aria-hidden="true"><span class="preview-halo"></span>${bonds}${nodes}</span>`;
}

function normalizedPreviewPoints(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const zs = points.map(([, , z]) => z ?? 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const spanZ = maxZ - minZ;
  return points.map(([x, y, z = 0]) => [
    spanX ? 22 + ((x - minX) / spanX) * 56 : 50,
    spanY ? 24 + ((y - minY) / spanY) * 48 : 47,
    spanZ ? ((z - minZ) / spanZ) * 2 - 1 : 0,
  ]);
}

function updateStructureCards() {
  ui.structureList.querySelectorAll("[data-structure-id]").forEach((card) => {
    const selected = state.mode === "structure" && card.dataset.structureId === state.structureId;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
}

function updateModeButtons() {
  ui.modeButtons.forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    if (button.dataset.mode === "structure") {
      button.disabled = false;
      button.title = "Show data-driven 3D forms and curated studies";
    }
  });
  updateStructureCards();
}

async function renderCurrentScene() {
  if (!state.selected) return;
  const token = ++state.renderToken;
  const element = state.selected;
  const family = slugify(element.category);
  const accent = FAMILY_COLORS.get(family) || "#527fb0";
  const sceneAccent = elementSceneColor(element, accent);
  const shells = electronShells(element, state.elementMap);
  const composition = makeNeutralAtomComposition(element.atomicNumber, state.isotope);
  const structure = getStructureViews(element).find(({ id }) => id === state.structureId);

  ui.stageCard.classList.add("is-changing");
  if (state.mode === "structure" && structure) {
    if (structure.kind === "conceptual-pattern") {
      updateSceneTextForPattern(element, structure);
      if (stage) await stage.showElementPattern(element, shells, structure, sceneAccent);
    } else {
      updateSceneTextForStructure(element, structure);
      if (stage) await stage.showMolecule(structure, accent);
    }
  } else {
    state.mode = "atom";
    updateModeButtons();
    updateSceneTextForAtom(element, shells, composition);
    if (stage) await stage.showAtom(element, shells, sceneAccent, composition);
  }

  if (token === state.renderToken) ui.stageCard.classList.remove("is-changing");
}

function updateSceneTextForStructure(element, structure) {
  ui.isotopeCard.hidden = true;
  ui.structureStudyCard.hidden = false;
  ui.storyCard.hidden = true;
  ui.inspector.dataset.view = "structure";
  ui.labelsToggle.hidden = false;
  ui.stageKicker.textContent = `Element ${element.atomicNumber} · molecular study`;
  ui.stageTitle.textContent = structure.name;
  ui.stageFormula.textContent = structure.formula;
  ui.stageSubtitle.textContent = structure.geometry.description;
  ui.annotationLabel.textContent = structure.facts[0]?.label ?? structure.geometry.label;
  ui.annotationCopy.textContent = structure.facts[0]?.value ?? structure.geometry.description;
  ui.geometryHeading.textContent = structure.geometry.label;
  ui.geometryCopy.textContent = structure.geometry.description;
  const referenceGeometry = structure.status === "reference-geometry";
  ui.truthChip.innerHTML = `<span aria-hidden="true">◎</span><span><strong>${referenceGeometry ? "Reference geometry" : "Teaching model"}</strong><small>${referenceGeometry ? "NIST internal coordinates" : "idealized geometry"}</small></span>`;
  ui.truthNoteCopy.textContent = referenceGeometry
    ? "Atom identity, topology, quoted bond lengths, and quoted angles are data-backed. Ball radii, bond thickness, colors, lighting, and motion are teaching representations and are not to scale."
    : "Molecular coordinates are hand-authored idealized teaching geometry in angstrom-scale scene units—not experimental conformers. Atom/bond radii, lighting, and camera scale are illustrative.";
  ui.isotopeCard.dataset.viewContext = "structure";
  ui.isotopeExplanation.textContent = "Isotope selection applies to the Atom view. This molecule shows element identities and geometry without assigning isotopes to individual atoms.";
  renderStructureStudy(structure);
  updateModelHudForStructure(structure);
}

function updateSceneTextForPattern(element, pattern) {
  ui.isotopeCard.hidden = true;
  ui.structureStudyCard.hidden = false;
  ui.storyCard.hidden = true;
  ui.inspector.dataset.view = "structure";
  ui.labelsToggle.hidden = false;
  ui.stageKicker.textContent = `Element ${element.atomicNumber} · category + shell data`;
  ui.stageTitle.textContent = pattern.name;
  ui.stageFormula.textContent = element.symbol;
  ui.stageSubtitle.textContent = pattern.geometry.description;
  ui.annotationLabel.textContent = pattern.facts[0].label;
  ui.annotationCopy.textContent = pattern.facts[0].value;
  ui.geometryHeading.textContent = pattern.geometry.label;
  ui.geometryCopy.textContent = "Concept model — not a molecule, allotrope, crystal lattice, or phase simulation.";
  ui.truthChip.innerHTML = "<span aria-hidden=\"true\">✦</span><span><strong>Concept visualization</strong><small>category + shell data</small></span>";
  ui.truthNoteCopy.textContent = `This locally generated artwork uses atomic number ${element.atomicNumber}, the ${element.category} category, and shell totals ${pattern.inputs.shells.join(" · ")}. Node count, topology, spacing, motion, connections, and scale are decorative.`;
  ui.isotopeCard.dataset.viewContext = "structure";
  ui.isotopeExplanation.textContent = "Isotope selection applies to the Atom view. This category artwork is not an isotope, molecule, allotrope, or crystal model.";
  renderConceptStudy(element, pattern);
  updateModelHudForPattern(element, pattern);
}

function updateSceneTextForAtom(element, shells, composition) {
  ui.isotopeCard.hidden = false;
  ui.structureStudyCard.hidden = true;
  ui.storyCard.hidden = !HERO_ELEMENT_STORIES[element.symbol];
  ui.inspector.dataset.view = "atom";
  ui.labelsToggle.hidden = true;
  renderIsotopePanel(element);
  const groupText = element.group ? `group ${element.group}` : "the f-block";
  ui.stageKicker.textContent = `Element ${element.atomicNumber} · ${element.category.toLowerCase()}`;
  ui.stageTitle.textContent = element.name;
  ui.stageFormula.textContent = `${element.symbol}–${composition.massNumber}`;
  const predictedConfiguration = /\(predicted\)/i.test(element.electronConfiguration);
  ui.stageSubtitle.textContent = `Neutral ${element.name}-${composition.massNumber} · ${shells.length} occupied shell${shells.length === 1 ? "" : "s"} · exact composition${predictedConfiguration ? "; shell occupancy derives from a predicted configuration" : " shown below"}.`;
  ui.annotationLabel.textContent = "Bohr-style occupancy cue";
  ui.annotationCopy.textContent = `${shells.join(" · ")} electrons by shell · directions alternate only to keep overlapping tracks readable.`;
  ui.geometryHeading.textContent = `${shells.length} principal shell${shells.length === 1 ? "" : "s"}`;
  ui.geometryCopy.textContent = `Mass number ${composition.massNumber} = ${composition.protons} protons + ${composition.neutrons} neutrons. The ${composition.electrons} neutral-atom electrons occupy ${predictedConfiguration ? "the predicted shell pattern" : "shells"} ${shells.join(" · ")}.`;
  ui.truthChip.innerHTML = "<span aria-hidden=\"true\">◎</span><span><strong>Exact particle counts</strong><small>schematic spatial model</small></span>";
  ui.truthNoteCopy.textContent = "Each nucleus sphere represents one proton or neutron for the selected isotope, and electron totals are exact for the neutral atom. Packing, paths, particle sizes, colors, direction, speed, and spatial scale are schematic; quantum electrons do not orbit like planets.";
  updateModelHudForAtom(element, composition, shells);
}

function renderStructureStudy(structure) {
  const counts = new Map();
  structure.atoms.forEach(({ symbol }) => counts.set(symbol, (counts.get(symbol) ?? 0) + 1));
  const referenceGeometry = structure.status === "reference-geometry";
  const metrics = [];
  if (structure.geometry.bondLengthAngstrom) metrics.push(["Bond length", `${structure.geometry.bondLengthAngstrom} Å`]);
  if (structure.geometry.angleDegrees !== undefined) metrics.push(["Bond angle", `${structure.geometry.approximate ? "≈" : ""}${structure.geometry.angleDegrees}°`]);
  if (structure.geometry.pointGroupHint) metrics.push(["Symmetry cue", structure.geometry.pointGroupHint]);
  if (!metrics.length) metrics.push(["Geometry", structure.geometry.label]);

  ui.studyKicker.textContent = referenceGeometry ? "Data-backed molecule" : "Molecular teaching model";
  ui.studyName.textContent = structure.name;
  ui.studyFormula.textContent = structure.formula;
  ui.studyStatus.textContent = referenceGeometry ? "Reference" : "Idealized";
  ui.studyStatus.dataset.status = referenceGeometry ? "reference" : "idealized";
  ui.studyComposition.innerHTML = [...counts.entries()].map(([symbol, count]) => `
    <span style="--atom-color:${atomColor(symbol, state.elementMap)}"><i aria-hidden="true"></i><b>${count} × ${escapeHTML(symbol)}</b><small>${escapeHTML(state.elementMap.get(symbol)?.name ?? symbol)}</small></span>`).join("");
  ui.studyMetrics.innerHTML = metrics.map(([label, value]) => `
    <div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(String(value))}</dd></div>`).join("");
  ui.studyFacts.innerHTML = structure.facts.slice(0, 3).map((fact) => `
    <article><strong>${escapeHTML(fact.label)}</strong><p>${escapeHTML(fact.value)}</p></article>`).join("");

  const sourceUrl = structure.geometry.sourceUrl ?? structure.provenance?.sourceUrls?.[0];
  ui.studySource.hidden = !sourceUrl;
  if (sourceUrl) {
    ui.studySource.href = sourceUrl;
    ui.studySource.firstChild.textContent = referenceGeometry ? "Open NIST geometry reference " : "Open structure reference ";
  }
}

function renderConceptStudy(element, pattern) {
  const shells = pattern.inputs.shells;
  ui.studyKicker.textContent = "Category-driven artwork";
  ui.studyName.textContent = pattern.name;
  ui.studyFormula.textContent = element.symbol;
  ui.studyStatus.textContent = "Not a molecule";
  ui.studyStatus.dataset.status = "concept";
  ui.studyComposition.innerHTML = `
    <span style="--atom-color:${elementSceneColor(element, "#527fb0")}"><i aria-hidden="true"></i><b>${element.atomicNumber} e⁻</b><small>neutral atom input</small></span>
    <span class="study-input"><b>${shells.join(" · ")}</b><small>electrons by shell</small></span>`;
  ui.studyMetrics.innerHTML = `
    <div><dt>Visual family</dt><dd>${escapeHTML(pattern.visualFamily.replaceAll("-", " "))}</dd></div>
    <div><dt>Truth class</dt><dd>Procedural concept</dd></div>`;
  ui.studyFacts.innerHTML = `
    <article class="concept-warning"><strong>Interpretation boundary</strong><p>Category and shell totals drive the artwork. Nodes, links, spacing, motion, and scale do not represent a molecule, allotrope, crystal, or electron density.</p></article>`;
  ui.studySource.hidden = true;
}

function updateModelHudForAtom(element, composition, shells) {
  ui.modelHud.dataset.kind = "atom";
  ui.modelHudKicker.textContent = "Exact composition";
  ui.modelHudTitle.textContent = `${element.name}-${composition.massNumber}`;
  ui.particleCounts.hidden = false;
  ui.moleculeComposition.hidden = true;
  ui.protonCount.textContent = String(composition.protons);
  ui.neutronCount.textContent = String(composition.neutrons);
  ui.electronCount.textContent = String(composition.electrons);
  ui.modelHudNote.textContent = `Shells ${shells.join(" · ")} · track motion, scale, and nucleon packing are schematic.`;
}

function updateModelHudForStructure(structure) {
  const counts = new Map();
  structure.atoms.forEach(({ symbol }) => counts.set(symbol, (counts.get(symbol) ?? 0) + 1));
  ui.modelHud.dataset.kind = "molecule";
  ui.modelHudKicker.textContent = "Molecular identity";
  ui.modelHudTitle.textContent = structure.geometry.label;
  ui.particleCounts.hidden = true;
  ui.moleculeComposition.hidden = false;
  ui.moleculeComposition.innerHTML = [...counts.entries()].map(([symbol, count]) => `
    <span class="atom-key" style="--atom-color:${atomColor(symbol, state.elementMap)}"><i aria-hidden="true"></i><b>${count} × ${symbol}</b></span>`).join("");
  ui.modelHudNote.textContent = structure.status === "reference-geometry"
    ? "Atom identity, topology, and quoted geometry are data-backed; sphere radii, bond thickness, lighting, and motion are illustrative."
    : "Composition is exact for this formula; geometry is an explicitly idealized teaching model.";
}

function updateModelHudForPattern(element, pattern) {
  ui.modelHud.dataset.kind = "concept";
  ui.modelHudKicker.textContent = "Concept artwork";
  ui.modelHudTitle.textContent = element.name;
  ui.particleCounts.hidden = true;
  ui.moleculeComposition.hidden = false;
  ui.moleculeComposition.innerHTML = `<span class="concept-key">${pattern.visualFamily.replaceAll("-", " ")}</span>`;
  ui.modelHudNote.textContent = "Not a molecule or crystal: nodes, links, spacing, scale, and motion are decorative category-and-shell cues.";
}

function valueWithUnit(value, unit) {
  return value ? `${value} ${unit}` : "Not listed";
}

async function resetExperience() {
  clearFilters();
  state.motion = !reducedMotionQuery.matches;
  state.labels = true;
  stage?.setMotion(state.motion);
  stage?.setLabels(true);
  ui.motionToggle.setAttribute("aria-pressed", String(state.motion));
  ui.motionToggle.innerHTML = `<span aria-hidden="true">◌</span> Motion ${state.motion ? "on" : "off"}`;
  ui.labelsToggle.setAttribute("aria-pressed", "true");
  closeElementPanel();
  await selectElement(state.elementMap.get("O"), { preferredMode: "atom", structureId: "dioxygen" });
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  ui.stageColumn?.scrollTo({ top: 0, behavior: "auto" });
  ui.stageCard?.scrollTo({ top: 0, behavior: "auto" });
  stage?.resetCamera();
}

function openElementPanel() {
  panelReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : ui.tableToggle;
  ui.elementPanel.inert = false;
  ui.elementPanel.setAttribute("aria-hidden", "false");
  ui.elementPanel.setAttribute("role", "dialog");
  ui.elementPanel.setAttribute("aria-modal", "true");
  ui.elementPanel.classList.add("is-open");
  ui.tableToggle.setAttribute("aria-expanded", "true");
  ui.panelScrim.hidden = false;
  requestAnimationFrame(() => ui.panelClose.focus());
}

function closeElementPanel({ returnFocus = false } = {}) {
  ui.elementPanel.classList.remove("is-open");
  ui.tableToggle.setAttribute("aria-expanded", "false");
  ui.panelScrim.hidden = true;
  ui.elementPanel.inert = true;
  ui.elementPanel.setAttribute("aria-hidden", "true");
  ui.elementPanel.removeAttribute("role");
  ui.elementPanel.removeAttribute("aria-modal");
  if (returnFocus) (panelReturnFocus?.isConnected ? panelReturnFocus : ui.tableToggle).focus({ preventScroll: true });
}

function runCommand(command) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.command === command));
  if (command === "open-table") openElementPanel();
  if (command === "focus-scene") {
    const heading = document.querySelector("#scene-heading");
    window.scrollTo({ top: 0, left: 0, behavior: reducedMotionQuery.matches ? "auto" : "smooth" });
    ui.stageColumn?.scrollTo({ top: 0, behavior: reducedMotionQuery.matches ? "auto" : "smooth" });
    ui.stageCard?.scrollTo({ top: 0, behavior: reducedMotionQuery.matches ? "auto" : "smooth" });
    heading?.focus({ preventScroll: true });
  }
  if (command === "focus-structures") ui.structureDock.scrollIntoView({ behavior: reducedMotionQuery.matches ? "auto" : "smooth", block: "nearest" });
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await ui.stageCard.requestFullscreen();
  } catch (error) {
    console.warn("Fullscreen could not be opened", error);
  }
}

function updateFullscreenButton() {
  const active = document.fullscreenElement === ui.stageCard;
  ui.fullscreen.setAttribute("aria-label", active ? "Exit full screen" : "Enter full screen");
  ui.fullscreen.innerHTML = `<span aria-hidden="true">${active ? "×" : "⛶"}</span><span>${active ? "Exit" : "Full screen"}</span>`;
  setTimeout(() => stage?.resize(), 60);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

init();
