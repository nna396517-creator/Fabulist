import type { ChatMessage } from "../shared/types.js";

/**
 * Stable across every request so it can be prompt-cached: no timestamps, no
 * per-conversation content. Everything volatile goes in the user message.
 */
export const SYSTEM_PROMPT = [
  "You help the user reply in a live chat. Analyze the OTHER party's latest message in the context of the transcript, identify their emotional state, and propose 3 short replies the user could send as-is.",
  "",
  "Constraints:",
  "- Write the replies in the same language the conversation is using.",
  "- Each reply is at most 2 sentences and can be sent verbatim, with no placeholders.",
  "- Vary the tone across the 3 replies and label each one.",
  "- No emojis unless the conversation already uses them.",
  "- Never fabricate facts, commitments or details the user has not stated.",
  "- If the user has typed a draft, make suggestion 1 a natural completion or refinement of that draft.",
  "- valence is -1 for hostile or unhappy, 0 for neutral, 1 for warm or happy. arousal is 0 for calm and 1 for agitated.",
  "- summary is one short sentence explaining why, written in the same language as the replies.",
].join("\n");

export function buildUserMessage(messages: ChatMessage[], draft: string): string {
  const transcript = messages
    .map((m) => `${m.direction === "in" ? "[them]" : "[me]"} ${m.text}`)
    .join("\n");
  return [
    "Transcript (oldest first):",
    transcript || "[them] (empty)",
    "",
    `Current draft: ${draft.trim() || "(none)"}`,
  ].join("\n");
}
