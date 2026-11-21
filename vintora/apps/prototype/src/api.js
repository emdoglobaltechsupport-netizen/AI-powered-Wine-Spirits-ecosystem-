/* =========================================================
   VINTORA storefront — API client.
   Same-origin by default so the API can serve the UI directly.
   Every call degrades gracefully when the API is not running:
   the prototype then uses its bundled reference catalogue.
   ========================================================= */

const BASE = '/v1';

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      detail = body.message || body.error || detail;
    } catch { /* non-JSON error */ }
    throw new Error(detail);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  /** Catalogue is the first DB-backed read used by the storefront. */
  async getProducts() {
    const data = await request('/products?limit=100');
    if (!Array.isArray(data.items) || !data.items.length) throw new Error('empty catalogue');
    return data.items;
  },

  async getProduct(id) {
    return request(`/products/${encodeURIComponent(id)}`);
  },

  async getReference() {
    return request('/reference');
  },

  async verifyAge(dateOfBirth, country) {
    return request('/age/verify', {
      method: 'POST',
      body: JSON.stringify({ dateOfBirth, country }),
    });
  },

  async getAgeStatus() {
    return request('/age/status');
  },

  /** Best-effort cart sync; local state remains authoritative in prototype mode. */
  async syncCart(items) {
    const lines = Array.isArray(items) ? items : [items];
    for (const line of lines) {
      await request('/cart/items', {
        method: 'POST',
        body: JSON.stringify(line),
      });
    }
  },

  async checkoutQuote(currency) {
    return request('/checkout/quote', {
      method: 'POST',
      body: JSON.stringify({ currency }),
    });
  },

  async createOrder(currency, idempotencyKey) {
    return request('/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({ currency, idempotencyKey }),
    });
  },

  /** Admin is authenticated; a 401/403 simply leaves the local simulation in place. */
  async admin(section) {
    return request(`/admin/${encodeURIComponent(section)}`);
  },

  /** Counts only — no PII. The console labels every count as seeded demo data. */
  async adminCoverage() {
    return request('/admin/coverage');
  },
};

export default api;
