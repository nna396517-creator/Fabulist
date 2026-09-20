import type { Emotion } from "./types.js";

export interface EmotionStyle {
  emoji: string;
  /** zh-TW label shown on the HUD */
  label: string;
  /** accent colour for the avatar glow and the status pill */
  color: string;
  /** keyframe animation name defined in the HUD stylesheet */
  anim: string;
}

export const EMOTION_STYLES: Record<Emotion, EmotionStyle> = {
  joy: { emoji: "\u{1F604}", label: "開心", color: "#4ade80", anim: "cma-bounce" },
  gratitude: { emoji: "\u{1F64F}", label: "感謝", color: "#86efac", anim: "cma-bounce" },
  neutral: { emoji: "\u{1F610}", label: "平靜", color: "#94a3b8", anim: "cma-breathe" },
  curiosity: { emoji: "\u{1F9D0}", label: "好奇", color: "#38bdf8", anim: "cma-tilt" },
  confusion: { emoji: "\u{1F615}", label: "困惑", color: "#60a5fa", anim: "cma-tilt" },
  anxiety: { emoji: "\u{1F630}", label: "焦慮", color: "#fbbf24", anim: "cma-jitter" },
  sadness: { emoji: "\u{1F622}", label: "難過", color: "#7dd3fc", anim: "cma-droop" },
  frustration: { emoji: "\u{1F624}", label: "不耐", color: "#fb923c", anim: "cma-shake" },
  anger: { emoji: "\u{1F621}", label: "生氣", color: "#f87171", anim: "cma-shake" },
  urgency: { emoji: "\u{23F1}\u{FE0F}", label: "急迫", color: "#f59e0b", anim: "cma-jitter" },
  sarcasm: { emoji: "\u{1F60F}", label: "反諷", color: "#c084fc", anim: "cma-tilt" },
  affection: { emoji: "\u{1F970}", label: "親近", color: "#f9a8d4", anim: "cma-bounce" },
};

export function emotionStyle(emotion: Emotion): EmotionStyle {
  return EMOTION_STYLES[emotion] ?? EMOTION_STYLES.neutral;
}

/** valence (-1..1) -> HP 0..100 */
export function valenceToHp(valence: number): number {
  const clamped = Math.max(-1, Math.min(1, valence));
  return Math.round(((clamped + 1) / 2) * 100);
}

/** HP -> the bar's gradient stops, matching the classic green / yellow / red tiers. */
export function hpColors(hp: number): { from: string; to: string; glow: string } {
  if (hp > 66) return { from: "#16a34a", to: "#4ade80", glow: "rgba(74,222,128,.45)" };
  if (hp >= 33) return { from: "#ca8a04", to: "#facc15", glow: "rgba(250,204,21,.45)" };
  return { from: "#b91c1c", to: "#f87171", glow: "rgba(248,113,113,.5)" };
}
