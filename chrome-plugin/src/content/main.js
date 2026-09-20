// 進入點：監看頁面 → 使用者開始回信／寫信時才觸發 → 讀信件串請背景分析 → 更新 HUD 與建議回覆。
(() => {
  const FAB = (globalThis.Fabulist ||= {});
  const adapter = (FAB.adapters || []).find((a) => a.match());
  if (!adapter) return;

  const SYNC_THROTTLE_MS = 600;

  let current = null; // { thread, sender, analysis, state, suggestions }
  let analyzeSeq = 0;
  let rewriteSeq = 0;
  const analyzed = new Map(); // thread.key → 分析結果，關掉再打開回信框不重打 API

  async function send(type, payload) {
    try {
      return await chrome.runtime.sendMessage({ type, payload });
    } catch {
      return { ok: false, error: '擴充功能已更新，請重新整理頁面' };
    }
  }

  const toPayload = ({ subject, recipients, messages }) => ({ subject, recipients, messages });

  const sourceNote = (state) => (state.source === 'mock' ? '未設定 API key：目前是離線關鍵字判讀' : '');

  // 回到「草稿是空的」時的畫面（不重播浮動字與戰鬥紀錄動畫）
  function restore() {
    FAB.hud.setGuard(null);
    if (!current) return;
    if (current.state) {
      FAB.hud.render({ ...current.state, moodDelta: 0, tensionDelta: 0 });
      FAB.hud.setStatus(sourceNote(current.state));
    } else {
      FAB.hud.setStatus(current.sender ? '' : '寫新信：停止打字後會提供修正建議');
    }
    FAB.suggest.set(current.suggestions || []);
  }

  function show(res, animate) {
    const { suggestions, ...analysis } = res.result;
    const state = FAB.state.build(analysis, {
      conversationId: current.thread.id,
      threadKey: current.thread.key,
      sender: current.sender,
      source: res.source,
    });
    Object.assign(current, { analysis, state, suggestions });
    if (!animate) return restore();
    FAB.hud.render(state);
    FAB.hud.setGuard(null);
    FAB.hud.setStatus(sourceNote(state));
    FAB.suggest.set(suggestions);
  }

  async function analyze() {
    const seq = ++analyzeSeq;
    const { thread } = current;
    const cached = analyzed.get(thread.key);
    if (cached) return show(cached, false);

    FAB.hud.setStatus('讀空氣中…', 'busy');
    const res = await send('FAB_ANALYZE', { thread: toPayload(thread), draft: FAB.suggest.draft() });
    if (seq !== analyzeSeq || FAB.demo.isRunning()) return;
    if (!res?.ok) return FAB.hud.setStatus(res?.error || '分析失敗', 'error'); // 失敗不回假資料
    analyzed.set(thread.key, res);
    show(res, true);
  }

  function sync() {
    if (FAB.demo.isRunning()) return;
    const box = adapter.getComposeBox();
    const thread = box && adapter.getThread(box);
    if (!thread) {
      // 沒有在回信／寫信：整個工具收起來
      if (current) {
        current = null;
        analyzeSeq += 1;
        rewriteSeq += 1;
        FAB.suggest.clear();
      }
      return FAB.hud.setVisible(false);
    }

    FAB.hud.setVisible(true);
    if (thread.key === current?.thread.key) return FAB.suggest.refresh();

    const sender = [...thread.messages].reverse().find((m) => !m.isMe)?.from;
    current = { thread, sender };
    FAB.suggest.clear();
    FAB.hud.setGuard(null);
    FAB.hud.reset(sender ? sender.name || sender.email : thread.recipients.join(', ') || '新信件');
    if (sender) analyze();
    else restore();
  }

  FAB.suggest.onDraftChange = async (draft) => {
    if (!current || FAB.demo.isRunning()) return;
    const seq = ++rewriteSeq;
    if (!draft) return restore();
    FAB.hud.setStatus('修正草稿中…', 'busy');
    const res = await send('FAB_REWRITE', {
      thread: toPayload(current.thread),
      draft,
      analysis: current.analysis || null,
    });
    if (seq !== rewriteSeq || FAB.suggest.draft() !== draft) return;
    if (!res?.ok) return FAB.hud.setStatus(res?.error || '修正失敗', 'error');
    FAB.hud.setStatus('');
    FAB.hud.setGuard(res.result);
    FAB.suggest.set(res.result.suggestions);
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'FAB_DEMO_TOGGLE') return false;
    if (FAB.demo.isRunning()) {
      FAB.demo.stop();
      FAB.suggest.clear();
      current = null;
      sync();
    } else {
      FAB.hud.setVisible(true);
      FAB.demo.start();
    }
    sendResponse({ running: FAB.demo.isRunning() });
    return false;
  });

  FAB.hud.mount();
  FAB.suggest.init(() => adapter.getComposeBox());

  let syncTimer = null;
  // 節流而非 debounce：Gmail 約每 500ms 就有一次 DOM 變動，debounce 會永遠等不到
  const scheduleSync = () => {
    if (syncTimer) return;
    syncTimer = setTimeout(() => {
      syncTimer = null;
      sync();
    }, SYNC_THROTTLE_MS);
  };
  new MutationObserver(scheduleSync).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', scheduleSync);
  scheduleSync();

  if (new URLSearchParams(location.search).get('demo') === '1') {
    FAB.hud.setVisible(true);
    FAB.demo.start();
  }
})();
