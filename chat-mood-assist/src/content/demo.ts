import type { AnalysisResult } from "../shared/types.js";

/** One beat of the demo: what the other party sends, and what the model would answer. */
export interface DemoStep extends AnalysisResult {
  /** The incoming message that produces this emotion. */
  incoming: string;
}

/**
 * Canned results so the whole loop can be seen without an API key or a real chat.
 * The four steps tell one small story: the customer gets lost, loses patience,
 * is won back, and finally the parcel arrives.
 */
export const DEMO_RESULTS: DemoStep[] = [
  {
    incoming: "等等，所以我是要重新下單，還是直接等就好？我剛剛問過一次還是有點搞不懂。",
    emotion: "confusion",
    intensity: 3,
    valence: 0.05,
    arousal: 0.45,
    summary: "對方沒看懂剛剛的步驟，連問了兩次同一件事。",
    suggestions: [
      { text: "我重新說一次流程，這次拆成三個步驟。", tone: "professional" },
      { text: "抱歉剛剛講得太快，我們從第一步慢慢來。", tone: "empathetic" },
      { text: "我再說明一次，哪一段最不清楚？", tone: "concise" },
    ],
  },
  {
    incoming: "我已經等三天了，到底什麼時候才會出貨？這樣真的很誇張。",
    emotion: "anger",
    intensity: 5,
    valence: -0.85,
    arousal: 0.92,
    summary: "對方已經等了三天還沒收到回覆，語氣非常不滿。",
    suggestions: [
      { text: "很抱歉讓你等這麼久，我現在馬上處理並回報進度。", tone: "empathetic" },
      { text: "這件事確實是我們的疏失，我今天之內給你明確答覆。", tone: "professional" },
      { text: "抱歉，我立刻跟進。", tone: "concise" },
    ],
  },
  {
    incoming: "剛剛收到出貨通知了，謝謝你幫忙處理，這次真的辛苦你了。",
    emotion: "gratitude",
    intensity: 4,
    valence: 0.66,
    arousal: 0.3,
    summary: "問題解決了，對方特地回來道謝。",
    suggestions: [
      { text: "不客氣，之後有任何狀況都可以再找我。", tone: "empathetic" },
      { text: "很高興問題解決了，後續我會再確認一次。", tone: "professional" },
      { text: "隨時找我。", tone: "casual" },
    ],
  },
  {
    incoming: "包裹今天早上就送到了，東西完全沒問題，這次速度超快！",
    emotion: "joy",
    intensity: 4,
    valence: 0.82,
    arousal: 0.55,
    summary: "對方剛收到好消息，語氣輕快還帶了驚嘆號。",
    suggestions: [
      { text: "太好了，聽起來一切都很順利！", tone: "casual" },
      { text: "恭喜你，這個結果真的值得開心。", tone: "empathetic" },
      { text: "很高興聽到這個消息。", tone: "concise" },
    ],
  },
];

/** The only channel between the content script and the demo page: no direct DOM access. */
export const DEMO_EVENT = "cma:demo";

export type DemoEventDetail =
  | { phase: "incoming"; text: string }
  | { phase: "reply"; text: string }
  | { phase: "reset" };
