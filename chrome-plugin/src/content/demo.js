// Demo 模式：不需要 API key，輪播四種情緒讓動畫端驗收。
(() => {
  const FAB = (globalThis.Fabulist ||= {});

  const INTERVAL_MS = 3500;
  const sender = { name: '王經理（Demo）', email: 'manager.wang@example.com' };

  const SCENES = [
    {
      analysis: {
        emotion: 'angry', mood: 24, tension: 88,
        effects: [{ icon: '😤', label: '憤怒', level: 4 }, { icon: '⏱', label: '急迫', level: 3 }],
        events: [
          { actor: 'them', move: '催促', moodDelta: -10 },
          { actor: 'me', move: '已讀不回', moodDelta: -14 },
          { actor: 'them', move: '抱怨', moodDelta: -18 },
        ],
        read: '他已經問第二次，要的是有人接住',
        evidence: ['到底怎麼樣了', '不是說好上週五'],
        register: '中文，正式，稱呼用「您」',
      },
      suggestions: [
        { label: '確認', text: '王經理您好，讓您久等很抱歉。我現在就確認進度，[你預計的時間] 前給您完整的說明。', why: '答應並給出時間，適合你確定做得到的時候' },
        { label: '追問', text: '王經理您好，很抱歉進度落後。想先確認您最急著要的是哪一部分，我優先處理。', why: '先釐清範圍，適合需求還不清楚的時候' },
        { label: '協商', text: '王經理您好，很抱歉。完整版需要到 [你預計的時間]，我先在 [較早的時間] 給您目前的版本可以嗎？', why: '調整期限或範圍，適合時間真的不夠的時候' },
      ],
    },
    {
      analysis: {
        emotion: 'anxious', mood: 46, tension: 62,
        effects: [{ icon: '⏱', label: '急迫', level: 4 }],
        events: [
          { actor: 'me', move: '道歉', moodDelta: 12 },
          { actor: 'them', move: '追問', moodDelta: -6 },
        ],
        read: '他被時間追著跑，要一個確定的時間點',
        evidence: ['下午三點要開會'],
        register: '中文，正式，稱呼用「您」',
      },
      suggestions: [
        { label: '確認', text: '王經理您好，了解下午就要開會。我三點前先給您目前的版本，缺的部分會標清楚。', why: '答應並給出時間' },
        { label: '追問', text: '王經理您好，三點前提供現有版本，完整版明天中午前補上。', why: '先釐清範圍' },
        { label: '協商', text: '王經理您好，別擔心，會議要用的部分我優先處理，三點前一定到您手上。', why: '調整期限或範圍' },
      ],
    },
    {
      analysis: {
        emotion: 'sad', mood: 38, tension: 30,
        effects: [{ icon: '💧', label: '失望', level: 3 }],
        events: [
          { actor: 'me', move: '交付', moodDelta: 4 },
          { actor: 'them', move: '嘆氣', moodDelta: -12 },
        ],
        read: '他期待落空了，要的是被理解',
      },
      suggestions: [
        { label: '確認', text: '王經理您好，這次沒有達到您的期待，我很抱歉。我整理可以調整的方向，明天中午前跟您說明。', why: '答應並給出時間' },
        { label: '追問', text: '王經理您好，了解您的想法。我會重新檢視，明天中午前提出調整方案。', why: '先釐清範圍' },
        { label: '協商', text: '王經理您好，讀完您的信我也覺得可惜。想先聽聽您最在意的部分，我們一起看怎麼調整。', why: '調整期限或範圍' },
      ],
    },
    {
      analysis: {
        emotion: 'happy', mood: 86, tension: 8,
        effects: [{ icon: '✨', label: '信任', level: 4 }, { icon: '🎯', label: '期待', level: 2 }],
        events: [
          { actor: 'me', move: '補救', moodDelta: 22 },
          { actor: 'them', move: '稱讚', moodDelta: 12 },
        ],
        read: '他很滿意，適合順勢推進下一步',
      },
      suggestions: [
        { label: '確認', text: '王經理您好，很高興調整後的版本符合需要。下一階段的規劃我這週五前整理給您。', why: '答應並給出時間' },
        { label: '追問', text: '王經理您好，謝謝您的回饋，後續有需要調整的地方請隨時告知。', why: '先釐清範圍' },
        { label: '協商', text: '王經理您好，收到您的信很開心，謝謝您一路的信任。', why: '調整期限或範圍' },
      ],
    },
  ];

  let timer = null;
  let index = 0;

  function show() {
    const scene = SCENES[index % SCENES.length];
    index += 1;
    const state = FAB.state.build(scene.analysis, {
      conversationId: '__demo__',
      threadKey: `__demo__${index}`,
      sender,
      source: 'demo',
    });
    FAB.hud.render(state);
    FAB.hud.setGuard(null);
    FAB.hud.setStatus('Demo 模式輪播中（再按一次 Demo 停止）');
    FAB.suggest.set(scene.suggestions);
  }

  FAB.demo = {
    isRunning: () => timer !== null,
    start() {
      if (timer) return;
      show();
      timer = setInterval(show, INTERVAL_MS);
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
  };
})();
