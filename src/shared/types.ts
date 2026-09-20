/** Emotions the model may report. Keep in sync with the zod schema in the background. */
export const EMOTIONS = [
  "joy",
  "gratitude",
  "neutral",
  "curiosity",
  "confusion",
  "anxiety",
  "sadness",
  "frustration",
  "anger",
  "urgency",
  "sarcasm",
  "affection",
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export const TONES = ["empathetic", "professional", "casual", "concise"] as const;
export type Tone = (typeof TONES)[number];

export interface Suggestion {
  text: string;
  tone: Tone;
}

export interface AnalysisResult {
  emotion: Emotion;
  /** 1..5 */
  intensity: number;
  /** -1 (hostile / unhappy) .. 1 (warm / happy) */
  valence: number;
  /** 0 (calm) .. 1 (agitated) */
  arousal: number;
  summary: string;
  suggestions: Suggestion[];
}

export interface ChatMessage {
  text: string;
  direction: "in" | "out";
  id: string;
}

export const MODELS = ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"] as const;
export type Model = (typeof MODELS)[number];

/** Synced settings. The API key deliberately lives in chrome.storage.local instead. */
export interface Settings {
  model: Model;
  /** Hostnames the content script is allowed to run on. Empty by default: privacy first. */
  enabledSites: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  model: "claude-opus-5",
  enabledSites: [],
};

export type ErrorKind =
  | "no_api_key"
  | "auth"
  | "rate_limit"
  | "refusal"
  | "api"
  | "network";

export interface AnalyzeError {
  kind: ErrorKind;
  message: string;
}

/** content script -> background */
export interface AnalyzeRequest {
  type: "analyze";
  host: string;
  messages: ChatMessage[];
  draft: string;
}

/** popup -> background */
export interface TestConnectionRequest {
  type: "test-connection";
}

export type BackgroundRequest = AnalyzeRequest | TestConnectionRequest;

export type AnalyzeResponse =
  | { ok: true; result: AnalysisResult }
  | { ok: false; error: AnalyzeError };

export type TestConnectionResponse = { ok: true } | { ok: false; error: AnalyzeError };

/** popup -> content script */
export type ContentRequest =
  | { type: "demo" }
  | { type: "get-state" }
  | { type: "site-toggled"; enabled: boolean };

export interface ContentState {
  active: boolean;
  host: string;
  result: AnalysisResult | null;
}
