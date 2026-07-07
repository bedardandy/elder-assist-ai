/* tv.js — up to 6 big buttons that call HA services from config. */

import { el, pageShell, note, banner, speak } from '../ui.js';

export default function mountTv(ctx) {
  const { config, ha } = ctx;
  const buttons = (config.tv && Array.isArray(config.tv.buttons)) ? config.tv.buttons : [];
  const view = pageShell('TV');
  const body = view._body;

  if (!ha.configured || !buttons.length) {
    body.append(note('TV buttons aren’t set up yet. A caregiver can add them in config.js.'));
    return view;
  }

  const status = el('div', { style: 'min-height:2.4rem;margin-bottom:1rem' });
  body.append(status);

  const grid = el('div.tv-grid');
  for (const b of buttons.slice(0, 6)) {
    const btn = el('button.tv-btn', { type: 'button', 'aria-label': b.label }, [
      el('span.icon', { 'aria-hidden': 'true' }, b.icon || '📺'),
      el('span.label', {}, b.label),
    ]);
    btn.addEventListener('click', async () => {
      status.replaceChildren(el('div.note', { style: 'text-align:left;padding:.4rem' }, `${b.label}…`));
      try {
        await ha.callService(b.domain, b.service, b.service_data || {});
        status.replaceChildren(el('span.status-pill.yes', {}, ['✓ ', b.label]));
        speak(b.label, config.language);
      } catch (e) {
        status.replaceChildren(banner(e.message || ha.friendly()));
      }
    });
    grid.append(btn);
  }
  body.append(grid);
  return view;
}
