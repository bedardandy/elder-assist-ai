/* ha.js — a tiny Home Assistant REST client.
 *
 * Every method throws a HaError with a *friendly* message on failure; pages
 * catch it and show the banner. We never surface raw stack traces to the elder.
 */

export class HaError extends Error {
  constructor(message, { kind = 'network', cause } = {}) {
    super(message);
    this.name = 'HaError';
    this.kind = kind;        // 'network' | 'auth' | 'notfound' | 'server' | 'config'
    this.cause = cause;
  }
}

export class HaClient {
  /** @param {{haBaseUrl:string, haToken:string, haTimeoutMs?:number, caregiver?:{name?:string}}} config */
  constructor(config) {
    this.base = (config.haBaseUrl || '').replace(/\/+$/, '');
    this.token = config.haToken || '';
    this.timeout = config.haTimeoutMs || 8000;
    this.caregiver = (config.caregiver && config.caregiver.name) || 'your caregiver';
  }

  get configured() {
    return Boolean(this.base && this.token && this.token !== 'PASTE_A_RESTRICTED_USER_LONG_LIVED_TOKEN_HERE');
  }

  /** A plain, reassuring message for the elder. */
  friendly() {
    return `Can't reach the house computer right now — ask ${this.caregiver} for help.`;
  }

  async _fetch(path, { method = 'GET', body, returnResponse = false } = {}) {
    if (!this.configured) throw new HaError('Home Assistant isn’t set up yet.', { kind: 'config' });

    const url = this.base + path + (returnResponse ? (path.includes('?') ? '&' : '?') + 'return_response' : '');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeout);
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...(body != null ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body != null ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
        cache: 'no-store',
        mode: 'cors',
      });
    } catch (e) {
      clearTimeout(timer);
      throw new HaError(this.friendly(), { kind: 'network', cause: e });
    }
    clearTimeout(timer);

    if (res.status === 401 || res.status === 403) {
      throw new HaError(`This tablet needs a new access code — ask ${this.caregiver}.`, { kind: 'auth' });
    }
    if (res.status === 404) {
      throw new HaError(this.friendly(), { kind: 'notfound' });
    }
    if (!res.ok) {
      throw new HaError(this.friendly(), { kind: 'server' });
    }
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
  }

  /** GET the full state object for one entity. */
  getState(entityId) {
    return this._fetch(`/api/states/${encodeURIComponent(entityId)}`);
  }

  /** Call a service, e.g. callService('input_boolean','turn_on',{entity_id}). */
  callService(domain, service, data = {}, { returnResponse = false } = {}) {
    return this._fetch(`/api/services/${domain}/${service}`, { method: 'POST', body: data, returnResponse });
  }

  /** GET calendar events between two Date/ISO bounds. */
  getCalendar(entityId, start, end) {
    const s = start instanceof Date ? start.toISOString() : start;
    const e = end instanceof Date ? end.toISOString() : end;
    return this._fetch(`/api/calendars/${encodeURIComponent(entityId)}?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`);
  }

  /** Read a to-do list via the todo.get_items response service. */
  async getTodoItems(entityId) {
    // return_response services reply with { service_response: { <entity>: { items:[...] } } }
    const out = await this.callService('todo', 'get_items', { entity_id: entityId }, { returnResponse: true });
    const resp = (out && (out.service_response || out)) || {};
    const forEntity = resp[entityId] || Object.values(resp)[0] || {};
    return Array.isArray(forEntity.items) ? forEntity.items : [];
  }

  /** POST a natural-language question to HA Assist. Returns the spoken reply text. */
  async converse(text, { language = 'en-US', conversationId = null } = {}) {
    const out = await this._fetch('/api/conversation/process', {
      method: 'POST',
      body: { text, language, conversation_id: conversationId },
    });
    const speech = out && out.response && out.response.speech && out.response.speech.plain;
    return {
      text: (speech && speech.speech) || 'I’m not sure how to answer that.',
      conversationId: (out && out.conversation_id) || conversationId,
    };
  }
}
