/* homebox.js — minimal HomeBox item search client.
 * HomeBox exposes GET /api/v1/items?q=<query> with a bearer token.
 * Returns a normalized array of { name, location, description, serial }.
 */

export class HomeBoxError extends Error {
  constructor(message) { super(message); this.name = 'HomeBoxError'; }
}

export class HomeBoxClient {
  constructor(cfg = {}) {
    this.base = (cfg.baseUrl || '').replace(/\/+$/, '');
    this.token = cfg.token || '';
    this.timeout = 8000;
  }

  get configured() { return Boolean(this.base && this.token); }

  async search(query) {
    if (!this.configured) throw new HomeBoxError('HomeBox is not set up.');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeout);
    let res;
    try {
      res = await fetch(`${this.base}/api/v1/items?q=${encodeURIComponent(query)}&pageSize=25`, {
        headers: { 'Authorization': `Bearer ${this.token}` },
        signal: ctrl.signal,
        cache: 'no-store',
        mode: 'cors',
      });
    } catch (e) {
      clearTimeout(timer);
      throw new HomeBoxError('network');
    }
    clearTimeout(timer);
    if (!res.ok) throw new HomeBoxError('http ' + res.status);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items || []);
    return items.map((it) => ({
      name: it.name || 'Untitled',
      location: (it.location && it.location.name) || '',
      description: it.description || '',
      serial: it.serialNumber || it.serial || (it.fields && it.fields.serialNumber) || '',
    }));
  }
}
