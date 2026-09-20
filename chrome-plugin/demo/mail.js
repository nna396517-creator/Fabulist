// 假信箱頁：同一套 content script 直接以 <script> 載入，這裡只提供 adapter 與虛構信件。
// 流程與 Gmail 相同：點開信件不會觸發，按「回覆」或「撰寫」開了輸入框才觸發。
(() => {
  const FAB = (globalThis.Fabulist ||= {});
  FAB.adapters ||= [];

  const ME = { name: '小安', email: 'an@example.com' };
  const CHEN = { name: 'Chen', email: 'chen@example.com' };
  const WANG = { name: '王經理', email: 'manager.wang@example.com' };

  // 每串信前面幾封是同一位寄件人的過往信件，當作語氣基準
  const BASELINE = [
    { from: CHEN, body: "Hi An, thanks for the update on the vendor call. Could you share the Q3 deck when it's ready this week? No rush at all.\nBest, Chen" },
    { from: ME, body: 'Hi Chen, sure, will do.\nAn' },
  ];
  const THREADS = [
    {
      id: 'short',
      subject: 'Q3 deck',
      messages: [...BASELINE, { from: CHEN, body: 'Can you send me the Q3 deck today? Thanks' }],
    },
    {
      id: 'polite-pressure',
      subject: 'Re: Q3 deck',
      messages: [...BASELINE, { from: CHEN, body: 'Just checking in on the Q3 deck :) Happy to look whenever, though the client call is Thursday.' }],
    },
    {
      id: 'mixed',
      subject: 'Q3 deck / vendor',
      messages: [{ from: CHEN, body: '小安，Q3 的 deck 你先丟個 draft 給我看一下就好，不用太完整，週五前 OK 嗎？另外 vendor 那邊也 update 一下。' }],
    },
    {
      id: 'angry',
      subject: 'A 案報告進度',
      messages: [
        { from: WANG, body: '您好，想確認一下 A 案的報告目前進度如何？' },
        { from: ME, body: '王經理您好，目前進行中，完成後會再跟您更新。' },
        { from: WANG, body: '這個進度到底怎麼樣了？不是說好上週五就要給嗎！！我已經問第二次了，這樣真的很誇張。' },
      ],
    },
    {
      id: 'happy',
      subject: 'Re: A 案報告 v2',
      messages: [{ from: WANG, body: '收到新版了，調整得很棒，客戶那邊也很滿意。辛苦了，謝謝你們這麼快處理！' }],
    },
  ];

  const $ = (id) => document.getElementById(id);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  let open = THREADS[0];
  let mode = null; // null | 'reply' | 'new'

  function render() {
    $('list').replaceChildren(
      ...THREADS.map((t) => {
        const last = t.messages[t.messages.length - 1];
        const item = el('li', `inbox-item${t === open ? ' is-open' : ''}`);
        item.append(el('strong', '', `${last.from.name} · ${t.subject}`), el('span', '', last.body));
        item.addEventListener('click', () => {
          open = t;
          mode = null;
          render();
        });
        return item;
      }),
    );
    $('subject').textContent = open.subject;
    $('thread').replaceChildren(
      ...open.messages.map((m) => {
        const mail = el('article', 'mail');
        const from = el('div', 'mail-from');
        from.append(el('strong', '', m.from.name), el('span', '', ` <${m.from.email}>`));
        mail.append(from, el('div', 'mail-body', m.body));
        return mail;
      }),
    );
    $('composer').hidden = !mode;
    $('reply').hidden = Boolean(mode);
    $('composer-head').textContent = mode === 'new' ? '新郵件 · 收件者：chen@example.com' : `回覆 ${open.messages.at(-1).from.name}`;
    if (mode) $('compose').focus();
  }

  function closeComposer() {
    $('compose').textContent = '';
    mode = null;
    render();
  }

  $('reply').addEventListener('click', () => { mode = 'reply'; render(); });
  $('new-mail').addEventListener('click', () => { mode = 'new'; $('compose').textContent = ''; render(); });
  $('discard').addEventListener('click', closeComposer);
  $('composer').addEventListener('submit', (event) => {
    event.preventDefault();
    const body = $('compose').innerText.trim();
    if (body && mode === 'reply') open.messages.push({ from: ME, body });
    closeComposer();
  });

  FAB.adapters.push({
    name: 'demo-mail',
    match: () => location.pathname.endsWith('/demo/mail.html'),
    getComposeBox: () => (mode ? $('compose') : null),
    getThread() {
      if (mode === 'new') {
        return { id: 'compose', key: 'compose', subject: '', me: ME.email, recipients: [CHEN.email], messages: [] };
      }
      const messages = open.messages.map((m) => ({ from: m.from, body: m.body, isMe: m.from === ME }));
      return {
        id: open.id,
        key: `${open.id}|${messages.length}`,
        subject: open.subject,
        me: ME.email,
        recipients: [],
        messages,
      };
    },
  });

  render();
})();
