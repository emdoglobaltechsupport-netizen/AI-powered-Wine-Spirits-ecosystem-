/* =========================================================
   VINTORA prototype — built-in self-test.
   Add ?selftest=1 to the URL to run the browser checks. The
   generated total lives in selftest-manifest.js; do not edit
   a count by hand. Zero dependencies. Does not modify source.
   ========================================================= */
(function () {
  'use strict';

  if (!/([?&])selftest=1(?:&|$)/.test(window.location.search)) return;

  var results = [];
  var manifest = window.VINTORA_SELFTEST_MANIFEST || null;

  function check(name, fn) {
    try {
      var value = fn();
      results.push({ name: name, pass: value === true, detail: value === true ? '' : String(value) });
    } catch (e) {
      results.push({ name: name, pass: false, detail: e && e.message ? e.message : String(e) });
    }
  }

  function skip(name, reason) {
    results.push({ name: name, skipped: true, detail: reason || 'not applicable in this environment' });
  }

  function text(sel) {
    var el = document.querySelector(sel);
    return el ? (el.textContent || '').trim() : '';
  }

  function click(sel) {
    var el = document.querySelector(sel);
    if (!el) throw new Error('missing element: ' + sel);
    el.click();
  }

  function nav(view) {
    click('.desktop-nav [data-view="' + view + '"]');
  }

  function setSelect(sel, value) {
    var el = document.querySelector(sel);
    if (!el) throw new Error('missing select: ' + sel);
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function run() {
    var D = window.VINTORA_DATA;

    // Reset persisted state and reload once so the age gate starts from a known point.
    try {
      if (!sessionStorage.getItem('vintora.selftest.reloaded')) {
        sessionStorage.setItem('vintora.selftest.reloaded', '1');
        localStorage.removeItem('vintora.prototype');
        localStorage.removeItem('vintora.admin.prototype');
        location.reload();
        return;
      }
    } catch (e) { /* storage unavailable — continue with current state */ }

    // @selftest-section: Data and i18n
    check('prototype data loads', function () { return !!D; });
    check('12 canonical demo products', function () { return D && D.products.length === 12 || 'count=' + (D && D.products.length); });
    check('product ids are unique', function () {
      var seen = {};
      for (var i = 0; i < D.products.length; i++) {
        if (seen[D.products[i].id]) return 'duplicate ' + D.products[i].id;
        seen[D.products[i].id] = true;
      }
      return true;
    });
    check('every product has a complete shape', function () {
      var required = ['id', 'name', 'producer', 'region', 'appellation', 'type', 'price', 'rating', 'reviews', 'stock', 'provenance', 'liquid', 'palate', 'notes', 'pairings', 'story', 'custody'];
      for (var i = 0; i < D.products.length; i++) {
        for (var j = 0; j < required.length; j++) {
          if (D.products[i][required[j]] === undefined) return D.products[i].id + ' missing ' + required[j];
        }
      }
      return true;
    });
    check('every product has isolated catalogue provenance', function () {
      for (var i = 0; i < D.products.length; i++) {
        var p = D.products[i];
        if (p.sourceClass !== 'seed' || p.dataClass !== 'demo' || p.fixtureClass !== 'demo' || p.purchasable !== false ||
            !p.sourceRef || !p.freshnessAsOf || p.verifiedAt !== null) {
          return p.id + ' has incomplete or purchasable seed metadata';
        }
      }
      return D.catalogueSource && D.catalogueSource.sourceClass === 'seed' && D.catalogueSource.purchasable === false || 'missing catalogueSource';
    });
    check('8 currencies', function () { return Object.keys(D.currencies).length === 8; });
    check('3 locales', function () { return Object.keys(D.locales).length === 3; });
    check('locale dictionaries have identical keys', function () {
      var langs = Object.keys(D.locales);
      var base = Object.keys(D.locales[langs[0]]).sort().join(',');
      for (var i = 1; i < langs.length; i++) {
        var other = Object.keys(D.locales[langs[i]]).sort().join(',');
        if (other !== base) return langs[i] + ' keys differ from ' + langs[0];
      }
      return true;
    });
    check('no unresolved i18n key placeholders', function () {
      var placeholders = document.querySelectorAll('[data-i18n]');
      for (var i = 0; i < placeholders.length; i++) {
        var key = placeholders[i].getAttribute('data-i18n');
        if (!D.locales.en[key]) return 'missing en key: ' + key;
      }
      return true;
    });

    // @selftest-section: Age gate and navigation
    // Age gate -> app
    var gate = document.getElementById('age-gate');
    check('age gate shown on fresh state', function () { return !gate.hidden; });
    document.getElementById('age-dob').value = '1990-05-15';
    document.getElementById('age-country').value = 'US';
    click('#age-enter');
    check('age gate dismissed after valid DOB', function () { return gate.hidden; });
    check('header revealed', function () { return !document.getElementById('topbar').hidden; });
    check('home hero renders', function () { return /world.s cellar/i.test(text('#view .hero h1')); });

    // @selftest-repeat-start: views
    var views = ['sommelier', 'assist', 'club', 'vault', 'trade', 'flow', 'seller', 'rewards', 'studio', 'home'];
    views.forEach(function (view) {
      check('view renders: ' + view, function () {
        nav(view);
        var el = document.getElementById('view');
        return el && el.innerText.trim().length > 200 || 'view too short';
      });
    });
    // @selftest-repeat-end: views

    // @selftest-section: Product, cart and checkout
    // Product detail
    check('product card navigates to detail', function () {
      nav('home');
      click('[data-product]');
      return /provenance/i.test(text('#view')) && text('#view h1').length > 2;
    });
    check('product detail labels seed source and simulation-only checkout', function () {
      return /Seed demo record/.test(text('#view')) && /not purchasable/.test(text('#view'));
    });

    // Cart + checkout
    check('add to cart updates badge', function () {
      nav('home');
      click('[data-add]');
      return document.getElementById('cart-count').textContent === '1';
    });
    check('cart shows order summary', function () {
      click('.cart-btn');
      return /ORDER SUMMARY/.test(text('#view')) && !!document.getElementById('checkout-btn');
    });
    check('cart labels checkout as simulation only', function () {
      return /Simulation only/.test(text('#view')) && /not purchasable/.test(text('#view'));
    });
    check('checkout shows confirmation', function () {
      click('#checkout-btn');
      return /Order confirmed/.test(text('#view'));
    });

    // @selftest-section: Preferences and FX
    // FX
    check('currency switch recomputes price', function () {
      nav('home');
      var before = text('.product-card .price');
      setSelect('#currency-select', 'JPY');
      var after = text('.product-card .price');
      setSelect('#currency-select', 'USD');
      return before !== after && after.indexOf('¥') === 0 || 'before=' + before + ' after=' + after;
    });

    // i18n
    check('language switch localises header', function () {
      setSelect('#lang-select', 'fr');
      var label = text('.desktop-nav button:first-child');
      setSelect('#lang-select', 'en');
      return label === 'Découvrir' || 'label=' + label;
    });

    // Theme
    check('dark mode toggles', function () {
      var before = document.documentElement.getAttribute('data-theme');
      click('#theme-toggle');
      var after = document.documentElement.getAttribute('data-theme');
      click('#theme-toggle');
      return after !== before || 'before=' + before + ' after=' + after;
    });

    // @selftest-section: Sommelier and Assist
    // Sommelier
    check('sommelier answers spicy-food query', function () {
      nav('sommelier');
      click('[data-suggest="What works with spicy Thai food?"]');
      return /Riesling/i.test(text('#chat-log'));
    });
    check('sommelier answers Rhône query', function () {
      click('[data-suggest="I like Northern Rhône Syrah — what should I try next?"]');
      return /Etna/i.test(text('#chat-log'));
    });
    check('sommelier answers include sources', function () {
      return /Sources:/.test(text('#chat-log'));
    });

    // Assist (cross-module router)
    check('assist routes a delivery request to Flow', function () {
      nav('assist');
      click('[data-assist="Where is my delivery?"]');
      return /Vintora Flow/.test(text('#assist-log')) && /out for delivery/i.test(text('#assist-log'));
    });
    check('assist exposes connected modules', function () {
      return /CONNECTED MODULES/.test(text('#view')) && /Vintora Rewards/.test(text('#view'));
    });
    check('flow shows live shipments', function () {
      nav('flow');
      return /FEATURED SHIPMENT/.test(text('#view')) && /Cold chain/.test(text('#view'));
    });

    // @selftest-section: Studio, Trade, Seller and Flow
    // Studio, Trade, Seller
    check('studio generates a campaign', function () {
      nav('studio');
      click('#studio-generate');
      return /LIVE PREVIEW/.test(text('#view')) && text('.preview-card h3').length > 5;
    });
    check('trade workbench tabs render', function () {
      nav('trade');
      ['rfqs', 'suppliers', 'orders', 'credit', 'overview'].forEach(function (tab) {
        click('[data-trade-tab="' + tab + '"]');
        if (text('#view').length < 200) throw new Error('tab ' + tab + ' too short');
      });
      return true;
    });
    check('supplier directory filters by category', function () {
      nav('trade');
      click('[data-trade-tab="suppliers"]');
      var before = document.querySelectorAll('#view tbody tr').length;
      click('[data-supplier-filter="Spirits"]');
      var after = document.querySelectorAll('#view tbody tr').length;
      return after > 0 && after < before || 'before=' + before + ' after=' + after;
    });
    check('awarding a quote generates a purchase order', function () {
      nav('trade');
      click('[data-trade-tab="rfqs"]');
      click('[data-award="Q-8813"]');
      return /Quote awarded/.test(text('#view')) && /PO-\d+/.test(text('#view'));
    });
    check('trade RFQ publishes', function () {
      nav('trade');
      click('[data-trade-tab="rfqs"]');
      var form = document.getElementById('rfq-form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      return /RFQ published/.test(text('#view'));
    });
    check('seller listing assistant drafts copy', function () {
      nav('seller');
      click('#listing-generate');
      return /awaiting approval/.test(text('#listing-output'));
    });

    // @selftest-section: Prototype safeguards
    check('prototype disclaimer visible', function () {
      return /no real orders/i.test(text('#site-footer'));
    });

    // @selftest-section: Admin and TechOps
    // Admin console — 18 internal operations workspaces.
    nav('admin');
    click('[data-admin-action="reset"]');
    check('admin console renders', function () {
      return /VINTORA ADMIN/.test(text('#view')) && !!document.querySelector('.admin-shell');
    });
    check('admin sidebar has 19 workspaces', function () {
      var count = document.querySelectorAll('[data-admin-tab]').length;
      return count === 19 || 'count=' + count;
    });
    check('admin workspaces are grouped', function () {
      var groups = document.querySelectorAll('.admin-group').length;
      var labels = document.querySelectorAll('.admin-group-label').length;
      return groups === 6 && labels === 6 || 'groups=' + groups + ' labels=' + labels;
    });
    check('all ADM-01 to ADM-19 codes are present', function () {
      var labels = Array.prototype.map.call(document.querySelectorAll('[data-admin-tab]'), function (button) {
        return button.textContent || '';
      }).join(' ');
      for (var i = 1; i <= 19; i++) {
        var code = 'ADM-' + ('0' + i).slice(-2);
        if (labels.indexOf(code) < 0) return 'missing ' + code;
      }
      return true;
    });
    check('all 19 admin workspaces render', function () {
      var ids = ['overview', 'users', 'roles', 'products', 'sellers', 'orders', 'inventory', 'crm',
        'finance', 'marketing', 'loyalty', 'subscriptions', 'logistics', 'compliance', 'support',
        'ai', 'security', 'global', 'techops'];
      for (var i = 0; i < ids.length; i++) {
        click('[data-admin-tab="' + ids[i] + '"]');
        var shell = document.querySelector('[data-admin-module]');
        if (!shell || shell.getAttribute('data-admin-module') !== ids[i]) return 'wrong module: ' + ids[i];
        if ((document.querySelector('#view').innerText || '').trim().length < 200) return 'short module: ' + ids[i];
      }
      return true;
    });
    check('admin workspace titles are named', function () {
      click('[data-admin-tab="ai"]');
      return /AI Operations Center/.test(text('#view')) &&
        /ADM-16 · AI Operations/.test(text('#view'));
    });
    check('admin command palette opens and filters', function () {
      click('[data-admin-action="command"]');
      var palette = document.getElementById('admin-command');
      if (!palette) return 'palette missing';
      var buttons = palette.querySelectorAll('[data-command-action]');
      if (buttons.length < 18) return 'buttons=' + buttons.length;
      var input = document.getElementById('admin-command-input');
      input.value = 'security';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      var visible = Array.prototype.filter.call(buttons, function (button) { return !button.hidden; }).length;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      click('[data-command-action="action"][data-id="close-command"]');
      return visible > 0 && visible < buttons.length || 'visible=' + visible;
    });
    check('admin T4 action requires elevation and a reason', function () {
      click('[data-admin-tab="security"]');
      click('[data-admin-action="demote"]');
      document.getElementById('admin-reason').value = 'Selftest unelevated rotation';
      click('[data-admin-action="rotate-key"]');
      var blocked = /Elevate this session/.test(text('#toast'));
      click('[data-admin-action="elevate"]');
      document.getElementById('admin-reason').value = '';
      var before = text('.admin-timeline-row');
      click('[data-admin-action="rotate-key"]');
      return blocked && /Reason is required/.test(text('#toast')) && before === text('.admin-timeline-row') ||
        'blocked=' + blocked + ' toast=' + text('#toast');
    });
    check('admin approver list excludes the actor', function () {
      var values = Array.prototype.map.call(document.querySelectorAll('#admin-approver option'), function (option) {
        return option.value;
      });
      return values.length > 0 && values.indexOf('ops_support') < 0 || 'approvers=' + values.join(',');
    });
    check('admin T4 action approves with reason and distinct approver', function () {
      document.getElementById('admin-reason').value = 'Selftest scheduled key rotation';
      document.getElementById('admin-approver').value = 'finance_ops';
      click('[data-admin-action="rotate-key"]');
      return /approved/i.test(text('#toast')) && /Rotate signing key/.test(text('.admin-timeline-row'));
    });
    check('TechOps roster contains 24 specialist agents', function () {
      click('[data-admin-tab="techops"]');
      var count = document.querySelectorAll('[data-admin-action="techops-run-check"]').length;
      return count === 24 && /Ultimate AI TechOps/.test(text('#view')) || 'count=' + count;
    });
    check('TechOps workflows, alerts and stack are rendered', function () {
      var body = text('#view');
      var alerts = document.querySelectorAll('[data-admin-select]').length;
      return alerts === 6 && /WF-INC/.test(body) && /WF-REL/.test(body) &&
        /FlutterFlow/.test(body) && /OpenAI adapter/.test(body) || 'alerts=' + alerts;
    });
    check('TechOps agent check writes an audit event', function () {
      click('[data-admin-action="techops-run-check"]');
      return /Run agent check/.test(text('#toast')) && /Run agent check · CTO-01/.test(text('#view'));
    });
    check('TechOps safe self-heal requires a T3 reason', function () {
      document.getElementById('admin-reason').value = '';
      click('[data-admin-action="techops-selfheal"]');
      var rejected = /Reason is required/.test(text('#toast'));
      document.getElementById('admin-reason').value = 'Selftest safe self-heal';
      document.getElementById('admin-approver').value = 'finance_ops';
      click('[data-admin-action="techops-selfheal"]');
      return rejected && /approved/i.test(text('#toast')) || 'toast=' + text('#toast');
    });
    check('TechOps ticket and report generation are audited', function () {
      click('[data-admin-action="techops-ticket"]');
      var ticket = /Create TechOps ticket/.test(text('#toast'));
      click('[data-admin-action="techops-report"]');
      var report = /Generate report/.test(text('#toast'));
      return ticket && report || 'ticket=' + ticket + ' report=' + report;
    });
    check('admin record drawer opens and closes', function () {
      click('[data-admin-tab="security"]');
      click('[data-admin-action="detail"][data-id="SEC-884"]');
      var open = !!document.querySelector('.admin-drawer') && /SEC-884/.test(text('.admin-drawer h3'));
      click('.admin-drawer [data-admin-action="close-detail"]');
      return open && !document.querySelector('.admin-drawer');
    });
    check('admin search filters table rows', function () {
      click('[data-admin-tab="users"]');
      var input = document.getElementById('admin-search');
      input.value = 'usr_1042';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      var visible = Array.prototype.filter.call(document.querySelectorAll('[data-admin-row]'), function (row) {
        return !row.hidden;
      }).length;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return visible === 1 || 'visible=' + visible;
    });
    check('admin bulk dry run uses checkbox selection', function () {
      var box = document.querySelector('[data-admin-select]');
      if (!box) return 'checkbox missing';
      box.click();
      var selected = document.querySelectorAll('[data-admin-select]:checked').length;
      click('[data-admin-action="bulk-preview"]');
      box.click();
      return selected === 1 && /Dry run/.test(text('#toast')) ||
        'selected=' + selected + ' toast=' + text('#toast');
    });
    check('admin kill switch requires T4 approval and halts/resumes models', function () {
      click('[data-admin-tab="ai"]');
      document.getElementById('admin-reason').value = '';
      click('[data-admin-action="kill"]');
      var rejected = /Reason is required/.test(text('#toast')) && !document.querySelector('.admin-alert.danger');
      document.getElementById('admin-reason').value = 'Selftest T4 kill switch';
      document.getElementById('admin-approver').value = 'finance_ops';
      click('[data-admin-action="kill"]');
      var active = !!document.querySelector('.admin-alert.danger') && /KILL SWITCH ACTIVE/.test(text('.admin-alert.danger'));
      click('[data-admin-action="kill"]');
      var resumed = !document.querySelector('.admin-alert.danger');
      return rejected && active && resumed ||
        'rejected=' + rejected + ' active=' + active + ' resumed=' + resumed;
    });
    check('admin states its simulation boundary', function () {
      return /Deterministic local simulation/.test(text('#view')) && /SIMULATION/.test(text('#view'));
    });

    report();
  }

  function report() {
    var passed = results.filter(function (r) { return r.pass; }).length;
    var skipped = results.filter(function (r) { return r.skipped; }).length;
    var failed = results.length - passed - skipped;
    var expected = manifest && typeof manifest.expectedCount === 'number' ? manifest.expectedCount : null;
    var countOk = expected !== null && expected === results.length;
    if (!countOk) failed += 1;
    var manifestLabel = expected === null ? 'manifest missing' : 'manifest=' + expected;

    var panel = document.createElement('aside');
    panel.id = 'selftest-results';
    panel.setAttribute('role', 'status');
    panel.style.cssText = 'position:fixed;z-index:9999;right:14px;bottom:14px;width:min(420px,calc(100vw - 28px));max-height:70vh;overflow:auto;background:#1C1917;color:#F7F1E6;border:2px solid #C9A227;border-radius:14px;padding:16px;font:12px/1.5 ui-monospace,Consolas,monospace;box-shadow:0 20px 60px rgba(0,0,0,.5)';
    panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<strong style="color:#C9A227;font-size:14px">VINTORA SELF-TEST</strong>' +
      '<button id="selftest-close" style="background:none;border:1px solid #6F675E;color:#F7F1E6;border-radius:6px;padding:2px 8px">✕</button></div>' +
      '<div id="selftest-summary" style="margin-bottom:8px;font-weight:700"></div>' +
      '<div>' + results.map(function (r) {
        var status = r.skipped ? 'SKIP' : r.pass ? 'PASS' : 'FAIL';
        var colour = r.skipped ? '#C9A227' : r.pass ? '#7FCBA5' : '#E58B8B';
        return '<div style="padding:3px 0;border-bottom:1px solid #3B322E">' +
          '<span style="color:' + colour + '">' + status + '</span> ' +
          r.name + (r.detail ? '<div style="color:#B3A79A;font-size:10px">' + r.detail.replace(/</g, '&lt;') + '</div>' : '') + '</div>';
      }).join('') + (countOk ? '' : '<div style="color:#E58B8B;padding-top:6px">Generated count mismatch: ' + manifestLabel + '</div>') + '</div>';
    document.body.appendChild(panel);
    var summary = passed + ' passed / ' + skipped + ' skipped / ' + failed + ' failed (' +
      results.length + ' total, ' + manifestLabel + ')';
    document.getElementById('selftest-summary').textContent = summary;
    document.getElementById('selftest-close').onclick = function () { panel.remove(); };

    console.log('[Vintora self-test] ' + summary);
    results.forEach(function (r) {
      var status = r.skipped ? 'SKIP ' : r.pass ? 'PASS ' : 'FAIL ';
      console.log(status + r.name + (r.detail ? ' — ' + r.detail : ''));
    });
    if (!countOk) console.log('FAIL generated manifest count mismatch: ' + manifestLabel + ' but ' + results.length + ' checks ran');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 0); });
  else setTimeout(run, 0);
})();
