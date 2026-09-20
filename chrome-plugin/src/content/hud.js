// HUD：把 HudState 畫成 RPG 戰鬥面板。掛在 shadow root 裡，不受 Gmail 樣式影響。
// 這個檔案只負責 DOM 結構與 class／data 屬性；所有動畫都在 styles/hud-animations.css。
//
// 動畫掛鉤一覽：
//   .fab-root[data-emotion="angry|sad|happy|anxious|neutral"]   情緒頭像動畫
//   .fab-bar--hp[data-level="high|mid|low"]                      血條 綠→黃→紅
//   .fab-root.is-danger                                          HP < 30：閃紅＋「危險」
//   .fab-float.fab-float--neg / --pos                            -18 / +12 浮動字（animationend 後自動移除）
//   .fab-log__line.is-new                                        新的戰鬥紀錄
//   .fab-card.is-active                                          目前選中的建議卡片
(() => {
  const FAB = (globalThis.Fabulist ||= {});

  const STYLES = ['src/content/styles/hud.css', 'src/content/styles/hud-animations.css'];

  function h(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function bar(kind, label) {
    const root = h('div', `fab-bar fab-bar--${kind}`);
    const track = h('div', 'fab-bar__track');
    const fill = h('div', 'fab-bar__fill');
    const value = h('span', 'fab-bar__value', '--');
    const floats = h('div', 'fab-floats');
    track.append(fill);
    root.append(h('span', 'fab-bar__label', label), track, value, floats);
    return { root, fill, value, floats };
  }

  function spawnFloat(container, delta) {
    if (!delta) return;
    const el = h('span', `fab-float ${delta < 0 ? 'fab-float--neg' : 'fab-float--pos'}`, delta > 0 ? `+${delta}` : `${delta}`);
    container.append(el);
    el.addEventListener('animationend', () => el.remove());
    setTimeout(() => el.remove(), 2500); // 動畫被關掉時的保險
  }

  // 拖曳標題列移動面板，避免擋到信箱自己的按鈕（例如 Gmail 右下角的「捨棄草稿」）
  function makeDraggable(panel, handle) {
    handle.addEventListener('pointerdown', (down) => {
      if (down.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      const offsetX = down.clientX - rect.left;
      const offsetY = down.clientY - rect.top;
      const move = (event) => {
        const left = Math.max(0, Math.min(innerWidth - rect.width, event.clientX - offsetX));
        const top = Math.max(0, Math.min(innerHeight - 40, event.clientY - offsetY));
        Object.assign(panel.style, {
          left: `${left}px`,
          top: `${top}px`,
          right: 'auto',
          maxHeight: `calc(100vh - ${top + 16}px)`,
        });
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
      };
      handle.setPointerCapture(down.pointerId);
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      down.preventDefault(); // 不要搶走輸入框的焦點
    });
  }

  const hpLevel = (mood) => (mood > 60 ? 'high' : mood >= FAB.state.DANGER_BELOW ? 'mid' : 'low');

  let ui = null;
  let lastLog = [];

  FAB.hud = {
    onPick: null, // (index) => void，由 suggest.js 設定

    mount() {
      if (ui) return;
      const host = h('div');
      host.id = 'fabulist-host';
      const shadow = host.attachShadow({ mode: 'open' });
      for (const path of STYLES) {
        const link = h('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL(path);
        shadow.append(link);
      }

      const root = h('div', 'fab-root');
      root.dataset.emotion = 'neutral';
      const panel = h('section', 'fab-panel');

      const header = h('header', 'fab-header');
      const source = h('span', 'fab-source');
      const toggle = h('button', 'fab-toggle', '–');
      toggle.type = 'button';
      toggle.title = '收合／展開';
      toggle.addEventListener('click', () => {
        const collapsed = root.classList.toggle('is-collapsed');
        toggle.textContent = collapsed ? '+' : '–';
      });
      header.append(h('span', 'fab-title', 'FABULIST'), source, toggle);

      const body = h('div', 'fab-body');
      const battle = h('div', 'fab-battle');
      const avatar = h('div', 'fab-avatar');
      const emoji = h('span', 'fab-avatar__emoji', FAB.state.EMOJI.neutral);
      avatar.append(emoji);
      const bars = h('div', 'fab-bars');
      const sender = h('div', 'fab-sender', '等待開啟信件…');
      const hp = bar('hp', 'HP');
      const danger = h('span', 'fab-danger', '危險');
      hp.root.append(danger);
      const tension = bar('tension', 'Tension');
      bars.append(sender, hp.root, tension.root);
      battle.append(avatar, bars);

      const effects = h('div', 'fab-effects');
      const read = h('div', 'fab-read');
      const evidence = h('div', 'fab-evidence');
      const register = h('div', 'fab-register');
      const log = h('ol', 'fab-log');
      const guard = h('div', 'fab-guard');
      const cards = h('div', 'fab-cards');
      const hint = h('div', 'fab-hint', 'Tab 採用 · Alt+↑↓ 切換 · Esc 關閉');
      const status = h('div', 'fab-status');
      body.append(battle, effects, read, evidence, register, log, guard, cards, hint, status);
      panel.append(header, body);
      makeDraggable(panel, header);

      const ghost = h('div', 'fab-ghost');
      root.append(panel, ghost);
      shadow.append(root);
      document.documentElement.append(host);

      ui = { root, source, sender, emoji, hp, tension, effects, read, evidence, register, log, guard, cards, hint, status, ghost };
      FAB.hud.setSuggestions([], 0);
      FAB.hud.setGuard(null);
      FAB.hud.setVisible(false);
    },

    // 只有在回信／寫信時才顯示
    setVisible(visible) {
      if (!ui) return;
      ui.root.hidden = !visible;
      if (!visible) FAB.hud.hideGhost();
    },

    // 沒有分析結果時的空白狀態（分析中、寫新信）
    reset(title) {
      if (!ui) return;
      ui.root.dataset.emotion = 'neutral';
      ui.root.classList.remove('is-danger');
      ui.source.textContent = '';
      ui.sender.textContent = title;
      ui.emoji.textContent = FAB.state.EMOJI.neutral;
      for (const b of [ui.hp, ui.tension]) {
        b.fill.style.width = '0%';
        b.value.textContent = '--';
      }
      delete ui.hp.root.dataset.level;
      ui.effects.replaceChildren();
      ui.evidence.replaceChildren();
      ui.log.replaceChildren();
      ui.read.textContent = ui.register.textContent = '';
      lastLog = [];
    },

    render(state) {
      if (!ui) return;
      ui.root.dataset.emotion = state.emotion;
      ui.root.classList.toggle('is-danger', state.danger);
      ui.source.textContent = { claude: 'CLAUDE', mock: 'OFFLINE', demo: 'DEMO' }[state.source] || '';
      ui.sender.textContent = state.sender?.name || state.sender?.email || '對方';
      ui.sender.title = state.sender?.email || '';
      ui.emoji.textContent = state.emoji;

      ui.hp.root.dataset.level = hpLevel(state.mood);
      ui.hp.fill.style.width = `${state.mood}%`;
      ui.hp.value.textContent = state.mood;
      spawnFloat(ui.hp.floats, state.moodDelta);

      ui.tension.fill.style.width = `${state.tension}%`;
      ui.tension.value.textContent = state.tension;
      spawnFloat(ui.tension.floats, state.tensionDelta);

      ui.effects.replaceChildren(
        ...state.effects.map((e) => h('span', 'fab-effect', `${e.icon} ${e.label} Lv.${e.level}`)),
      );
      ui.read.textContent = state.read;
      ui.evidence.replaceChildren(...state.evidence.map((quote) => h('q', 'fab-quote', quote)));
      ui.register.textContent = state.register;

      ui.log.replaceChildren(
        ...state.log.map((line, i) => {
          const li = h('li', 'fab-log__line', line);
          if (line !== lastLog[i]) li.classList.add('is-new');
          return li;
        }),
      );
      lastLog = state.log;
    },

    setStatus(text, kind = 'info') {
      if (!ui) return;
      ui.status.textContent = text || '';
      ui.status.dataset.kind = kind;
    },

    // guard：草稿修正引擎的判讀（對方會怎麼讀這份草稿）
    setGuard(guard) {
      if (!ui) return;
      ui.guard.hidden = !guard;
      if (!guard) return;
      ui.guard.classList.toggle('is-flagged', guard.flagged);
      const delta = guard.predictedMoodDelta;
      const forecast = delta ? `（照原稿送出：心情 ${delta > 0 ? '+' : ''}${delta}）` : '';
      ui.guard.textContent = `${guard.flagged ? '⚠️' : '🛡'} ${guard.reason}${forecast}`;
    },

    setSuggestions(list, activeIndex) {
      if (!ui) return;
      ui.cards.hidden = ui.hint.hidden = !list.length;
      ui.cards.replaceChildren(
        ...list.map((s, i) => {
          const card = h('button', 'fab-card');
          card.type = 'button';
          card.classList.toggle('is-active', i === activeIndex);
          card.append(h('span', 'fab-card__label', s.label), h('span', 'fab-card__text', s.text));
          if (s.why) card.append(h('span', 'fab-card__why', s.why));
          // mousedown 而非 click：避免輸入框先失焦
          card.addEventListener('mousedown', (event) => {
            event.preventDefault();
            FAB.hud.onPick?.(i);
          });
          return card;
        }),
      );
    },

    // ghost text：疊在輸入框上的灰字。box 是位置與字型資訊，由 suggest.js 計算
    showGhost(text, box) {
      if (!ui) return;
      Object.assign(ui.ghost.style, {
        display: 'block',
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.width}px`,
        font: box.font,
        lineHeight: box.lineHeight,
      });
      ui.ghost.classList.toggle('fab-ghost--block', Boolean(box.asBlock));
      ui.ghost.textContent = text;
    },

    hideGhost() {
      if (ui) ui.ghost.style.display = 'none';
    },
  };
})();
