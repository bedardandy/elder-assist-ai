/* ask.js — voice-first question box to HA Assist.
 * Mic via Web Speech API when available; typed input always works.
 * Replies are shown as big bubbles and spoken aloud. */

import { el, pageShell, note, speak, stopSpeaking } from '../ui.js';

export default function mountAsk(ctx) {
  const { config, ha } = ctx;
  const lang = config.language || 'en-US';
  const view = pageShell('Ask a Question');
  const body = view._body;

  if (!ha.configured) {
    body.append(note('The assistant isn’t connected yet. A caregiver can set it up in config.js.'));
    return view;
  }

  const chat = el('div.chat', { 'aria-live': 'polite' });
  chat.append(el('div.bubble.them', {}, 'Hello! Tap the microphone and ask me anything, or type your question below.'));

  const input = el('input', { type: 'text', 'aria-label': 'Type your question', placeholder: 'Type your question…', autocomplete: 'off' });
  const sendBtn = el('button.send', { type: 'button' }, 'Ask');

  // Speech recognition (optional; requires a secure context on most browsers).
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;
  let listening = false;
  const micBtn = el('button.mic', { type: 'button', 'aria-label': 'Speak your question', title: 'Speak your question' }, '🎤');

  let conversationId = null;
  let busy = false;

  function addBubble(cls, text) {
    const b = el('div.bubble.' + cls, {}, text);
    chat.append(b);
    chat.scrollTop = chat.scrollHeight;
    return b;
  }

  async function ask(text) {
    const q = (text || '').trim();
    if (!q || busy) return;
    busy = true;
    input.value = '';
    addBubble('me', q);
    const thinking = addBubble('them thinking', 'Thinking…');
    try {
      const { text: reply, conversationId: cid } = await ha.converse(q, { language: lang, conversationId });
      conversationId = cid;
      thinking.classList.remove('thinking');
      thinking.textContent = reply;
      speak(reply, lang);
    } catch (e) {
      thinking.classList.remove('thinking');
      thinking.textContent = e.message || ha.friendly();
    } finally {
      busy = false;
      chat.scrollTop = chat.scrollHeight;
    }
  }

  sendBtn.addEventListener('click', () => ask(input.value));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(input.value); });

  if (SR) {
    micBtn.addEventListener('click', () => {
      if (listening) { try { recog.stop(); } catch { /* noop */ } return; }
      stopSpeaking();
      recog = new SR();
      recog.lang = lang;
      recog.interimResults = false;
      recog.maxAlternatives = 1;
      listening = true;
      micBtn.classList.add('listening');
      micBtn.textContent = '● Listening';
      recog.onresult = (ev) => {
        const said = ev.results[0][0].transcript;
        input.value = said;
        ask(said);
      };
      recog.onerror = (ev) => {
        listening = false;
        micBtn.classList.remove('listening');
        micBtn.textContent = '🎤';
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          addBubble('them', 'I couldn’t use the microphone here. You can type your question in the box instead.');
        }
      };
      recog.onend = () => {
        listening = false;
        micBtn.classList.remove('listening');
        micBtn.textContent = '🎤';
      };
      try { recog.start(); } catch { listening = false; micBtn.classList.remove('listening'); micBtn.textContent = '🎤'; }
    });
  } else {
    micBtn.disabled = true;
    micBtn.title = 'Voice isn’t available on this device — please type';
    micBtn.style.opacity = '0.5';
  }

  const inputRow = el('div.ask-input', {}, SR
    ? [micBtn, input, sendBtn]
    : [input, sendBtn]);

  const wrap = el('div.ask-wrap', {}, [chat, inputRow]);
  if (!SR) {
    wrap.insertBefore(el('div.note', { style: 'flex:0 0 auto;padding:.4rem' }, 'Voice input isn’t available here — type your question below.'), inputRow);
  }
  body.append(wrap);

  view.cleanup = () => {
    stopSpeaking();
    try { if (recog) recog.abort(); } catch { /* noop */ }
  };
  return view;
}
