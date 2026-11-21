/* Generated from the original zero-dependency app.js — modular ES build. */
import { state, D, MIN_AGE, $, $$, t, esc, save, load, toast, useProducts, getProduct } from './core.js';
import api from './api.js';
import { viewHome, viewSearch, viewProduct } from './views/catalog.js';
import { viewSommelier, sendChat } from './views/sommelier.js';
import { viewCart } from './views/checkout.js';
import { viewClub, viewVault } from './views/membership.js';
import { viewTrade } from './views/trade.js';
import { viewSeller, viewRewards, viewStudio } from './views/platform.js';
import { viewAssist, sendAssist, viewFlow, viewConfirmation } from './views/assistant.js';
import { viewAdmin, adminState, adminFmt, adminApplyFilters, adminCommandHTML, adminHandle, adminPersist } from './views/admin.js';


  setInterval(function () {
    if (state.view !== 'admin' || !adminState.elevated || adminState.seconds <= 0) return;
    adminState.seconds--;
    $$('#admin-timer, #admin-timer-elevated').forEach(function (el) {
      el.textContent = adminFmt(Math.max(0, adminState.seconds));
    });
    if (adminState.seconds <= 0) {
      adminState.elevated = false;
      adminState.breakGlass = false;
      render();
    }
  }, 1000);

  document.addEventListener('keydown', function (ev) {
    if (state.view !== 'admin') return;
    if ((ev.metaKey || ev.ctrlKey) && String(ev.key).toLowerCase() === 'k') {
      ev.preventDefault();
      var host = document.getElementById('admin-command-host');
      if (host) { host.innerHTML = adminCommandHTML(); var input = document.getElementById('admin-command-input'); if (input) input.focus(); }
    }
    if (ev.key === 'Escape') {
      var h = document.getElementById('admin-command-host');
      if (h && h.innerHTML) h.innerHTML = '';
    }
  });

  /* ---------------- routing & rendering ---------------- */

  var VIEWS = {
    home: viewHome, search: viewSearch, product: viewProduct, sommelier: viewSommelier,
    cart: viewCart, club: viewClub, vault: viewVault, trade: viewTrade,
    seller: viewSeller, rewards: viewRewards, studio: viewStudio,
    assist: viewAssist, flow: viewFlow, confirmation: viewConfirmation,
    admin: viewAdmin
  };

  function navigate(view) {
    if (view === 'confirmation' && !state.ageVerified) { render(); return; }
    state.view = view;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function applyI18n() {
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    document.documentElement.lang = state.lang;
    document.documentElement.setAttribute('data-theme', state.theme);
    $$('.desktop-nav button, .mobile-tabs button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === state.view);
    });
    var count = Object.keys(state.cart).reduce(function (a, id) { return a + state.cart[id]; }, 0);
    var badge = $('#cart-count');
    if (badge) { badge.textContent = count; badge.hidden = count === 0; }
  }

  function render() {
    var fn = VIEWS[state.view] || viewHome;
    $('#view').innerHTML = fn();
    applyI18n();
    if (state.view === 'admin') adminApplyFilters();
  }

  function startApp() {
    $('#age-gate').hidden = true;
    $('#topbar').hidden = false;
    $('#mobile-tabs').hidden = false;
    $('#site-footer').hidden = false;
    render();
  }

  /* ---------------- age gate ---------------- */

  function initAgeGate() {
    var gate = $('#age-gate');
    if (state.ageVerified) { startApp(); return; }
    gate.hidden = false;
    $('#age-enter').addEventListener('click', function () {
      var dob = $('#age-dob').value;
      var country = $('#age-country').value;
      var err = $('#age-error');
      if (!dob || !country) {
        err.textContent = t('validationError'); err.hidden = false; return;
      }
      var born = new Date(dob + 'T00:00:00');
      if (isNaN(born.getTime()) || born > new Date()) {
        err.textContent = t('validationError'); err.hidden = false; return;
      }
      var now = new Date();
      var age = now.getFullYear() - born.getFullYear();
      if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--;
      var min = MIN_AGE[country] || 18;
      if (age < min) { err.textContent = t('tooYoung'); err.hidden = false; return; }
      state.ageVerified = true;
      save();
      // Best-effort DB assertion (ADR-008). Local gate remains authoritative offline.
      api.verifyAge(dob, country).catch(function () { /* API unavailable — local verification stands */ });
      startApp();
    });
  }

  /* ---------------- events ---------------- */

  function addToCart(id) {
    if (!getProduct(id)) return;
    state.cart[id] = (state.cart[id] || 0) + 1;
    save();
    applyI18n();
    toast('✓ ' + t('added'));
    if (state.apiMode === 'api') {
      api.syncCart([{ productId: id, quantity: state.cart[id] }]).catch(function () { /* session optional */ });
    }
  }

  function generateStudio() {
    var p = getProduct($('#studio-product').value);
    var channel = $('#studio-channel').value;
    var audience = $('#studio-audience').value;
    var headline = p.name + ' — ' + p.notes[0].toLowerCase() + ' for the curious.';
    state.studioOutput = {
      channel: channel,
      headline: headline,
      alt: 'A bottle worth slowing down for: ' + p.name,
      cta: 'Discover ' + p.name,
      body: 'For ' + audience.toLowerCase() + ', ' + p.name + ' opens with ' + p.notes.slice(0, 2).join(' and ').toLowerCase() +
        '. ' + p.region + ', provenance ' + p.provenance + '/100, verified custody. Enjoy responsibly.'
    };
    render();
    toast('✧ Campaign generated and compliance-checked');
  }

  function initEvents() {
    document.addEventListener('click', function (ev) {
      var el;

      if ((el = ev.target.closest('[data-add]'))) {
        ev.stopPropagation(); addToCart(el.getAttribute('data-add')); return;
      }
      if ((el = ev.target.closest('[data-product]'))) {
        state.currentProduct = el.getAttribute('data-product'); navigate('product'); return;
      }
      if ((el = ev.target.closest('[data-view]'))) { navigate(el.getAttribute('data-view')); return; }
      if ((el = ev.target.closest('[data-occasion]'))) { sendChat(el.getAttribute('data-occasion')); return; }
      if ((el = ev.target.closest('[data-suggest]'))) { sendChat(el.getAttribute('data-suggest')); return; }
      if ((el = ev.target.closest('[data-ask]'))) { sendChat('Tell me about ' + el.getAttribute('data-ask')); return; }
      if ((el = ev.target.closest('[data-assist]'))) { sendAssist(el.getAttribute('data-assist')); return; }
      if ((el = ev.target.closest('[data-admin-tab]'))) { adminHandle('goto', el.getAttribute('data-admin-tab')); return; }
      if ((el = ev.target.closest('[data-command-action]'))) {
        var cmd = el.getAttribute('data-command-action');
        if (cmd === 'goto') { adminHandle('goto', el.getAttribute('data-id')); var host = document.getElementById('admin-command-host'); if (host) host.innerHTML = ''; }
        else adminHandle(el.getAttribute('data-id'), 'palette');
        return;
      }
      if ((el = ev.target.closest('[data-admin-action]'))) { adminHandle(el.getAttribute('data-admin-action'), el.getAttribute('data-id')); return; }
      if (ev.target.id === 'admin-command') { adminHandle('close-command', 'palette'); return; }
      if ((el = ev.target.closest('[data-trade-tab]'))) { state.tradeTab = el.getAttribute('data-trade-tab'); render(); return; }
      if ((el = ev.target.closest('[data-rfq]'))) { state.selectedRfq = el.getAttribute('data-rfq'); render(); return; }
      if ((el = ev.target.closest('[data-supplier-filter]'))) { state.supplierFilter = el.getAttribute('data-supplier-filter'); render(); return; }
      if ((el = ev.target.closest('[data-award]'))) {
        state.awardedQuote = el.getAttribute('data-award');
        state.createdPo = 'PO-' + (7830 + Math.floor(Math.random() * 100));
        render();
        toast('✓ Quote awarded — purchase order generated');
        return;
      }
      if ((el = ev.target.closest('[data-filter]'))) { state.filter = el.getAttribute('data-filter'); render(); return; }
      if ((el = ev.target.closest('[data-tier]'))) {
        state.clubTier = el.getAttribute('data-tier'); save(); render();
        toast('✓ ' + state.clubTier + ' tier selected'); return;
      }
      if ((el = ev.target.closest('[data-remove]'))) {
        delete state.cart[el.getAttribute('data-remove')]; save(); render(); return;
      }
      if ((el = ev.target.closest('[data-qty]'))) {
        var id = el.getAttribute('data-id');
        var delta = parseInt(el.getAttribute('data-qty'), 10);
        state.cart[id] = (state.cart[id] || 0) + delta;
        if (state.cart[id] <= 0) delete state.cart[id];
        save(); render(); return;
      }
      if (ev.target.closest('#checkout-btn')) {
        if (state.apiMode === 'api' && state.ageVerified) {
          api.createOrder(state.currency, crypto.randomUUID()).catch(function () { /* offline prototype order */ });
        }
        state.cart = {}; save(); navigate('confirmation'); return;
      }
      if (ev.target.closest('#studio-generate')) { generateStudio(); return; }
      if (ev.target.closest('#listing-generate')) {
        var text = $('#listing-input').value || 'Single-vineyard Etna Rosso 2021.';
        $('#listing-output').innerHTML = '<div class="card" style="background:var(--surface-2)"><strong>AI draft · awaiting approval</strong>' +
          '<p style="font-size:12px">' + esc(text) + '</p>' +
          '<div class="checklist"><div class="ok">✓ Label scan matched to canonical SKU</div>' +
          '<div class="ok">✓ Tasting fingerprint suggested</div><div class="ok">✓ Alcohol-policy copy check passed</div></div>' +
          '<button class="btn btn-primary btn-sm" style="margin-top:10px">Approve &amp; publish</button></div>';
        toast('✧ Listing draft ready for review'); return;
      }
    });

    document.addEventListener('submit', function (ev) {
      if (ev.target.id === 'chat-form') {
        ev.preventDefault();
        var input = $('#chat-input');
        sendChat(input.value);
        return;
      }
      if (ev.target.id === 'assist-form') {
        ev.preventDefault();
        var assistInput = $('#assist-input');
        sendAssist(assistInput.value);
        return;
      }
      if (ev.target.id === 'rfq-form') {
        ev.preventDefault();
        state.rfqSent = true;
        render();
        toast('✓ RFQ published to verified suppliers');
        return;
      }
    });

    $('#lang-select').addEventListener('change', function (e) { state.lang = e.target.value; save(); render(); });
    $('#currency-select').addEventListener('change', function (e) { state.currency = e.target.value; save(); render(); toast('FX rate locked at ' + state.currency); });
    $('#theme-toggle').addEventListener('click', function () { state.theme = state.theme === 'dark' ? 'light' : 'dark'; save(); applyI18n(); });

    var searchTimer;
    $('#global-search').addEventListener('input', function (e) {
      clearTimeout(searchTimer);
      var val = e.target.value;
      searchTimer = setTimeout(function () {
        state.search = val;
        if (state.view !== 'search' && val) navigate('search'); else render();
      }, 180);
    });

    document.addEventListener('input', function (ev) {
      if (!ev.target) return;
      if (ev.target.id === 'admin-command-input') {
        var needle = (ev.target.value || '').toLowerCase();
        $$('#admin-command [data-command-action]').forEach(function (button) {
          button.hidden = needle ? (button.textContent || '').toLowerCase().indexOf(needle) < 0 : false;
        });
        return;
      }
      if (ev.target.id !== 'admin-search') return;
      adminState.query = ev.target.value;
      adminPersist();
      adminApplyFilters();
    });
    document.addEventListener('change', function (ev) {
      if (!ev.target) return;
      if (ev.target.id === 'admin-severity') { adminState.severity = ev.target.value; adminApplyFilters(); }
      if (ev.target.id === 'admin-status') { adminState.status = ev.target.value; adminApplyFilters(); }
      if (ev.target.id === 'admin-market') { adminState.market = ev.target.value; adminApplyFilters(); }
      if (ev.target.id === 'admin-approver') { adminState.approver = ev.target.value; adminPersist(); }
      if (ev.target.id === 'admin-range') { adminState.range = ev.target.value; adminPersist(); render(); }
      if (ev.target.id === 'admin-saved-view') { adminState.savedView = ev.target.value; adminPersist(); adminApplyFilters(); }
      if (ev.target.hasAttribute && ev.target.hasAttribute('data-admin-select-all')) {
        $$('[data-admin-row]').forEach(function (row) {
          if (row.hidden) return;
          var box = row.querySelector('[data-admin-select]');
          if (box) box.checked = ev.target.checked;
        });
      }
      if (ev.target.hasAttribute && (ev.target.hasAttribute('data-admin-select') || ev.target.hasAttribute('data-admin-select-all'))) {
        adminState.bulk = $$('[data-admin-select]:checked').map(function (box) { return box.getAttribute('value'); });
        var count = document.querySelector('[data-admin-bulk-count]');
        if (count) count.textContent = adminState.bulk.length + ' selected';
        adminPersist();
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && state.view === 'admin') {
        adminHandle('close-detail', 'drawer');
        var palette = document.getElementById('admin-command-host');
        if (palette) palette.innerHTML = '';
      }
      if (ev.key === 'Enter' && ev.target.classList && ev.target.classList.contains('product-card')) {
        state.currentProduct = ev.target.getAttribute('data-product'); navigate('product');
      }
      if (ev.key === 'Escape' && state.view === 'product') navigate('search');
    });
  }

  /* ---------------- boot ---------------- */

  function hydrateCatalogue() {
    api.getProducts()
      .then(function (items) {
        if (useProducts(items) && state.view !== 'admin') render();
        return api.adminCoverage().catch(function () { return null; });
      })
      .then(function (coverage) {
        if (!coverage || !Array.isArray(coverage.modules)) return;
        adminState.coverage = coverage;
        if (state.view === 'admin') render();
      })
      .catch(function () { /* bundled catalogue remains the offline fallback */ });
  }

  function boot() {
    load();
    $('#currency-select').innerHTML = Object.keys(D.currencies).map(function (code) {
      return '<option value="' + code + '">' + code + '</option>';
    }).join('');
    $('#currency-select').value = state.currency;
    $('#lang-select').value = state.lang;
    document.documentElement.setAttribute('data-theme', state.theme);
    initEvents();
    hydrateCatalogue();
    var deep = (window.location.hash || '').replace(/^#/, '');
    var match = window.location.search.match(/[?&]view=([^&]+)/);
    if (!deep && match) deep = decodeURIComponent(match[1]);
    if (deep === 'admin') { state.view = 'admin'; startApp(); return; }
    initAgeGate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  export { render, navigate };
