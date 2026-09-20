/** Text currently in the chat input, whatever kind of element it is. */
export function readDraft(input: HTMLElement): string {
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    return input.value;
  }
  return input.innerText ?? "";
}

/**
 * The part of `suggestion` that should be painted as ghost text after `draft`.
 * Returns null when the draft has diverged from the suggestion, which is the
 * signal to hide the ghost (the badge and the cards stay).
 */
export function ghostRemainder(suggestion: string, draft: string): string | null {
  if (!suggestion) return null;
  if (!draft) return suggestion;
  if (draft.length > suggestion.length) return null;
  if (!suggestion.toLowerCase().startsWith(draft.toLowerCase())) return null;
  const remainder = suggestion.slice(draft.length);
  return remainder.length > 0 ? remainder : null;
}

const MIRRORED_PROPERTIES = [
  "color",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textIndent",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "textAlign",
  "direction",
] as const;

/** Copies the input's text metrics onto the overlay so the ghost lines up with real typing. */
export function mirrorInputStyle(input: HTMLElement, overlay: HTMLElement): void {
  const computed = getComputedStyle(input);
  for (const property of MIRRORED_PROPERTIES) {
    overlay.style[property] = computed[property];
  }
  const rect = input.getBoundingClientRect();
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.borderStyle = "solid";
  overlay.style.borderColor = "transparent";
  overlay.style.whiteSpace = computed.whiteSpace === "nowrap" ? "nowrap" : "pre-wrap";
  overlay.scrollTop = input.scrollTop;
}

const savedPlaceholders = new WeakMap<HTMLElement, string>();

/**
 * A native placeholder would show through the ghost text while the draft is empty,
 * so it is parked for as long as the ghost is painted and restored right after.
 */
export function suppressPlaceholder(input: HTMLElement): void {
  if (!(input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement)) return;
  if (!input.placeholder || savedPlaceholders.has(input)) return;
  savedPlaceholders.set(input, input.placeholder);
  input.placeholder = "";
}

export function restorePlaceholder(input: HTMLElement): void {
  if (!(input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement)) return;
  const saved = savedPlaceholders.get(input);
  if (saved === undefined) return;
  input.placeholder = saved;
  savedPlaceholders.delete(input);
}
