/* ask.js — voice-first question box to HA Assist.
 * Mic via Web Speech API when available; typed input always works.
 * Replies are shown as big bubbles and spoken aloud.
 * Also hosts "Read This For Me": photo → local vision model via the kiosk's
 * locked-down /ollama proxy (user-initiated capture only — see D11). */

import { el, pageShell, note, speak, stopSpeaking } from '../ui.js';

const VISION_SYSTEM_PROMPT =
  'You are helping an elderly person read something they photographed. ' +
  'First read ALL visible text out verbatim. Then briefly explain in plain, warm words what this is. ' +
  'If the text is blurry or unreadable, say so and ask for a closer, better-lit photo — never guess. ' +
  'If there is a date, state it plainly, like "September 12, 2026". ' +
  'Use short sentences. Never give medical dosage advice — suggest asking the doctor or family instead.';

/* Downscale a photo to <=1280px JPEG and return the base64 payload (no data: prefix). */
function downscale(file, maxDim = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
      } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}

/* Ask the local vision model to read a photo. Served same-origin by the kiosk
 * nginx proxy, which only forwards when the key matches (closed by default). */
async function readPhoto(base64, vision) {
  const res = await fetch('/ollama/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Kiosk-Key': vision.kioskKey },
    body: JSON.stringify({
      model: vision.model,
      stream: false,
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
        { role: 'user', content: 'Please read this for me.', images: [base64] },
      ],
    }),
  });
  if (!res.ok) throw new Error('vision http ' + res.status);
  const data = await res.json();
  const text = data && data.message && data.message.content;
  if (!text) throw new Error('empty vision reply');
  return text.trim();
}

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
      if (busy) return; // a question or photo is already being handled
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

  // "Read This For Me" — only when the vision model + kiosk key are configured.
  const vision = config.vision || {};
  let cameraRow = null;
  if (vision.model && vision.kioskKey) {
    const fileInput = el('input', {
      type: 'file', accept: 'image/*', capture: 'environment',
      style: 'display:none', 'aria-hidden': 'true',
    });
    const camBtn = el('button.action', { type: 'button', style: 'width:100%' },
      ['📷 Read Something For Me']);
    camBtn.addEventListener('click', () => { if (!busy) fileInput.click(); });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file || busy) return;
      busy = true;
      camBtn.disabled = true;
      addBubble('me', '📷 (photo)');
      const reading = addBubble('them thinking', 'Reading it… this can take a minute ⏳');
      try {
        const b64 = await downscale(file);
        const reply = await readPhoto(b64, vision);
        reading.classList.remove('thinking');
        reading.textContent = reply;
        speak(reply, lang);
      } catch (e) {
        reading.classList.remove('thinking');
        reading.textContent = 'I couldn’t read that photo. Try again with more light, holding the camera closer.';
      } finally {
        busy = false;
        camBtn.disabled = false;
        chat.scrollTop = chat.scrollHeight;
      }
    });
    cameraRow = el('div', { style: 'flex:0 0 auto;padding:.4rem 0' }, [camBtn, fileInput]);
  }

  const wrap = el('div.ask-wrap', {}, cameraRow ? [chat, cameraRow, inputRow] : [chat, inputRow]);
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
