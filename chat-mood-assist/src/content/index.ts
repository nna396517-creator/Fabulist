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
import { DEMO_EVENT, DEMO_RESULTS, type DemoEventDetail } from "./demo.js";
import { ghostRemainder, readDraft, restorePlaceholder, suppressPlaceholder } from "./ghost.js";
import { Hud } from "./hud.js";
import { insertSuggestion } from "./insert.js";

const DEBOUNCE_MS = 700;
const RESCAN_MS = 3000;

/** How long each beat of the demo conversation waits before it plays. */
const DEMO_INCOMING_MS = 0;
const DEMO_ANALYZE_MS = 600;
const DEMO_RESULT_MS = 1100;
const DEMO_ACCEPT_MS = 1600;
const DEMO_SEND_MS = 900;
const DEMO_NEXT_MS = 1400;

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
let demoRunning = false;

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
  demoRunning = false;
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
  // The demo writes its own messages into the page, so the watcher stays out of the way.
  if (demoRunning) return;
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

function accept(log = "已採用建議回覆"): void {
  const suggestion = currentSuggestion();
  if (!suggestion || !input) return;
  insertSuggestion(input, suggestion);
  hideGhost();
  hud?.pushLog(log, false);
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

interface DemoBeat {
  /** Milliseconds to wait before this beat plays. */
  after: number;
  run(panel: Hud): void;
}

/** The demo page listens for these; the content script never touches the host DOM itself. */
function demoEvent(detail: DemoEventDetail): void {
  document.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail }));
}

/** Plays the beats one after another on the single cancellable demo timer. */
function playBeats(beats: DemoBeat[], index = 0): void {
  const beat = beats[index];
  if (!beat) return;
  demoTimer = window.setTimeout(() => {
    if (!hud || !demoRunning) return;
    beat.run(hud);
    playBeats(beats, index + 1);
  }, beat.after);
}

/**
 * One step of the demo conversation: the other party writes, the HUD thinks, the
 * suggestion appears as ghost text, Tab accepts it and the reply is sent.
 */
function runDemo(step = 0, loop = false): void {
  if (!hud) return;
  const result = DEMO_RESULTS[step];
  if (!result) return;
  if (step === 0) {
    hud.pushLog(loop ? "Demo 模式：自動循環播放" : "Demo 模式：展示一輪對話", false);
    // A demo is for looking at, so let the placement decide instead of an old choice.
    hud.setCollapsed(null);
  }
  demoRunning = true;

  let reply = "";
  playBeats([
    { after: DEMO_INCOMING_MS, run: () => demoEvent({ phase: "incoming", text: result.incoming }) },
    {
      after: DEMO_ANALYZE_MS,
      run: (panel) => {
        panel.setState({ kind: "analyzing" });
        hideGhost();
      },
    },
    { after: DEMO_RESULT_MS, run: () => applyResult(result) },
    {
      after: DEMO_ACCEPT_MS,
      run: () => {
        reply = currentSuggestion() ?? "";
        accept("已按 Tab 採用建議");
      },
    },
    {
      after: DEMO_SEND_MS,
      run: (panel) => {
        demoEvent({ phase: "reply", text: reply });
        // The ghost would come straight back on the now empty input.
        dismissed = true;
        if (input) insertSuggestion(input, "");
        hideGhost();
        panel.pushLog("已送出回覆", false);
      },
    },
    {
      after: DEMO_NEXT_MS,
      run: () => {
        const next = step + 1;
        if (next < DEMO_RESULTS.length) {
          runDemo(next, loop);
          return;
        }
        if (!loop) {
          demoRunning = false;
          return;
        }
        // Back to the two opening messages, so the list never grows without end.
        demoEvent({ phase: "reset" });
        runDemo(0, loop);
      },
    },
  ]);
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
      runDemo(0, message.loop === true);
      sendResponse({ ok: true });
    })();
    return true;
  }
  return false;
});

async function init(): Promise<void> {
  // A page that declares itself as our demo page plays the canned loop on its
  // own, so a copy of demo/chat.html works with zero clicks. This never reaches
  // the network: demo mode short-circuits the watcher and the API call.
  if (document.querySelector('meta[name="chat-mood-assist-demo"]')) {
    await start();
    runDemo(0, true);
    return;
  }
  const settings = await loadSettings();
  // Nothing is created, observed or sent on a site the user has not enabled.
  if (isSiteEnabled(settings, host)) await start();
}

void init();
