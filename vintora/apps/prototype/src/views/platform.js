/* Generated from the original zero-dependency app.js — modular ES build. */
import { state, D, esc, t, money, toast, sectionHead } from '../core.js';
import { render } from '../app.js';

  function viewSeller() {
    var rows = state.products.slice(0, 6).map(function (p) {
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
          '<label class="field"><span>Bottle</span><select id="studio-product">' + state.products.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
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


export { viewSeller, viewRewards, viewStudio };
