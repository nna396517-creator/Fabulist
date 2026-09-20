// Gmail adapter：從 DOM 讀出回信／寫信輸入框，以及它對應的信件串。
// Adapter 契約：
//   getComposeBox()  → 目前的回信／寫信輸入框；沒有在寫信時回 null（整個工具不會觸發）
//   getThread(box)   → { id, key, subject, me, recipients, messages }；寫新信時 messages 是空陣列
(() => {
  const FAB = (globalThis.Fabulist ||= {});
  FAB.adapters ||= [];

  const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

  function myEmail() {
    // 分頁標題格式：「主旨 - someone@gmail.com - Gmail」
    return (document.title.match(EMAIL_RE)?.[0] || '').toLowerCase();
  }

  function bodyText(bodyEl) {
    let text = bodyEl.innerText || '';
    // 去掉引用的舊信，避免同一段內容重複送進模型
    for (const quote of bodyEl.querySelectorAll('.gmail_quote, blockquote')) {
      const quoted = quote.innerText;
      if (quoted) text = text.replace(quoted, '');
    }
    return text.trim();
  }

  function readMessage(el, me) {
    const senderEl = el.querySelector('span.gD, span.yP, span.zF');
    const bodyEl = el.querySelector('div.a3s');
    const snippetEl = el.querySelector('.iA.g6'); // 收合狀態的信件只有摘要
    const body = bodyEl ? bodyText(bodyEl) : (snippetEl?.innerText || '').trim();
    if (!senderEl || !body) return null;
    const email = (senderEl.getAttribute('email') || '').toLowerCase();
    return {
      from: { name: senderEl.getAttribute('name') || senderEl.innerText.trim(), email },
      body,
      isMe: Boolean(me) && email === me,
    };
  }

  FAB.adapters.push({
    name: 'gmail',
    match: () => location.hostname === 'mail.google.com',

    getThread(box) {
      const me = myEmail();
      // 新信件視窗是浮動的 dialog；信件串內的回信框不是
      const dialog = box?.closest('[role="dialog"]');
      if (dialog) {
        const recipients = [...dialog.querySelectorAll('[data-hovercard-id], [email]')]
          .map((el) => el.getAttribute('data-hovercard-id') || el.getAttribute('email'))
          .filter((email) => EMAIL_RE.test(email || ''));
        const subject = dialog.querySelector('input[name="subjectbox"]')?.value || '';
        return { id: 'compose', key: 'compose', subject, me, recipients: [...new Set(recipients)], messages: [] };
      }

      const subjectEl = document.querySelector('h2.hP');
      if (!subjectEl) return null;
      const messages = [...document.querySelectorAll('div[role="listitem"]')]
        .map((el) => readMessage(el, me))
        .filter(Boolean);
      if (!messages.length) return null;
      const last = messages[messages.length - 1];
      return {
        id: location.hash,
        key: `${location.hash}|${messages.length}|${last.body.length}`,
        subject: subjectEl.innerText.trim(),
        me,
        recipients: [],
        messages,
      };
    },

    getComposeBox() {
      const selector = 'div[role="textbox"][contenteditable="true"]';
      const focused = document.activeElement?.closest?.(selector);
      if (focused) return focused;
      const boxes = [...document.querySelectorAll(selector)].filter((el) => el.offsetParent);
      return boxes[boxes.length - 1] || null;
    },
  });
})();
