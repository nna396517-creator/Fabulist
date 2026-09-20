# Chat Mood Assist

一個 Chrome 擴充套件的概念驗證（PoC）：在網頁聊天室裡判讀「對方」最新訊息的情緒，用遊戲風格的血條 HUD 呈現，並在輸入框內直接給出按 Tab 就能採用的回覆建議。

情緒判讀由 Claude 完成（Anthropic 官方 SDK + 結構化輸出），本機不做任何情緒模型推論，也沒有伺服器、沒有統計、沒有遙測。

## 畫面上會看到什麼

HUD 會貼在聊天輸入框正上方，只在你啟用的網站出現：

| 元件 | 說明 |
| --- | --- |
| 對方心情血條 | 分段式 RPG 血條。填充比例 =（valence + 1）/ 2，綠（> 66）、黃（33 到 66）、紅（< 33）。數值變動時會有 600 毫秒的動畫，右側浮出 `+12` / `-18` 的變化量並淡出 |
| HP 讀數 | 血條右上角的 `HP 72/100` |
| 危險標籤 | HP 低於 30 時出現 `⚠ 危險`，血條同時開始脈動 |
| Tension 怒氣/緊張 | 紫色細條，對應 arousal（0 冷靜到 1 激動） |
| 情緒頭像 | 大顆 emoji，會依情緒做不同動畫（生氣左右抖動並發紅光、難過緩慢下垂、開心彈跳、焦慮或急迫高頻抖動、平靜呼吸、反諷歪頭），分析中會變成 🤔 |
| 狀態效果 | 一到三個遊戲風格的小徽章，例如 `😤 不耐 Lv.4`、`⚡ 高張力`、`💔 心情低落` |
| 一句話摘要 | 模型解釋「為什麼判斷成這個情緒」 |
| 建議卡 | 三張回覆卡片，目前選中的會高亮，點一下即可插入輸入框 |
| 戰鬥紀錄 | 最後三行的小日誌，例如 `> 對方使用了「生氣」！心情 -18`、`> 建議回覆已就緒 (Tab)`，錯誤訊息也會顯示在這裡 |
| 收合鈕 | 右上角 `[-]`，收合後只留頭像與血條，選擇會記在 `chrome.storage.local` |

所有動畫都遵守 `prefers-reduced-motion`：系統設定為減少動態時會自動停用。

## 鍵盤操作

| 按鍵 | 行為 |
| --- | --- |
| `Tab` | 採用目前選中的建議（只有在輸入框裡有灰色提示文字時才攔截，其他時候 Tab 行為完全不受影響） |
| `Alt` + `↑` / `↓` | 在三個建議之間切換 |
| `Esc` | 收起灰色提示文字，直到對方下一則訊息進來 |

灰色提示文字（ghost text）的規則：你還沒打字時直接顯示整句建議；已經打了草稿時，只有在建議「以你的草稿開頭」（不分大小寫）才會把剩下的部分接著顯示，否則隱藏提示但 HUD 照常顯示。

## 安裝

需要 Node 20 以上（開發時使用 Node 26 / npm 11）。

```bash
npm install
npm run build      # 產生 dist/
npm run typecheck  # tsc --noEmit
```

接著在 Chrome：

1. 打開 `chrome://extensions`
2. 右上角開啟「開發人員模式」
3. 點「載入未封裝項目」，選擇專案裡的 `dist/` 資料夾

`npm run watch` 可以在開發時持續重建，改完之後在 `chrome://extensions` 按一下重新整理即可。

## 設定 API key

點擴充套件圖示打開 popup：

1. 在「Anthropic API key」欄位貼上你的金鑰，游標離開欄位就會儲存
2. 選擇模型：`claude-opus-5`（預設）、`claude-sonnet-5`、`claude-haiku-4-5`
3. 按「測試連線」確認金鑰可用

金鑰存在 `chrome.storage.local`，不會跟著 Chrome 帳號同步、不會出現在任何網頁裡，也只有背景 service worker 讀得到。

## 啟用一個網站

預設情況下，**所有網站都是關閉的**。內容腳本雖然會注入每個分頁，但只要目前網域不在啟用清單裡，它就什麼都不做：不建立 HUD、不掛 MutationObserver、不讀取訊息、更不會送出任何請求。

要啟用：在該分頁打開 popup，把「啟用」打勾。清單存在 `chrome.storage.sync`，換台電腦登入同一個 Chrome 帳號也會帶著走。取消勾選會立刻停掉該分頁的 HUD 與監看。

## 最快的試玩方式：一鍵開 Chrome

不需要 API key 也能把整套 HUD 動畫看過一輪：

```bash
npm run build
npm run demo
```

`npm run demo` 會做三件事：在 `http://localhost:8787/chat.html` 提供示範聊天室、用一個獨立的暫存設定檔（`.chrome-profile/`，已加入 `.gitignore`）啟動 Chrome、透過 DevTools 協定的 `Extensions.loadUnpacked` 把 `dist/` 載入。之所以不用 `--load-extension` 參數，是因為新版 Chrome 穩定版已經不理會它。

Chrome 開好之後：

1. 點工具列的擴充套件圖示（沒看到就點拼圖圖示），「目前網站」會顯示 `localhost`，把「啟用」打勾
2. 按「Demo 展示」：HUD 會每兩秒切換一次，依序播放開心、困惑、生氣、感謝四種假結果，讓你看完血條升降、變化量浮出、頭像動畫、狀態徽章與戰鬥紀錄
3. 想走完整流程（會真的呼叫 API）：填好 API key 之後，按示範頁上的「收到一則新訊息（對方）」，HUD 會進入分析中的閃爍狀態，回來之後就能用 Tab 採用建議

如果你想用自己平常的 Chrome，改走「安裝」那一節的「載入未封裝項目」，再執行 `npm run demo:server` 只開示範頁即可。直接用 `file://` 開 `demo/chat.html` 會因為擴充套件預設沒有本機檔案權限而讓 popup 顯示「此頁面不支援」。

示範頁本身是一個很普通的假聊天室（訊息清單 + textarea + 送出鈕），剛好可以驗證通用選取器抓不抓得到輸入框與訊息區。

## 隱私

- 預設不啟用任何網站，沒啟用就完全不動作
- 只有在對方送出新訊息、而且該網站被啟用時，才會送出一次請求
- 送出的內容：最近 12 則訊息（每則裁到 500 字）、以及你當下在輸入框裡的草稿，送往 Anthropic API
- API key 只存在本機 `chrome.storage.local`
- 分析結果只放在該分頁的記憶體裡，關掉分頁就消失；不落地、不上傳、沒有第三方服務
- 沒有伺服器、沒有分析工具、沒有遙測

## 架構

```
src/
  background/   service worker：呼叫 Claude、錯誤分類、同分頁請求去重
    analyze.ts  zod schema + client.beta.messages.parse
    prompt.ts   固定的 system prompt（可被 prompt cache 命中）與使用者訊息組裝
  content/      內容腳本
    adapters/   每個網站怎麼找輸入框與訊息區
    hud.ts      血條 HUD（Shadow DOM）
    hud-styles.ts  HUD 的全部 CSS
    ghost.ts    灰色提示文字的前綴比對與樣式鏡射
    insert.ts   把建議寫回輸入框（相容 React 受控元件與 contenteditable）
    index.ts    監看、防抖、鍵盤處理、與背景溝通
  popup/        設定與 Demo 觸發
  shared/       型別、設定存取、hash、情緒對照表
demo/chat.html  本機示範聊天室
```

### 每站 adapter 架構

內容腳本不直接認識任何聊天網站，而是透過 adapter 介面：

```ts
interface Adapter {
  id: string;
  matches(hostname: string): boolean;
  findInput(): HTMLElement | null;
  findMessageContainer(input: HTMLElement | null): HTMLElement | null;
  extractMessages(container: HTMLElement): ChatMessage[];
}
```

`selectAdapter(hostname)` 會挑第一個 `matches()` 為 true 的專屬 adapter，都沒有就退回 `generic`。這個 PoC 只實作 `generic`：

- 輸入框：可見的、目前有焦點的（或面積最大的）`textarea` 或 `[contenteditable="true"]`
- 訊息區：從輸入框往上找八層，在每一層裡挑「可捲動、位置在輸入框上方、內含最多文字列」的元素
- 誰講的：元素的 class 含有 `out`、`self`、`me`、`mine`、`own`、`right`、`sent` 等字樣，或視覺上靠右且不是整列寬，視為「我」，其餘視為「對方」
- 取最後 12 則，每則裁到 500 字，連續重複的內容會被丟掉

要加 WhatsApp、Slack 這類專屬 adapter，就在 `src/content/adapters/` 新增一個檔案，把該站選取器集中在裡面，再加進 `adapters/index.ts` 的清單，失敗時自然會退回 generic 行為。

### 監看流程

MutationObserver 監看訊息區（`subtree` + `childList` + `characterData`），防抖 700 毫秒。每次變動就重新抽取訊息，只有在「最後一則是對方發的」而且「內容 hash 與上次分析的不同」時才送出請求。HUD 自己造成的 DOM 變動會被忽略。SPA 重繪導致輸入框或訊息區脫離文件時，每三秒的重新掃描會把它們接回來。

## Claude API 的用法

- SDK：官方 `@anthropic-ai/sdk`，沒有任何手寫 fetch。MV3 service worker 裡用 `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })`（這個選項確認存在於安裝版本的 `client.d.ts`，它負責補上直接由瀏覽器呼叫所需的標頭）
- 結構化輸出：`zodOutputFormat` 搭配 zod schema，欄位為 `emotion`（12 選 1）、`intensity`（1 到 5 整數）、`valence`（-1 到 1）、`arousal`（0 到 1）、`summary`、`suggestions`（剛好 3 筆，每筆有 `text` 與 `tone`）。`parsed_output` 為 null 時會擋下來當作 API 錯誤處理
- **走的是 beta 路徑**：安裝的 SDK（0.127.0）在 `client.beta.messages.parse` 上同時有 `betas` 與 `fallbacks` 的型別定義，所以直接使用 `betas: ["server-side-fallback-2026-07-01"]` 與 `fallbacks: "default"`，不需要任何 `as any` 或 `@ts-expect-error`。模型婉拒時伺服器端會自動改用備援模型；整串都婉拒才會回 `stop_reason: "refusal"`
- 參數：`output_config: { effort: "low", format }`、`max_tokens: 1024`。沒有設定 `temperature` / `top_p` / `top_k`，也完全不送 `thinking`（Opus 5 預設就是 adaptive）
- Prompt caching：固定不變的角色與限制放在 `system: [{ type: "text", text, cache_control: { type: "ephemeral" } }]`，裡面沒有時間戳；逐次變動的對話內容與草稿一律放在 user message
- 婉拒處理：讀取內容之前先檢查 `stop_reason === "refusal"`，HUD 顯示中性的「模型婉拒了這則訊息」而不是崩潰
- 錯誤處理：依序判斷 `Anthropic.AuthenticationError`（badge 顯示 `KEY`，HUD 顯示 API key 無效）、`Anthropic.RateLimitError`（退避 20 秒）、`Anthropic.APIError`（一般 API 錯誤），最後才是網路錯誤。全部用型別判斷，沒有任何字串比對
- 去重：同一個分頁若已有分析在路上，新的請求會先 `AbortController.abort()` 掉舊的再開始

## 已知限制

- 這是 PoC：只有 generic adapter，遇到把訊息包在深層虛擬清單裡的網站（例如 Slack、Discord）可能抓錯訊息區或判錯方向
- 「誰講的」是視覺與 class 名稱的啟發式判斷，不保證正確
- HUD 用 `position: fixed` 貼在輸入框上方，極窄的視窗或浮動式輸入框可能會擋到畫面
- 結果只存在記憶體，重新整理分頁就沒了
