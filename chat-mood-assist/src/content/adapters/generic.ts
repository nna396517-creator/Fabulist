import { hash } from "../../shared/hash.js";
import type { ChatMessage } from "../../shared/types.js";

export interface Adapter {
  id: string;
  matches(hostname: string): boolean;
  findInput(): HTMLElement | null;
  findMessageContainer(input: HTMLElement | null): HTMLElement | null;
  extractMessages(container: HTMLElement): ChatMessage[];
}

const MAX_MESSAGES = 12;
const MAX_CHARS = 500;
/** Class-name fragments sites commonly use for the user's own bubbles. */
const OUT_HINTS = ["out", "outgoing", "self", "me", "mine", "own", "right", "sent"];

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 12) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
}

function inputCandidates(): HTMLElement[] {
  const nodes = document.querySelectorAll<HTMLElement>(
    'textarea, [contenteditable="true"], [contenteditable="plaintext-only"]',
  );
  return Array.from(nodes).filter((el) => !el.hasAttribute("readonly") && isVisible(el));
}

function area(el: Element): number {
  const rect = el.getBoundingClientRect();
  return rect.width * rect.height;
}

function isScrollable(el: Element): boolean {
  const style = getComputedStyle(el);
  if (style.overflowY === "auto" || style.overflowY === "scroll") return true;
  return el.scrollHeight > el.clientHeight + 24;
}

function textRows(el: Element): Element[] {
  return Array.from(el.children).filter((child) => (child.textContent ?? "").trim().length > 0);
}

/** Leaf-ish blocks: used when a container holds one giant wrapper instead of a row per message. */
function leafBlocks(el: Element): Element[] {
  const out: Element[] = [];
  const walk = (node: Element, depth: number) => {
    if (depth > 6) return;
    for (const child of Array.from(node.children)) {
      const text = (child.textContent ?? "").trim();
      if (!text) continue;
      const nestedWithText = Array.from(child.children).filter(
        (g) => (g.textContent ?? "").trim().length > 0,
      );
      if (nestedWithText.length <= 1 && text.length <= 2000) out.push(child);
      else walk(child, depth + 1);
    }
  };
  walk(el, 0);
  return out;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function directionOf(row: Element, containerRect: DOMRect): "in" | "out" {
  const tokens = [
    ...Array.from(row.classList),
    row.getAttribute("data-testid") ?? "",
    (row as HTMLElement).dataset?.["direction"] ?? "",
  ]
    .join(" ")
    .toLowerCase();
  if (OUT_HINTS.some((hint) => new RegExp(`(^|[^a-z])${hint}([^a-z]|$)`).test(tokens))) {
    return "out";
  }
  const rect = row.getBoundingClientRect();
  const nearRightEdge = containerRect.right - rect.right < containerRect.width * 0.12;
  const notFullWidth = rect.width < containerRect.width * 0.9;
  return nearRightEdge && notFullWidth ? "out" : "in";
}

/** Extracts the visible transcript: last 12 rows, 500 chars each, consecutive repeats dropped. */
export function extractMessages(container: HTMLElement): ChatMessage[] {
  const containerRect = container.getBoundingClientRect();
  const rows = textRows(container);
  const candidates = rows.length >= 2 ? rows : leafBlocks(container);

  const messages: ChatMessage[] = [];
  for (const row of candidates) {
    const text = normalize((row as HTMLElement).innerText ?? row.textContent ?? "");
    if (!text) continue;
    const direction = directionOf(row, containerRect);
    const previous = messages[messages.length - 1];
    if (previous && previous.text === text.slice(0, MAX_CHARS) && previous.direction === direction) {
      continue;
    }
    const clipped = text.slice(0, MAX_CHARS);
    messages.push({ text: clipped, direction, id: hash(`${direction}:${clipped}`) });
  }
  return messages.slice(-MAX_MESSAGES);
}

export const genericAdapter: Adapter = {
  id: "generic",
  matches: () => true,

  findInput(): HTMLElement | null {
    const candidates = inputCandidates();
    if (candidates.length === 0) return null;
    const active = document.activeElement as HTMLElement | null;
    if (active && candidates.includes(active)) return active;
    return candidates.reduce((best, el) => (area(el) > area(best) ? el : best));
  },

  /**
   * The message list is the scrollable block that sits above the input and holds
   * the most text rows. Walks up from the input, then scans that subtree.
   */
  findMessageContainer(input: HTMLElement | null): HTMLElement | null {
    if (!input) return null;
    const inputTop = input.getBoundingClientRect().top;
    let scope: HTMLElement | null = input.parentElement;

    for (let depth = 0; depth < 8 && scope; depth++, scope = scope.parentElement) {
      let best: HTMLElement | null = null;
      let bestScore = 0;
      const pool = scope.querySelectorAll<HTMLElement>("div, ul, ol, section, main");
      for (const el of Array.from(pool)) {
        if (el.contains(input) || !isScrollable(el) || !isVisible(el)) continue;
        if (el.getBoundingClientRect().top >= inputTop) continue;
        const score = textRows(el).length;
        if (score >= 2 && score > bestScore) {
          best = el;
          bestScore = score;
        }
      }
      if (best) return best;
    }
    return document.body;
  },

  extractMessages,
};
