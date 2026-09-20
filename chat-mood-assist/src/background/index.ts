import Anthropic from "@anthropic-ai/sdk";
import { loadApiKey, loadSettings } from "../shared/settings.js";
import type {
  AnalyzeError,
  AnalyzeResponse,
  BackgroundRequest,
  TestConnectionResponse,
} from "../shared/types.js";
import { EmptyParseError, RefusalError, analyze, ping } from "./analyze.js";

const RATE_LIMIT_BACKOFF_MS = 20_000;

/** One in-flight analysis per tab; a newer request aborts the older one. */
const inFlight = new Map<number, AbortController>();
let rateLimitedUntil = 0;

function toError(error: unknown): AnalyzeError {
  if (error instanceof RefusalError) {
    return { kind: "refusal", message: "模型婉拒了這則訊息" };
  }
  if (error instanceof EmptyParseError) {
    return { kind: "api", message: "回應格式不完整" };
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return { kind: "auth", message: "API key 無效" };
  }
  if (error instanceof Anthropic.RateLimitError) {
    rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
    return { kind: "rate_limit", message: "已達速率上限，20 秒後再試" };
  }
  // Checked before the generic APIError: the SDK wraps transport failures in it.
  if (error instanceof Anthropic.APIConnectionError) {
    return { kind: "network", message: "連線失敗" };
  }
  if (error instanceof Anthropic.APIError) {
    return { kind: "api", message: `API 錯誤 ${error.status ?? ""}`.trim() };
  }
  // zodOutputFormat lowers enums and ranges into schema descriptions, so the API
  // enforces the shape only; a value outside our enums fails the SDK's own zod
  // validation, which surfaces as the base AnthropicError.
  if (error instanceof Anthropic.AnthropicError) {
    return { kind: "api", message: "回應格式不完整" };
  }
  return { kind: "network", message: "連線失敗" };
}

function setBadge(error: AnalyzeError | null): void {
  if (!error) {
    void chrome.action.setBadgeText({ text: "" });
    return;
  }
  void chrome.action.setBadgeBackgroundColor({ color: "#b91c1c" });
  void chrome.action.setBadgeText({ text: error.kind === "auth" ? "KEY" : "!" });
  void chrome.action.setTitle({ title: `Chat Mood Assist: ${error.message}` });
}

async function handleAnalyze(
  request: Extract<BackgroundRequest, { type: "analyze" }>,
  tabId: number | undefined,
): Promise<AnalyzeResponse> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    const error: AnalyzeError = { kind: "no_api_key", message: "尚未設定 API key" };
    setBadge(error);
    return { ok: false, error };
  }

  if (Date.now() < rateLimitedUntil) {
    return { ok: false, error: { kind: "rate_limit", message: "冷卻中，稍後再試" } };
  }

  const settings = await loadSettings();
  const key = tabId ?? -1;
  inFlight.get(key)?.abort();
  const controller = new AbortController();
  inFlight.set(key, controller);

  try {
    const result = await analyze({
      apiKey,
      model: settings.model,
      messages: request.messages,
      draft: request.draft,
      signal: controller.signal,
    });
    setBadge(null);
    return { ok: true, result };
  } catch (error) {
    if (controller.signal.aborted) {
      return { ok: false, error: { kind: "network", message: "已被新的分析取代" } };
    }
    const mapped = toError(error);
    setBadge(mapped);
    return { ok: false, error: mapped };
  } finally {
    if (inFlight.get(key) === controller) inFlight.delete(key);
  }
}

async function handleTestConnection(): Promise<TestConnectionResponse> {
  const apiKey = await loadApiKey();
  if (!apiKey) return { ok: false, error: { kind: "no_api_key", message: "尚未設定 API key" } };
  const settings = await loadSettings();
  try {
    await ping(apiKey, settings.model);
    setBadge(null);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

chrome.runtime.onMessage.addListener((message: BackgroundRequest, sender, sendResponse) => {
  if (message?.type === "analyze") {
    void handleAnalyze(message, sender.tab?.id).then(sendResponse);
    return true;
  }
  if (message?.type === "test-connection") {
    void handleTestConnection().then(sendResponse);
    return true;
  }
  return false;
});
