import { hash } from "../shared/hash.js";
import { hostKeyFromUrl } from "../shared/host.js";
import { isSiteEnabled, loadHudCollapsed, loadSettings, saveHudCollapsed } from "../shared/settings.js";
import type {
  AnalysisResult,
  AnalyzeRequest,
  AnalyzeResponse,
  ContentRequest,
  ContentState,
} from "../shared/types.js";
import { selectAdapter, type Adapter } from "./adapters/index.js";
import { DEMO_RESULTS } from "./demo.js";
import { ghostRemainder, readDraft, restorePlaceholder, suppressPlaceholder } from "./ghost.js";
import { Hud } from "./hud.js";
import { insertSuggestion } from "./insert.js";

const DEBOUNCE_MS = 700;
const RESCAN_MS = 3000;
const DEMO_STEP_MS = 2000;

const host = hostKeyFromUrl(location.href);
const adapter: Adapter = selectAdapter(host);

let hud: Hud | null = null;
let input: HTMLElement | null = null;
let container: HTMLElement | null = null;
let observer: MutationObserver | null = null;
let rescanTimer: number | null = null;
let debounceTimer: number | null = null;
let demoTimer: number | null = null;

let lastResult: AnalysisResult | null = null;
let lastAnalyzedHash = "";
let activeIndex = 0;
let dismissed = false;
let requestSeq = 0;

/* ---------------- lifecycle ---------------- */

async function start(): Promise<void> {
  if (hud) return;
  hud = new Hud({
    onCardClick: (index) => {
      activeIndex = index;
      hud?.setActiveIndex(index);
      accept();
    },
    onCollapseChange: (collapsed) => void saveHudCollapsed(collapsed),
  });
  hud.mount();
  hud.setCollapsed(await loadHudCollapsed());
  hud.setState({ kind: "idle" });

  document.addEventListener("keydown", onKeydown, true);
  document.addEventListener("input", onInputEvent, true);
  window.addEventListener("scroll", reposition, true);
  window.addEventListener("resize", reposition);

  rescan();
  rescanTimer = window.setInterval(rescan, RESCAN_MS);
}

function stop(): void {
  if (!hud) return;
  document.removeEventListener("keydown", onKeydown, true);
  document.removeEventListener("input", onInputEvent, true);
  window.removeEventListener("scroll", reposition, true);
  window.removeEventListener("resize", reposition);
  observer?.disconnect();
  observer = null;
  if (rescanTimer !== null) window.clearInterval(rescanTimer);
  if (demoTimer !== null) window.clearTimeout(demoTimer);
  rescanTimer = null;
  demoTimer = null;
  hud.destroy();
  hud = null;
  if (input) restorePlaceholder(input);
  input = null;
  container = null;
  lastResult = null;
}

/** SPAs re-render their chat panes, so the input and the list are re-looked-up on a timer. */
function rescan(): void {
  if (!hud) return;
  const foundInput = adapter.findInput();
  if (foundInput !== input) {
    input = foundInput;
    if (input) hud.show();
    else hud.hide();
  }
  if (!input) return;
  hud.anchorTo(input);

  const foundContainer = adapter.findMessageContainer(input);
  if (foundContainer && foundContainer !== container) {
    container = foundContainer;
    observer?.disconnect();
    observer = new MutationObserver(onMutations);
    observer.observe(container, { subtree: true, childList: true, characterData: true });
  }
}

function reposition(): void {
  if (hud && input) hud.anchorTo(input);
}

/* ---------------- watching ---------------- */

function onMutations(records: MutationRecord[]): void {
  const ours = records.every((record) => hud?.element.contains(record.target as Node));
  if (ours) return;
  if (debounceTimer !== null) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(maybeAnalyze, DEBOUNCE_MS);
}

function maybeAnalyze(): void {
  if (!hud || !input || !container) return;
  const messages = adapter.extractMessages(container);
  const last = messages[messages.length - 1];
  if (!last || last.direction !== "in") return;

  const fingerprint = hash(last.text);
  if (fingerprint === lastAnalyzedHash) return;
  lastAnalyzedHash = fingerprint;
  dismissed = false;

  const request: AnalyzeRequest = {
    type: "analyze",
    host,
    messages,
    draft: readDraft(input),
  };
  const seq = ++requestSeq;
  hud.setState({ kind: "analyzing" });
  hideGhost();

  chrome.runtime.sendMessage(request, (response: AnalyzeResponse | undefined) => {
    if (seq !== requestSeq || !hud) return;
    if (chrome.runtime.lastError || !response) {
      hud.setState({ kind: "error", message: "背景服務無回應" });
      return;
    }
    if (!response.ok) {
      hud.setState({ kind: "error", message: response.error.message });
      return;
    }
    applyResult(response.result);
  });
}

function applyResult(result: AnalysisResult): void {
  lastResult = result;
  activeIndex = 0;
  dismissed = false;
  hud?.setState({ kind: "result", result });
  hud?.setActiveIndex(activeIndex);
  updateGhost();
}

/* ---------------- ghost + keys ---------------- */

function currentSuggestion(): string | null {
  return lastResult?.suggestions[activeIndex]?.text ?? null;
}

function updateGhost(): void {
  if (!hud || !input) return;
  const suggestion = currentSuggestion();
  const draft = suggestion ? readDraft(input) : "";
  const remainder = suggestion && !dismissed ? ghostRemainder(suggestion, draft) : null;
  if (remainder === null) {
    hideGhost();
    return;
  }
  hud.anchorTo(input);
  suppressPlaceholder(input);
  hud.showGhost(draft, remainder);
}

function hideGhost(): void {
  hud?.hideGhost();
  if (input) restorePlaceholder(input);
}

function onInputEvent(event: Event): void {
  if (event.target === input) updateGhost();
}

function accept(): void {
  const suggestion = currentSuggestion();
  if (!suggestion || !input) return;
  insertSuggestion(input, suggestion);
  hideGhost();
  hud?.pushLog("已採用建議回覆", false);
}

function onKeydown(event: KeyboardEvent): void {
  if (!hud || !input || event.target !== input) return;

  if (event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey) {
    // Tab is only ever intercepted while the ghost is actually showing.
    if (!hud.isGhostVisible()) return;
    event.preventDefault();
    event.stopPropagation();
    accept();
    return;
  }

  if (event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
    const count = lastResult?.suggestions.length ?? 0;
    if (count === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.key === "ArrowDown" ? 1 : -1;
    activeIndex = (activeIndex + step + count) % count;
    dismissed = false;
    hud.setActiveIndex(activeIndex);
    updateGhost();
    return;
  }

  if (event.key === "Escape" && hud.isGhostVisible()) {
    event.stopPropagation();
    dismissed = true;
    hideGhost();
  }
}

/* ---------------- demo ---------------- */

function runDemo(step = 0): void {
  if (!hud) return;
  if (step === 0) hud.pushLog("Demo 模式：展示四種情緒", false);
  const result = DEMO_RESULTS[step];
  if (!result) return;
  applyResult(result);
  if (step + 1 < DEMO_RESULTS.length) {
    demoTimer = window.setTimeout(() => runDemo(step + 1), DEMO_STEP_MS);
  }
}

/* ---------------- wiring ---------------- */

chrome.runtime.onMessage.addListener((message: ContentRequest, _sender, sendResponse) => {
  if (message?.type === "get-state") {
    const state: ContentState = { active: hud !== null, host, result: lastResult };
    sendResponse(state);
    return false;
  }
  if (message?.type === "site-toggled") {
    if (message.enabled) void start();
    else stop();
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === "demo") {
    void (async () => {
      await start();
      if (demoTimer !== null) window.clearTimeout(demoTimer);
      runDemo(0);
      sendResponse({ ok: true });
    })();
    return true;
  }
  return false;
});

async function init(): Promise<void> {
  const settings = await loadSettings();
  // Nothing is created, observed or sent on a site the user has not enabled.
  if (isSiteEnabled(settings, host)) await start();
}

void init();
