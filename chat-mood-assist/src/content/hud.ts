import { emotionStyle, hpColors, valenceToHp } from "../shared/emotions.js";
import type { AnalysisResult } from "../shared/types.js";
import { mirrorInputStyle } from "./ghost.js";
import { HUD_CSS } from "./hud-styles.js";

export type HudState =
  | { kind: "idle" }
  | { kind: "analyzing" }
  | { kind: "result"; result: AnalysisResult }
  | { kind: "error"; message: string };

export interface HudCallbacks {
  onCardClick(index: number): void;
  onCollapseChange(collapsed: boolean): void;
}

const MAX_LOG_LINES = 3;
/** Keep in sync with `.panel` in hud-styles.ts. */
const PANEL_WIDTH = 360;
/** Gap between the input and a docked panel. */
const DOCK_GAP = 16;
/** Smallest gap kept to every viewport edge. */
const EDGE_MARGIN = 12;
/** How far past the input an ancestor may reach and still count as the chat column. */
const COLUMN_SLACK = 220;
/** How many ancestors to climb while looking for that column. */
const COLUMN_DEPTH = 4;

const MARKUP = `
<div class="root" part="root">
  <div class="panel">
    <div class="top">
      <span class="brand">Chat Mood</span>
      <span class="spacer"></span>
      <button class="iconbtn js-collapse" type="button">[-]</button>
    </div>

    <div class="body">
      <div class="avatar-wrap"><div class="avatar js-avatar">\u{1F610}</div></div>
      <div class="bars">
        <div class="bar-head">
          <span class="bar-label">對方心情</span>
          <span class="danger">⚠ 危險</span>
          <span class="readout js-readout">HP --/100</span>
        </div>
        <div class="hpbar js-hpbar">
          <div class="hp-fill js-hpfill"></div>
          <div class="hp-segments"></div>
        </div>
        <span class="delta js-delta"></span>
        <div class="tension-head">
          <span class="tension-label">Tension 怒氣/緊張</span>
          <span class="readout js-tension">--</span>
        </div>
        <div class="tbar"><div class="t-fill js-tfill"></div></div>
      </div>
    </div>

    <div class="status js-status"></div>
    <div class="summary js-summary"></div>
    <div class="cards js-cards"></div>
    <div class="log js-log"></div>
    <div class="hint">Tab 採用 · Alt+↑↓ 切換 · Esc 關閉</div>
  </div>

  <div class="ghost"><span class="typed js-typed"></span><span class="js-rest"></span></div>
</div>`;

export class Hud {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private panel!: HTMLElement;
  private ghost!: HTMLElement;
  private logLines: { text: string; error: boolean }[] = [];
  private lastHp: number | null = null;
  /** The user's explicit choice, or null while they have not made one. */
  private choice: boolean | null = null;
  /** True when there is no room beside the chat, so the panel has to sit over it. */
  private cramped = false;
  private deltaTimer: number | null = null;

  constructor(private callbacks: HudCallbacks) {
    this.host = document.createElement("div");
    // Marks our own nodes so the watcher can ignore the mutations we cause.
    this.host.dataset["chatMoodAssist"] = "host";
    this.shadow = this.host.attachShadow({ mode: "open" });
  }

  /** The host element, so the watcher can skip mutations coming from the HUD. */
  get element(): HTMLElement {
    return this.host;
  }

  mount(): void {
    const style = document.createElement("style");
    style.textContent = HUD_CSS;
    this.shadow.append(style);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = MARKUP;
    this.shadow.append(wrapper.firstElementChild!);

    this.panel = this.query(".panel");
    this.ghost = this.query(".ghost");
    this.query(".js-collapse").addEventListener("click", () => {
      const collapsed = !this.isCollapsed();
      this.setCollapsed(collapsed);
      this.callbacks.onCollapseChange(collapsed);
    });
    document.body.append(this.host);
  }

  destroy(): void {
    this.host.remove();
  }

  /** The remembered choice. null means the user has not chosen, so placement decides. */
  setCollapsed(collapsed: boolean | null): void {
    this.choice = collapsed;
    this.renderCollapsed();
  }

  private isCollapsed(): boolean {
    return this.choice ?? this.cramped;
  }

  private renderCollapsed(): void {
    const collapsed = this.isCollapsed();
    this.panel.classList.toggle("collapsed", collapsed);
    this.query(".js-collapse").textContent = collapsed ? "[+]" : "[-]";
  }

  show(): void {
    this.panel.classList.add("visible");
  }

  hide(): void {
    this.panel.classList.remove("visible");
    this.hideGhost();
  }

  /**
   * Docks the panel beside the chat column so it never covers the messages, and
   * only falls back to sitting above the input when neither side has room.
   */
  anchorTo(input: HTMLElement): void {
    const rect = input.getBoundingClientRect();
    const column = columnRect(input, rect);
    const width = this.panel.offsetWidth || PANEL_WIDTH;
    // The room test uses the full width so collapsing cannot flip the side.
    const needed = PANEL_WIDTH + DOCK_GAP + EDGE_MARGIN;

    let left: number;
    let bottom: number;
    if (window.innerWidth - column.right >= needed) {
      this.cramped = false;
      left = column.right + DOCK_GAP;
      bottom = window.innerHeight - rect.bottom;
    } else if (column.left >= needed) {
      this.cramped = false;
      left = column.left - DOCK_GAP - width;
      bottom = window.innerHeight - rect.bottom;
    } else {
      // Nothing fits beside the chat, so cover as little of it as possible.
      this.cramped = true;
      left = rect.left;
      bottom = window.innerHeight - rect.top + 10;
    }
    this.renderCollapsed();

    const height = this.panel.offsetHeight;
    const maxBottom = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN);
    this.panel.style.left = `${clamp(left, EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN)}px`;
    this.panel.style.bottom = `${clamp(bottom, EDGE_MARGIN, maxBottom)}px`;
    mirrorInputStyle(input, this.ghost);
  }

  setState(state: HudState): void {
    switch (state.kind) {
      case "idle":
        this.setAvatar("\u{1F610}", "cma-breathe", "#94a3b8");
        this.query(".js-hpbar").classList.remove("loading");
        break;
      case "analyzing":
        this.setAvatar("\u{1F914}", "cma-think", "#a5b4fc");
        this.query(".js-hpbar").classList.add("loading");
        this.query(".js-readout").textContent = "HP ??/100";
        break;
      case "result":
        this.query(".js-hpbar").classList.remove("loading");
        this.renderResult(state.result);
        break;
      case "error":
        this.query(".js-hpbar").classList.remove("loading");
        this.setAvatar("\u{1F4A4}", "cma-breathe", "#94a3b8");
        this.query(".js-readout").textContent = "HP --/100";
        this.pushLog(state.message, true);
        break;
    }
  }

  private renderResult(result: AnalysisResult): void {
    const style = emotionStyle(result.emotion);
    const hp = valenceToHp(result.valence);
    const colors = hpColors(hp);

    const root = this.query(".root");
    root.style.setProperty("--hp-from", colors.from);
    root.style.setProperty("--hp-to", colors.to);
    root.style.setProperty("--hp-glow", colors.glow);
    root.style.setProperty("--accent", style.color);

    this.setAvatar(style.emoji, style.anim, style.color);
    (this.query(".js-hpfill") as HTMLElement).style.width = `${hp}%`;
    this.query(".js-readout").textContent = `HP ${hp}/100`;
    this.panel.classList.toggle("low", hp < 30);

    const tension = Math.round(Math.max(0, Math.min(1, result.arousal)) * 100);
    (this.query(".js-tfill") as HTMLElement).style.width = `${tension}%`;
    this.query(".js-tension").textContent = `${tension}%`;

    this.query(".js-summary").textContent = result.summary;
    this.renderStatus(result, hp);
    this.renderCards(result);

    const delta = this.lastHp === null ? null : hp - this.lastHp;
    if (delta !== null && delta !== 0) this.playDelta(delta);
    this.pushLog(
      delta === null
        ? `偵測到「${style.label}」！心情 ${hp}`
        : `對方使用了「${style.label}」！心情 ${delta > 0 ? "+" : ""}${delta}`,
      false,
    );
    this.pushLog("建議回覆已就緒 (Tab)", false);
    this.lastHp = hp;
  }

  private renderStatus(result: AnalysisResult, hp: number): void {
    const style = emotionStyle(result.emotion);
    const pills: { text: string; color: string }[] = [
      { text: `${style.emoji} ${style.label} <span class="lv">Lv.${result.intensity}</span>`, color: style.color },
    ];
    if (result.arousal >= 0.65) pills.push({ text: "⚡ 高張力", color: "#c084fc" });
    if (hp < 30) pills.push({ text: "\u{1F494} 心情低落", color: "#f87171" });
    else if (hp > 75) pills.push({ text: "✨ 氣氛良好", color: "#4ade80" });

    const container = this.query(".js-status");
    container.replaceChildren(
      ...pills.slice(0, 3).map((pill) => {
        const el = document.createElement("span");
        el.className = "pill";
        el.style.setProperty("--pill", pill.color);
        el.innerHTML = pill.text;
        return el;
      }),
    );
  }

  private renderCards(result: AnalysisResult): void {
    const container = this.query(".js-cards");
    container.replaceChildren(
      ...result.suggestions.map((suggestion, index) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "card";
        card.dataset["index"] = String(index);
        const tone = document.createElement("span");
        tone.className = "tone";
        tone.textContent = suggestion.tone;
        card.append(tone, document.createTextNode(suggestion.text));
        card.addEventListener("click", () => this.callbacks.onCardClick(index));
        return card;
      }),
    );
  }

  setActiveIndex(index: number): void {
    const cards = this.shadow.querySelectorAll<HTMLElement>(".card");
    cards.forEach((card, i) => card.classList.toggle("active", i === index));
  }

  private playDelta(delta: number): void {
    const chip = this.query(".js-delta");
    chip.textContent = `${delta > 0 ? "+" : ""}${delta}`;
    chip.className = `delta js-delta ${delta > 0 ? "up" : "down"}`;
    // Restart the float-up animation even if it is already running.
    void chip.offsetWidth;
    chip.classList.add("play");
    // Also clears the chip when animations are off (prefers-reduced-motion).
    if (this.deltaTimer !== null) window.clearTimeout(this.deltaTimer);
    this.deltaTimer = window.setTimeout(() => chip.classList.remove("play"), 1400);
  }

  pushLog(text: string, error: boolean): void {
    this.logLines = [...this.logLines, { text, error }].slice(-MAX_LOG_LINES);
    const container = this.query(".js-log");
    container.replaceChildren(
      ...this.logLines.map((line) => {
        const el = document.createElement("div");
        el.className = line.error ? "log-line err" : "log-line";
        el.textContent = `> ${line.text}`;
        return el;
      }),
    );
  }

  private setAvatar(emoji: string, anim: string, color: string): void {
    const avatar = this.query(".js-avatar");
    avatar.textContent = emoji;
    avatar.className = `avatar js-avatar anim-${anim.replace("cma-", "")}`;
    avatar.style.setProperty("--accent", color);
  }

  showGhost(draft: string, remainder: string): void {
    this.query(".js-typed").textContent = draft;
    this.query(".js-rest").textContent = remainder;
    this.ghost.classList.add("visible");
  }

  hideGhost(): void {
    this.ghost.classList.remove("visible");
  }

  isGhostVisible(): boolean {
    return this.ghost.classList.contains("visible");
  }

  private query(selector: string): HTMLElement {
    const el = this.shadow.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`HUD element missing: ${selector}`);
    return el;
  }
}

/**
 * The edges of the chat column the input sits in, so the panel docks clear of the
 * whole card instead of only the text box. Ancestors that reach far past the input
 * (a full-width page wrapper) are not a column and stop the climb.
 */
function columnRect(input: HTMLElement, rect: DOMRect): { left: number; right: number } {
  let left = rect.left;
  let right = rect.right;
  let node = input.parentElement;
  for (let depth = 0; node && node !== document.body && depth < COLUMN_DEPTH; depth++) {
    const box = node.getBoundingClientRect();
    if (box.right - rect.right > COLUMN_SLACK || rect.left - box.left > COLUMN_SLACK) break;
    left = Math.min(left, box.left);
    right = Math.max(right, box.right);
    node = node.parentElement;
  }
  return { left, right };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
