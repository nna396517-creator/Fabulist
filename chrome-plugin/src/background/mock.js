// 沒有 API key 時的離線替身：用關鍵字粗判情緒，讓 demo 頁與動畫可以完整跑流程。

const RULES = [
  {
    emotion: 'angry',
    pattern: /到底|離譜|誇張|不能接受|太慢|爛|投訴|客訴|不是說好|！！|\?\?|unacceptable|ridiculous|angry/i,
    move: '抱怨',
    delta: -18,
    tension: 82,
    effects: [{ icon: '😤', label: '憤怒', level: 4 }],
    read: '他覺得被晾著，要的是有人負責',
  },
  {
    emotion: 'anxious',
    pattern: /盡快|馬上|急|今天要|下午要|來得及|還要多久|什麼時候|asap|urgent|deadline/i,
    move: '催促',
    delta: -10,
    tension: 64,
    effects: [{ icon: '⏱', label: '急迫', level: 3 }],
    read: '他被時間追著跑，要一個確定的時間點',
  },
  {
    emotion: 'sad',
    pattern: /失望|遺憾|可惜|難過|沒想到|算了|disappointed|sad|sorry to/i,
    move: '嘆氣',
    delta: -12,
    tension: 35,
    effects: [{ icon: '💧', label: '失望', level: 3 }],
    read: '他期待落空了，要的是被理解',
  },
  {
    emotion: 'happy',
    pattern: /謝謝|感謝|太好了|很棒|辛苦了|滿意|讚|thank|great|awesome|appreciate/i,
    move: '稱讚',
    delta: 12,
    tension: 8,
    effects: [{ icon: '✨', label: '信任', level: 3 }],
    read: '他很滿意，適合順勢推進下一步',
  },
];

const NEUTRAL = { emotion: 'neutral', move: '來信', delta: 0, tension: 20, effects: [], read: '公事公辦，正常回覆即可' };

// 三種立場：確認／追問／協商。沒有依據的時間一律用方括號佔位
const STANCES = [
  ['確認', '答應並給出時間，適合你確定做得到的時候'],
  ['追問', '先釐清範圍，適合需求還不清楚的時候'],
  ['協商', '調整期限或範圍，適合時間真的不夠的時候'],
];

const REPLIES = {
  angry: [
    '您好，造成您的困擾很抱歉。我現在就確認狀況，[你預計的時間] 前給您完整的說明與處理方式。',
    '您好，很抱歉讓您久等。想先確認您最急著要的是哪一部分，我優先處理。',
    '您好，很抱歉進度落後。完整版需要到 [你預計的時間]，我可以先在 [較早的時間] 給您目前的版本嗎？',
  ],
  anxious: [
    '您好，了解時間很趕。我 [你預計的時間] 前給您。',
    '您好，收到。想確認會議上要用的是完整版，還是先有重點摘要就可以？',
    '您好，了解。[你預計的時間] 前可以先給初版，完整版 [較晚的時間] 補上，這樣可以嗎？',
  ],
  sad: [
    '您好，這次的結果沒有達到您的期待，很抱歉。我 [你預計的時間] 前提出調整後的版本。',
    '您好，了解您的想法。想先請教您最在意的落差是哪一部分，我從那裡開始調整。',
    '您好，了解您的想法。方向要大幅調整的話需要到 [你預計的時間]，我們是否先對齊重點再動工？',
  ],
  happy: [
    '您好，很高興成果符合需要。下一階段的規劃我 [你預計的時間] 前整理給您。',
    '您好，謝謝您的回饋。想確認下一步您希望先進行哪一項？',
    '您好，謝謝您的回饋。下一階段若要同時進行兩項，時程需要到 [你預計的時間]，可以嗎？',
  ],
  neutral: [
    '您好，收到。我 [你預計的時間] 前回覆您。',
    '您好，收到。想先確認您需要的範圍與格式。',
    '您好，收到。這部分需要到 [你預計的時間]，時間上可以嗎？',
  ],
};

const suggestionsFor = (emotion) =>
  REPLIES[emotion].map((text, i) => ({ label: STANCES[i][0], text, why: STANCES[i][1] }));

const clamp = (n) => Math.max(0, Math.min(100, n));
const ruleFor = (text) => RULES.find((r) => r.pattern.test(text)) || NEUTRAL;

export function mockAnalyze({ thread }) {
  let mood = 70;
  const events = thread.messages.map((m) => {
    const rule = ruleFor(m.body);
    const event = m.isMe
      ? { actor: 'me', move: '回覆', moodDelta: 8 }
      : { actor: 'them', move: rule.move, moodDelta: rule.delta };
    mood = clamp(mood + event.moodDelta);
    return event;
  });
  const lastTheirs = [...thread.messages].reverse().find((m) => !m.isMe);
  const rule = lastTheirs ? ruleFor(lastTheirs.body) : NEUTRAL;
  return {
    emotion: rule.emotion,
    mood,
    tension: rule.tension,
    effects: rule.effects,
    events: events.slice(-3),
    evidence: lastTheirs && rule.pattern ? [lastTheirs.body.match(rule.pattern)[0]] : [],
    register: '中文，正式，稱呼用「您」',
    read: rule.read,
    suggestions: suggestionsFor(rule.emotion),
  };
}

export function mockRewrite({ draft, analysis }) {
  const heat = /！|!|不是說過|不然|怎樣|你們自己/.test(draft);
  const cleaned = draft.replace(/[！!]+/g, '。').replace(/。+/g, '。').trim();
  const base = suggestionsFor(analysis?.emotion || 'neutral');
  return {
    flagged: heat,
    type: heat ? 'heat' : 'none',
    reason: heat ? '火氣出去了，他會硬回來' : '語氣平穩，對方讀起來沒有壓力',
    predictedMoodDelta: heat ? -15 : 5,
    suggestions: [
      { label: '最小修正', text: cleaned, why: '只拿掉帶刺的標點與語病，其餘保留原句' },
      base[0],
      base[2],
    ],
  };
}
