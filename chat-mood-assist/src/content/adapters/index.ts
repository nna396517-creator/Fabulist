import { genericAdapter, type Adapter } from "./generic.js";

/**
 * This PoC ships the generic adapter only. Site-specific adapters would be added
 * here and picked before the generic one by their matches(hostname).
 */
const ADAPTERS: Adapter[] = [];

export function selectAdapter(hostname: string): Adapter {
  return ADAPTERS.find((adapter) => adapter.matches(hostname)) ?? genericAdapter;
}

export type { Adapter };
