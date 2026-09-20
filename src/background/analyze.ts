import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { EMOTIONS, TONES, type AnalysisResult, type ChatMessage, type Model } from "../shared/types.js";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.js";

const AnalysisSchema = z.object({
  emotion: z.enum(EMOTIONS),
  intensity: z.int().min(1).max(5),
  valence: z.number().min(-1).max(1),
  arousal: z.number().min(0).max(1),
  summary: z.string(),
  suggestions: z
    .array(z.object({ text: z.string(), tone: z.enum(TONES) }))
    .length(3),
});

export class RefusalError extends Error {
  constructor() {
    super("model refused");
    this.name = "RefusalError";
  }
}

export class EmptyParseError extends Error {
  constructor() {
    super("structured output missing");
    this.name = "EmptyParseError";
  }
}

export interface AnalyzeOptions {
  apiKey: string;
  model: Model;
  messages: ChatMessage[];
  draft: string;
  signal: AbortSignal;
}

export async function analyze(options: AnalyzeOptions): Promise<AnalysisResult> {
  // dangerouslyAllowBrowser is required in an MV3 service worker: it is what adds
  // the direct-browser-access header the API expects from a non-server client.
  const client = new Anthropic({ apiKey: options.apiKey, dangerouslyAllowBrowser: true });

  const params = {
    model: options.model,
    max_tokens: 1024,
    // Latency matters more than depth here, and thinking stays adaptive by default.
    output_config: { effort: "low" as const, format: zodOutputFormat(AnalysisSchema) },
    system: [
      {
        type: "text" as const,
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      { role: "user" as const, content: buildUserMessage(options.messages, options.draft) },
    ],
    // The installed SDK types `fallbacks` on the beta params, so no cast is needed.
    betas: ["server-side-fallback-2026-07-01" as const],
    fallbacks: "default" as const,
  };

  const response = await client.beta.messages.parse(params, { signal: options.signal });

  if (response.stop_reason === "refusal") throw new RefusalError();
  if (!response.parsed_output) throw new EmptyParseError();
  return response.parsed_output;
}

/** Tiny request used by the popup's connection test. */
export async function ping(apiKey: string, model: Model): Promise<void> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  await client.messages.create({
    model,
    max_tokens: 16,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
  });
}
