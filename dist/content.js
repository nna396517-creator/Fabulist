function E(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return(t>>>0).toString(36)}function $(e){try{let t=new URL(e);return t.protocol==="file:"?"file://":t.hostname}catch{return""}}var B=["claude-opus-5","claude-sonnet-5","claude-haiku-4-5"],G={model:"claude-opus-5",enabledSites:[]};var A="hudCollapsed";async function U(){let e=await chrome.storage.sync.get(["model","enabledSites"]),t=B.includes(e.model)?e.model:G.model,n=e.enabledSites;return{model:t,enabledSites:Array.isArray(n)?n.filter(o=>typeof o=="string"):[]}}async function K(){let t=(await chrome.storage.local.get(A))[A];return typeof t=="boolean"?t:null}async function W(e){await chrome.storage.local.set({[A]:e})}function Y(e,t){return e.enabledSites.includes(t)}var xe=12,X=500,ve=["out","outgoing","self","me","mine","own","right","sent"];function J(e){let t=e.getBoundingClientRect();if(t.width<40||t.height<12)return!1;let n=getComputedStyle(e);return n.visibility!=="hidden"&&n.display!=="none"&&n.opacity!=="0"}function Ee(){let e=document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable="plaintext-only"]');return Array.from(e).filter(t=>!t.hasAttribute("readonly")&&J(t))}function V(e){let t=e.getBoundingClientRect();return t.width*t.height}function we(e){let t=getComputedStyle(e);return t.overflowY==="auto"||t.overflowY==="scroll"?!0:e.scrollHeight>e.clientHeight+24}function Z(e){return Array.from(e.children).filter(t=>(t.textContent??"").trim().length>0)}function Me(e){let t=[],n=(o,a)=>{if(!(a>6))for(let r of Array.from(o.children)){let i=(r.textContent??"").trim();if(!i)continue;Array.from(r.children).filter(d=>(d.textContent??"").trim().length>0).length<=1&&i.length<=2e3?t.push(r):n(r,a+1)}};return n(e,0),t}function Te(e){return e.replace(/\s+/g," ").trim()}function Se(e,t){let n=[...Array.from(e.classList),e.getAttribute("data-testid")??"",e.dataset?.direction??""].join(" ").toLowerCase();if(ve.some(i=>new RegExp(`(^|[^a-z])${i}([^a-z]|$)`).test(n)))return"out";let o=e.getBoundingClientRect(),a=t.right-o.right<t.width*.12,r=o.width<t.width*.9;return a&&r?"out":"in"}function Le(e){let t=e.getBoundingClientRect(),n=Z(e),o=n.length>=2?n:Me(e),a=[];for(let r of o){let i=Te(r.innerText??r.textContent??"");if(!i)continue;let l=Se(r,t),d=a[a.length-1];if(d&&d.text===i.slice(0,X)&&d.direction===l)continue;let v=i.slice(0,X);a.push({text:v,direction:l,id:E(`${l}:${v}`)})}return a.slice(-xe)}var Q={id:"generic",matches:()=>!0,findInput(){let e=Ee();if(e.length===0)return null;let t=document.activeElement;return t&&e.includes(t)?t:e.reduce((n,o)=>V(o)>V(n)?o:n)},findMessageContainer(e){if(!e)return null;let t=e.getBoundingClientRect().top,n=e.parentElement;for(let o=0;o<8&&n;o++,n=n.parentElement){let a=null,r=0,i=n.querySelectorAll("div, ul, ol, section, main");for(let l of Array.from(i)){if(l.contains(e)||!we(l)||!J(l)||l.getBoundingClientRect().top>=t)continue;let d=Z(l).length;d>=2&&d>r&&(a=l,r=d)}if(a)return a}return document.body},extractMessages:Le};var Ce=[];function ee(e){return Ce.find(t=>t.matches(e))??Q}var H=[{incoming:"\u7B49\u7B49\uFF0C\u6240\u4EE5\u6211\u662F\u8981\u91CD\u65B0\u4E0B\u55AE\uFF0C\u9084\u662F\u76F4\u63A5\u7B49\u5C31\u597D\uFF1F\u6211\u525B\u525B\u554F\u904E\u4E00\u6B21\u9084\u662F\u6709\u9EDE\u641E\u4E0D\u61C2\u3002",emotion:"confusion",intensity:3,valence:.05,arousal:.45,summary:"\u5C0D\u65B9\u6C92\u770B\u61C2\u525B\u525B\u7684\u6B65\u9A5F\uFF0C\u9023\u554F\u4E86\u5169\u6B21\u540C\u4E00\u4EF6\u4E8B\u3002",suggestions:[{text:"\u6211\u91CD\u65B0\u8AAA\u4E00\u6B21\u6D41\u7A0B\uFF0C\u9019\u6B21\u62C6\u6210\u4E09\u500B\u6B65\u9A5F\u3002",tone:"professional"},{text:"\u62B1\u6B49\u525B\u525B\u8B1B\u5F97\u592A\u5FEB\uFF0C\u6211\u5011\u5F9E\u7B2C\u4E00\u6B65\u6162\u6162\u4F86\u3002",tone:"empathetic"},{text:"\u6211\u518D\u8AAA\u660E\u4E00\u6B21\uFF0C\u54EA\u4E00\u6BB5\u6700\u4E0D\u6E05\u695A\uFF1F",tone:"concise"}]},{incoming:"\u6211\u5DF2\u7D93\u7B49\u4E09\u5929\u4E86\uFF0C\u5230\u5E95\u4EC0\u9EBC\u6642\u5019\u624D\u6703\u51FA\u8CA8\uFF1F\u9019\u6A23\u771F\u7684\u5F88\u8A87\u5F35\u3002",emotion:"anger",intensity:5,valence:-.85,arousal:.92,summary:"\u5C0D\u65B9\u5DF2\u7D93\u7B49\u4E86\u4E09\u5929\u9084\u6C92\u6536\u5230\u56DE\u8986\uFF0C\u8A9E\u6C23\u975E\u5E38\u4E0D\u6EFF\u3002",suggestions:[{text:"\u5F88\u62B1\u6B49\u8B93\u4F60\u7B49\u9019\u9EBC\u4E45\uFF0C\u6211\u73FE\u5728\u99AC\u4E0A\u8655\u7406\u4E26\u56DE\u5831\u9032\u5EA6\u3002",tone:"empathetic"},{text:"\u9019\u4EF6\u4E8B\u78BA\u5BE6\u662F\u6211\u5011\u7684\u758F\u5931\uFF0C\u6211\u4ECA\u5929\u4E4B\u5167\u7D66\u4F60\u660E\u78BA\u7B54\u8986\u3002",tone:"professional"},{text:"\u62B1\u6B49\uFF0C\u6211\u7ACB\u523B\u8DDF\u9032\u3002",tone:"concise"}]},{incoming:"\u525B\u525B\u6536\u5230\u51FA\u8CA8\u901A\u77E5\u4E86\uFF0C\u8B1D\u8B1D\u4F60\u5E6B\u5FD9\u8655\u7406\uFF0C\u9019\u6B21\u771F\u7684\u8F9B\u82E6\u4F60\u4E86\u3002",emotion:"gratitude",intensity:4,valence:.66,arousal:.3,summary:"\u554F\u984C\u89E3\u6C7A\u4E86\uFF0C\u5C0D\u65B9\u7279\u5730\u56DE\u4F86\u9053\u8B1D\u3002",suggestions:[{text:"\u4E0D\u5BA2\u6C23\uFF0C\u4E4B\u5F8C\u6709\u4EFB\u4F55\u72C0\u6CC1\u90FD\u53EF\u4EE5\u518D\u627E\u6211\u3002",tone:"empathetic"},{text:"\u5F88\u9AD8\u8208\u554F\u984C\u89E3\u6C7A\u4E86\uFF0C\u5F8C\u7E8C\u6211\u6703\u518D\u78BA\u8A8D\u4E00\u6B21\u3002",tone:"professional"},{text:"\u96A8\u6642\u627E\u6211\u3002",tone:"casual"}]},{incoming:"\u5305\u88F9\u4ECA\u5929\u65E9\u4E0A\u5C31\u9001\u5230\u4E86\uFF0C\u6771\u897F\u5B8C\u5168\u6C92\u554F\u984C\uFF0C\u9019\u6B21\u901F\u5EA6\u8D85\u5FEB\uFF01",emotion:"joy",intensity:4,valence:.82,arousal:.55,summary:"\u5C0D\u65B9\u525B\u6536\u5230\u597D\u6D88\u606F\uFF0C\u8A9E\u6C23\u8F15\u5FEB\u9084\u5E36\u4E86\u9A5A\u5606\u865F\u3002",suggestions:[{text:"\u592A\u597D\u4E86\uFF0C\u807D\u8D77\u4F86\u4E00\u5207\u90FD\u5F88\u9806\u5229\uFF01",tone:"casual"},{text:"\u606D\u559C\u4F60\uFF0C\u9019\u500B\u7D50\u679C\u771F\u7684\u503C\u5F97\u958B\u5FC3\u3002",tone:"empathetic"},{text:"\u5F88\u9AD8\u8208\u807D\u5230\u9019\u500B\u6D88\u606F\u3002",tone:"concise"}]}],te="cma:demo";function R(e){return e instanceof HTMLTextAreaElement||e instanceof HTMLInputElement?e.value:e.innerText??""}function ne(e,t){if(!e)return null;if(!t)return e;if(t.length>e.length||!e.toLowerCase().startsWith(t.toLowerCase()))return null;let n=e.slice(t.length);return n.length>0?n:null}var ke=["color","fontFamily","fontSize","fontWeight","fontStyle","letterSpacing","lineHeight","textIndent","paddingTop","paddingRight","paddingBottom","paddingLeft","borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","textAlign","direction"];function oe(e,t){let n=getComputedStyle(e);for(let a of ke)t.style[a]=n[a];let o=e.getBoundingClientRect();t.style.left=`${o.left}px`,t.style.top=`${o.top}px`,t.style.width=`${o.width}px`,t.style.height=`${o.height}px`,t.style.borderStyle="solid",t.style.borderColor="transparent",t.style.whiteSpace=n.whiteSpace==="nowrap"?"nowrap":"pre-wrap",t.scrollTop=e.scrollTop}var w=new WeakMap;function ae(e){(e instanceof HTMLTextAreaElement||e instanceof HTMLInputElement)&&(!e.placeholder||w.has(e)||(w.set(e,e.placeholder),e.placeholder=""))}function j(e){if(!(e instanceof HTMLTextAreaElement||e instanceof HTMLInputElement))return;let t=w.get(e);t!==void 0&&(e.placeholder=t,w.delete(e))}var re={joy:{emoji:"\u{1F604}",label:"\u958B\u5FC3",color:"#4ade80",anim:"cma-bounce"},gratitude:{emoji:"\u{1F64F}",label:"\u611F\u8B1D",color:"#86efac",anim:"cma-bounce"},neutral:{emoji:"\u{1F610}",label:"\u5E73\u975C",color:"#94a3b8",anim:"cma-breathe"},curiosity:{emoji:"\u{1F9D0}",label:"\u597D\u5947",color:"#38bdf8",anim:"cma-tilt"},confusion:{emoji:"\u{1F615}",label:"\u56F0\u60D1",color:"#60a5fa",anim:"cma-tilt"},anxiety:{emoji:"\u{1F630}",label:"\u7126\u616E",color:"#fbbf24",anim:"cma-jitter"},sadness:{emoji:"\u{1F622}",label:"\u96E3\u904E",color:"#7dd3fc",anim:"cma-droop"},frustration:{emoji:"\u{1F624}",label:"\u4E0D\u8010",color:"#fb923c",anim:"cma-shake"},anger:{emoji:"\u{1F621}",label:"\u751F\u6C23",color:"#f87171",anim:"cma-shake"},urgency:{emoji:"\u23F1\uFE0F",label:"\u6025\u8FEB",color:"#f59e0b",anim:"cma-jitter"},sarcasm:{emoji:"\u{1F60F}",label:"\u53CD\u8AF7",color:"#c084fc",anim:"cma-tilt"},affection:{emoji:"\u{1F970}",label:"\u89AA\u8FD1",color:"#f9a8d4",anim:"cma-bounce"}};function D(e){return re[e]??re.neutral}function se(e){let t=Math.max(-1,Math.min(1,e));return Math.round((t+1)/2*100)}function ie(e){return e>66?{from:"#16a34a",to:"#4ade80",glow:"rgba(74,222,128,.45)"}:e>=33?{from:"#ca8a04",to:"#facc15",glow:"rgba(250,204,21,.45)"}:{from:"#b91c1c",to:"#f87171",glow:"rgba(248,113,113,.5)"}}var le=`
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
`;var Ae=3,ce=360,z=16,u=12,de=220,He=4,Re=`
<div class="root" part="root">
  <div class="panel">
    <div class="top">
      <span class="brand">Chat Mood</span>
      <span class="spacer"></span>
      <button class="iconbtn js-collapse" type="button">[-]</button>
    </div>

    <div class="body">
      <div class="avatar-wrap"><div class="avatar js-avatar">\u{1F610}</div></div>
      <div class="bars">
        <div class="bar-head">
          <span class="bar-label">\u5C0D\u65B9\u5FC3\u60C5</span>
          <span class="danger">\u26A0 \u5371\u96AA</span>
          <span class="readout js-readout">HP --/100</span>
        </div>
        <div class="hpbar js-hpbar">
          <div class="hp-fill js-hpfill"></div>
          <div class="hp-segments"></div>
        </div>
        <span class="delta js-delta"></span>
        <div class="tension-head">
          <span class="tension-label">Tension \u6012\u6C23/\u7DCA\u5F35</span>
          <span class="readout js-tension">--</span>
        </div>
        <div class="tbar"><div class="t-fill js-tfill"></div></div>
      </div>
    </div>

    <div class="status js-status"></div>
    <div class="summary js-summary"></div>
    <div class="cards js-cards"></div>
    <div class="log js-log"></div>
    <div class="hint">Tab \u63A1\u7528 \xB7 Alt+\u2191\u2193 \u5207\u63DB \xB7 Esc \u95DC\u9589</div>
  </div>

  <div class="ghost"><span class="typed js-typed"></span><span class="js-rest"></span></div>
</div>`,M=class{constructor(t){this.callbacks=t;this.host=document.createElement("div"),this.host.dataset.chatMoodAssist="host",this.shadow=this.host.attachShadow({mode:"open"})}callbacks;host;shadow;panel;ghost;logLines=[];lastHp=null;choice=null;cramped=!1;deltaTimer=null;get element(){return this.host}mount(){let t=document.createElement("style");t.textContent=le,this.shadow.append(t);let n=document.createElement("div");n.innerHTML=Re,this.shadow.append(n.firstElementChild),this.panel=this.query(".panel"),this.ghost=this.query(".ghost"),this.query(".js-collapse").addEventListener("click",()=>{let o=!this.isCollapsed();this.setCollapsed(o),this.callbacks.onCollapseChange(o)}),document.body.append(this.host)}destroy(){this.host.remove()}setCollapsed(t){this.choice=t,this.renderCollapsed()}isCollapsed(){return this.choice??this.cramped}renderCollapsed(){let t=this.isCollapsed();this.panel.classList.toggle("collapsed",t),this.query(".js-collapse").textContent=t?"[+]":"[-]"}show(){this.panel.classList.add("visible")}hide(){this.panel.classList.remove("visible"),this.hideGhost()}anchorTo(t){let n=t.getBoundingClientRect(),o=je(t,n),a=this.panel.offsetWidth||ce,r=ce+z+u,i,l;window.innerWidth-o.right>=r?(this.cramped=!1,i=o.right+z,l=window.innerHeight-n.bottom):o.left>=r?(this.cramped=!1,i=o.left-z-a,l=window.innerHeight-n.bottom):(this.cramped=!0,i=n.left,l=window.innerHeight-n.top+10),this.renderCollapsed();let d=this.panel.offsetHeight,v=Math.max(u,window.innerHeight-d-u);this.panel.style.left=`${pe(i,u,window.innerWidth-a-u)}px`,this.panel.style.bottom=`${pe(l,u,v)}px`,oe(t,this.ghost)}setState(t){switch(t.kind){case"idle":this.setAvatar("\u{1F610}","cma-breathe","#94a3b8"),this.query(".js-hpbar").classList.remove("loading");break;case"analyzing":this.setAvatar("\u{1F914}","cma-think","#a5b4fc"),this.query(".js-hpbar").classList.add("loading"),this.query(".js-readout").textContent="HP ??/100";break;case"result":this.query(".js-hpbar").classList.remove("loading"),this.renderResult(t.result);break;case"error":this.query(".js-hpbar").classList.remove("loading"),this.setAvatar("\u{1F4A4}","cma-breathe","#94a3b8"),this.query(".js-readout").textContent="HP --/100",this.pushLog(t.message,!0);break}}renderResult(t){let n=D(t.emotion),o=se(t.valence),a=ie(o),r=this.query(".root");r.style.setProperty("--hp-from",a.from),r.style.setProperty("--hp-to",a.to),r.style.setProperty("--hp-glow",a.glow),r.style.setProperty("--accent",n.color),this.setAvatar(n.emoji,n.anim,n.color),this.query(".js-hpfill").style.width=`${o}%`,this.query(".js-readout").textContent=`HP ${o}/100`,this.panel.classList.toggle("low",o<30);let i=Math.round(Math.max(0,Math.min(1,t.arousal))*100);this.query(".js-tfill").style.width=`${i}%`,this.query(".js-tension").textContent=`${i}%`,this.query(".js-summary").textContent=t.summary,this.renderStatus(t,o),this.renderCards(t);let l=this.lastHp===null?null:o-this.lastHp;l!==null&&l!==0&&this.playDelta(l),this.pushLog(l===null?`\u5075\u6E2C\u5230\u300C${n.label}\u300D\uFF01\u5FC3\u60C5 ${o}`:`\u5C0D\u65B9\u4F7F\u7528\u4E86\u300C${n.label}\u300D\uFF01\u5FC3\u60C5 ${l>0?"+":""}${l}`,!1),this.pushLog("\u5EFA\u8B70\u56DE\u8986\u5DF2\u5C31\u7DD2 (Tab)",!1),this.lastHp=o}renderStatus(t,n){let o=D(t.emotion),a=[{text:`${o.emoji} ${o.label} <span class="lv">Lv.${t.intensity}</span>`,color:o.color}];t.arousal>=.65&&a.push({text:"\u26A1 \u9AD8\u5F35\u529B",color:"#c084fc"}),n<30?a.push({text:"\u{1F494} \u5FC3\u60C5\u4F4E\u843D",color:"#f87171"}):n>75&&a.push({text:"\u2728 \u6C23\u6C1B\u826F\u597D",color:"#4ade80"}),this.query(".js-status").replaceChildren(...a.slice(0,3).map(i=>{let l=document.createElement("span");return l.className="pill",l.style.setProperty("--pill",i.color),l.innerHTML=i.text,l}))}renderCards(t){this.query(".js-cards").replaceChildren(...t.suggestions.map((o,a)=>{let r=document.createElement("button");r.type="button",r.className="card",r.dataset.index=String(a);let i=document.createElement("span");return i.className="tone",i.textContent=o.tone,r.append(i,document.createTextNode(o.text)),r.addEventListener("click",()=>this.callbacks.onCardClick(a)),r}))}setActiveIndex(t){this.shadow.querySelectorAll(".card").forEach((o,a)=>o.classList.toggle("active",a===t))}playDelta(t){let n=this.query(".js-delta");n.textContent=`${t>0?"+":""}${t}`,n.className=`delta js-delta ${t>0?"up":"down"}`,n.offsetWidth,n.classList.add("play"),this.deltaTimer!==null&&window.clearTimeout(this.deltaTimer),this.deltaTimer=window.setTimeout(()=>n.classList.remove("play"),1400)}pushLog(t,n){this.logLines=[...this.logLines,{text:t,error:n}].slice(-Ae),this.query(".js-log").replaceChildren(...this.logLines.map(a=>{let r=document.createElement("div");return r.className=a.error?"log-line err":"log-line",r.textContent=`> ${a.text}`,r}))}setAvatar(t,n,o){let a=this.query(".js-avatar");a.textContent=t,a.className=`avatar js-avatar anim-${n.replace("cma-","")}`,a.style.setProperty("--accent",o)}showGhost(t,n){this.query(".js-typed").textContent=t,this.query(".js-rest").textContent=n,this.ghost.classList.add("visible")}hideGhost(){this.ghost.classList.remove("visible")}isGhostVisible(){return this.ghost.classList.contains("visible")}query(t){let n=this.shadow.querySelector(t);if(!n)throw new Error(`HUD element missing: ${t}`);return n}};function je(e,t){let n=t.left,o=t.right,a=e.parentElement;for(let r=0;a&&a!==document.body&&r<He;r++){let i=a.getBoundingClientRect();if(i.right-t.right>de||t.left-i.left>de)break;n=Math.min(n,i.left),o=Math.max(o,i.right),a=a.parentElement}return{left:n,right:o}}function pe(e,t,n){return Math.max(t,Math.min(e,n))}function q(e,t){if(e.focus(),e instanceof HTMLTextAreaElement||e instanceof HTMLInputElement){let o=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,a=Object.getOwnPropertyDescriptor(o,"value")?.set;a?a.call(e,t):e.value=t,e.dispatchEvent(new Event("input",{bubbles:!0}));let r=e.value.length;e.setSelectionRange?.(r,r);return}De(e),document.execCommand("insertText",!1,t)||(e.textContent=t,e.dispatchEvent(new InputEvent("input",{inputType:"insertText",data:t,bubbles:!0}))),ze(e)}function De(e){let t=document.createRange();t.selectNodeContents(e);let n=window.getSelection();n?.removeAllRanges(),n?.addRange(t)}function ze(e){let t=document.createRange();t.selectNodeContents(e),t.collapse(!1);let n=window.getSelection();n?.removeAllRanges(),n?.addRange(t)}var qe=700,Pe=3e3,_e=0,Oe=600,Ie=1100,Ne=1600,Fe=900,$e=1400,k=$(location.href),O=ee(k),s=null,c=null,m=null,b=null,T=null,P=null,f=null,x=null,ue="",p=0,g=!1,me=0,y=!1;async function S(){s||(s=new M({onCardClick:e=>{p=e,s?.setActiveIndex(e),F()},onCollapseChange:e=>{W(e)}}),s.mount(),s.setCollapsed(await K()),s.setState({kind:"idle"}),document.addEventListener("keydown",be,!0),document.addEventListener("input",he,!0),window.addEventListener("scroll",L,!0),window.addEventListener("resize",L),fe(),T=window.setInterval(fe,Pe))}function Be(){s&&(document.removeEventListener("keydown",be,!0),document.removeEventListener("input",he,!0),window.removeEventListener("scroll",L,!0),window.removeEventListener("resize",L),b?.disconnect(),b=null,T!==null&&window.clearInterval(T),f!==null&&window.clearTimeout(f),T=null,f=null,y=!1,s.destroy(),s=null,c&&j(c),c=null,m=null,x=null)}function fe(){if(!s)return;let e=O.findInput();if(e!==c&&(c=e,c?s.show():s.hide()),!c)return;s.anchorTo(c);let t=O.findMessageContainer(c);t&&t!==m&&(m=t,b?.disconnect(),b=new MutationObserver(Ge),b.observe(m,{subtree:!0,childList:!0,characterData:!0}))}function L(){s&&c&&s.anchorTo(c)}function Ge(e){y||e.every(n=>s?.element.contains(n.target))||(P!==null&&window.clearTimeout(P),P=window.setTimeout(Ue,qe))}function Ue(){if(!s||!c||!m)return;let e=O.extractMessages(m),t=e[e.length-1];if(!t||t.direction!=="in")return;let n=E(t.text);if(n===ue)return;ue=n,g=!1;let o={type:"analyze",host:k,messages:e,draft:R(c)},a=++me;s.setState({kind:"analyzing"}),h(),chrome.runtime.sendMessage(o,r=>{if(!(a!==me||!s)){if(chrome.runtime.lastError||!r){s.setState({kind:"error",message:"\u80CC\u666F\u670D\u52D9\u7121\u56DE\u61C9"});return}if(!r.ok){s.setState({kind:"error",message:r.error.message});return}ge(r.result)}})}function ge(e){x=e,p=0,g=!1,s?.setState({kind:"result",result:e}),s?.setActiveIndex(p),N()}function I(){return x?.suggestions[p]?.text??null}function N(){if(!s||!c)return;let e=I(),t=e?R(c):"",n=e&&!g?ne(e,t):null;if(n===null){h();return}s.anchorTo(c),ae(c),s.showGhost(t,n)}function h(){s?.hideGhost(),c&&j(c)}function he(e){e.target===c&&N()}function F(e="\u5DF2\u63A1\u7528\u5EFA\u8B70\u56DE\u8986"){let t=I();!t||!c||(q(c,t),h(),s?.pushLog(e,!1))}function be(e){if(!(!s||!c||e.target!==c)){if(e.key==="Tab"&&!e.altKey&&!e.ctrlKey&&!e.metaKey){if(!s.isGhostVisible())return;e.preventDefault(),e.stopPropagation(),F();return}if(e.altKey&&(e.key==="ArrowDown"||e.key==="ArrowUp")){let t=x?.suggestions.length??0;if(t===0)return;e.preventDefault(),e.stopPropagation();let n=e.key==="ArrowDown"?1:-1;p=(p+n+t)%t,g=!1,s.setActiveIndex(p),N();return}e.key==="Escape"&&s.isGhostVisible()&&(e.stopPropagation(),g=!0,h())}}function _(e){document.dispatchEvent(new CustomEvent(te,{detail:e}))}function ye(e,t=0){let n=e[t];n&&(f=window.setTimeout(()=>{!s||!y||(n.run(s),ye(e,t+1))},n.after))}function C(e=0,t=!1){if(!s)return;let n=H[e];if(!n)return;e===0&&(s.pushLog(t?"Demo \u6A21\u5F0F\uFF1A\u81EA\u52D5\u5FAA\u74B0\u64AD\u653E":"Demo \u6A21\u5F0F\uFF1A\u5C55\u793A\u4E00\u8F2A\u5C0D\u8A71",!1),s.setCollapsed(null)),y=!0;let o="";ye([{after:_e,run:()=>_({phase:"incoming",text:n.incoming})},{after:Oe,run:a=>{a.setState({kind:"analyzing"}),h()}},{after:Ie,run:()=>ge(n)},{after:Ne,run:()=>{o=I()??"",F("\u5DF2\u6309 Tab \u63A1\u7528\u5EFA\u8B70")}},{after:Fe,run:a=>{_({phase:"reply",text:o}),g=!0,c&&q(c,""),h(),a.pushLog("\u5DF2\u9001\u51FA\u56DE\u8986",!1)}},{after:$e,run:()=>{let a=e+1;if(a<H.length){C(a,t);return}if(!t){y=!1;return}_({phase:"reset"}),C(0,t)}}])}chrome.runtime.onMessage.addListener((e,t,n)=>e?.type==="get-state"?(n({active:s!==null,host:k,result:x}),!1):e?.type==="site-toggled"?(e.enabled?S():Be(),n({ok:!0}),!1):e?.type==="demo"?((async()=>(await S(),f!==null&&window.clearTimeout(f),C(0,e.loop===!0),n({ok:!0})))(),!0):!1);async function Ke(){if(document.querySelector('meta[name="chat-mood-assist-demo"]')){await S(),C(0,!0);return}let e=await U();Y(e,k)&&await S()}Ke();
