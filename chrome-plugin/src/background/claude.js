import Anthropic from '@anthropic-ai/sdk';
import engineAnalyze from './prompts/engine-analyze.md';
import engineRewrite from './prompts/engine-rewrite.md';
import tone from './prompts/tone.md';

// 互動式卡片要在幾秒內出現，預設用 Sonnet 5；popup 可切到 Opus 5
const DEFAULT_MODEL = 'claude-sonnet-5';

const SUGGESTIONS_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      label: { type: 'string' },
      text: { type: 'string' },
      why: { type: 'string' },
    },
    required: ['label', 'text', 'why'],
    additionalProperties: false,
  },
};

const ANALYZE_SCHEMA = {
  type: 'object',
  properties: {
    emotion: { type: 'string', enum: ['angry', 'sad', 'happy', 'anxious', 'neutral'] },
    mood: { type: 'integer' },
    tension: { type: 'integer' },
    effects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          icon: { type: 'string' },
          label: { type: 'string' },
          level: { type: 'integer' },
        },
        required: ['icon', 'label', 'level'],
        additionalProperties: false,
      },
    },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          actor: { type: 'string', enum: ['them', 'me'] },
          move: { type: 'string' },
          moodDelta: { type: 'integer' },
        },
        required: ['actor', 'move', 'moodDelta'],
        additionalProperties: false,
      },
    },
    evidence: { type: 'array', items: { type: 'string' } },
    register: { type: 'string' },
    read: { type: 'string' },
    suggestions: SUGGESTIONS_SCHEMA,
  },
  required: ['emotion', 'mood', 'tension', 'effects', 'events', 'evidence', 'register', 'read', 'suggestions'],
  additionalProperties: false,
};

const REWRITE_SCHEMA = {
  type: 'object',
  properties: {
    flagged: { type: 'boolean' },
    type: { type: 'string', enum: ['defensive', 'blame', 'heat', 'none'] },
    reason: { type: 'string' },
    predictedMoodDelta: { type: 'integer' },
    suggestions: SUGGESTIONS_SCHEMA,
  },
  required: ['flagged', 'type', 'reason', 'predictedMoodDelta', 'suggestions'],
  additionalProperties: false,
};

function renderProfile(profile = {}) {
  const lines = [
    profile.name && `姓名：${profile.name}`,
    profile.role && `職稱／公司：${profile.role}`,
    profile.tone && `語氣偏好：${profile.tone}`,
    profile.notes && `補充資訊與事實：\n${profile.notes}`,
  ].filter(Boolean);
  return lines.length ? lines.join('\n') : '（使用者未填寫）';
}

function renderThread(thread) {
  const messages = thread.messages
    .map((m) => {
      const who = m.isMe ? 'me' : 'them';
      const from = [m.from?.name, m.from?.email && `<${m.from.email}>`].filter(Boolean).join(' ');
      return `<message from="${who}" sender="${from}">\n${m.body}\n</message>`;
    })
    .join('\n');
  const to = thread.recipients?.length ? ` to="${thread.recipients.join(', ')}"` : '';
  return `<thread subject="${thread.subject || ''}"${to}>\n${messages}\n</thread>`;
}

// 第 4 層（runtime）：個人資訊＋當下這串信件＋草稿
function renderTask({ thread, draft, profile, analysis }) {
  return [
    `<profile>\n${renderProfile(profile)}\n</profile>`,
    renderThread(thread),
    analysis && `<analysis>\n${JSON.stringify(analysis)}\n</analysis>`,
    `<draft>\n${draft || ''}\n</draft>`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'API key 無效，請到 popup 重新設定';
  if (err instanceof Anthropic.PermissionDeniedError) return '這把 API key 沒有權限使用此模型';
  if (err instanceof Anthropic.RateLimitError) return '已達 API 速率上限，請稍後再試';
  if (err instanceof Anthropic.APIConnectionError) return '連不上 Claude API，請檢查網路';
  if (err instanceof Anthropic.APIError) return `Claude API 錯誤（${err.status}）：${err.message}`;
  return err?.message || String(err);
}

async function run({ apiKey, model, engine, schema, task }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  let response;
  try {
    response = await client.messages.create({
      model: model || DEFAULT_MODEL,
      max_tokens: 16000,
      // 互動式 UI：低 effort 換延遲
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      system: [{ type: 'text', text: `${engine}\n\n${tone}`, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: task }],
    });
  } catch (err) {
    throw new Error(describeError(err));
  }
  if (response.stop_reason === 'refusal') throw new Error('模型婉拒了這次請求');
  if (response.stop_reason === 'max_tokens') throw new Error('回應被截斷，請再試一次');
  const text = response.content.find((block) => block.type === 'text')?.text;
  if (!text) throw new Error('模型沒有回傳內容');
  return JSON.parse(text);
}

const squash = (text) => text.replace(/\s+/g, ' ').trim();

// 機檢：依據原句必須逐字出現在對方的信裡，對不上的不顯示
function verifyEvidence(evidence, thread) {
  const theirs = squash(thread.messages.filter((m) => !m.isMe).map((m) => m.body).join('\n'));
  return evidence.map(squash).filter((quote) => quote && theirs.includes(quote));
}

export async function analyzeThread({ apiKey, model, profile, thread, draft }) {
  const result = await run({
    apiKey,
    model,
    engine: engineAnalyze,
    schema: ANALYZE_SCHEMA,
    task: renderTask({ thread, draft, profile }),
  });
  return { ...result, evidence: verifyEvidence(result.evidence, thread) };
}

export function rewriteDraft({ apiKey, model, profile, thread, draft, analysis }) {
  return run({
    apiKey,
    model,
    engine: engineRewrite,
    schema: REWRITE_SCHEMA,
    task: renderTask({ thread, draft, profile, analysis }),
  });
}
