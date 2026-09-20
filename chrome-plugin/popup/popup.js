const $ = (id) => document.getElementById(id);
const PROFILE_FIELDS = ['name', 'role', 'tone', 'notes'];
const DEMO_MAIL = 'demo/mail.html';

function showKeyState(hasKey) {
  $('key-state').textContent = hasKey ? 'Claude 已連接' : '離線模式';
  $('key-state').classList.toggle('is-on', hasKey);
}

async function load() {
  const { apiKey = '', model = 'claude-sonnet-5', profile = {} } = await chrome.storage.local.get(['apiKey', 'model', 'profile']);
  $('apiKey').value = apiKey;
  $('model').value = model;
  for (const field of PROFILE_FIELDS) $(field).value = profile[field] || '';
  showKeyState(Boolean(apiKey));
}

$('settings').addEventListener('submit', async (event) => {
  event.preventDefault();
  const apiKey = $('apiKey').value.trim();
  const profile = Object.fromEntries(PROFILE_FIELDS.map((field) => [field, $(field).value.trim()]));
  await chrome.storage.local.set({ apiKey, model: $('model').value, profile });
  showKeyState(Boolean(apiKey));
  $('saved').textContent = '已儲存';
  setTimeout(() => ($('saved').textContent = ''), 1500);
});

$('demo').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'FAB_DEMO_TOGGLE' });
    $('demo').textContent = res?.running ? '■ 停止 Demo' : '▶ Demo';
  } catch {
    // 這個分頁沒有 content script（不是 Gmail）→ 改開 Demo 信箱頁並自動輪播
    chrome.tabs.create({ url: chrome.runtime.getURL(`${DEMO_MAIL}?demo=1`) });
  }
});

$('open-mail').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL(DEMO_MAIL) });
});

load();
