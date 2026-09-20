/** All HUD styling lives in the shadow root so the host page is never touched. */
export const HUD_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }

.root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483600;
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --panel: rgba(20, 20, 28, .85);
  --hp-from: #16a34a;
  --hp-to: #4ade80;
  --hp-glow: rgba(74, 222, 128, .45);
  --accent: #94a3b8;
}

/* ---------- panel ---------- */
.panel {
  position: fixed;
  pointer-events: auto;
  width: 360px;
  max-width: calc(100vw - 16px);
  padding: 10px 12px 8px;
  background: var(--panel);
  color: #e8e8f0;
  font-family: var(--font-ui);
  font-size: 12px;
  line-height: 1.45;
  border: 1px solid var(--hp-glow);
  border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .04), 0 10px 30px rgba(0, 0, 0, .45), 0 0 18px var(--hp-glow);
  backdrop-filter: blur(8px);
  transition: border-color .4s ease, box-shadow .4s ease;
  display: none;
}
.panel.visible { display: block; }

.top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.brand {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #a5b4fc;
}
.spacer { flex: 1; }
.iconbtn {
  all: unset;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 10px;
  color: #cbd5e1;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, .06);
}
.iconbtn:hover { background: rgba(255, 255, 255, .14); }

/* ---------- avatar + bars ---------- */
.body { display: flex; gap: 12px; align-items: center; }

.avatar-wrap {
  width: 52px;
  height: 52px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 70%);
}
.avatar {
  font-size: 30px;
  line-height: 1;
  text-shadow: 0 0 14px var(--accent);
  animation: cma-breathe 3.4s ease-in-out infinite;
  will-change: transform;
}
.avatar.anim-shake { animation: cma-shake .32s ease-in-out infinite; }
.avatar.anim-droop { animation: cma-droop 2.6s ease-in-out infinite; }
.avatar.anim-bounce { animation: cma-bounce .9s cubic-bezier(.3, .7, .4, 1) infinite; }
.avatar.anim-jitter { animation: cma-jitter .18s linear infinite; }
.avatar.anim-breathe { animation: cma-breathe 3.4s ease-in-out infinite; }
.avatar.anim-tilt { animation: cma-tilt 2.8s ease-in-out infinite; }
.avatar.anim-think { animation: cma-think 1.5s ease-in-out infinite; }

.bars { flex: 1; min-width: 0; position: relative; }
.bar-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 3px;
  white-space: nowrap;
}
.bar-label { font-size: 11px; color: #cbd5e1; }
.readout {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 11px;
  color: #f1f5f9;
}
.danger {
  font-size: 10px;
  color: #fecaca;
  background: rgba(185, 28, 28, .35);
  border: 1px solid rgba(248, 113, 113, .5);
  border-radius: 999px;
  padding: 0 6px;
  display: none;
  animation: cma-lowpulse 1s ease-in-out infinite;
}
.panel.low .danger { display: inline-block; }

.hpbar {
  position: relative;
  height: 14px;
  border-radius: 7px;
  background: rgba(255, 255, 255, .08);
  border: 1px solid rgba(255, 255, 255, .12);
  overflow: hidden;
}
.hp-fill {
  height: 100%;
  width: 0%;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--hp-from), var(--hp-to));
  transition: width .6s cubic-bezier(.22, .61, .36, 1), background .6s ease;
}
.panel.low .hp-fill { animation: cma-lowpulse 1s ease-in-out infinite; }
/* RPG notches drawn over the fill */
.hp-segments {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(90deg, rgba(0, 0, 0, .55) 0 1px, transparent 1px 10%);
  pointer-events: none;
}
.hpbar.loading .hp-fill {
  width: 100%;
  background-image: repeating-linear-gradient(115deg, rgba(255, 255, 255, .22) 0 10px, rgba(255, 255, 255, .05) 10px 20px);
  background-color: rgba(148, 163, 184, .35);
  background-size: 200% 100%;
  animation: cma-shimmer 1.1s linear infinite;
}

.delta {
  position: absolute;
  right: 4px;
  top: 14px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  text-shadow: 0 1px 3px rgba(0, 0, 0, .8);
  opacity: 0;
}
.delta.up { color: #4ade80; }
.delta.down { color: #f87171; }
.delta.play { opacity: 1; animation: cma-float-up 1.4s ease-out forwards; }

.tension-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 6px 0 3px;
}
.tension-label { font-size: 10px; color: #a5b4fc; }
.tbar {
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, .08);
  overflow: hidden;
}
.t-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #7c3aed, #c084fc);
  transition: width .6s cubic-bezier(.22, .61, .36, 1);
}

/* ---------- status effects ---------- */
.status {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;
}
.pill {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--pill, #94a3b8) 55%, transparent);
  background: color-mix(in srgb, var(--pill, #94a3b8) 18%, transparent);
  color: #f8fafc;
  white-space: nowrap;
}
.pill .lv { font-family: var(--font-mono); opacity: .85; }

.summary {
  margin-top: 8px;
  font-size: 11px;
  color: #cbd5e1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---------- suggestion cards ---------- */
.cards { margin-top: 9px; display: grid; gap: 5px; }
.card {
  all: unset;
  cursor: pointer;
  display: block;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, .05);
  border: 1px solid transparent;
  color: #e2e8f0;
  font-size: 11.5px;
  line-height: 1.4;
  transition: background .18s ease, border-color .18s ease;
}
.card:hover { background: rgba(255, 255, 255, .1); }
.card.active {
  background: color-mix(in srgb, var(--accent) 20%, rgba(255, 255, 255, .05));
  border-color: color-mix(in srgb, var(--accent) 65%, transparent);
}
.card .tone {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .08em;
  opacity: .65;
  margin-right: 6px;
}

/* ---------- combat log ---------- */
.log {
  margin-top: 9px;
  padding-top: 7px;
  border-top: 1px dashed rgba(255, 255, 255, .12);
  font-family: var(--font-mono);
  font-size: 10px;
  color: #94a3b8;
  display: grid;
  gap: 2px;
}
.log-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  animation: cma-logfade .4s ease-out;
}
.log-line.err { color: #fca5a5; }

.hint {
  margin-top: 7px;
  font-size: 10px;
  color: #7c8598;
}

/* ---------- collapsed ---------- */
.panel.collapsed { width: 290px; padding-bottom: 10px; }
.panel.collapsed .status,
.panel.collapsed .summary,
.panel.collapsed .cards,
.panel.collapsed .log,
.panel.collapsed .hint,
.panel.collapsed .tension-head,
.panel.collapsed .tbar { display: none; }

/* ---------- ghost text overlay ---------- */
.ghost {
  position: fixed;
  pointer-events: none;
  overflow: hidden;
  opacity: .5;
  background: transparent;
  z-index: 2147483600;
  display: none;
}
.ghost.visible { display: block; }
.ghost .typed { color: transparent; }

/* ---------- keyframes ---------- */
@keyframes cma-shake {
  0%, 100% { transform: translateX(-3px) rotate(-2deg); }
  50% { transform: translateX(3px) rotate(2deg); }
}
@keyframes cma-droop {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(5px) rotate(-7deg); }
}
@keyframes cma-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  35% { transform: translateY(-7px) scale(1.08); }
  60% { transform: translateY(1px) scale(.97); }
}
@keyframes cma-jitter {
  0% { transform: translate(-1.5px, 1px); }
  25% { transform: translate(1.5px, -1px); }
  50% { transform: translate(-1px, -1.5px); }
  75% { transform: translate(1px, 1.5px); }
  100% { transform: translate(-1.5px, 1px); }
}
@keyframes cma-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.07); }
}
@keyframes cma-tilt {
  0%, 100% { transform: rotate(-9deg); }
  50% { transform: rotate(5deg) translateY(-2px); }
}
@keyframes cma-think {
  0%, 100% { transform: rotate(-6deg); opacity: .55; }
  50% { transform: rotate(6deg); opacity: 1; }
}
@keyframes cma-shimmer {
  from { background-position: 0 0; }
  to { background-position: -200% 0; }
}
@keyframes cma-float-up {
  0% { opacity: 0; transform: translateY(6px); }
  18% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}
@keyframes cma-lowpulse {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.45); }
}
@keyframes cma-logfade {
  from { opacity: 0; transform: translateX(-4px); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .avatar, .hp-fill, .t-fill, .delta, .log-line, .hpbar.loading .hp-fill, .danger {
    animation: none !important;
    transition: none !important;
  }
}
`;
