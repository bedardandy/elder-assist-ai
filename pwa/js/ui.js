/* ui.js — tiny DOM + speech helpers shared across pages. No dependencies. */

/** Create an element: el('button.btn.call', {onclick}, [children|text]). */
export function el(spec, props = {}, children = []) {
  // spec supports "tag#id.class1.class2" (id and classes optional).
  let id = '';
  let rest = spec;
  const hash = rest.indexOf('#');
  if (hash >= 0) {
    const after = rest.slice(hash + 1);
    const dot = after.indexOf('.');
    id = dot >= 0 ? after.slice(0, dot) : after;
    rest = rest.slice(0, hash) + (dot >= 0 ? after.slice(dot) : '');
  }
  const [tag, ...classes] = rest.split('.');
  const node = document.createElement(tag || 'div');
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'onclick' || k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'html') {
      node.innerHTML = v;
    } else if (k === 'text') {
      node.textContent = v;
    } else if (k === 'dataset') {
      Object.assign(node.dataset, v);
    } else {
      node.setAttribute(k, v);
    }
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

/** Deterministic, pleasant avatar color from a name. */
export function avatarColor(name) {
  const palette = ['#1b5e20', '#0d47a1', '#4a148c', '#8a2e02', '#00564b', '#37474f', '#5d4037', '#283593'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function avatar(name, extraClass = '') {
  const a = el('div.avatar' + (extraClass ? '.' + extraClass : ''));
  a.textContent = (name || '?').trim().charAt(0).toUpperCase();
  a.style.background = avatarColor(name || '?');
  return a;
}

/** Friendly error banner (never a stack trace). */
export function banner(message) {
  return el('div.banner', {}, [el('span.icon', { text: '⚠️' }), el('span', { text: message })]);
}

export function spinner(label = 'One moment…') {
  return el('div', {}, [el('div.spinner'), el('div.note', { text: label })]);
}

export function note(text) { return el('div.note', { text }); }

/** Standard subpage frame: giant Back button (top-left) + title + scrollable body. */
export function pageShell(title, bodyNode) {
  const body = el('div.page-body');
  if (bodyNode) body.append(bodyNode.nodeType ? bodyNode : document.createTextNode(String(bodyNode)));
  const view = el('div.view.page', {}, [
    el('div.page-head', {}, [
      el('a.back', { href: '#/', 'aria-label': 'Back to home' }, ['⬅ Back']),
      el('h1.page-title', {}, title),
    ]),
    body,
  ]);
  view._body = body;   // pages fill this asynchronously
  return view;
}

/** Speak text aloud if the browser supports it; safe no-op otherwise. */
export function speak(text, lang = 'en-US') {
  try {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.95;         // a touch slower for clarity
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch { /* ignore — speech is a nicety */ }
}

export function stopSpeaking() {
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* noop */ }
}
