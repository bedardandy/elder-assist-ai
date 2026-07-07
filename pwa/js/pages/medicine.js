/* medicine.js — schedule + a big "I TOOK IT" button that turns on an HA
 * input_boolean and reflects the real acknowledged state. */

import { el, pageShell, note, banner, spinner, speak } from '../ui.js';

export default function mountMedicine(ctx) {
  const { config, ha } = ctx;
  const med = config.medication || {};
  const view = pageShell('My Medicine');
  const body = view._body;

  // Static schedule (always safe to show).
  const schedule = Array.isArray(med.schedule) ? med.schedule : [];
  if (schedule.length) {
    body.append(el('h2.section-title', {}, 'Today’s medicine'));
    const list = el('ul.big-list');
    for (const m of schedule) {
      list.append(el('li', {}, [
        el('span.when', {}, m.time || ''),
        el('span.what', {}, `${m.name}${m.dose ? ' — ' + m.dose : ''}`),
      ]));
    }
    body.append(list);
  } else {
    body.append(note('No medicine schedule is set up yet.'));
  }

  const entity = med.acknowledgedEntity;
  // Derive the service domain from the entity id (e.g. input_boolean, switch),
  // rather than hardcoding input_boolean, so a switch.* / other toggle works too.
  const domain = (entity && entity.includes('.')) ? entity.split('.')[0] : 'input_boolean';
  if (!entity || !ha.configured) {
    body.append(el('div', { style: 'margin-top:1.4rem' }, [
      note('The “I took it” button isn’t connected yet. A caregiver can set it up in config.js.'),
    ]));
    return view;
  }

  const statusWrap = el('div', { style: 'margin:1.4rem 0' });
  const actionWrap = el('div');
  body.append(statusWrap, actionWrap);

  function renderTaken(isOn) {
    statusWrap.replaceChildren(
      isOn
        ? el('span.status-pill.yes', {}, ['✓ ', 'You took your medicine today'])
        : el('span.status-pill.no', {}, ['• ', 'Not marked as taken yet'])
    );
    if (isOn) {
      actionWrap.replaceChildren(el('button.action.done', { type: 'button', disabled: 'true' }, ['✓ All done — thank you']));
    } else {
      const btn = el('button.action', { type: 'button' }, ['I TOOK IT ✓']);
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Saving…';
        try {
          await ha.callService(domain, 'turn_on', { entity_id: entity });
          const st = await ha.getState(entity);
          const on = st && st.state === 'on';
          renderTaken(on);
          if (on) speak('Thank you. Your medicine is marked as taken.', config.language);
        } catch (e) {
          btn.disabled = false;
          btn.textContent = 'I TOOK IT ✓';
          statusWrap.replaceChildren(banner(e.message || ha.friendly()));
        }
      });
      actionWrap.replaceChildren(btn);
    }
  }

  // Load real state.
  statusWrap.replaceChildren(spinner('Checking…'));
  ha.getState(entity)
    .then((st) => renderTaken(st && st.state === 'on'))
    .catch((e) => {
      statusWrap.replaceChildren(banner(e.message || ha.friendly()));
      // Still offer the button so the elder can try to mark it.
      const btn = el('button.action', { type: 'button' }, ['I TOOK IT ✓']);
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = 'Saving…';
        try { await ha.callService(domain, 'turn_on', { entity_id: entity }); renderTaken(true); }
        catch (err) { btn.disabled = false; btn.textContent = 'I TOOK IT ✓'; statusWrap.replaceChildren(banner(err.message || ha.friendly())); }
      });
      actionWrap.replaceChildren(btn);
    });

  return view;
}
