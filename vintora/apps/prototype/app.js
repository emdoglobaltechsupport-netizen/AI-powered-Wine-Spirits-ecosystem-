/* =========================================================
   VINTORA prototype — zero-dependency application logic
   Open index.html in any modern browser. Nothing is sent anywhere.
   ========================================================= */
(function () {
  'use strict';

  var D = window.VINTORA_DATA;
  var MIN_AGE = { US: 21, AE: 21, JP: 20, SG: 18, GB: 18, FR: 18, DE: 18, IT: 18, ES: 18, NL: 18, AU: 18, BR: 18, CA: 19, ZA: 18 };

  var state = {
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
    createdPo: null
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function t(key) {
    var dict = D.locales[state.lang] || D.locales.en;
    return dict[key] || D.locales.en[key] || key;
  }

  function money(usd) {
    var c = D.currencies[state.currency];
    var v = usd * c.rate;
    var digits = c.rate >= 100 ? 0 : 2;
    return c.symbol + v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function getProduct(id) {
    for (var i = 0; i < D.products.length; i++) if (D.products[i].id === id) return D.products[i];
    return null;
  }

  function save() {
    try {
      localStorage.setItem('vintora.prototype', JSON.stringify({
        lang: state.lang, currency: state.currency, theme: state.theme,
        cart: state.cart, ageVerified: state.ageVerified, clubTier: state.clubTier
      }));
    } catch (e) { /* storage unavailable — prototype still works */ }
  }

  function load() {
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

  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  /* ---------------- shared components ---------------- */

  function bottleHTML(p) {
    var nm = p.name.length > 17 ? p.name.slice(0, 16) + '…' : p.name;
    return '<div class="bottle" style="--liquid:' + esc(p.liquid) + '" aria-hidden="true">' +
      '<span class="bottle-foil"></span>' +
      '<span class="bottle-label"><strong>' + esc(nm) + '</strong><small>' + (p.vintage || 'SPIRIT') + '</small></span>' +
      '</div>';
  }

  function productCard(p) {
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
          '<button class="btn btn-primary btn-sm" data-add="' + p.id + '">' + t('addToCart') + '</button></div>' +
      '</div></article>';
  }

  function sectionHead(title, sub, actionLabel, actionView) {
    return '<div class="section-head"><div><h2>' + title + '</h2><p>' + sub + '</p></div>' +
      (actionLabel ? '<button class="link-btn" data-view="' + actionView + '">' + actionLabel + ' →</button>' : '') + '</div>';
  }

  /* ---------------- views ---------------- */

  function viewHome() {
    var trending = D.products.slice(0, 3);
    var curated = [D.products[5], D.products[2], D.products[7], D.products[9]];
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
        '<div class="hero-visual">' + bottleHTML(D.products[1]) + bottleHTML(D.products[0]) + bottleHTML(D.products[6]) + '</div>' +
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
    var list = D.products.filter(function (p) {
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
          '<div class="row"><span class="pill gold">Provenance ' + p.provenance + '/100</span><span class="pill">' + esc(p.type) + '</span><span class="pill green">In stock · ' + p.stock + '</span></div>' +
          '<h1>' + esc(p.name) + '</h1>' +
          '<div class="meta">' + esc(p.producer) + ' · ' + esc(p.appellation) + ' · ' + esc(p.region) + (p.vintage ? ' · ' + p.vintage : '') + '</div>' +
          '<div class="row" style="margin:12px 0"><span class="stars">★★★★★</span><span class="meta">' + p.rating + ' from ' + p.reviews.toLocaleString() + ' verified tastings</span></div>' +
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
          '<div class="card provenance" style="margin-top:14px"><strong>Verified provenance chain</strong>' +
            '<ol><li>Producer attestation · ' + esc(p.producer) + '</li><li>Vineyard / appellation · ' + esc(p.appellation) + '</li>' +
            '<li>Vintage ' + (p.vintage || 'NAS') + ' sealed and authenticated</li><li>' + esc(p.custody) + '</li></ol></div>' +
        '</div>' +
      '</section>';
  }

  function viewSommelier() {
    var log = state.chat.map(function (m) {
      var recs = m.ids && m.ids.length ? '<div class="chat-recs">' + m.ids.map(function (id) {
        var p = getProduct(id);
        return '<div class="chat-rec" data-product="' + id + '"><span class="pill gold">' + money(p.price) + '</span><span><strong>' + esc(p.name) + '</strong><small>' + esc(p.region) + ' · ' + p.rating + '★ · provenance ' + p.provenance + '</small></span></div>';
      }).join('') + '</div>' : '';
      return '<div class="bubble ' + m.role + '">' + m.text + (m.source ? '<div class="source">' + m.source + '</div>' : '') + recs + '</div>';
    }).join('');

    if (!state.chat.length) {
      log = '<div class="bubble bot">Bonjour — I am your Vintora Sommelier. I have read 300 million graph edges covering producers, vintages, appellations and tasting notes. Tell me what you are eating, what you liked before, or your budget, and I will find something worth opening. <div class="source">Grounded in the Vintora Wine Knowledge Graph · citations shown on every answer</div></div>';
    }

    var sideRecs = [D.products[4], D.products[5], D.products[8]];
    return '<div class="section-head"><div><h1 class="serif" style="font-size:36px;margin:0">Vintora Sommelier</h1><p>Conversational, multilingual, and grounded in verified provenance.</p></div>' +
        '<span class="pill green">● Online · EN / FR / ES · Voice ready</span></div>' +
      '<div class="chat-shell">' +
        '<div class="chat-panel">' +
          '<div class="chat-head"><span class="avatar">S</span><div><strong>Sommelier</strong><div class="product-sub">Powered by retrieval over the wine knowledge graph</div></div>' +
            '<span class="pill gold" style="margin-left:auto">Taste profile 82%</span></div>' +
          '<div class="chat-log" id="chat-log">' + log + '</div>' +
          '<div class="composer">' +
            '<div class="suggestions">' +
              '<button data-suggest="I like Northern Rhône Syrah — what should I try next?">Rhône Syrah</button>' +
              '<button data-suggest="What works with spicy Thai food?">Spicy food</button>' +
              '<button data-suggest="A gift under $100 for a whisky lover">Gift under $100</button>' +
              '<button data-suggest="A bottle worth cellaring for 15 years">Cellar for 15 years</button>' +
            '</div>' +
            '<form class="composer-row" id="chat-form"><input id="chat-input" placeholder="Ask about a grape, a dish, an occasion…" aria-label="Message the sommelier" autocomplete="off">' +
              '<button class="btn btn-primary" type="submit">' + t('send') + ' →</button></form>' +
            '<div class="safety-note">Please enjoy responsibly. Answers are guidance, not health claims. You are 21+.</div>' +
          '</div>' +
        '</div>' +
        '<aside class="stack">' +
          '<div class="card"><p class="eyebrow">YOUR TASTE PROFILE</p><strong>Confidence 82%</strong>' +
            '<p class="muted" style="font-size:12px">Learned from 14 tastings and 6 explicit preferences. You lean toward savoury, structured reds with moderate oak.</p>' +
            '<div class="stack">' + [['Body', 4], ['Dryness', 4], ['Oak', 3], ['Fruit', 3]].map(function (b) {
              return '<div><div class="spread" style="font-size:10px"><span>' + b[0] + '</span><span>' + b[1] + '/5</span></div><div class="meter"><span style="width:' + (b[1] * 20) + '%"></span></div></div>';
            }).join('') + '</div>' +
            '<button class="link-btn" style="margin-top:12px">Edit or export profile →</button></div>' +
          '<div class="card"><p class="eyebrow">SOMMELIER PICKS</p><div class="chat-recs">' + sideRecs.map(function (p) {
            return '<div class="chat-rec" data-product="' + p.id + '"><span class="pill gold">' + money(p.price) + '</span><span><strong>' + esc(p.name) + '</strong><small>' + esc(p.region) + '</small></span></div>';
          }).join('') + '</div></div>' +
        '</aside>' +
      '</div>';
  }

  function sommelierReply(text) {
    var q = (text || '').toLowerCase();
    if (/spicy|thai|chilli|curry|mexic/.test(q)) {
      return { text: 'For heat, reach for high acidity and low tannin — tannin amplifies chilli burn. My pick is the <strong>Riesling Kabinett Trocken</strong> from the Rheingau: lime, slate and enough fruit to cool the palate. The <strong>Mezcal Espadín</strong> is the adventurous alternative when the dish is smoky rather than sweet.', source: 'Sources: Rheingau QbA tasting panel · pairing graph edge PAIRS_WITH(Spicy) · 4,812 verified reviews', ids: ['sku-1005', 'sku-1011'] };
    }
    if (/rhône|rhone|syrah|northern/.test(q)) {
      return { text: 'If Northern Rhône Syrah is your reference point, the savoury, pepper-driven profile points to two paths. Stay near home with <strong>Etna Rosso</strong> — ash, blood orange and wild strawberry from volcanic soils. Or cross to Barolo, where Nebbiolo offers rose, tar and the same savoury gravity. I would start with Etna for value and Barolo for the long evening.', source: 'Sources: knowledge graph SIMILAR_TO(Syrah → Nerello Mascalese, Nebbiolo) · provenance verified', ids: ['sku-1006', 'sku-1002'] };
    }
    if (/gift|present|under \$?100| whisky/.test(q)) {
      return { text: 'For a whisky lover, <strong>Hibiki Harmony</strong> is the confident gift: orchard fruit, honey and sandalwood, beautifully presented and widely adored. If you want something rarer and can stretch the budget, <strong>Macallan 12 Sherry Cask</strong> delivers the richer, sherry-led style. Both arrive with verified custody and gift packaging.', source: 'Sources: 3,190 + 2,870 verified tastings · gifting propensity model · custody records', ids: ['sku-1008', 'sku-1009'] };
    }
    if (/cellar|15 year|age|invest|vintage/.test(q)) {
      return { text: 'For a 15-year horizon, buy on provenance and structure, not fashion. <strong>Château Margaux 2016</strong> is a first growth with the tannic architecture and verified bonded custody to reward patience; our Vault liquidity score is 88/100. <strong>Barolo Cannubi 2018</strong> offers a lower entry point with similar longevity.', source: 'Sources: Vault price model · liquidity score · provenance chain 99/100 · bonded custody, Geneva', ids: ['sku-1001', 'sku-1002'] };
    }
    if (/champagne|celebrat|bubble|sparkl/.test(q)) {
      return { text: 'For a celebration, <strong>Champagne Blanc de Blancs 2016</strong> is hard to beat: brioche, lemon zest and chalk with a slow, creamy mousse. It also pairs with everything from oysters to fried chicken, which makes it a generous choice when you are not sure what is being served.', source: 'Sources: Champagne AOC panel · PAIRS_WITH(Celebration, Oysters) · 1,102 verified tastings', ids: ['sku-1010'] };
    }
    if (/under \$?50|everyday|cheap|value/.test(q)) {
      return { text: 'For an everyday bottle with above-its-price character, take the <strong>Etna Rosso</strong> — volcanic, savoury and food-flexible at $44. If you prefer white, the <strong>Riesling Kabinett</strong> at $32 is the most versatile bottle in the catalogue.', source: 'Sources: price-to-quality ranking · 468 + 734 verified tastings', ids: ['sku-1006', 'sku-1005'] };
    }
    return { text: 'Based on your taste profile — savoury, structured, moderate oak — I would begin with <strong>Barolo Cannubi 2018</strong>. It has the rose-and-tar lift you enjoy in Rhône wines, with a finer tannin line. If you are cooking tonight, tell me the dish and I will narrow it further.', source: 'Sources: taste embedding similarity · 300M-edge knowledge graph · 892 verified tastings', ids: ['sku-1002', 'sku-1006'] };
  }

  function sendChat(text) {
    if (!text || !text.trim()) return;
    var reply = sommelierReply(text);
    state.chat.push({ role: 'user', text: esc(text.trim()) });
    state.chat.push({ role: 'bot', text: reply.text, source: reply.source, ids: reply.ids });
    render();
    var log = $('#chat-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  function viewCart() {
    var ids = Object.keys(state.cart);
    if (!ids.length) {
      return '<div class="section-head"><h1 class="serif" style="font-size:36px;margin:0">Your cellar</h1></div>' +
        '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:46px">▣</div><h2 class="serif">Your cellar is empty</h2><p class="muted">' + t('emptyCart') + '</p><button class="btn btn-primary" data-view="sommelier">Ask the Sommelier →</button></div>';
    }
    var lines = ids.map(function (id) {
      var p = getProduct(id), qty = state.cart[id];
      var safeId = esc(id);
      return '<div class="cart-line">' + bottleHTML(p) +
        '<div class="line-info"><strong>' + esc(p.name) + '</strong><div class="product-sub">' + esc(p.region) + ' · provenance ' + esc(p.provenance) + '</div>' +
        '<div class="row" style="margin-top:6px"><span class="qty"><button data-qty="-1" data-id="' + safeId + '" aria-label="Decrease">−</button><span>' + esc(qty) + '</span><button data-qty="1" data-id="' + safeId + '" aria-label="Increase">+</button></span>' +
        '<button class="link-btn" data-remove="' + safeId + '">Remove</button></div></div>' +
        '<strong>' + money(p.price * qty) + '</strong></div>';
    }).join('');
    var subtotal = ids.reduce(function (a, id) { return a + getProduct(id).price * state.cart[id]; }, 0);
    var shipping = subtotal > 250 ? 0 : 18;
    return '<div class="section-head"><h1 class="serif" style="font-size:36px;margin:0">Your cellar</h1><p>Age-verified delivery · temperature-controlled · insured</p></div>' +
      '<div class="cart-layout"><div class="card">' + lines + '</div>' +
      '<aside class="card summary"><p class="eyebrow">ORDER SUMMARY</p>' +
        '<div class="row" style="justify-content:space-between"><span>' + t('subtotal') + '</span><strong>' + money(subtotal) + '</strong></div>' +
        '<div class="row" style="justify-content:space-between"><span>Temperature-controlled delivery</span><strong>' + (shipping ? money(shipping) : 'Complimentary') + '</strong></div>' +
        '<div class="row" style="justify-content:space-between"><span>Insured value (0.6%)</span><strong>' + money(subtotal * 0.006) + '</strong></div>' +
        '<hr style="border:0;border-top:1px solid var(--border);margin:14px 0">' +
        '<div class="row" style="justify-content:space-between"><strong>Total</strong><strong class="price">' + money(subtotal + shipping + subtotal * 0.006) + '</strong></div>' +
        '<p class="fine-print" style="margin:12px 0">🔒 ' + t('lockedRate') + '</p>' +
        '<button class="btn btn-primary btn-block" id="checkout-btn">' + t('checkout') + ' →</button>' +
        '<p class="fine-print" style="text-align:center;margin-top:10px">' + t('demo') + '</p>' +
      '</aside></div>';
  }

  function viewClub() {
    return '<div class="section-head"><div><h1 class="serif" style="font-size:36px;margin:0">Vintora Club</h1>' +
        '<p>Curated by the Sommelier, delivered monthly. Skip or cancel any time.</p></div><span class="pill green">Member 14 months · 42 bottles discovered</span></div>' +
      '<div class="tier-grid">' + D.clubTiers.map(function (c) {
        return '<div class="tier ' + (c.popular ? 'popular' : '') + '" style="--tier:' + c.accent + '">' +
          (c.popular ? '<span class="tier-flag">MOST LOVED</span>' : '') +
          '<p class="eyebrow" style="color:' + c.accent + '">' + c.name.toUpperCase() + '</p>' +
          '<h3>' + esc(c.bottles) + '</h3>' +
          '<div class="amount">' + money(c.price) + ' <small>/ month</small></div>' +
          '<p class="muted" style="font-size:12px">' + esc(c.note) + '</p>' +
          '<ul><li>Personalised by your taste profile</li><li>Full tasting notes &amp; provenance</li><li>Free insured delivery</li>' + (c.name === 'Icon' ? '<li>Exclusive producer allocations</li>' : '') + '</ul>' +
          '<button class="btn ' + (state.clubTier === c.name ? 'btn-primary' : '') + ' btn-block" data-tier="' + c.name + '">' + (state.clubTier === c.name ? 'Current tier' : 'Choose ' + c.name) + '</button>' +
        '</div>';
      }).join('') + '</div>' +
      '<section class="section card"><div class="row" style="justify-content:space-between"><div><p class="eyebrow">NEXT BOX · OCTOBER</p>' +
        '<h2 class="serif" style="margin:0">Three bottles, chosen for your palate</h2><p class="muted">Etna Rosso 2021 · Riesling Kabinett 2022 · a surprise from our Icon allocation</p></div>' +
        '<button class="btn" data-view="sommelier">Change preferences →</button></div></section>';
  }

  function viewVault() {
    var total = D.vaultLots.reduce(function (a, l) { return a + l.value; }, 0);
    var bars = [62, 68, 65, 76, 74, 84, 81, 92, 88, 100];
    return '<div class="section-head"><div><h1 class="serif" style="font-size:36px;margin:0">Vintora Vault</h1><p>Custodied fine wine. Fractional from $25. Continuous secondary market.</p></div>' +
        '<span class="pill">● Vault blueprint · simulated settlement only</span></div>' +
      '<div class="kpi-grid">' +
        '<div class="kpi"><small>' + t('portfolio') + '</small><strong>' + money(total) + '</strong><em>▲ 8.7% YTD</em></div>' +
        '<div class="kpi"><small>Lots held</small><strong>' + D.vaultLots.length + '</strong><em>3 producers</em></div>' +
        '<div class="kpi"><small>Avg. liquidity score</small><strong>85</strong><em>▲ 4 pts</em></div>' +
        '<div class="kpi"><small>Custody</small><strong>100%</strong><em>insured &amp; bonded</em></div>' +
      '</div>' +
      '<div class="grid grid-2 section">' +
        '<div class="card"><p class="eyebrow">PORTFOLIO VALUE · 10 YEARS</p><div class="chart">' +
          bars.map(function (h, i) { return '<div class="bar" style="height:' + h + '%">' + (i === bars.length - 1 ? '<em>' + money(total) + '</em>' : '') + '<span>' + (2016 + i) + '</span></div>'; }).join('') +
        '</div></div>' +
        '<div class="card"><p class="eyebrow">ALLOCATION BY REGION</p><div class="stack" style="margin-top:18px">' +
          [['Bordeaux', 52], ['Japan', 28], ['Piedmont', 20]].map(function (r) {
            return '<div><div class="spread" style="font-size:12px"><span>' + r[0] + '</span><strong>' + r[1] + '%</strong></div><div class="meter"><span style="width:' + (r[1] * 2) + '%"></span></div></div>';
          }).join('') + '</div>' +
          '<p class="fine-print" style="margin-top:20px">Fees: 1.5% buy · 2% sell · 0.5% p.a. custody · 5–15% performance above high-water mark.</p>' +
        '</div>' +
      '</div>' +
      '<section class="section">' + sectionHead('Your lots', 'Mark-to-market with verified condition and custody.', 'Browse market', 'search') +
        '<div class="table-wrap"><table><thead><tr><th>Lot</th><th>Qty</th><th>Value</th><th>12m change</th><th>' + t('liquidity') + '</th><th>Custody</th></tr></thead><tbody>' +
        D.vaultLots.map(function (l) {
          var p = getProduct(l.productId);
          return '<tr><td><strong>' + esc(p.name) + '</strong><br><small class="muted">' + (p.vintage || 'NAS') + '</small></td><td>' + l.qty + '</td><td>' + money(l.value) + '</td>' +
            '<td style="color:var(--success)">▲ ' + l.change + '%</td><td>' + l.liquidity + '/100</td><td>' + l.years + ' yrs · insured</td></tr>';
        }).join('') + '</tbody></table></div></section>';
  }

  var TRADE_TABS = [
    ['overview', 'Overview'], ['rfqs', 'RFQs'], ['suppliers', 'Suppliers'],
    ['orders', 'Purchase orders'], ['credit', 'Credit & terms']
  ];

  function tradeTabBar() {
    return '<div class="row" style="margin:18px 0 20px;border-bottom:1px solid var(--border);padding-bottom:10px">' +
      TRADE_TABS.map(function (tab) {
        return '<button class="btn btn-sm ' + (state.tradeTab === tab[0] ? 'btn-primary' : 'btn-ghost') + '" data-trade-tab="' + tab[0] + '">' + tab[1] + '</button>';
      }).join('') + '</div>';
  }

  function tradeOverview() {
    var spend = [62, 58, 71, 66, 78, 74, 69, 82];
    var latestQuotes = D.trade.quotes.slice(0, 4);
    return '<div class="kpi-grid">' +
        '<div class="kpi"><small>Monthly spend</small><strong>' + money(84200) + '</strong><em>▼ 6.2% vs last month</em></div>' +
        '<div class="kpi"><small>Active suppliers</small><strong>28</strong><em>9 markets</em></div>' +
        '<div class="kpi"><small>RFQ → order</small><strong>25%</strong><em>▲ 4 pts</em></div>' +
        '<div class="kpi"><small>On-time delivery</small><strong>96.4%</strong><em>SLA 95%</em></div>' +
      '</div>' +
      '<div class="grid grid-2 section">' +
        '<div class="card"><p class="eyebrow">SPEND TREND · LAST 8 MONTHS (USD 000s)</p><div class="chart">' +
          spend.map(function (v, i) { return '<div class="bar" style="height:' + (v * 1.15) + '%">' + (i === spend.length - 1 ? '<em>' + v + '</em>' : '') + '<span>M' + (i + 1) + '</span></div>'; }).join('') +
        '</div></div>' +
        '<div class="card"><p class="eyebrow">TRADE COPILOT</p><div class="stack" style="font-size:12px">' +
          '<div class="spread"><span>Licensing pre-check</span><span class="pill green">All markets cleared</span></div>' +
          '<div class="spread"><span>Incoterm validation</span><span class="pill green">DAP / DDP verified</span></div>' +
          '<div class="spread"><span>Credit exposure</span><span class="pill gold">42% of limit</span></div>' +
          '<div class="spread"><span>Price anomaly detection</span><span class="pill green">No flags</span></div>' +
        '</div><p class="fine-print" style="margin-top:16px">Copilot prepares drafts and checks policy. A buyer approves every RFQ, award and contract.</p>' +
        '<button class="btn btn-primary btn-block" style="margin-top:12px" data-trade-tab="rfqs">Manage RFQs →</button></div>' +
      '</div>' +
      '<section class="section">' + sectionHead('Latest quotes', 'Verified suppliers, comparable Incoterms, landed-cost view.', 'All RFQs', 'rfqs') +
        '<div class="table-wrap"><table><thead><tr><th>Quote</th><th>RFQ</th><th>Supplier</th><th>Per bottle</th><th>Incoterm</th><th>Lead time</th><th>Valid until</th></tr></thead><tbody>' +
        latestQuotes.map(function (q) {
          return '<tr><td><strong>' + q.id + '</strong></td><td>' + q.rfqId + '</td><td>' + esc(q.supplier) + ' · ★ ' + q.rating + '</td>' +
            '<td><strong>' + money(q.price) + '</strong>' + (q.saving ? '<br><small class="muted">' + money(q.saving) + ' under target</small>' : '') + '</td>' +
            '<td>' + q.incoterm + '</td><td>' + q.lead + ' days</td><td>' + q.valid + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
  }

  function tradeRfqs() {
    var rfq = null;
    for (var i = 0; i < D.trade.rfqs.length; i++) if (D.trade.rfqs[i].id === state.selectedRfq) rfq = D.trade.rfqs[i];
    if (!rfq) rfq = D.trade.rfqs[0];
    var quotes = D.trade.quotes.filter(function (q) { return q.rfqId === rfq.id; });
    var product = getProduct(rfq.productId);
    var awarded = state.awardedQuote;

    return '<div class="grid" style="grid-template-columns:320px 1fr;align-items:start">' +
      '<div class="card"><p class="eyebrow">RFQ PIPELINE</p><div class="stack">' +
        D.trade.rfqs.map(function (r) {
          var p = getProduct(r.productId);
          return '<button class="chat-rec" data-rfq="' + r.id + '" style="' + (r.id === rfq.id ? 'border-color:var(--gold);background:var(--gold-soft)' : '') + '">' +
            '<span style="flex:1"><strong style="font-family:var(--serif);font-size:13px">' + r.id + '</strong><small>' + esc(p.name) + ' · ' + r.cases + ' cases</small>' +
            '<small>' + r.status + ' · ' + r.quotes + ' quotes · ' + r.created + '</small></span></button>';
        }).join('') +
      '</div>' +
      '<form id="rfq-form" class="stack" style="margin-top:18px;border-top:1px solid var(--border);padding-top:16px">' +
        '<p class="eyebrow" style="margin:0">NEW RFQ</p>' +
        '<label class="field"><span>Bottle</span><select id="rfq-product">' + D.products.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
        '<div class="field-row"><label class="field"><span>Cases (12 btls)</span><input id="rfq-qty" type="number" min="1" value="10"></label>' +
        '<label class="field"><span>Deliver to</span><select id="rfq-market"><option>London, UK</option><option>New York, US</option><option>Singapore</option><option>Paris, FR</option></select></label></div>' +
        '<label class="field"><span>Target price per bottle (USD)</span><input id="rfq-price" type="number" min="1" value="140"></label>' +
        '<button class="btn btn-primary" type="submit">' + t('requestQuote') + ' →</button>' +
        '<p class="fine-print">Copilot checks Incoterms, delivery feasibility and licensing before publishing.</p>' +
      '</form></div>' +
      '<div class="stack">' +
        '<div class="card"><div class="spread"><div><p class="eyebrow" style="margin:0">' + rfq.id + ' · ' + rfq.status + '</p>' +
          '<h2 class="serif" style="margin:4px 0">' + esc(product.name) + '</h2>' +
          '<p class="muted" style="margin:0;font-size:12px">' + rfq.cases + ' cases × 12 bottles · ' + esc(rfq.market) + ' · ' + rfq.incoterm + ' · target ' + money(rfq.target) + '/bottle</p></div>' +
          '<span class="pill gold">' + quotes.length + ' supplier quotes</span></div></div>' +
        (quotes.length ? '<div class="table-wrap"><table><thead><tr><th>Supplier</th><th>Per bottle</th><th>Incoterm</th><th>MOQ</th><th>Lead</th><th>Valid</th><th></th></tr></thead><tbody>' +
          quotes.map(function (q) {
            var isAwarded = awarded === q.id;
            return '<tr' + (isAwarded ? ' style="background:var(--gold-soft)"' : '') + '><td><strong>' + esc(q.supplier) + '</strong><br><small class="muted">★ ' + q.rating + ' · verified</small></td>' +
              '<td><strong>' + money(q.price) + '</strong>' + (q.saving ? '<br><small style="color:var(--success)">▲ ' + money(q.saving) + ' vs target</small>' : '') + '</td>' +
              '<td>' + q.incoterm + '</td><td>' + q.moq + ' cases</td><td>' + q.lead + ' days</td><td>' + q.valid + '</td>' +
              '<td><button class="btn btn-sm ' + (isAwarded ? '' : 'btn-primary') + '" data-award="' + q.id + '"' + (isAwarded ? ' disabled' : '') + '>' + (isAwarded ? '✓ Awarded' : 'Award') + '</button></td></tr>';
          }).join('') + '</tbody></table></div>'
          : '<div class="card" style="text-align:center"><p class="muted">No quotes yet. Suppliers typically respond within four hours.</p></div>') +
        (awarded ? '<div class="card" style="border-color:var(--success)"><strong>✓ Quote awarded — purchase order ' + (state.createdPo || 'being generated') + '.</strong>' +
          '<p class="muted" style="font-size:12px;margin:6px 0 0">Contract terms, Incoterm and licensed delivery route were locked. Supplier has been notified and the bonded warehouse reservation is held for 48 hours.</p>' +
          '<button class="btn btn-sm" style="margin-top:10px" data-trade-tab="orders">View purchase orders →</button></div>' : '') +
      '</div>' +
    '</div>';
  }

  function tradeSuppliers() {
    var categories = ['All', 'Red Wine', 'White Wine', 'Sparkling', 'Spirits', 'Fortified'];
    var list = D.trade.suppliers.filter(function (s) {
      return state.supplierFilter === 'All' || s.categories.indexOf(state.supplierFilter) !== -1;
    });
    return '<div class="row" style="margin-bottom:16px">' + categories.map(function (c) {
      return '<button class="btn btn-sm ' + (state.supplierFilter === c ? 'btn-primary' : '') + '" data-supplier-filter="' + c + '">' + c + '</button>';
    }).join('') + '</div>' +
      '<div class="kpi-grid" style="margin-bottom:18px">' +
        '<div class="kpi"><small>Verified suppliers</small><strong>28</strong><em>9 markets</em></div>' +
        '<div class="kpi"><small>Avg. on-time</small><strong>96.5%</strong><em>SLA 95%</em></div>' +
        '<div class="kpi"><small>Quote turnaround</small><strong>3.8 h</strong><em>median</em></div>' +
        '<div class="kpi"><small>Disputes</small><strong>0.3%</strong><em>of fulfilled orders</em></div>' +
      '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>Supplier</th><th>Market</th><th>Categories</th><th>Rating</th><th>Orders</th><th>On-time</th><th>Terms</th><th>MOQ</th><th></th></tr></thead><tbody>' +
      list.map(function (s) {
        return '<tr><td><strong>' + esc(s.name) + '</strong><br><small class="muted">' + (s.verified ? '✓ Verified & licensed' : '⚠ Verification pending') + '</small></td>' +
          '<td>' + s.market + '</td><td>' + s.categories.join(', ') + '</td><td>★ ' + s.rating + '</td><td>' + s.orders + '</td><td>' + s.onTime + '%</td><td>' + s.terms + '</td><td>' + s.moq + ' cases</td>' +
          '<td><button class="btn btn-sm" data-assist="Get wholesale pricing from ' + esc(s.name) + '">Request quote</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="fine-print" style="margin-top:12px">Suppliers are onboarded with business registration, alcohol licences, tax status and bank verification. Ratings come from completed B2B orders.</p>';
  }

  function tradeOrders() {
    var pos = D.trade.pos.slice();
    var extra = state.createdPo ? [{
      id: state.createdPo, supplier: 'Awarded supplier', items: state.createdPo + ' · newly awarded',
      value: 3552, status: 'Confirmed', eta: 'Pending pickup', incoterm: 'DAP'
    }].concat(pos) : pos;
    return '<div class="kpi-grid" style="margin-bottom:18px">' +
        '<div class="kpi"><small>Open POs</small><strong>12</strong><em>4 awaiting goods</em></div>' +
        '<div class="kpi"><small>Contract value</small><strong>' + money(184600) + '</strong><em>next 60 days</em></div>' +
        '<div class="kpi"><small>On-time delivery</small><strong>96.4%</strong><em>SLA 95%</em></div>' +
        '<div class="kpi"><small>Invoices due</small><strong>' + money(42800) + '</strong><em>within 30 days</em></div>' +
      '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>PO</th><th>Supplier</th><th>Items</th><th>Value</th><th>Status</th><th>Incoterm</th><th>ETA</th><th></th></tr></thead><tbody>' +
      extra.map(function (p) {
        return '<tr><td><strong>' + p.id + '</strong></td><td>' + esc(p.supplier) + '</td><td>' + esc(p.items) + '</td><td>' + money(p.value) + '</td>' +
          '<td><span class="pill ' + (p.status === 'Delivered' ? 'green' : '') + '">' + p.status + '</span></td><td>' + p.incoterm + '</td><td>' + p.eta + '</td>' +
          '<td><button class="btn btn-sm" data-assist="Track purchase order ' + p.id + '">Track</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<section class="section card"><div class="grid grid-3">' +
        '<div><p class="eyebrow">1 · RFQ</p><p class="muted" style="font-size:12px">Buyer publishes requirements with target price, market and Incoterm.</p></div>' +
        '<div><p class="eyebrow">2 · AWARD</p><p class="muted" style="font-size:12px">Comparable quotes are ranked by landed cost, lead time and supplier reliability.</p></div>' +
        '<div><p class="eyebrow">3 · SETTLE</p><p class="muted" style="font-size:12px">Contract, invoice, bonded delivery and credit terms reconcile automatically.</p></div>' +
      '</div></section>';
  }

  function tradeCredit() {
    var used = 84200, limit = 200000, pct = Math.round(used / limit * 100);
    return '<div class="grid grid-2">' +
      '<div class="card"><p class="eyebrow">CREDIT FACILITY</p>' +
        '<div class="spread"><strong style="font-family:var(--serif);font-size:32px">' + money(limit - used) + '</strong><span class="pill gold">' + used / limit * 100 + '% utilised</span></div>' +
        '<p class="muted" style="font-size:12px">Available of ' + money(limit) + ' approved limit · reviewed quarterly</p>' +
        '<div class="meter" style="margin:14px 0"><span style="width:' + pct + '%"></span></div>' +
        '<div class="stack" style="font-size:12px">' +
          '<div class="spread"><span>Payment terms</span><strong>Net 30 / Net 45</strong></div>' +
          '<div class="spread"><span>Interest on overdue</span><strong>1.2% / month</strong></div>' +
          '<div class="spread"><span>Security</span><strong>Inventory-backed</strong></div>' +
        '</div></div>' +
      '<div class="card"><p class="eyebrow">PAYABLES AGEING</p><div class="stack">' +
        [['Current', 26400, 62], ['1–30 days', 11800, 28], ['31–60 days', 3400, 8], ['60+ days', 600, 2]].map(function (r) {
          return '<div><div class="spread" style="font-size:12px"><span>' + r[0] + '</span><strong>' + money(r[1]) + '</strong></div><div class="meter"><span style="width:' + r[2] + '%"></span></div></div>';
        }).join('') +
        '</div><p class="fine-print" style="margin-top:16px">Automated reminders at T-3 days; buyer approval required before any payment is released.</p></div>' +
      '</div>' +
      '<section class="section">' + sectionHead('Settlement methods', 'Multi-currency and regional rails, reconciled to the ledger.', null, null) +
        '<div class="grid grid-4">' + ['SEPA / SEPA Instant', 'ACH & wire', 'Local methods (iDEAL, Pix, UPI)', 'USDC (Vault design target only)'].map(function (m) {
          return '<div class="card"><strong>' + m + '</strong><p class="muted" style="font-size:11px">Available for verified B2B accounts · FX locked at confirmation.</p></div>';
        }).join('') + '</div></section>';
  }

  function viewTrade() {
    var body = state.tradeTab === 'rfqs' ? tradeRfqs()
      : state.tradeTab === 'suppliers' ? tradeSuppliers()
      : state.tradeTab === 'orders' ? tradeOrders()
      : state.tradeTab === 'credit' ? tradeCredit()
      : tradeOverview();
    return '<div class="section-head"><div><h1 class="serif" style="font-size:36px;margin:0">Vintora Trade</h1>' +
        '<p>B2B wholesale: RFQs, comparable quotes, contracts, delivery and credit — without the spreadsheets.</p></div>' +
        '<span class="pill">' + D.trade.rfqs.length + ' RFQs · ' + D.trade.suppliers.length + ' shown suppliers</span></div>' +
      tradeTabBar() + body +
      (state.rfqSent ? '<div class="card section" style="border-color:var(--success)"><strong>✓ RFQ published to verified suppliers.</strong> Quotes typically arrive within 4 hours. Trade copilot has pre-checked licensing for the selected market.</div>' : '');
  }

  function viewSeller() {
    var rows = D.products.slice(0, 6).map(function (p) {
      return '<tr><td><strong>' + esc(p.name) + '</strong><br><small class="muted">' + esc(p.region) + '</small></td><td>' + esc(p.type) + '</td><td>' + money(p.price) + '</td>' +
        '<td>' + p.stock + '</td><td>' + p.provenance + '/100</td><td>' + (p.stock < 20 ? '<span class="pill red">Replenish — 6 SKUs low</span>' : '<span class="pill green">Healthy</span>') + '</td></tr>';
    }).join('');
    return '<div class="section-head"><div><h1 class="serif" style="font-size:36px;margin:0">' + t('sellMore') + '</h1><p>One operating system for listings, wholesale, marketing and fulfilment.</p></div>' +
        '<span class="pill gold">Pro tier · $399/mo</span></div>' +
      '<div class="kpi-grid">' +
        '<div class="kpi"><small>30-day GMV</small><strong>' + money(184200) + '</strong><em>▲ 12.4%</em></div>' +
        '<div class="kpi"><small>' + t('liveListings') + '</small><strong>248</strong><em>12 awaiting review</em></div>' +
        '<div class="kpi"><small>Conversion</small><strong>3.8%</strong><em>▲ 0.4 pts</em></div>' +
        '<div class="kpi"><small>Net payout</small><strong>' + money(142600) + '</strong><em>paid 2 days ago</em></div>' +
      '</div>' +
      '<div class="grid grid-2 section">' +
        '<div class="card"><p class="eyebrow">AI LISTING ASSISTANT</p><p class="muted" style="font-size:12px">Describe the bottle. Studio drafts compliant copy, suggests a tasting fingerprint and verifies the label from a scan.</p>' +
          '<textarea id="listing-input" class="input" rows="4" placeholder="e.g. Single-vineyard Etna Rosso 2021, volcanic soils, wild strawberry, ash, 94 points, 6 months in neutral oak…" style="width:100%;resize:vertical"></textarea>' +
          '<button class="btn btn-primary" id="listing-generate" style="margin-top:10px">✧ ' + t('generateCopy') + '</button>' +
          '<div id="listing-output" class="stack" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="card"><p class="eyebrow">DEMAND SIGNALS</p><div class="stack">' +
          '<div class="spread"><span>Barolo Cannubi 2018</span><span class="pill green">Demand ▲ 28%</span></div>' +
          '<div class="spread"><span>Chablis Grand Cru 2020</span><span class="pill green">Reorder now</span></div>' +
          '<div class="spread"><span>Etna Rosso 2021</span><span class="pill">Stable</span></div>' +
          '<div class="spread"><span>Vintage Port 2017</span><span class="pill red">Overstocked</span></div>' +
          '</div><p class="fine-print" style="margin-top:18px">Forecasts: XGBoost/LightGBM with weather, event and promotion signals. Sellers approve every AI action.</p>' +
        '</div>' +
      '</div>' +
      '<section class="section">' + sectionHead('Inventory', 'Live from bonded warehouses via Vintora Flow.', 'Add listing', 'studio') +
        '<div class="table-wrap"><table><thead><tr><th>Bottle</th><th>Type</th><th>Price</th><th>Stock</th><th>Provenance</th><th>AI action</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }

  function viewRewards() {
    var tiers = [['Explorer', 0, 500], ['Connoisseur', 500, 2500], ['Sommelier', 2500, 10000], ['Icon', 10000, null]];
    return '<div class="section-head"><div><h1 class="serif" style="font-size:36px;margin:0">Vintora Rewards</h1><p>One balance across Market, Club, Trade and Vault. Points never expire while you are active.</p></div>' +
        '<span class="pill gold">✦ 3,240 ' + t('points') + '</span></div>' +
      '<div class="kpi-grid">' +
        '<div class="kpi"><small>' + t('tier') + '</small><strong>Connoisseur</strong><em>740 pts to Sommelier</em></div>' +
        '<div class="kpi"><small>Earned this year</small><strong>8,910</strong><em>from 6 modules</em></div>' +
        '<div class="kpi"><small>Redeemed</small><strong>5,670</strong><em>4 experiences</em></div>' +
        '<div class="kpi"><small>Partner offers</small><strong>12</strong><em>nearby</em></div>' +
      '</div>' +
      '<section class="section">' + sectionHead('Your journey', 'Each tier unlocks experiences, not just discounts.', null, null) +
        '<div class="tier-grid">' + tiers.map(function (r, i) {
          return '<div class="tier ' + (i === 1 ? 'popular' : '') + '"><p class="eyebrow">' + r[0].toUpperCase() + '</p><h3>' + r[1].toLocaleString() + ' pts</h3>' +
            '<p class="muted" style="font-size:12px">' + (r[2] ? 'Up to ' + r[2].toLocaleString() + ' pts' : 'Unlimited') + '</p>' +
            '<ul><li>' + (i === 1 ? 'Current tier ✓' : i < 1 ? 'Unlocked' : 'Locked') + '</li><li>Earn 1–5 pts per $1</li><li>' + (i > 1 ? 'Producer allocations' : 'Tasting invitations') + '</li></ul></div>';
        }).join('') + '</div></section>' +
      '<section class="section card"><p class="eyebrow">PARTNER NETWORK</p><div class="row">' +
        ['Fine-dining reservations', 'Hotel upgrades', 'Wine regions travel', 'Sommelier-led tastings', 'Co-branded card', 'Airport lounges'].map(function (x) {
          return '<span class="pill">' + x + '</span>';
        }).join('') + '</div><p class="fine-print" style="margin-top:14px">Insights shared with partners are anonymised and aggregated. No taste profile is ever sold.</p></section>';
  }

  function viewStudio() {
    var out = state.studioOutput;
    return '<div class="section-head"><div><h1 class="serif" style="font-size:36px;margin:0">Vintora Studio</h1><p>Generative campaigns that stay on-brand and on the right side of alcohol advertising rules.</p></div>' +
        '<span class="pill gold">Brand tier · $599/mo</span></div>' +
      '<div class="studio-grid">' +
        '<div class="card stack"><p class="eyebrow">CAMPAIGN BRIEF</p>' +
          '<label class="field"><span>Bottle</span><select id="studio-product">' + D.products.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
          '<label class="field"><span>Audience</span><select id="studio-audience"><option>Connoisseurs 35–54</option><option>Curious millennials</option><option>Gift buyers</option><option>Trade buyers</option></select></label>' +
          '<label class="field"><span>Channel</span><select id="studio-channel"><option>Email + CRM</option><option>Paid social</option><option>Product page</option><option>SMS</option></select></label>' +
          '<label class="field"><span>Brand voice · elegant ←→ playful</span><input id="studio-voice" type="range" min="0" max="100" value="40"></label>' +
          '<button class="btn btn-primary" id="studio-generate">✧ Generate campaign</button>' +
          '<div class="checklist"><p class="eyebrow" style="margin-top:10px">' + t('compliance') + '</p>' +
            '<div class="ok">✓ Age gate required on landing page</div>' +
            '<div class="ok">✓ No health or intoxication claims</div>' +
            '<div class="warn">⚠ Évin-style restrictions apply in FR — copy localised</div>' +
            '<div class="ok">✓ Audience excludes minors by configuration</div>' +
          '</div>' +
        '</div>' +
        '<div>' +
          (out ? '<div class="preview-card"><p class="eyebrow">LIVE PREVIEW · ' + esc(out.channel.toUpperCase()) + '</p>' +
              '<h3>' + esc(out.headline) + '</h3><p>' + esc(out.body) + '</p>' +
              '<button class="btn btn-gold">' + esc(out.cta) + '</button>' +
              '<p class="fine-print" style="color:#D9C9B6;margin-top:20px">Brand-voice score 92/100 · generated in 1.4s · human approval required before publishing</p></div>' +
            '<div class="card" style="margin-top:14px"><p class="eyebrow">GENERATED VARIANTS</p><div class="stack">' +
              [['A', out.headline], ['B', out.alt], ['C', 'The bottle that starts the conversation.']].map(function (v) {
                return '<div class="spread"><span><strong>' + v[0] + '</strong> · ' + esc(v[1]) + '</span><button class="btn btn-sm">Select</button></div>';
              }).join('') + '</div></div>'
            : '<div class="preview-card" style="display:grid;place-items:center;text-align:center"><div><div style="font-size:40px">✧</div><h3>Your campaign starts here</h3><p>Fill the brief and Studio will draft on-brand copy, imagery direction and a compliance report.</p></div></div>') +
        '</div>' +
      '</div>';
  }

  var ASSIST_QUICK = [
    'Reorder my last Club box',
    'Where is my delivery?',
    'Find a gift under $75',
    'Explain the Vault fee schedule',
    'How do I upgrade my Club tier?',
    'Get wholesale pricing for a restaurant'
  ];

  function assistReply(text) {
    var q = (text || '').toLowerCase();
    if (/track|delivery|where|shipment|order/.test(q)) {
      return { module: 'Vintora Flow', view: 'flow', text: 'Your order <strong>VNT-2026-482913</strong> is out for delivery in London. It left our bonded warehouse in Paris at 06:20, cleared customs at 09:45, and has stayed within 11–13°C throughout. The courier expects delivery before 18:00 today. <strong>Insurance is active to the doorstep.</strong>' };
    }
    if (/reorder|club|subscription|box/.test(q)) {
      return { module: 'Vintora Club', view: 'club', text: 'I can repeat your <strong>Better</strong> box — Etna Rosso 2021, Riesling Kabinett 2022 and one Icon-allocation surprise. Your next billing date is the 1st, and you can skip or swap any bottle before then. Shall I keep the surprise?' };
    }
    if (/gift|under \$?75|present/.test(q)) {
      return { module: 'Vintora Market', view: 'search', text: 'Three safe gifts under $75: <strong>Hibiki Harmony</strong> ($78, beautifully boxed), <strong>Mezcal Espadín</strong> ($62, for the adventurous) and <strong>Vintage Port</strong> ($88, for the collector). If the budget is firm at $75, Hibiki is the most universally liked.' };
    }
    if (/vault|fee|custody|investment/.test(q)) {
      return { module: 'Vintora Vault', view: 'vault', text: 'Vault fees are transparent: <strong>1.5% buy</strong>, <strong>2% sell</strong>, <strong>0.5% per year</strong> for insured bonded custody, and a 5–15% performance fee only above your high-water mark. There are no hidden spreads — the execution price is shown before you confirm.' };
    }
    if (/wholesale|trade|restaurant|rfq|b2b/.test(q)) {
      return { module: 'Vintora Trade', view: 'trade', text: 'For restaurant purchasing, publish an RFQ and verified suppliers quote against it. Trade copilot pre-checks Incoterms, delivery feasibility and your credit terms. Commissions are 3–8%, well below Market rates. Your account has $120k credit available.' };
    }
    return { module: 'Vintora Sommelier', view: 'sommelier', text: 'I can help with that. I route product and pairing questions to the Sommelier, orders and deliveries to Flow, and account questions to the right module. Try asking about a gift, your next Club box, a shipment, or Vault fees.' };
  }

  function viewAssist() {
    var log = state.assist.length ? state.assist.map(function (m) {
      return '<div class="bubble ' + m.role + '">' + m.text +
        (m.module ? '<div class="source">Routed to ' + m.module + ' · cross-module context shared</div>' : '') +
        (m.view ? '<div style="margin-top:8px"><button class="btn btn-sm" data-view="' + m.view + '">Open ' + m.module + ' →</button></div>' : '') +
        '</div>';
    }).join('') : '<div class="bubble bot">Hello — I am Vintora Assist, your concierge across all ten modules. I can reorder a Club box, check a Flow shipment, explain Vault fees, start a Trade RFQ or hand a tasting question to the Sommelier. What would you like me to do? <div class="source">One identity · one taste profile · one cart · one loyalty balance</div></div>';

    return '<div class="section-head"><div><h1 class="serif" style="font-size:36px;margin:0">Vintora Assist</h1>' +
        '<p>The cross-module concierge. It knows your cart, subscriptions, shipments and rewards — and hands off to the right module.</p></div>' +
        '<span class="pill green">● Online · 10 modules connected</span></div>' +
      '<div class="chat-shell">' +
        '<div class="chat-panel">' +
          '<div class="chat-head"><span class="avatar">A</span><div><strong>Assist</strong><div class="product-sub">Task router with shared customer context</div></div>' +
            '<span class="pill gold" style="margin-left:auto">6 tasks automated</span></div>' +
          '<div class="chat-log" id="assist-log">' + log + '</div>' +
          '<div class="composer">' +
            '<div class="suggestions">' + ASSIST_QUICK.map(function (s) {
              return '<button data-assist="' + esc(s) + '">' + esc(s) + '</button>';
            }).join('') + '</div>' +
            '<form class="composer-row" id="assist-form"><input id="assist-input" placeholder="Ask me to do something across Vintora…" aria-label="Message Vintora Assist" autocomplete="off">' +
              '<button class="btn btn-primary" type="submit">' + t('send') + ' →</button></form>' +
            '<div class="safety-note">Assist never makes a purchase or payment without your explicit confirmation.</div>' +
          '</div>' +
        '</div>' +
        '<aside class="stack">' +
          '<div class="card"><p class="eyebrow">CONNECTED MODULES</p><div class="stack">' +
            ['Market', 'Trade', 'Sommelier', 'Flow', 'Club', 'Vault', 'Rewards'].map(function (m) {
              return '<div class="spread" style="font-size:12px"><span>Vintora ' + m + '</span><span class="pill green">● live</span></div>';
            }).join('') +
          '</div></div>' +
          '<div class="card"><p class="eyebrow">RECENT ACTIONS</p><div class="stack" style="font-size:11px">' +
            '<div class="spread"><span>Insurance claim pre-filled</span><span class="muted">2h ago</span></div>' +
            '<div class="spread"><span>Club box swapped</span><span class="muted">3d ago</span></div>' +
            '<div class="spread"><span>Vault fee summary sent</span><span class="muted">1w ago</span></div>' +
          '</div></div>' +
        '</aside>' +
      '</div>';
  }

  function sendAssist(text) {
    if (!text || !text.trim()) return;
    var reply = assistReply(text);
    state.assist.push({ role: 'user', text: esc(text.trim()) });
    state.assist.push({ role: 'bot', text: reply.text, module: reply.module, view: reply.view });
    render();
    var log = $('#assist-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  var FLOW_SHIPMENTS = [
    { id: 'VNT-2026-482913', route: 'Paris, FR → London, UK', carrier: 'DHL Temperature Controlled', status: 'Out for delivery', progress: 5, temp: '11–13°C', insured: 482, eta: 'Today, before 18:00' },
    { id: 'VNT-2026-482447', route: 'Alba, IT → New York, US', carrier: 'FedEx Cold Chain', status: 'Customs clearance', progress: 4, temp: '11.5–12.5°C', insured: 1840, eta: '22 Nov' },
    { id: 'VNT-2026-481990', route: 'Tokyo, JP → Singapore, SG', carrier: 'Nippon Express Pharma', status: 'In transit', progress: 3, temp: '14–15°C', insured: 780, eta: '24 Nov' },
    { id: 'VNT-2026-481204', route: 'Geneva, CH → Dubai, AE', carrier: 'DHL Temperature Controlled', status: 'Delivered', progress: 6, temp: '12–12.8°C', insured: 3975, eta: 'Delivered 14 Nov' }
  ];

  var FLOW_STEPS = ['Created', 'Picked', 'In transit', 'Customs', 'Out for delivery', 'Delivered'];

  function viewFlow() {
    var feature = FLOW_SHIPMENTS[0];
    var temps = [12.1, 12.4, 11.8, 12.6, 12.2, 11.9, 12.5, 12.0, 12.3, 11.7];
    return '<div class="section-head"><div><h1 class="serif" style="font-size:36px;margin:0">Vintora Flow</h1>' +
        '<p>Temperature-controlled, insured, customs-ready logistics across 40+ bonded warehouses.</p></div>' +
        '<span class="pill green">● No excursions in the last 30 days</span></div>' +
      '<div class="kpi-grid">' +
        '<div class="kpi"><small>Active shipments</small><strong>1,284</strong><em>18 markets today</em></div>' +
        '<div class="kpi"><small>On-time delivery</small><strong>96.4%</strong><em>SLA 95%</em></div>' +
        '<div class="kpi"><small>Insured value</small><strong>' + money(7200000) + '</strong><em>in transit</em></div>' +
        '<div class="kpi"><small>Avg. journey</small><strong>4.2 days</strong><em>cross-border</em></div>' +
      '</div>' +
      '<section class="section card">' +
        '<div class="spread"><div><p class="eyebrow">FEATURED SHIPMENT · ' + feature.id + '</p>' +
          '<h2 class="serif" style="margin:0">' + feature.route + '</h2>' +
          '<p class="muted" style="margin:4px 0 0">' + feature.carrier + ' · insured to ' + money(feature.insured) + '</p></div>' +
          '<span class="pill gold">' + feature.status + '</span></div>' +
        '<div class="row" style="margin:22px 0;gap:0">' + FLOW_STEPS.map(function (step, i) {
          var done = i < feature.progress - 1;
          var active = i === feature.progress - 1;
          return '<div style="flex:1;text-align:center;position:relative">' +
            '<div style="margin:0 auto 6px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:10px;' +
              (done ? 'background:var(--success);color:#fff' : active ? 'background:var(--gold);color:#2A1E05' : 'background:var(--surface-2);color:var(--text-muted)') + '">' +
              (done ? '✓' : i + 1) + '</div>' +
            '<small style="font-size:9px;color:' + (active ? 'var(--text)' : 'var(--text-muted)') + '">' + step + '</small></div>';
        }).join('') + '</div>' +
        '<div class="grid grid-2">' +
          '<div><strong>Cold chain · last 10 readings</strong><div class="chart" style="height:120px">' +
            temps.map(function (v, i) { return '<div class="bar" style="height:' + Math.round((v - 11) * 70) + '%"><em>' + v + '°</em><span>T' + (i + 1) + '</span></div>'; }).join('') +
          '</div></div>' +
          '<div><strong>Customs &amp; compliance</strong><div class="checklist" style="margin-top:10px">' +
            '<div class="ok">✓ Export licence and commercial invoice attached</div>' +
            '<div class="ok">✓ Destination age and import rules verified</div>' +
            '<div class="ok">✓ Bonded custody transfer recorded</div>' +
            '<div class="ok">✓ Duty and tax prepaid — DDP</div>' +
          '</div><p class="fine-print" style="margin-top:14px">ETA ' + feature.eta + '. Customer receives a live tracking link at every milestone.</p></div>' +
        '</div>' +
      '</section>' +
      '<section class="section">' + sectionHead('All shipments', 'Live status from carrier and warehouse events.', 'Ask Assist', 'assist') +
        '<div class="table-wrap"><table><thead><tr><th>Order</th><th>Route</th><th>Carrier</th><th>Temperature</th><th>Insured value</th><th>ETA</th></tr></thead><tbody>' +
        FLOW_SHIPMENTS.map(function (s) {
          return '<tr><td><strong>' + s.id + '</strong><br><small class="muted">' + s.status + '</small></td><td>' + s.route + '</td><td>' + s.carrier + '</td>' +
            '<td>' + s.temp + '</td><td>' + money(s.insured) + '</td><td>' + s.eta + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
  }

  function viewConfirmation() {
    return '<div class="card" style="text-align:center;padding:60px 20px;max-width:640px;margin:40px auto">' +
      '<div style="font-size:52px">✓</div><h1 class="serif">Order confirmed</h1>' +
      '<p class="muted">Your age verification, payment authorisation and bondedwarehouse reservation all passed.</p>' +
      '<div class="stack" style="text-align:left;max-width:380px;margin:24px auto">' +
        '<div class="spread"><span>Order</span><strong>VNT-2026-' + Math.floor(100000 + Math.random() * 900000) + '</strong></div>' +
        '<div class="spread"><span>Items</span><strong>' + esc(Object.keys(state.cart).reduce(function (a, id) { return a + state.cart[id]; }, 0)) + '</strong></div>' +
        '<div class="spread"><span>Delivery</span><strong>Temperature-controlled · insured</strong></div>' +
        '<div class="spread"><span>FX</span><strong>Locked at ' + esc(state.currency) + '</strong></div>' +
      '</div>' +
      '<button class="btn btn-primary" data-view="home">Continue exploring →</button>' +
      '<p class="fine-print" style="margin-top:16px">' + t('demo') + '</p>' +
      '</div>';
  }

  /* ---------------- internal admin control center (interactive prototype) ---------------- */

  var ADMIN_SECTIONS = [
    ['overview', '⌂', 'ADM-01 Overview'], ['users', '◉', 'ADM-02 Users'],
    ['sellers', '▤', 'ADM-03 Sellers'], ['orders', '▣', 'ADM-04 Orders'],
    ['logistics', '➤', 'ADM-05 Logistics'], ['payments', '◈', 'ADM-06 Payments'],
    ['campaigns', '✧', 'ADM-07 Campaigns'], ['ai', '◇', 'ADM-08 AI Systems'],
    ['cases', '☷', 'ADM-09 Cases & Audit'], ['access', '⚿', 'ADM-10 Access & Settings']
  ];
  var ADMIN_APPROVERS = ['finance_ops', 'seller_ops', 'ai_ops', 'growth_ops', 'auditor'];

  function adminSeedData() {
    return {
      tab: 'overview', query: '', severity: 'All', status: 'All', market: 'All',
      selectedCase: 'case-901', actor: 'ops_support', approver: 'finance_ops',
      elevated: false, breakGlass: false, seconds: 900, killSwitch: false,
      clock: 872, reason: '',
      cases: [
        { id: 'case-901', domain: 'orders', severity: 'P1', sla: '12m', status: 'open', assignee: 'unassigned', market: 'US', entity: 'ord-88117', summary: 'Refund above threshold', detail: 'Buyer requested a refund after a delivery delay. Payment is captured; age, KYC and licence checks cleared at checkout.' },
        { id: 'case-897', domain: 'payments', severity: 'P2', sla: '1h 20m', status: 'assigned', assignee: 'finance_ops', market: 'GB', entity: 'pay-77101', summary: 'Chargeback response due', detail: 'SEPA settlement shows an open dispute. Processor evidence pack is pending representment.' },
        { id: 'case-884', domain: 'campaigns', severity: 'P3', sla: '3h', status: 'open', assignee: 'unassigned', market: 'SG', entity: 'cmp-4402', summary: 'Creative flagged WARN', detail: 'Generated email creative has a brand-voice warning. No publish is permitted until a named human acknowledges it.' },
        { id: 'case-879', domain: 'sellers', severity: 'P2', sla: '45m', status: 'in_progress', assignee: 'seller_ops', market: 'FR', entity: 'sel-882', summary: 'Licence expiring', detail: 'Seller licence expires in 14 days. Payout hold is recommended pending verification.' },
        { id: 'case-871', domain: 'ai', severity: 'P1', sla: '8m', status: 'escalated', assignee: 'ai_ops', market: 'Global', entity: 'forecast-v7', summary: 'Model drift detected', detail: 'Canary model breached its drift gate. Automatic fallback to champion is available.' }
      ],
      approvals: [
        { id: 'apr-441', action: 'Refund $1,180', tier: 'T3', requester: 'ops_support', status: 'pending', reason: 'Delivery exception — case-901', entity: 'case-901' },
        { id: 'apr-438', action: 'Suspend seller + payout hold', tier: 'T3', requester: 'seller_ops', status: 'pending', reason: 'Licence verification failed', entity: 'sel-882' },
        { id: 'apr-435', action: 'Promote model to production', tier: 'T4', requester: 'ai_ops', status: 'pending', reason: 'Eval gates passed', entity: 'studio-voice v2.1' }
      ],
      models: [
        { key: 'sommelier-rank', version: 'v9.2', stage: 'champion', status: 'active', drift: 'none', cap: '$12k/mo' },
        { key: 'forecast-v7', version: 'v7.4', stage: 'canary', status: 'halted', drift: 'detected', cap: '$8k/mo' },
        { key: 'studio-voice', version: 'v2.1', stage: 'shadow', status: 'active', drift: 'none', cap: '$5k/mo' },
        { key: 'growth-planner', version: 'v1.3', stage: 'shadow', status: 'active', drift: 'none', cap: '$4k/mo' }
      ],
      audit: [
        { time: '14:31', actor: 'finance_ops', action: 'Payout hold · seller-882', tier: 'T3', detail: 'Approved by ai_ops · evidence case-879' },
        { time: '14:28', actor: 'ai_ops', action: 'Halt model forecast-v7', tier: 'T4', detail: 'Drift gate breach · fallback to champion' },
        { time: '14:22', actor: 'ops_support', action: 'Refund initiated · case-901', tier: 'T3', detail: 'Pending dual approval' },
        { time: '14:09', actor: 'growth_ops', action: 'Campaign paused · cmp-4402', tier: 'T2', detail: 'Compliance WARN acknowledged by human' },
        { time: '13:54', actor: 'auditor', action: 'Evidence export', tier: 'T4', detail: 'Hash manifest generated' }
      ]
    };
  }

  var adminState = (function () {
    try {
      var raw = localStorage.getItem('vintora.admin.prototype');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable — use seed */ }
    return adminSeedData();
  })();

  function adminPersist() {
    try { localStorage.setItem('vintora.admin.prototype', JSON.stringify(adminState)); } catch (e) { /* ignore */ }
  }
  function adminFmt(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function adminTime() {
    var h = Math.floor(adminState.clock / 60) % 24, m = adminState.clock % 60;
    adminState.clock++;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function adminLog(action, tier, detail) {
    adminState.audit.unshift({ time: adminTime(), actor: adminState.actor, action: action, tier: tier || 'T1', detail: detail || '' });
    if (adminState.audit.length > 40) adminState.audit.length = 40;
    adminPersist();
  }
  function adminHash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return 'sha-sim-' + ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function adminPill(text, kind) { return '<span class="pill ' + (kind || '') + '">' + esc(text) + '</span>'; }
  function adminTable(heads, rows) {
    return '<div class="table-wrap"><table><thead><tr>' + heads.map(function (h) {
      return '<th>' + esc(h) + '</th>';
    }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  }
  function adminTr(attrs, cells) {
    return '<tr ' + attrs + '>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
  }
  function adminAttrs(o) {
    return Object.keys(o).map(function (k) { return 'data-' + k + '="' + esc(o[k]) + '"'; }).join(' ');
  }
  function adminRowAttrs(o) {
    var a = { 'admin-row': '', 'search-text': o.text || '', severity: o.severity || '', status: o.status || '', market: o.market || '' };
    if (o.select) a['admin-select'] = o.select;
    return adminAttrs(a);
  }
  function adminBar(label, value, pct, kind) {
    return '<div class="admin-bar"><span>' + esc(label) + '</span><div class="admin-bar-track"><div class="admin-bar-fill ' + (kind || '') + '" style="width:' + Math.max(0, Math.min(100, pct)) + '%"></div></div><strong>' + esc(value) + '</strong></div>';
  }
  function adminGuard(reason, approver, tier) {
    if (tier === 'T3' || tier === 'T4') {
      if (!reason || !reason.trim()) { toast('Reason is required for ' + tier + ' actions'); return false; }
      if (!approver || approver === adminState.actor) { toast('A distinct approver is required — requester cannot approve'); return false; }
    }
    return true;
  }
  function adminFields() {
    return '<div class="admin-fields">' +
      '<label class="admin-field">Reason / evidence<textarea id="admin-reason" rows="2" placeholder="Required for T3/T4 actions">' + esc(adminState.reason || '') + '</textarea></label>' +
      '<label class="admin-field">Approver<select id="admin-approver">' + ADMIN_APPROVERS.map(function (a) {
        return '<option value="' + a + '"' + (adminState.approver === a ? ' selected' : '') + '>' + a + '</option>';
      }).join('') + '</select></label></div>';
  }

  function adminApplyFilters() {
    var q = (adminState.query || '').toLowerCase();
    $$('[data-admin-row]').forEach(function (row) {
      var hay = (row.getAttribute('data-search-text') || '').toLowerCase();
      var sev = row.getAttribute('data-severity') || '';
      var st = row.getAttribute('data-status') || '';
      var mk = row.getAttribute('data-market') || '';
      var ok = (!q || hay.indexOf(q) >= 0) &&
        (adminState.severity === 'All' || sev === adminState.severity) &&
        (adminState.status === 'All' || st === adminState.status) &&
        (adminState.market === 'All' || mk === adminState.market || mk === 'Global');
      row.hidden = !ok;
    });
  }

  function adminExport() {
    var manifest = { hash: adminHash(JSON.stringify(adminState.audit)), records: adminState.audit.length };
    var payload = {
      exportedBy: adminState.actor,
      note: 'Simulated evidence export — no live system data',
      cases: adminState.cases, approvals: adminState.approvals,
      audit: adminState.audit, manifest: manifest
    };
    try {
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'vintora-admin-evidence.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) { /* download unavailable in some contexts */ }
    adminLog('Evidence export', 'T4', 'manifest ' + manifest.hash + ' · ' + manifest.records + ' records');
    toast('✓ Evidence manifest exported (simulated)');
    render();
  }

  function adminCommandHTML() {
    return '<div class="admin-command" id="admin-command"><div class="admin-command-card">' +
      '<p class="eyebrow">Command palette · prototype</p>' +
      '<input id="admin-command-input" placeholder="Jump to a screen or run an action…" aria-label="Admin command">' +
      '<div class="admin-command-group"><p class="fine-print">SCREENS</p><div class="row">' +
        ADMIN_SECTIONS.map(function (s) {
          return '<button class="btn btn-sm btn-ghost" data-command-action="goto" data-id="' + s[0] + '">' + esc(s[2]) + '</button>';
        }).join('') + '</div></div>' +
      '<div class="admin-command-group"><p class="fine-print">ACTIONS</p><div class="row">' +
        '<button class="btn btn-sm" data-command-action="action" data-id="elevate">Request elevation</button>' +
        '<button class="btn btn-sm" data-command-action="action" data-id="kill">Toggle kill switch</button>' +
        '<button class="btn btn-sm" data-command-action="action" data-id="export">Export evidence</button>' +
        '<button class="btn btn-sm btn-ghost" data-command-action="action" data-id="close-command">Close</button>' +
      '</div></div></div></div>';
  }

  function adminSection() {
    var s = adminState;
    if (s.tab === 'overview') {
      var p1 = s.cases.filter(function (c) { return c.severity === 'P1' && c.status !== 'closed'; }).length;
      var p2 = s.cases.filter(function (c) { return c.severity === 'P2' && c.status !== 'closed'; }).length;
      var pending = s.approvals.filter(function (a) { return a.status === 'pending'; }).length;
      return '<div class="kpi-grid">' +
          '<div class="kpi"><small>Users · 24h</small><strong>2.4M</strong><em>▲ 0.8% (demo)</em></div>' +
          '<div class="kpi"><small>Sellers · 24h</small><strong>18,420</strong><em>▲ 2.1% (demo)</em></div>' +
          '<div class="kpi"><small>Orders · 24h</small><strong>91,208</strong><em>▼ 1.4% (demo)</em></div>' +
          '<div class="kpi"><small>Payments OK</small><strong>99.2%</strong><em>▲ 0.1pp (demo)</em></div>' +
        '</div>' +
        '<div class="grid grid-2 section">' +
          '<div class="card"><p class="eyebrow">Case pressure</p>' +
            adminBar('P1 · critical', String(p1), p1 * 25, 'red') +
            adminBar('P2 · high', String(p2), p2 * 20, 'gold') +
            adminBar('Pending approvals', String(pending), pending * 25, '') +
            '<p class="fine-print">Every KPI links to a filtered queue in production. Values here are deterministic demo data.</p>' +
          '</div>' +
          '<div class="card"><p class="eyebrow">Advertising cap</p>' +
            adminBar('Spend vs revenue', '7.4% / 8.0%', 92.5, 'green') +
            '<p class="fine-print">Hard cap enforced at allocation and per-spend increment. Breach pauses campaigns automatically.</p>' +
            '<div class="row" style="margin-top:12px"><button class="btn btn-sm" data-admin-action="goto" data-id="cases">Open case queue →</button>' +
            '<button class="btn btn-sm btn-ghost" data-admin-action="action" data-id="export">Export evidence</button></div>' +
          '</div>' +
        '</div>' +
        '<div class="grid grid-2 section">' +
          '<div class="card"><p class="eyebrow">Approvals awaiting release</p>' +
            adminTable(['ID', 'Action', 'Tier', 'Status'], s.approvals.map(function (a) {
              return adminTr(adminAttrs({ 'admin-row': '', 'search-text': a.action + ' ' + a.id }), [
                esc(a.id), esc(a.action), adminPill(a.tier, a.tier === 'T4' ? 'red' : 'gold'),
                a.status === 'pending' ? adminPill('Pending', 'gold') : adminPill(a.status, 'green')
              ]);
            })) +
          '</div>' +
          '<div class="card"><p class="eyebrow">Recent privileged actions</p>' +
            adminTable(['Time', 'Actor', 'Action', 'Tier'], s.audit.slice(0, 5).map(function (a) {
              return adminTr(adminAttrs({ 'admin-row': '', 'search-text': a.actor + ' ' + a.action }), [
                esc(a.time), esc(a.actor), esc(a.action), adminPill(a.tier, a.tier === 'T4' ? 'red' : '')
              ]);
            })) +
          '</div>' +
        '</div>';
    }

    if (s.tab === 'users') {
      var users = [
        ['usr_1042', 'US', 'verified', '21+', 'none', 'Active', 'US'],
        ['usr_2077', 'GB', 'review', '18+', 'velocity', 'Under review', 'GB'],
        ['usr_3188', 'SG', 'verified', '18+', 'none', 'Active', 'SG'],
        ['usr_4410', 'AE', 'pending', '—', 'documents', 'Restricted', 'AE']
      ];
      return '<div class="card"><p class="eyebrow">ADM-02 · Identity & safety</p>' +
        adminTable(['User', 'Market', 'KYC', 'Age', 'Flag', 'Status', 'Action'], users.map(function (u) {
          return adminTr(adminRowAttrs({ text: u.join(' '), status: u[5], market: u[6] }), [
            '<code>' + esc(u[0]) + '</code>', esc(u[1]), esc(u[2]), esc(u[3]), esc(u[4]),
            adminPill(u[5], u[5] === 'Restricted' ? 'red' : u[5] === 'Active' ? 'green' : 'gold'),
            '<button class="btn btn-sm btn-ghost" data-admin-action="log-review" data-id="' + esc(u[0]) + '">Reveal PII / review</button>'
          ]);
        })) +
        '<p class="fine-print">PII is masked by default. Revealing it records a purpose in the append-only audit. Erasure is handed off to the Identity pipeline.</p></div>';
    }

    if (s.tab === 'sellers') {
      var sellers = [
        ['sel-110', 'Château Bellevue', '$399', 'valid', 'clear', '0.2%', 'Approved', 'FR'],
        ['sel-882', 'Napa Collective', '$999', 'expiring', 'hold', '1.8%', 'Review', 'US'],
        ['sel-301', 'Loire Selections', '$99', 'valid', 'clear', '0.0%', 'Approved', 'FR']
      ];
      return '<div class="card"><p class="eyebrow">ADM-03 · Merchant compliance</p>' +
        adminTable(['Seller', 'Legal name', 'Tier', 'Licence', 'Payout', 'Disputes', 'Status', 'Action'], sellers.map(function (x) {
          return adminTr(adminRowAttrs({ text: x.join(' '), status: x[6], market: x[7] }), [
            '<code>' + esc(x[0]) + '</code>', esc(x[1]), esc(x[2]), esc(x[3]), esc(x[4]), esc(x[5]),
            adminPill(x[6], x[6] === 'Approved' ? 'green' : 'gold'),
            '<button class="btn btn-sm btn-ghost" data-admin-action="log-review" data-id="' + esc(x[0]) + '">Review</button>'
          ]);
        })) +
        '<p class="fine-print">Suspension is T3: dual approval, automatic payout hold and a case record.</p></div>';
    }

    if (s.tab === 'orders') {
      var orders = [
        ['ord-88120', 'usr_1042', '$420', 'stuck', '18m', 'Low', 'US'],
        ['ord-88117', 'usr_2077', '$1,180', 'refund requested', '42m', 'High', 'GB'],
        ['ord-88103', 'usr_3188', '$96', 'in fulfilment', '2h', 'Low', 'SG']
      ];
      return '<div class="card"><p class="eyebrow">ADM-04 · Order exceptions</p>' +
        adminTable(['Order', 'Buyer', 'Value', 'State', 'SLA', 'Risk', 'Action'], orders.map(function (o) {
          return adminTr(adminRowAttrs({ text: o.join(' '), status: o[3], market: o[6] }), [
            '<code>' + esc(o[0]) + '</code>', esc(o[1]), esc(o[2]), esc(o[3]), esc(o[4]),
            adminPill(o[5], o[5] === 'High' ? 'red' : ''),
            '<button class="btn btn-sm btn-ghost" data-admin-action="log-review" data-id="' + esc(o[0]) + '">Inspect</button>'
          ]);
        })) +
        '<p class="fine-print">Refunds above threshold require human approval and execute through the Payments service — never a direct DB edit.</p></div>';
    }

    if (s.tab === 'logistics') {
      var ships = [
        ['shp-5510', 'DHL', 'in transit', 'in range', '2d', 'None', 'US'],
        ['shp-5508', 'FedEx', 'delayed', 'excursion', '4d', 'Claim', 'GB'],
        ['shp-5499', 'UPS', 'delivered', 'in range', '—', 'None', 'SG']
      ];
      return '<div class="card"><p class="eyebrow">ADM-05 · Vintora Flow</p>' +
        adminTable(['Shipment', 'Carrier', 'State', 'Temperature', 'ETA', 'Exception', 'Action'], ships.map(function (x) {
          return adminTr(adminRowAttrs({ text: x.join(' '), status: x[2], market: x[6] }), [
            '<code>' + esc(x[0]) + '</code>', esc(x[1]), esc(x[2]), esc(x[3]), esc(x[4]),
            adminPill(x[5], x[5] === 'Claim' ? 'gold' : ''),
            '<button class="btn btn-sm btn-ghost" data-admin-action="log-review" data-id="' + esc(x[0]) + '">Escalate</button>'
          ]);
        })) +
        '<p class="fine-print">Insurance claims reference insured value; no manual payout is made from the admin surface.</p></div>';
    }

    if (s.tab === 'payments') {
      var pays = [
        ['pay-77120', 'Stripe · card', '$420', 'captured', 'none', '7.4%', 'US'],
        ['pay-77118', 'PayPal', '$96', 'requires action', 'none', '7.4%', 'GB'],
        ['pay-77101', 'SEPA transfer', '$1,180', 'settled', 'open', '7.4%', 'FR']
      ];
      return '<div class="card"><p class="eyebrow">ADM-06 · Global Payments</p>' +
        adminTable(['Payment', 'Method', 'Amount', 'Status', 'Dispute', 'Cap', 'Action'], pays.map(function (x) {
          return adminTr(adminRowAttrs({ text: x.join(' '), status: x[3], market: x[6] }), [
            '<code>' + esc(x[0]) + '</code>', esc(x[1]), esc(x[2]), esc(x[3]),
            adminPill(x[4], x[4] === 'open' ? 'red' : ''), esc(x[5]),
            '<button class="btn btn-sm btn-ghost" data-admin-action="log-review" data-id="' + esc(x[0]) + '">Open dispute</button>'
          ]);
        })) +
        '<p class="fine-print">Advertising ≤ 8% of revenue. FX rates lock for 15 minutes; no stale-rate capture. Card data never appears here.</p></div>';
    }

    if (s.tab === 'campaigns') {
      var cmps = [
        ['cmp-4391', 'Autumn Rioja', 'paid social', 'PASS', '92/100', '$4,200', 'Approved', 'GB'],
        ['cmp-4402', 'Holiday Single Malt', 'email', 'WARN', '84/100', '$1,100', 'Awaiting human', 'SG'],
        ['cmp-4410', 'Spring Rosé', 'search', 'BLOCK', '71/100', '—', 'Rejected', 'US']
      ];
      return '<div class="card"><p class="eyebrow">ADM-07 · Marketing review</p>' +
        adminTable(['ID', 'Campaign', 'Channel', 'Compliance', 'Voice', 'Spend', 'Decision', 'Action'], cmps.map(function (x) {
          return adminTr(adminRowAttrs({ text: x.join(' '), status: x[6], market: x[7] }), [
            '<code>' + esc(x[0]) + '</code>', esc(x[1]), esc(x[2]),
            adminPill(x[3], x[3] === 'PASS' ? 'green' : x[3] === 'WARN' ? 'gold' : 'red'),
            esc(x[4]), esc(x[5]), adminPill(x[6], x[6] === 'Approved' ? 'green' : 'gold'),
            '<button class="btn btn-sm btn-ghost" data-admin-action="log-review" data-id="' + esc(x[0]) + '">Review</button>'
          ]);
        })) +
        '<p class="fine-print">No publish without named human approval. No health or intoxication claims. Minors are never targeted.</p></div>';
    }

    if (s.tab === 'ai') {
      return '<div class="card"><p class="eyebrow">ADM-08 · AI systems</p>' +
        (s.killSwitch ? '<div class="admin-alert">⚠ KILL SWITCH ACTIVE — all model traffic halted, fallback to champion. Propagation target &lt; 1 min.</div>' : '') +
        adminTable(['Model', 'Version', 'Stage', 'Status', 'Drift', 'Spend cap', 'Action'], s.models.map(function (m) {
          return adminTr(adminRowAttrs({ text: [m.key, m.version, m.stage].join(' '), status: m.status, market: 'Global' }), [
            '<code>' + esc(m.key) + '</code>', esc(m.version), esc(m.stage),
            adminPill(m.status, m.status === 'active' ? 'green' : 'red'),
            adminPill(m.drift, m.drift === 'detected' ? 'red' : ''), esc(m.cap),
            '<button class="btn btn-sm btn-ghost" data-admin-action="promote" data-id="' + esc(m.key) + '">Promote</button>'
          ]);
        })) +
        adminFields() +
        '<div class="row" style="margin-top:14px">' +
          '<button class="btn btn-sm" data-admin-action="kill" data-id="all">' + (s.killSwitch ? 'Resume models' : 'Activate kill switch') + '</button>' +
          '<button class="btn btn-sm btn-ghost" data-admin-action="log-review" data-id="model-governance">Open model card</button>' +
        '</div>' +
        '<p class="fine-print">Production promote is T4 dual approval. Requires reason + a distinct approver. No autonomous writes to financial or identity systems.</p></div>';
    }

    if (s.tab === 'cases') {
      var c = null;
      for (var i = 0; i < s.cases.length; i++) if (s.cases[i].id === s.selectedCase) c = s.cases[i];
      if (!c) c = s.cases[0];
      var detail = '<div class="card admin-detail"><p class="eyebrow">Selected case · ' + esc(c.id) + '</p>' +
        '<h3>' + esc(c.summary) + '</h3><p>' + esc(c.detail) + '</p>' +
        '<div class="row">' + adminPill(c.severity, c.severity === 'P1' ? 'red' : 'gold') +
          adminPill(c.status, c.status === 'open' ? 'gold' : '') + '<span class="fine-print">SLA ' + esc(c.sla) + ' · ' + esc(c.assignee) + '</span></div>' +
        adminFields() +
        '<div class="row" style="margin-top:14px">' +
          '<button class="btn btn-sm" data-admin-action="assign" data-id="' + esc(c.id) + '">Assign to me</button>' +
          '<button class="btn btn-sm" data-admin-action="resolve" data-id="' + esc(c.id) + '">Resolve</button>' +
          '<button class="btn btn-sm btn-ghost" data-admin-action="escalate" data-id="' + esc(c.id) + '">Escalate</button>' +
        '</div></div>';
      return '<div class="card"><p class="eyebrow">ADM-09 · Unified case queue</p>' +
        adminTable(['Case', 'Domain', 'Severity', 'SLA', 'Assignee', 'Status', 'Market'], s.cases.map(function (x) {
          return adminTr(adminRowAttrs({ text: [x.id, x.domain, x.summary, x.assignee].join(' '), severity: x.severity, status: x.status, market: x.market, select: x.id }), [
            '<code>' + esc(x.id) + '</code>', esc(x.domain),
            adminPill(x.severity, x.severity === 'P1' ? 'red' : 'gold'), esc(x.sla),
            esc(x.assignee), adminPill(x.status, x.status === 'open' ? 'gold' : ''), esc(x.market)
          ]);
        })) + '</div>' +
        '<div class="grid grid-2 section">' + detail +
          '<div class="card"><p class="eyebrow">Approval inbox</p>' +
            adminTable(['ID', 'Action', 'Tier', 'Status', 'Decision'], s.approvals.map(function (a) {
              return adminTr(adminAttrs({ 'admin-row': '', 'search-text': a.id + ' ' + a.action }), [
                '<code>' + esc(a.id) + '</code>', esc(a.action), adminPill(a.tier, 'gold'),
                adminPill(a.status, a.status === 'pending' ? 'gold' : 'green'),
                a.status === 'pending'
                  ? '<button class="btn btn-sm" data-admin-action="approve" data-id="' + esc(a.id) + '">Approve</button> ' +
                    '<button class="btn btn-sm btn-ghost" data-admin-action="reject" data-id="' + esc(a.id) + '">Reject</button>'
                  : '<span class="fine-print">' + esc(a.status) + '</span>'
              ]);
            })) +
            '<p class="fine-print">Requester can never approve their own action. T3/T4 require reason + distinct approver.</p>' +
          '</div>' +
        '</div>' +
        '<div class="card section"><div class="section-head"><div><p class="eyebrow">Append-only action log</p><p>' + s.audit.length + ' simulated records</p></div>' +
          '<button class="btn btn-sm btn-ghost" data-admin-action="export" data-id="audit">Export evidence</button></div>' +
          adminTable(['Time', 'Actor', 'Action', 'Tier', 'Detail'], s.audit.map(function (a) {
            return adminTr(adminAttrs({ 'admin-row': '', 'search-text': a.actor + ' ' + a.action + ' ' + a.detail }), [
              esc(a.time), esc(a.actor), esc(a.action), adminPill(a.tier, a.tier === 'T4' ? 'red' : ''), esc(a.detail)
            ]);
          })) +
        '</div>';
    }

    return '<div class="card"><p class="eyebrow">ADM-10 · Access & settings</p>' +
      '<div class="row">' +
        '<button class="btn btn-sm" data-admin-action="elevate" data-id="self">Request JIT elevation</button>' +
        '<button class="btn btn-sm" data-admin-action="breakglass" data-id="self">Break glass (2h)</button>' +
        '<button class="btn btn-sm btn-ghost" data-admin-action="extend" data-id="self">Extend with MFA</button>' +
        '<button class="btn btn-sm btn-ghost" data-admin-action="demote" data-id="self">End session</button>' +
        '<button class="btn btn-sm btn-ghost" data-admin-action="reset" data-id="self">Reset demo data</button>' +
      '</div>' + adminFields() +
      '<p class="fine-print">SSO + hardware MFA, time-boxed break-glass, read-only impersonation, quarterly recertification. Admin roles never bypass RLS.</p>' +
      adminTable(['Role', 'Domains', 'Scope', 'Elevation', 'Review'], [
        adminTr(adminAttrs({ 'admin-row': '', 'search-text': 'super_admin all global JIT MFA' }), ['<code>super_admin</code>', 'all', 'global', 'JIT + MFA', 'Q3 2027']),
        adminTr(adminAttrs({ 'admin-row': '', 'search-text': 'finance_ops payments sellers tenant dual' }), ['<code>finance_ops</code>', 'payments, sellers', 'tenant', 'T3 dual', 'Q3 2027']),
        adminTr(adminAttrs({ 'admin-row': '', 'search-text': 'auditor all read global none' }), ['<code>auditor</code>', 'all (read)', 'global', 'none', 'Q3 2027'])
      ]) + '</div>';
  }

  function adminHandle(action, id) {
    var reasonEl = document.getElementById('admin-reason');
    var approverEl = document.getElementById('admin-approver');
    var reason = reasonEl ? reasonEl.value : '';
    var approver = approverEl ? approverEl.value : adminState.approver;
    adminState.reason = reason || '';
    adminState.approver = approver || adminState.approver;
    var i, x;

    if (action === 'goto') { adminState.tab = id; adminPersist(); render(); return; }
    if (action === 'command') {
      var host = document.getElementById('admin-command-host');
      if (host) { host.innerHTML = adminCommandHTML(); var input = document.getElementById('admin-command-input'); if (input) input.focus(); }
      toast('Command palette opened — simulated'); return;
    }
    if (action === 'close-command') { var h = document.getElementById('admin-command-host'); if (h) h.innerHTML = ''; return; }
    if (action === 'export') { adminExport(); return; }
    if (action === 'reset') {
      adminState = adminSeedData(); adminPersist(); render(); toast('↺ Admin demo data reset'); return;
    }
    if (action === 'elevate') {
      adminState.elevated = true; adminState.seconds = 900; adminLog('JIT elevation', 'T2', id + ' · scope all');
      adminPersist(); render(); toast('✓ Elevated for 15:00 — simulated'); return;
    }
    if (action === 'breakglass') {
      if (!adminGuard(reason, approver, 'T4')) return;
      adminState.elevated = true; adminState.breakGlass = true; adminState.seconds = 7200;
      adminLog('Break-glass session', 'T4', 'approver ' + approver + ' · 2h · ' + reason);
      adminPersist(); render(); toast('⚠ Break-glass active for 2h — simulated'); return;
    }
    if (action === 'extend') {
      adminState.seconds = adminState.breakGlass ? 7200 : 900;
      adminLog('Elevation extended', 'T1', 'MFA re-verified'); adminPersist(); render(); toast('✓ Session extended — simulated'); return;
    }
    if (action === 'demote') {
      adminState.elevated = false; adminState.breakGlass = false; adminState.seconds = 900;
      adminLog('Session ended', 'T1', 'auto-demote simulated'); adminPersist(); render(); toast('Session ended'); return;
    }
    if (action === 'kill') {
      adminState.killSwitch = !adminState.killSwitch;
      for (i = 0; i < adminState.models.length; i++) {
        adminState.models[i].status = adminState.killSwitch ? 'halted' : (adminState.models[i].key === 'forecast-v7' ? 'halted' : 'active');
      }
      adminLog(adminState.killSwitch ? 'Kill switch activated' : 'Models resumed', 'T4', 'all models · fallback champion');
      adminPersist(); render(); toast(adminState.killSwitch ? '⚠ Kill switch active — simulated' : '✓ Models resumed — simulated'); return;
    }
    if (action === 'promote') {
      if (!adminGuard(reason, approver, 'T4')) return;
      for (i = 0; i < adminState.models.length; i++) if (adminState.models[i].key === id) adminState.models[i].stage = 'champion';
      adminLog('Promote model ' + id, 'T4', 'approver ' + approver + ' · ' + reason);
      adminPersist(); render(); toast('✓ Promotion approved — simulated'); return;
    }
    if (action === 'approve' || action === 'reject') {
      var a = null;
      for (i = 0; i < adminState.approvals.length; i++) if (adminState.approvals[i].id === id) a = adminState.approvals[i];
      if (!a) return;
      if (!adminGuard(reason, approver, a.tier)) return;
      a.status = action === 'approve' ? 'approved' : 'rejected';
      adminLog((action === 'approve' ? 'Approved ' : 'Rejected ') + a.action, a.tier, 'approver ' + approver + ' · ' + reason);
      adminPersist(); render(); toast((action === 'approve' ? '✓ Approved: ' : '✕ Rejected: ') + a.action + ' (simulated)'); return;
    }
    if (action === 'assign' || action === 'resolve' || action === 'escalate') {
      for (i = 0; i < adminState.cases.length; i++) if (adminState.cases[i].id === id) x = adminState.cases[i];
      if (!x) return;
      if (action === 'assign') { x.assignee = adminState.actor; x.status = 'assigned'; adminLog('Assign case ' + id, 'T1', x.assignee); }
      if (action === 'resolve') {
        if (!reason || !reason.trim()) { toast('A resolution reason is required'); return; }
        x.status = 'resolved'; adminLog('Resolve case ' + id, 'T2', reason);
      }
      if (action === 'escalate') {
        x.severity = x.severity === 'P3' ? 'P2' : 'P1'; x.status = 'escalated';
        adminLog('Escalate case ' + id, 'T2', 'severity ' + x.severity);
      }
      adminPersist(); render(); toast('✓ Case ' + id + ' updated — simulated'); return;
    }
    if (action === 'log-review') {
      if (id === 'model-governance') { toast('Model card: owner ai_ops · eval gates pass · SLO < 1 min halt'); return; }
      adminLog('Review ' + id, 'T1', 'PII masked · purpose recorded');
      adminPersist(); render(); toast('✓ Review logged — simulated, no record changed'); return;
    }
  }

  function viewAdmin() {
    var s = adminState;
    var side = ADMIN_SECTIONS.map(function (x) {
      return '<button class="' + (s.tab === x[0] ? 'active' : '') + '" data-admin-tab="' + x[0] + '"><span aria-hidden="true">' + x[1] + '</span><small>' + esc(x[2]) + '</small></button>';
    }).join('');
    var banner = (s.elevated
      ? '<div class="admin-alert ' + (s.breakGlass ? 'danger' : '') + '">⚠ ' + (s.breakGlass ? 'BREAK-GLASS' : 'ELEVATED') +
        ' · scope all · session <strong id="admin-timer">' + adminFmt(s.seconds) + '</strong> · approver ' + esc(s.approver) + '</div>'
      : '<div class="admin-banner"><span class="pill gold">SIMULATED · NO REAL ACTIONS</span><span>Read-only by default · request elevation to enable guarded actions · all activity is logged locally.</span></div>');
    var toolbar = '<div class="admin-toolbar">' +
      '<label class="admin-field">Search<input id="admin-search" value="' + esc(s.query) + '" placeholder="Users, orders, cases, models…"></label>' +
      '<label class="admin-field">Severity<select id="admin-severity">' +
        ['All', 'P1', 'P2', 'P3'].map(function (v) { return '<option' + (s.severity === v ? ' selected' : '') + '>' + v + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="admin-field">Status<select id="admin-status">' +
        ['All', 'open', 'assigned', 'in_progress', 'escalated', 'resolved', 'active', 'halted'].map(function (v) { return '<option' + (s.status === v ? ' selected' : '') + '>' + v + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="admin-field">Market<select id="admin-market">' +
        ['All', 'US', 'GB', 'SG', 'FR', 'AE'].map(function (v) { return '<option' + (s.market === v ? ' selected' : '') + '>' + v + '</option>'; }).join('') +
      '</select></label>' +
      '<button class="btn btn-sm btn-ghost" data-admin-action="command" data-id="palette">⌘K</button>' +
      '</div>';
    return '<section class="section admin-shell">' +
      '<div class="section-head"><div><p class="eyebrow">Internal operations plane · not a market-facing module</p>' +
        '<h1 class="serif">VINTORA ADMIN · CONTROL CENTER</h1>' +
        '<p>Super admin console — Users, Sellers, Orders, Logistics, Payments, Marketing campaigns, AI systems.</p></div>' +
        '<button class="btn btn-ghost btn-sm" data-view="home">← Back to cellar</button></div>' +
      '<div class="admin-layout"><aside class="admin-side" aria-label="Admin sections">' + side +
        '<div class="admin-side-foot"><span class="fine-print">Actor: <strong>' + esc(s.actor) + '</strong></span>' +
        '<span class="fine-print">Tenant: all · Market: all</span></div></aside>' +
        '<div class="admin-main">' + banner + toolbar + adminSection() +
          '<p class="fine-print">Deterministic local simulation. No real users, orders, payments, campaigns or model controls are affected. ' +
          'Production design: <code>vintora/21-admin-panel-module.md</code>.</p>' +
        '</div></div>' +
      '<div id="admin-command-host"></div>' +
      '</section>';
  }

  setInterval(function () {
    if (state.view !== 'admin' || !adminState.elevated || adminState.seconds <= 0) return;
    adminState.seconds--;
    var el = document.getElementById('admin-timer');
    if (el) el.textContent = adminFmt(adminState.seconds);
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
      if ((el = ev.target.closest('[data-admin-tab]'))) { adminState.tab = el.getAttribute('data-admin-tab'); adminPersist(); render(); return; }
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
        toast('? Quote awarded � purchase order generated');
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
      if (!ev.target || ev.target.id !== 'admin-search') return;
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
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && ev.target.classList && ev.target.classList.contains('product-card')) {
        state.currentProduct = ev.target.getAttribute('data-product'); navigate('product');
      }
      if (ev.key === 'Escape' && state.view === 'product') navigate('search');
    });
  }

  /* ---------------- boot ---------------- */

  function boot() {
    load();
    $('#currency-select').innerHTML = Object.keys(D.currencies).map(function (code) {
      return '<option value="' + code + '">' + code + '</option>';
    }).join('');
    $('#currency-select').value = state.currency;
    $('#lang-select').value = state.lang;
    document.documentElement.setAttribute('data-theme', state.theme);
    initEvents();
    var deep = (window.location.hash || '').replace(/^#/, '');
    var match = window.location.search.match(/[?&]view=([^&]+)/);
    if (!deep && match) deep = decodeURIComponent(match[1]);
    if (deep === 'admin') { state.view = 'admin'; startApp(); return; }
    initAgeGate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
