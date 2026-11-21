/* Generated from the original zero-dependency app.js — modular ES build. */
import { state, D, esc, t, money, getProduct, bottleHTML, productCard, catalogueBadge, sectionHead } from '../core.js';
import { AFRICA_MARKETPLACE } from '../africa-snapshot.js';

  function africaMarketplacePanel() {
    var a = AFRICA_MARKETPLACE;
    var metrics = [
      [a.markets.length, 'Launch markets'],
      [a.languages.length, 'Languages'],
      [a.candidateBrandCount, 'Candidate brands'],
      [a.scaleTargets.africanCountries, 'Country scale target'],
    ];
    return '<section class="section card" id="africa-marketplace">' +
        '<div class="row" style="justify-content:space-between;align-items:flex-start">' +
          '<div>' +
            '<p class="eyebrow">VINTORA MARKET · AFRICA</p>' +
            '<h2 class="serif" style="font-size:26px;margin:0">Africa Marketplace</h2>' +
            '<p class="muted" style="margin:6px 0 0">Registry-backed expansion across 14 design-target markets. ' +
              'Candidate brands and draft listing templates only — no live listings.</p>' +
          '</div>' +
          '<span class="pill gold">Verification required</span>' +
        '</div>' +
        '<div class="grid grid-4" style="margin-top:16px">' + metrics.map(function (metric) {
          return '<div class="card" style="text-align:center"><strong style="font-size:24px">' + metric[0] +
            '</strong><p class="muted" style="margin:4px 0 0">' + esc(metric[1]) + '</p></div>';
        }).join('') + '</div>' +
        '<div class="row" style="margin-top:14px;flex-wrap:wrap">' + a.markets.map(function (market) {
          return '<span class="pill">' + esc(market.code) + ' · ' + esc(market.name) + '</span>';
        }).join('') + '</div>' +
        '<div class="row" style="margin-top:10px;flex-wrap:wrap">' + a.languages.map(function (language) {
          return '<span class="pill">' + esc(language.name) + (language.rtl ? ' · RTL' : '') + '</span>';
        }).join('') + '</div>' +
        '<p class="fine-print" style="margin-top:12px">' + esc(a.notice) + ' ' + esc(a.productDataPolicy) + '</p>' +
      '</section>';
  }

  function viewHome() {
    var trending = state.products.slice(0, 3);
    var curated = [state.products[5], state.products[2], state.products[7], state.products[9]];
    return '<section class="hero">' +
        '<div class="hero-copy">' +
          '<p class="eyebrow">AI-NATIVE WINE &amp; SPIRITS</p>' +
          '<h1>' + t('yourPalate') + '</h1>' +
          '<p>' + t('heroSub') + '</p>' +
          '<div class="hero-actions">' +
            '<button class="btn btn-gold" data-view="sommelier">' + t('findWine') + ' →</button>' +
            '<button class="btn btn-ghost" data-view="club">Explore ' + t('club') + '</button>' +
          '</div>' +
          '<p class="fine-print" style="margin-top:20px;color:#D9C9B6">Illustrative catalogue · target scale: 10M+ SKUs across 200+ markets</p>' +
        '</div>' +
        '<div class="hero-visual">' + bottleHTML(state.products[1]) + bottleHTML(state.products[0]) + bottleHTML(state.products[6]) + '</div>' +
      '</section>' +

      '<section class="section">' +
        sectionHead(t('shopByMood'), 'One tap hands the context to your Sommelier.', 'Open Sommelier', 'sommelier') +
        '<div class="occasion-grid">' + D.occasions.map(function (o) {
          return '<button class="occasion" data-occasion="' + esc(o.query) + '"><span>' + o.icon + '</span><small>' + esc(o.label) + '</small></button>';
        }).join('') + '</div>' +
      '</section>' +

      '<section class="section">' +
        sectionHead(t('curated'), 'Ranked by your taste embedding, with grounded rationales.', 'See all', 'search') +
        '<div class="grid grid-4">' + curated.map(productCard).join('') + '</div>' +
      '</section>' +

      africaMarketplacePanel() +

      '<section class="section">' +
        sectionHead(t('trending'), 'What verified buyers in your region are opening now.', 'See all', 'search') +
        '<div class="grid grid-3">' + trending.map(productCard).join('') + '</div>' +
      '</section>' +

      '<section class="section card" style="background:linear-gradient(120deg,var(--surface),var(--gold-soft))">' +
        '<div class="row" style="justify-content:space-between">' +
          '<div><p class="eyebrow">VINTORA VAULT</p><h2 class="serif" style="font-size:26px;margin:0">Your cellar is an asset class.</h2>' +
          '<p class="muted" style="margin:6px 0 0">Fractional ownership from $25. Custodied, insured, and tradable on a continuous secondary market.</p></div>' +
          '<button class="btn btn-primary" data-view="vault">Explore Vault →</button>' +
        '</div>' +
      '</section>';
  }

  function viewSearch() {
    var types = ['All', 'Red Wine', 'White Wine', 'Sparkling', 'Spirits', 'Fortified'];
    var q = state.search.toLowerCase();
    var list = state.products.filter(function (p) {
      var matchType = state.filter === 'All' || p.type === state.filter;
      var hay = (p.name + ' ' + p.producer + ' ' + p.region + ' ' + p.type + ' ' + p.notes.join(' ')).toLowerCase();
      return matchType && (!q || hay.indexOf(q) !== -1);
    });
    return '<div class="section-head"><div><h1 class="serif" style="font-size:36px;margin:0">Explore the cellar</h1>' +
        '<p>' + list.length + ' illustrative bottles shown · 10M+ SKU target at scale</p></div></div>' +
      '<div class="row" style="margin-bottom:20px">' + types.map(function (tp) {
        return '<button class="btn btn-sm ' + (state.filter === tp ? 'btn-primary' : '') + '" data-filter="' + tp + '">' + tp + '</button>';
      }).join('') + '</div>' +
      (list.length ? '<div class="grid grid-4">' + list.map(productCard).join('') + '</div>'
        : '<div class="card" style="text-align:center"><p class="muted">No bottles matched. Try a grape, region or occasion.</p><button class="btn" data-view="sommelier">Ask the Sommelier</button></div>');
  }

  function viewProduct() {
    var p = getProduct(state.currentProduct);
    if (!p) return viewHome();
    var bodyLevels = [['Body', p.palate.body], ['Dryness', p.palate.dryness], ['Oak', p.palate.oak], ['Fruit intensity', p.palate.fruit]];
    return '<button class="link-btn" data-view="search">← Back to cellar</button>' +
      '<section class="detail section" style="margin-top:18px">' +
        '<div class="detail-art">' + bottleHTML(p) + '</div>' +
        '<div>' +
          '<div class="row"><span class="pill gold">Provenance ' + p.provenance + '/100</span><span class="pill">' + esc(p.type) + '</span><span class="pill">Demo record · not purchasable</span></div>' +
          '<h1>' + esc(p.name) + '</h1>' +
          '<div class="meta">' + esc(p.producer) + ' · ' + esc(p.appellation) + ' · ' + esc(p.region) + (p.vintage ? ' · ' + p.vintage : '') + '</div>' +
          catalogueBadge(p) +
          '<div class="row" style="margin:12px 0"><span class="stars">★★★★★</span><span class="meta">' + p.rating + ' from ' + p.reviews.toLocaleString() + ' illustrative demo ratings</span></div>' +
          '<p class="story">' + esc(p.story) + '</p>' +
          '<div class="spread" style="margin-bottom:18px"><span class="price" style="font-size:30px">' + money(p.price) + '</span>' +
            '<div class="row"><button class="btn" data-ask="' + esc(p.name) + '">✧ ' + t('askSommelier') + '</button>' +
            '<button class="btn btn-primary" data-add="' + p.id + '">' + t('addToCart') + '</button></div></div>' +
          '<div class="card"><strong>Tasting fingerprint</strong><div class="stack" style="margin-top:12px">' +
            bodyLevels.map(function (b) {
              return '<div><div class="spread" style="font-size:11px"><span>' + b[0] + '</span><span>' + b[1] + '/5</span></div>' +
                '<div class="meter"><span style="width:' + (b[1] * 20) + '%"></span></div></div>';
            }).join('') + '</div></div>' +
          '<div class="grid grid-2" style="margin-top:14px">' +
            '<div class="card"><strong>Flavour notes</strong><div class="notes" style="margin-top:10px">' + p.notes.map(function (n) { return '<span class="pill">' + esc(n) + '</span>'; }).join('') + '</div></div>' +
            '<div class="card"><strong>Pairs with</strong><div class="pair-grid" style="margin-top:10px">' + p.pairings.map(function (n) { return '<div>' + esc(n) + '</div>'; }).join('') + '</div></div>' +
          '</div>' +
          '<div class="card provenance" style="margin-top:14px"><strong>Illustrative provenance chain (demo data)</strong>' +
            '<ol><li>Producer attestation · ' + esc(p.producer) + '</li><li>Vineyard / appellation · ' + esc(p.appellation) + '</li>' +
            '<li>Vintage ' + (p.vintage || 'NAS') + ' sealed and authenticated</li><li>' + esc(p.custody) + '</li></ol></div>' +
        '</div>' +
      '</section>';
  }


export { viewHome, viewSearch, viewProduct };
