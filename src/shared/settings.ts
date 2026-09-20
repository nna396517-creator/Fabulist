import { DEFAULT_SETTINGS, MODELS, type Model, type Settings } from "./types.js";

const API_KEY = "apiKey";
const HUD_COLLAPSED = "hudCollapsed";

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(["model", "enabledSites"]);
  const model = MODELS.includes(stored["model"] as Model)
    ? (stored["model"] as Model)
    : DEFAULT_SETTINGS.model;
  const sites = stored["enabledSites"];
  return {
    model,
    enabledSites: Array.isArray(sites) ? sites.filter((s): s is string => typeof s === "string") : [],
  };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(patch);
}

export async function loadApiKey(): Promise<string> {
  const stored = await chrome.storage.local.get(API_KEY);
  const key = stored[API_KEY];
  return typeof key === "string" ? key.trim() : "";
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await chrome.storage.local.set({ [API_KEY]: apiKey.trim() });
}

/** null when the user has never used the collapse button, so the HUD may decide. */
export async function loadHudCollapsed(): Promise<boolean | null> {
  const stored = await chrome.storage.local.get(HUD_COLLAPSED);
  const collapsed = stored[HUD_COLLAPSED];
  return typeof collapsed === "boolean" ? collapsed : null;
}

export async function saveHudCollapsed(collapsed: boolean): Promise<void> {
  await chrome.storage.local.set({ [HUD_COLLAPSED]: collapsed });
}

export function isSiteEnabled(settings: Settings, hostname: string): boolean {
  return settings.enabledSites.includes(hostname);
}
