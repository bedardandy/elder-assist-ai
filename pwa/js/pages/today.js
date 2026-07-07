/* today.js — today's & tomorrow's calendar events + to-do reminders from HA. */

import { el, pageShell, note, banner, spinner } from '../ui.js';

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function eventStart(ev) {
  const s = ev.start || {};
  if (typeof s === 'string') return { date: new Date(s), allDay: false };
  if (s.dateTime) return { date: new Date(s.dateTime), allDay: false };
  if (s.date) return { date: new Date(s.date + 'T00:00:00'), allDay: true };
  return { date: new Date(ev.start_time || Date.now()), allDay: false };
}

function timeLabel(info) {
  if (info.allDay) return 'All day';
  return info.date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function eventList(events) {
  const list = el('ul.big-list');
  for (const ev of events) {
    const info = eventStart(ev);
    list.append(el('li', {}, [
      el('span.when', {}, timeLabel(info)),
      el('span.what', {}, ev.summary || ev.message || 'Event'),
    ]));
  }
  return list;
}

export default function mountToday(ctx) {
  const { config, ha } = ctx;
  const cfg = config.today || {};
  const view = pageShell('Today');
  const body = view._body;

  if (!ha.configured || (!(cfg.calendars && cfg.calendars.length) && !cfg.todoEntity)) {
    body.append(note('Your calendar isn’t connected yet. A caregiver can set it up in config.js.'));
    return view;
  }

  body.append(spinner('Looking at your day…'));

  const now = new Date();
  const start = startOfDay(now);
  const end = addDays(start, 2);           // through end of tomorrow
  const todayEnd = addDays(start, 1);

  const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];

  async function load() {
    const errors = [];
    let events = [];
    for (const cal of calendars) {
      try {
        const evs = await ha.getCalendar(cal, start, end);
        if (Array.isArray(evs)) events = events.concat(evs);
      } catch (e) {
        errors.push(cal);
      }
    }
    events.sort((a, b) => eventStart(a).date - eventStart(b).date);
    const todays = events.filter((e) => eventStart(e).date < todayEnd);
    const tomorrows = events.filter((e) => eventStart(e).date >= todayEnd);

    body.replaceChildren();

    if (errors.length && errors.length === calendars.length) {
      body.append(banner(ha.friendly()));
    }

    body.append(el('h2.section-title', {}, 'Today'));
    body.append(todays.length ? eventList(todays) : note('Nothing on the calendar today.'));

    body.append(el('h2.section-title', {}, 'Tomorrow'));
    body.append(tomorrows.length ? eventList(tomorrows) : note('Nothing on the calendar tomorrow.'));

    // Reminders (to-do list) — best-effort; falls back gracefully.
    if (cfg.todoEntity) {
      body.append(el('h2.section-title', {}, 'Reminders'));
      const holder = el('div', {}, [spinner('Checking reminders…')]);
      body.append(holder);
      try {
        const items = await ha.getTodoItems(cfg.todoEntity);
        const open = items.filter((it) => it.status !== 'completed');
        if (!open.length) {
          holder.replaceChildren(note('No reminders right now.'));
        } else {
          const list = el('ul.big-list');
          for (const it of open) {
            list.append(el('li', {}, [
              el('span.when', {}, '•'),
              el('span.what', {}, it.summary || it.name || 'Reminder'),
            ]));
          }
          holder.replaceChildren(list);
        }
      } catch (e) {
        holder.replaceChildren(note('Reminders aren’t available right now — the calendar above is up to date.'));
      }
    }
  }

  load();
  return view;
}
