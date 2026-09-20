// 把模型的分析結果轉成 HUD 要畫的「戰況」。
// HudState 契約（動畫端只需要看這個物件）：
// {
//   threadKey, sender: {name, email},
//   emotion: 'angry'|'sad'|'happy'|'anxious'|'neutral', emoji,
//   mood: 0-100, moodDelta, tension: 0-100, tensionDelta, danger: boolean,
//   effects: [{icon, label, level}], log: [string ×≤3], read,
//   evidence: [對方信件原句], register, source: 'claude'|'mock'|'demo'
// }
(() => {
  const FAB = (globalThis.Fabulist ||= {});

  const EMOJI = { angry: '😡', sad: '😢', happy: '😄', anxious: '😰', neutral: '😐' };
  const DANGER_BELOW = 30;
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

  const lastByConversation = new Map();

  function logLine(event) {
    const who = event.actor === 'me' ? '你' : '對方';
    const delta = event.moodDelta ? `心情 ${signed(event.moodDelta)}` : '心情沒有變化';
    return `${who}使用了「${event.move}」！${delta}`;
  }

  FAB.state = {
    EMOJI,
    DANGER_BELOW,

    build(analysis, { conversationId, threadKey, sender, source }) {
      const prev = lastByConversation.get(conversationId);
      const mood = clamp(analysis.mood);
      const tension = clamp(analysis.tension);
      const events = (analysis.events || []).slice(-3);
      const lastDelta = events.length ? events[events.length - 1].moodDelta : 0;
      const state = {
        threadKey,
        sender,
        source,
        emotion: EMOJI[analysis.emotion] ? analysis.emotion : 'neutral',
        emoji: EMOJI[analysis.emotion] || EMOJI.neutral,
        mood,
        // 同一串信有新回合時用實際差值；第一次開啟則用最後一回合的變化讓浮動字有東西可演
        moodDelta: prev ? mood - prev.mood : lastDelta,
        tension,
        tensionDelta: prev ? tension - prev.tension : 0,
        danger: mood < DANGER_BELOW,
        effects: (analysis.effects || []).slice(0, 3),
        log: events.map(logLine),
        read: analysis.read || '',
        evidence: (analysis.evidence || []).slice(0, 3),
        register: analysis.register || '',
      };
      lastByConversation.set(conversationId, state);
      return state;
    },
  };
})();
