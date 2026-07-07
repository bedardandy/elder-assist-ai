/* help.js — reach the caregiver, raise an alarm, and calm reassurance. */

import { el, pageShell, banner, speak } from '../ui.js';

/* Build a Jitsi URL for the caregiver. Returns null if no room/url is configured
 * — we NEVER fall back to a guessable default room name (a public meet.jit.si
 * room is open to anyone who knows its name). */
function jitsiUrl(config, cg) {
  if (cg.url) return cg.url;
  if (!cg.jitsiRoom) return null;
  const base = (config.jitsiBase || 'https://meet.jit.si').replace(/\/+$/, '');
  const room = encodeURIComponent(cg.jitsiRoom);
  return `${base}/${room}#config.prejoinConfig.enabled=false&config.prejoinPageEnabled=false&config.disableDeepLinking=true`;
}

export default function mountHelp(ctx) {
  const { config, ha } = ctx;
  const cg = config.caregiver || {};
  const view = pageShell('Get Help');
  const body = view._body;

  const name = cg.name || 'your caregiver';
  const videoUrl = jitsiUrl(config, cg);
  const canVideo = cg.type === 'video' && !!videoUrl;
  const canReach = cg.phone || canVideo;

  // 1) Big "Call caregiver" button (EMERGENCY actions come first).
  if (canReach) {
    const callBtn = el('button.action', { type: 'button', style: 'margin-bottom:1.4rem' }, [`📞 Call ${name}`]);
    callBtn.addEventListener('click', () => {
      // Prefer video only when a real room/url is configured; else dial the phone.
      if (canVideo) {
        window.open(videoUrl, '_blank', 'noopener');
      } else if (cg.phone) {
        window.location.href = 'tel:' + cg.phone.replace(/[^\d+]/g, '');
      }
    });
    body.append(callBtn);
  }

  // 2) "Something is wrong" — fires an HA script that notifies family.
  const scriptEntity = config.help && config.help.alarmScript;
  if (scriptEntity && ha.configured) {
    const status = el('div', { style: 'margin-bottom:1.4rem' });
    const alarmBtn = el('button.action.danger', { type: 'button' }, ['🆘 Something is wrong']);
    alarmBtn.addEventListener('click', async () => {
      alarmBtn.disabled = true;
      alarmBtn.textContent = 'Sending…';
      try {
        const objectId = scriptEntity.includes('.') ? scriptEntity.split('.')[1] : scriptEntity;
        // script.turn_on works for any script entity id.
        await ha.callService('script', 'turn_on', { entity_id: 'script.' + objectId });
        status.replaceChildren(el('span.status-pill.yes', {}, ['✓ ', `I have told ${name}.`]));
        speak(`I have told ${name}. If you are in danger, call 911 now. You are okay.`, config.language);
      } catch (e) {
        alarmBtn.disabled = false;
        alarmBtn.textContent = '🆘 Something is wrong';
        status.replaceChildren(banner(e.message || ha.friendly()));
      }
    });
    body.append(alarmBtn, status);
  }

  // 3) Reassurance.
  body.append(el('div.card', { style: 'cursor:default;display:block' }, [
    el('p', { style: 'font-size:var(--fs-lead);font-weight:700;margin:0 0 .6rem' }, 'You are safe.'),
    el('p', { style: 'font-size:var(--fs-body);margin:0' }, `If you feel unwell or frightened, tap the red button above and ${name} will be told. If you are in danger, call 911 now.`),
  ]));

  // 4) Ask a Question — the AI chat page, kept reachable but visually calm and
  //    placed BELOW the emergency actions so it never competes with them.
  const askBtn = el('a.action.ask-tile', {
    href: '#/ask',
    role: 'button',
    style: 'margin-top:1.4rem;background:var(--c-ask)',
  }, ['Ask a Question 🗣️']);
  body.append(askBtn);

  if (!canReach && !(scriptEntity && ha.configured)) {
    body.insertBefore(banner('Help contacts aren’t set up yet. A caregiver can add them in config.js.'), body.firstChild);
  }

  return view;
}
