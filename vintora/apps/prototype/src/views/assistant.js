/* Generated from the original zero-dependency app.js — modular ES build. */
import { state, D, esc, t, money, $, getProduct, sectionHead } from '../core.js';
import { RESPONSIBLE_DRINKING_NOTICE, RECOMMENDATION_LABEL, screenAiReply } from '../ai-safety.js';
import { render } from '../app.js';

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
        (m.module ? '<div class="source">Routed to ' + m.module + ' · cross-module context shared · ' + (m.tierLabel || 'Recommendation · no external action') + '</div>' : '') +
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
            '<div class="safety-note">Assist never makes a purchase or payment without your explicit confirmation. ' + RESPONSIBLE_DRINKING_NOTICE + '</div>' +
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
    var reply = screenAiReply(
      assistReply(text),
      'I cannot provide that action from the available sources. Ask about delivery, Club, gifting, Vault fees or Trade.'
    );
    state.assist.push({ role: 'user', text: esc(text.trim()) });
    state.assist.push({
      role: 'bot',
      text: reply.text,
      module: reply.module,
      view: reply.view,
      actionTier: reply.actionTier,
      tierLabel: reply.tierLabel,
      blocked: Boolean(reply.blocked),
    });
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
        '<div class="spread"><span>Items</span><strong>' + Object.keys(state.cart).reduce(function (a, id) { return a + state.cart[id]; }, 0) + '</strong></div>' +
        '<div class="spread"><span>Delivery</span><strong>Temperature-controlled · insured</strong></div>' +
        '<div class="spread"><span>FX</span><strong>Locked at ' + state.currency + '</strong></div>' +
      '</div>' +
      '<button class="btn btn-primary" data-view="home">Continue exploring →</button>' +
      '<p class="fine-print" style="margin-top:16px">' + t('demo') + '</p>' +
      '</div>';
  }

export { assistReply, viewAssist, sendAssist, viewFlow, viewConfirmation, ASSIST_QUICK, FLOW_SHIPMENTS, FLOW_STEPS };
