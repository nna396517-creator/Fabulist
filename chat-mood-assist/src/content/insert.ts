/**
 * Replaces the input's content with `text`. React-controlled inputs ignore a plain
 * `.value =` assignment, so the native setter is used and an input event dispatched.
 */
export function insertSuggestion(input: HTMLElement, text: string): void {
  input.focus();

  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    const prototype =
      input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(input, text);
    else input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const end = input.value.length;
    input.setSelectionRange?.(end, end);
    return;
  }

  selectAll(input);
  const inserted = document.execCommand("insertText", false, text);
  if (!inserted) {
    input.textContent = text;
    input.dispatchEvent(
      new InputEvent("input", { inputType: "insertText", data: text, bubbles: true }),
    );
  }
  caretToEnd(input);
}

function selectAll(input: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(input);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function caretToEnd(input: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(input);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
