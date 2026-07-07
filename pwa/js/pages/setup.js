/* setup.js — shown when config.js is missing. Calm, caregiver-facing, never
 * an error. The elder should never see this in normal use. */

import { el } from '../ui.js';

export function renderSetup() {
  return el('div.setup', {}, [
    el('div.setup-card', {}, [
      el('span.big-emoji', { 'aria-hidden': 'true' }, '🛠️'),
      el('h1', {}, 'This tablet isn’t set up yet'),
      el('p', {}, 'If you are the caregiver, a few quick steps will get it ready. If you are not, please hand this tablet to the person who set it up.'),
      el('ol', {}, [
        el('li', { html: 'Copy the template: <code>cp config.example.js config.js</code> in the <code>pwa/</code> folder.' }),
        el('li', { html: 'Open <code>config.js</code> and fill in the elder’s name, your Home Assistant address, and a <strong>restricted-user</strong> long-lived access token.' }),
        el('li', { html: 'Add the family contacts, medication schedule, TV buttons, and HomeBox details you want to use.' }),
        el('li', { html: 'Make sure Home Assistant allows this app’s address under <code>http: cors_allowed_origins</code> (see <code>pwa/README.md</code>).' }),
        el('li', { html: 'Reload this page.' }),
      ]),
      el('p', { html: 'Full instructions, security notes, and an install guide are in <code>pwa/README.md</code>.' }),
    ]),
  ]);
}

export default renderSetup;
