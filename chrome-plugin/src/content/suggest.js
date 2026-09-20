// 建議回覆：三張卡片＋輸入框內的灰色 ghost text。
// Tab 採用、Alt+↑↓ 切換、Esc 關閉；使用者停止打字後通知 main.js 去要修正版。
(() => {
  const FAB = (globalThis.Fabulist ||= {});

  const DRAFT_DEBOUNCE_MS = 1200;

  let getBox = () => null;
  let list = [];
  let active = 0;
  let dismissed = false;
  let draftTimer = null;
  let accepting = false;

  const PLACEHOLDER = '[contenteditable="false"]';

  // 編輯器自己塞在輸入框裡的不可編輯節點（例如 Gmail 的「Press / to write…」提示）不算草稿
  function draftOf(box) {
    let text = box?.innerText || '';
    for (const node of box?.querySelectorAll(PLACEHOLDER) || []) text = text.replace(node.innerText, '');
    return text.replace(/\u200b/g, '').trim();
  }
  const isLive = () => list.length > 0 && !dismissed;

  function refreshGhost() {
    const box = getBox();
    if (!isLive() || !box || !box.offsetParent) return FAB.hud.hideGhost();
    const cs = getComputedStyle(box);
    const rect = box.getBoundingClientRect();
    const padLeft = parseFloat(cs.paddingLeft) || 0;
    const geometry = {
      left: rect.left + padLeft,
      top: rect.top + (parseFloat(cs.paddingTop) || 0),
      width: rect.width - padLeft - (parseFloat(cs.paddingRight) || 0),
      font: cs.font,
      lineHeight: cs.lineHeight,
    };
    const text = list[active].text;
    if (!draftOf(box) && !box.querySelector(PLACEHOLDER)) return FAB.hud.showGhost(text, geometry);

    // 已經有草稿（或編輯器的提示文字佔著第一行）：建議放在既有文字下方
    const range = document.createRange();
    range.selectNodeContents(box);
    const content = range.getBoundingClientRect();
    if (content.height) geometry.top = content.bottom + 6;
    FAB.hud.showGhost(`⇥ ${text}`, { ...geometry, asBlock: true });
  }

  function render() {
    FAB.hud.setSuggestions(list, active);
    refreshGhost();
  }

  function accept(index = active) {
    const box = getBox();
    const suggestion = list[index];
    if (!box || !suggestion) return;
    box.focus();
    const range = document.createRange();
    range.selectNodeContents(box);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    // execCommand 會走編輯器自己的輸入流程，Gmail 的草稿自動儲存與 undo 才會正常
    accepting = true;
    document.execCommand('insertText', false, suggestion.text);
    accepting = false;
    dismissed = true;
    active = index;
    render();
  }

  function onKeydown(event) {
    const box = getBox();
    if (!isLive() || !box || !box.contains(event.target)) return;
    const plain = !event.shiftKey && !event.ctrlKey && !event.metaKey;
    if (event.key === 'Tab' && plain && !event.altKey) {
      accept();
    } else if (event.altKey && plain && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      active = (active + (event.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length;
      render();
    } else if (event.key === 'Escape') {
      dismissed = true;
      render();
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function onInput(event) {
    const box = getBox();
    if (!box || !box.contains(event.target)) return;
    refreshGhost();
    if (accepting) return; // 採用建議本身造成的 input 不需要再送去修正
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => FAB.suggest.onDraftChange?.(draftOf(box)), DRAFT_DEBOUNCE_MS);
  }

  FAB.suggest = {
    onDraftChange: null, // (draft) => void，由 main.js 設定

    init(composeBoxGetter) {
      getBox = composeBoxGetter;
      FAB.hud.onPick = accept;
      document.addEventListener('keydown', onKeydown, true);
      document.addEventListener('input', onInput, true);
      document.addEventListener('focusin', refreshGhost, true);
      document.addEventListener('scroll', refreshGhost, true);
      window.addEventListener('resize', refreshGhost);
    },

    set(suggestions) {
      list = (suggestions || []).filter((s) => s?.text).slice(0, 3);
      active = 0;
      dismissed = false;
      render();
    },

    clear() {
      clearTimeout(draftTimer);
      FAB.suggest.set([]);
    },

    draft: () => draftOf(getBox()),
    refresh: refreshGhost,
  };
})();
