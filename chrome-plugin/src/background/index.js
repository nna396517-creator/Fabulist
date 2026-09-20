import { analyzeThread, rewriteDraft } from './claude.js';
import { mockAnalyze, mockRewrite } from './mock.js';

const HANDLERS = {
  FAB_ANALYZE: { live: analyzeThread, mock: mockAnalyze },
  FAB_REWRITE: { live: rewriteDraft, mock: mockRewrite },
};

async function handle(message) {
  const handler = HANDLERS[message.type];
  const { apiKey, model, profile } = await chrome.storage.local.get(['apiKey', 'model', 'profile']);
  if (!apiKey) return { ok: true, source: 'mock', result: handler.mock(message.payload) };
  const result = await handler.live({ ...message.payload, apiKey, model, profile });
  return { ok: true, source: 'claude', result };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!HANDLERS[message?.type]) return false;
  handle(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: err.message }));
  return true; // 非同步回應
});
