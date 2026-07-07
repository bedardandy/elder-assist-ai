/* things.js — search HomeBox for household items, or deep-link to the app. */

import { el, pageShell, note, banner, spinner } from '../ui.js';

export default function mountThings(ctx) {
  const { config, homebox } = ctx;
  const view = pageShell('My Things');
  const body = view._body;

  // Deep-link mode: HomeBox not configured for direct search.
  if (!homebox.configured) {
    const webUrl = (config.homebox && config.homebox.webUrl) || '';
    if (webUrl) {
      body.append(note('Open your household inventory to look things up.'));
      body.append(el('a.action', { href: webUrl, target: '_blank', rel: 'noopener', style: 'margin-top:1rem' }, ['🔍 Open My Things']));
    } else {
      body.append(note('The household inventory isn’t set up yet. A caregiver can add it in config.js.'));
    }
    return view;
  }

  const input = el('input', { type: 'search', 'aria-label': 'Search your things', placeholder: 'Search, e.g. “fridge”', autocomplete: 'off' });
  const searchBtn = el('button.send', { type: 'button' }, 'Search');
  const results = el('div', {}, [note('Type what you’re looking for and tap Search.')]);

  async function run() {
    const q = input.value.trim();
    if (!q) return;
    results.replaceChildren(spinner('Searching…'));
    try {
      const items = await homebox.search(q);
      if (!items.length) {
        results.replaceChildren(note(`Nothing found for “${q}”.`));
        return;
      }
      const grid = el('div.card-grid');
      for (const it of items) {
        const lines = [el('span.card-name', {}, it.name)];
        if (it.location) lines.push(el('span.card-sub', {}, '📍 ' + it.location));
        if (it.serial) lines.push(el('span.card-sub', {}, 'Serial: ' + it.serial));
        if (it.description && !it.serial) lines.push(el('span.card-sub', {}, it.description));
        grid.append(el('div.card', { style: 'cursor:default' }, [
          el('span', { 'aria-hidden': 'true', style: 'font-size:2.6rem' }, '📦'),
          el('div.card-text', {}, lines),
        ]));
      }
      results.replaceChildren(grid);
    } catch (e) {
      results.replaceChildren(banner('Can’t search your things right now — please try again in a moment.'));
    }
  }

  searchBtn.addEventListener('click', run);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });

  body.append(el('div.search-row', {}, [input, searchBtn]));
  body.append(results);
  return view;
}
