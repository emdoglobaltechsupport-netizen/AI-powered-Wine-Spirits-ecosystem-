/* Generated from the original zero-dependency app.js — modular ES build. */
import { state, D, esc, t, money, getProduct, sectionHead } from '../core.js';

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


export { viewClub, viewVault };
