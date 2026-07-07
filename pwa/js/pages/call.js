/* call.js — person cards. Video → Jitsi (prejoin skipped). Phone → tel:.
 * Emergency / caregiver card is pinned first and visually distinct. */

import { el, avatar, note, banner, speak, stopSpeaking } from '../ui.js';

/** Build a Jitsi URL that skips the prejoin screen. */
function jitsiUrl(config, contact) {
  if (contact.url) return contact.url;
  const base = (config.jitsiBase || 'https://meet.jit.si').replace(/\/+$/, '');
  const room = encodeURIComponent(contact.jitsiRoom || 'ElderAssist');
  const params = [
    'config.prejoinConfig.enabled=false',
    'config.prejoinPageEnabled=false',
    'config.startWithVideoMuted=false',
    'config.startWithAudioMuted=false',
    'config.disableDeepLinking=true',
  ].join('&');
  return `${base}/${room}#${params}`;
}

/** Full-screen "Calling Mary…" state with a giant Cancel. */
function showCalling(name, onProceed) {
  let cancelled = false;
  const overlay = el('div.calling', { role: 'dialog', 'aria-modal': 'true', 'aria-label': `Calling ${name}` }, [
    el('div.ring', { 'aria-hidden': 'true' }, '📞'),
    el('div.who', {}, `Calling ${name}…`),
    el('div.status', {}, 'Connecting the video call'),
    el('button.cancel', { type: 'button', onclick: () => { cancelled = true; cleanup(); } }, 'Cancel'),
  ]);
  function cleanup() {
    stopSpeaking();
    overlay.remove();
  }
  document.body.append(overlay);
  speak(`Calling ${name}`);
  // Give the elder an unhurried moment to read/cancel, then open the call.
  setTimeout(() => {
    if (cancelled) return;
    onProceed();
    cleanup();
  }, 3500);
}

/** Show the friendly banner used elsewhere at the top of the page body. */
function showBanner(fromCard, message) {
  const body = fromCard.closest('.page-body') || fromCard.closest('.view');
  if (!body) return;
  const b = banner(message);
  body.insertBefore(b, body.firstChild);
}

function contactCard(config, contact, { emergency = false } = {}) {
  const isVideo = contact.type === 'video';
  const sub = emergency
    ? 'Tap for help'
    : (isVideo ? 'Video call' : 'Phone call');

  const card = el('button.card' + (emergency ? '.emergency' : ''), {
    type: 'button',
    'aria-label': `${emergency ? 'Emergency: ' : ''}${contact.name}, ${sub}`,
  }, [
    avatar(contact.name),
    el('div.card-text', {}, [
      el('span.card-name', {}, contact.name),
      el('span.card-sub', {}, sub),
    ]),
    el('span.card-sub', { 'aria-hidden': 'true', style: 'margin-left:auto;font-size:2rem;' }, isVideo ? '📹' : '📞'),
  ]);

  card.addEventListener('click', () => {
    if (isVideo && (contact.jitsiRoom || contact.url)) {
      showCalling(contact.name, () => window.open(jitsiUrl(config, contact), '_blank', 'noopener'));
    } else if (contact.phone) {
      // tel: works on devices with a SIM / FaceTime.
      window.location.href = 'tel:' + contact.phone.replace(/[^\d+]/g, '');
    } else {
      showBanner(card, `No way to reach ${contact.name} is set up yet. A caregiver can add a phone number or video room in config.js.`);
    }
  });
  return card;
}

export default function mountCall(ctx) {
  const { config } = ctx;
  const grid = el('div.card-grid');

  // Emergency / caregiver first.
  const cg = config.caregiver;
  if (cg && (cg.phone || cg.jitsiRoom || cg.url)) {
    const emergencyContact = {
      name: cg.name || 'Caregiver',
      type: cg.type || (cg.phone ? 'phone' : 'video'),
      phone: cg.phone,
      jitsiRoom: cg.jitsiRoom,
      url: cg.url,
    };
    grid.append(contactCard(config, emergencyContact, { emergency: true }));
  }

  const contacts = Array.isArray(config.contacts) ? config.contacts : [];
  for (const c of contacts) grid.append(contactCard(config, c));

  const body = el('div.page-body', {}, grid.children.length ? [grid] : [
    note('No family contacts are set up yet. A caregiver can add them in config.js.'),
  ]);

  return el('div.view.page', {}, [
    el('div.page-head', {}, [
      el('a.back', { href: '#/', 'aria-label': 'Back to home' }, ['⬅ Back']),
      el('h1.page-title', {}, 'Call Family'),
    ]),
    body,
  ]);
}
