// 用真的 Claude API 跑一次 analyze + rewrite（與擴充功能共用同一份 claude.js）。
// 用法：在 chrome-plugin/.env 寫入 ANTHROPIC_API_KEY=sk-ant-...，然後 npm run smoke
// 可選：CLAUDE_MODEL=claude-opus-5 npm run smoke
import { readFileSync } from 'node:fs';
import { analyzeThread, rewriteDraft } from '../src/background/claude.js';

try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
} catch {
  // 沒有 .env 就只看環境變數
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('找不到 ANTHROPIC_API_KEY：請寫進 chrome-plugin/.env 或設成環境變數');
  process.exit(1);
}
const model = process.env.CLAUDE_MODEL;

const CHEN = { name: 'Chen', email: 'chen@example.com' };
const ME = { name: 'An', email: 'an@example.com' };
const thread = {
  subject: 'Q3 deck',
  recipients: [],
  messages: [
    { from: CHEN, isMe: false, body: "Hi An, thanks for the update on the vendor call. Could you share the Q3 deck when it's ready this week? No rush at all.\nBest, Chen" },
    { from: ME, isMe: true, body: 'Hi Chen, sure, will do.\nAn' },
    { from: CHEN, isMe: false, body: 'Can you send me the Q3 deck today? Thanks' },
  ],
};
const profile = { name: 'An', role: 'Engineer', tone: '', notes: '' };

async function timed(label, fn) {
  const start = Date.now();
  const result = await fn();
  console.log(`\n=== ${label}（${((Date.now() - start) / 1000).toFixed(1)}s）`);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

const { suggestions: _suggestions, ...analysis } = await timed('analyze', () => analyzeThread({ apiKey, model, profile, thread, draft: '' }));
await timed('rewrite', () =>
  rewriteDraft({ apiKey, model, profile, thread, analysis, draft: 'I already told you, Friday!! Stop asking!' }),
);
