/* =========================================================
   VINTORA storefront — shared core.
   State, i18n, formatting and reusable presentation helpers.
   ========================================================= */

import D from '../data.js';

export { D };

export var MIN_AGE = { US: 21, AE: 21, JP: 20, SG: 18, GB: 18, FR: 18, DE: 18, IT: 18, ES: 18, NL: 18, AU: 18, BR: 18, CA: 19, ZA: 18 };

export var state = {
  view: 'home',
  lang: 'en',
  currency: 'USD',
  theme: 'light',
  cart: {},
  ageVerified: false,
  chat: [],
  search: '',
  filter: 'All',
  currentProduct: null,
  clubTier: 'Better',
  studioOutput: null,
  rfqSent: false,
  assist: [],
  tradeTab: 'overview',
  selectedRfq: 'RFQ-2041',
  awardedQuote: null,
  supplierFilter: 'All',
  createdPo: null,
  // Catalogue is hydrated from the API at boot; bundled data is the offline fallback.
  products: D.products.slice(),
  apiMode: 'fallback',
};

export function useProducts(products) {
  if (!Array.isArray(products) || !products.length) return false;
  state.products = products;
  state.apiMode = 'api';
  return true;
}

export var $ = function (sel, root) { return (root || document).querySelector(sel); };
export var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

export function t(key) {
  var dict = D.locales[state.lang] || D.locales.en;
  return dict[key] || D.locales.en[key] || key;
}

export function money(usd) {
  var c = D.currencies[state.currency];
  var v = usd * c.rate;
  var digits = c.rate >= 100 ? 0 : 2;
  return c.symbol + v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function getProduct(id) {
  for (var i = 0; i < state.products.length; i++) if (state.products[i].id === id) return state.products[i];
  return null;
}

export function save() {
  try {
    localStorage.setItem('vintora.prototype', JSON.stringify({
      lang: state.lang, currency: state.currency, theme: state.theme,
      cart: state.cart, ageVerified: state.ageVerified, clubTier: state.clubTier
    }));
  } catch (e) { /* storage unavailable — prototype still works */ }
}

export function load() {
  try {
    var raw = localStorage.getItem('vintora.prototype');
    if (!raw) return;
    var s = JSON.parse(raw);
    state.lang = s.lang || state.lang;
    state.currency = s.currency || state.currency;
    state.theme = s.theme || state.theme;
    state.cart = s.cart || state.cart;
    state.ageVerified = !!s.ageVerified;
    state.clubTier = s.clubTier || state.clubTier;
  } catch (e) { /* ignore corrupt state */ }
}

export function toast(msg) {
  var el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { el.hidden = true; }, 2600);
}

/* ---------------- shared components ---------------- */

export function bottleHTML(p) {
  var nm = p.name.length > 17 ? p.name.slice(0, 16) + '…' : p.name;
  return '<div class="bottle" style="--liquid:' + esc(p.liquid) + '" aria-hidden="true">' +
    '<span class="bottle-foil"></span>' +
    '<span class="bottle-label"><strong>' + esc(nm) + '</strong><small>' + (p.vintage || 'SPIRIT') + '</small></span>' +
    '</div>';
}

export function catalogueBadge(p) {
  var sourceClass = p.sourceClass || 'seed';
  var freshness = p.freshnessAsOf || 'prototype snapshot — no live feed';
  return '<p class="fine-print" style="margin:8px 0 0">' +
    'Seed demo record · ' + esc(sourceClass) + ' source · ' + esc(freshness) +
    ' · not licensed or verified · not purchasable</p>';
}

export function productCard(p) {
  return '<article class="product-card" data-product="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(p.name) + '">' +
    '<div class="product-art">' +
      '<div class="badge-row"><span class="pill gold">✓ Provenance ' + p.provenance + '</span>' + (p.stock < 15 ? '<span class="pill red">Rare</span>' : '') + '</div>' +
      bottleHTML(p) +
    '</div>' +
    '<div class="product-body">' +
      '<div><h3 class="product-title">' + esc(p.name) + '</h3><div class="product-sub">' + esc(p.region) + ' · ' + (p.vintage || 'NAS') + '</div></div>' +
      '<div class="row"><span class="stars">★★★★★</span><span class="product-sub">' + p.rating + ' (' + p.reviews.toLocaleString() + ')</span></div>' +
      '<div class="notes">' + p.notes.slice(0, 3).map(function (n) { return '<span class="pill">' + esc(n) + '</span>'; }).join('') + '</div>' +
      '<div class="product-bottom"><span class="price">' + money(p.price) + '</span>' +
        '<button class="btn btn-primary btn-sm" data-add="' + p.id + '" title="Prototype simulation only — seed rows are not purchasable">' + t('addToCart') + '</button></div>' +
      catalogueBadge(p) +
    '</div></article>';
}

export function sectionHead(title, sub, actionLabel, actionView) {
  return '<div class="section-head"><div><h2>' + title + '</h2><p>' + sub + '</p></div>' +
    (actionLabel ? '<button class="link-btn" data-view="' + actionView + '">' + actionLabel + ' →</button>' : '') + '</div>';
}
