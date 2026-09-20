import { emotionStyle, valenceToHp } from "../shared/emotions.js";
import { hostKeyFromUrl } from "../shared/host.js";
import { loadApiKey, loadSettings, saveApiKey, saveSettings } from "../shared/settings.js";
import { MODELS, type ContentRequest, type ContentState, type Model, type TestConnectionResponse } from "../shared/types.js";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

const hostLabel = el<HTMLDivElement>("host");
const enabledBox = el<HTMLInputElement>("enabled");
const apiKeyBox = el<HTMLInputElement>("apiKey");
const modelBox = el<HTMLSelectElement>("model");
const moodLabel = el<HTMLParagraphElement>("mood");
const statusLabel = el<HTMLParagraphElement>("status");

let tabId: number | null = null;
let host = "";

function setStatus(text: string, kind: "" | "ok" | "err" = ""): void {
  statusLabel.textContent = text;
  statusLabel.className = `status ${kind}`.trim();
}

function sendToTab(message: ContentRequest): Promise<unknown> {
  return new Promise((resolve) => {
    if (tabId === null) return resolve(undefined);
    chrome.tabs.sendMessage(tabId, message, (response) => {
      void chrome.runtime.lastError;
      resolve(response);
    });
  });
}

async function init(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id ?? null;
  host = hostKeyFromUrl(tab?.url ?? "");
  hostLabel.textContent = host || "（此頁面不支援）";

  const settings = await loadSettings();
  modelBox.value = settings.model;
  enabledBox.checked = host !== "" && settings.enabledSites.includes(host);
  enabledBox.disabled = host === "";
  apiKeyBox.value = await loadApiKey();

  const state = (await sendToTab({ type: "get-state" })) as ContentState | undefined;
  if (state?.result) {
    const style = emotionStyle(state.result.emotion);
    moodLabel.textContent = `${style.emoji} ${style.label} Lv.${state.result.intensity} · HP ${valenceToHp(state.result.valence)}/100`;
  }
}

enabledBox.addEventListener("change", async () => {
  const settings = await loadSettings();
  const enabled = enabledBox.checked;
  const sites = new Set(settings.enabledSites);
  if (enabled) sites.add(host);
  else sites.delete(host);
  await saveSettings({ enabledSites: [...sites] });
  await sendToTab({ type: "site-toggled", enabled });
  setStatus(enabled ? `已啟用 ${host}` : `已停用 ${host}`, "ok");
});

apiKeyBox.addEventListener("change", async () => {
  await saveApiKey(apiKeyBox.value);
  setStatus("API key 已儲存", "ok");
});

modelBox.addEventListener("change", async () => {
  const model = modelBox.value as Model;
  if (!MODELS.includes(model)) return;
  await saveSettings({ model });
  setStatus(`模型已切換為 ${model}`, "ok");
});

el<HTMLButtonElement>("demo").addEventListener("click", async () => {
  setStatus("已送出 Demo，請看聊天輸入框上方的 HUD");
  await sendToTab({ type: "demo" });
});

el<HTMLButtonElement>("test").addEventListener("click", async () => {
  setStatus("測試中...");
  const response = (await chrome.runtime.sendMessage({ type: "test-connection" })) as
    | TestConnectionResponse
    | undefined;
  if (!response) setStatus("背景服務無回應", "err");
  else if (response.ok) setStatus("連線成功", "ok");
  else setStatus(response.error.message, "err");
});

void init();
