/* home.js — the six enormous buttons. No scrolling, fills the viewport. */

import { el } from '../ui.js';

const BUTTONS = [
  { path: '/call',     cls: 'call',   icon: '📞', label: 'Call Family' },
  { path: '/medicine', cls: 'med',    icon: '💊', label: 'My Medicine' },
  { path: '/today',    cls: 'today',  icon: '📅', label: 'Today' },
  { path: '/help',     cls: 'ask',    icon: '🙋', label: 'Get Help' },
  { path: '/tv',       cls: 'tv',     icon: '📺', label: 'TV' },
  { path: '/things',   cls: 'things', icon: '🔍', label: 'Find My Things' },
];

export default function mountHome() {
  const grid = el('div.home-grid');
  for (const b of BUTTONS) {
    grid.append(
      el('a.btn.' + b.cls, { href: '#' + b.path, role: 'button', 'aria-label': b.label }, [
        el('span.icon', { 'aria-hidden': 'true' }, b.icon),
        el('span.label', {}, b.label),
      ])
    );
  }
  return el('div.view.home', {}, [grid]);
}
