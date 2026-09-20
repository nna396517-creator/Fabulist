# Fabulist Chrome Plugin（PoC）

在 Gmail **開始回信／寫信時**才觸發：讀目前這串信件與寄件人，用 RPG 式 HUD 呈現對方情緒（心情 HP、Tension、狀態效果、戰鬥紀錄），並提供三種立場的回信草稿與草稿修正。平常看信時不出現、不呼叫 API。絕不自動寄出。

概念來源：「幕聊 EQ Copilot」的 `analyze`／`guard` 引擎與分層 prompt；Boss Radar 的依據原句機檢、確認／追問／協商三立場、`[你預計的時間]` 佔位、語言與敬語對齊。

## 安裝

```bash
npm install
npm run build        # 只打包背景 service worker（含 Anthropic SDK 與 prompts/*.md）→ dist/background.js
```

`chrome://extensions` → 開發人員模式 → 載入未封裝項目 → 選這個資料夾。
改 `src/content/**`、`popup/**`、`demo/**` 不用 build，重新載入擴充功能即可；改 `src/background/**`（含 prompt）要重跑 `npm run build`（或 `npm run watch`）。

## 使用

- **沒有 API key**：離線模式，背景用關鍵字粗判情緒（`src/background/mock.js`），整個流程與動畫都能跑
- **Demo**：popup 的 Demo 按鈕在目前分頁輪播四種情緒；不是 Gmail 分頁時會改開 `demo/mail.html?demo=1`
- **假信箱頁**：popup →「開啟 Demo 信箱頁」。五封虛構信（突然變短／客氣但施壓／中英混用／生氣／開心），流程與 Gmail 相同：點開信不觸發，按「回覆」或「撰寫」才觸發
- **真的分析**：popup 填 Claude API key、模型（預設 `claude-sonnet-5`，可切 `claude-opus-5`）與個人資訊。在 Gmail 開信後按回覆 → 分析該串信件；在輸入框打字停 1.2 秒 → 草稿修正；寫新信時沒有信件串，只做草稿修正
- 快捷鍵（焦點在回信框時）：`Tab` 採用、`Alt+↑/↓` 切換、`Esc` 關閉
- 個人資訊的「補充資訊與事實」中，以 `[內部]` 開頭的行只影響判斷、不會寫進回覆

## 架構

```
popup/                    設定（API key、個人資訊）與 Demo 按鈕
demo/mail.html            假信箱頁：用 <script> 載入同一套 content script + demo adapter
src/background/
  index.js                訊息路由：FAB_ANALYZE / FAB_REWRITE；沒 key 走 mock
  claude.js               Claude API（@anthropic-ai/sdk、結構化輸出、依據原句機檢）
  mock.js                 離線替身
  prompts/*.md            分層 prompt：engine-analyze / engine-rewrite（第 1 層）＋ tone（第 2 層，可抽換）
src/content/
  adapters/gmail.js       讀 Gmail DOM：回信／寫信框、信件串、寄件人  ← 換平台只要再寫一個 adapter
  state.js                分析結果 → HudState（HP 差值、戰鬥紀錄文字）
  hud.js                  HUD DOM（shadow root）。只管結構與 class/data 掛鉤
  suggest.js              建議卡片、ghost text、快捷鍵、草稿 debounce
  demo.js                 四種情緒輪播
  main.js                 進入點：偵測到回信／寫信框才觸發 → 分析 → 更新 HUD
  styles/hud.css          版面與外觀
  styles/hud-animations.css   動畫層 ← 動畫夥伴的檔案
```

### 給動畫夥伴

只需要動 `src/content/styles/hud-animations.css`（目前放了一份可用的最小版本）。掛鉤：

| 掛鉤 | 意義 |
|---|---|
| `.fab-root[data-emotion="angry\|sad\|happy\|anxious\|neutral"]` | 情緒頭像（`.fab-avatar`、`.fab-avatar__emoji`）|
| `.fab-bar--hp[data-level="high\|mid\|low"]` | 血條 綠 >60／黃 30–60／紅 <30 |
| `.fab-root.is-danger` | HP < 30：閃紅、`.fab-danger`「危險」|
| `.fab-float.fab-float--neg` / `--pos` | 浮動字，`animationend` 後自動移除 |
| `.fab-bar--tension .fab-bar__fill` | 紫色怒氣條 |
| `.fab-effect` | 狀態效果標籤 |
| `.fab-quote` | 依據原句（黃底）|
| `.fab-log__line.is-new` | 新的戰鬥紀錄 |
| `.fab-card.is-active`、`.fab-ghost` | 建議卡片、ghost text |

需要 JS 才做得到的效果，資料在 `HudState`（定義在 `state.js` 檔頭），進入點是 `hud.js` 的 `render(state)`。

### 訊息契約（content → background）

```
{ type: 'FAB_ANALYZE', payload: { thread: {subject, recipients, messages:[{from:{name,email}, body, isMe}]}, draft } }
  → { ok, source: 'claude'|'mock', result: { emotion, mood, tension, effects[], events[], evidence[], register, read, suggestions[{label,text,why}] } }
{ type: 'FAB_REWRITE', payload: { thread, draft, analysis } }
  → { ok, source, result: { flagged, type, reason, predictedMoodDelta, suggestions[] } }
```

## 已知限制（PoC）

- Gmail 的 class 名稱（`h2.hP`、`span.gD`、`div.a3s`…）是未公開的，Google 改版就要更新 `adapters/gmail.js`
- API key 存在 `chrome.storage.local`、由擴充功能直接呼叫 Claude API；正式版應改走自家後端
- 每串信第一次按回覆＝一次 Claude 呼叫（同一頁面內有快取），每次停止打字＝一次呼叫
- 已在真的 Gmail 上驗證過 content script（選擇器、回信才觸發、Tab／Alt+↑↓／Esc、點卡片採用、草稿修正、關閉回信框後收起），但當時背景接的是離線 mock；**真的 Claude API 呼叫尚未驗證**（沒有 key）
- HUD 預設在右上角，可拖曳標題列移動（右下角會擋到 Gmail 的「捨棄草稿」按鈕）
- ghost text 在草稿非空時顯示為草稿下方的整段改寫提示，不是逐字補完
