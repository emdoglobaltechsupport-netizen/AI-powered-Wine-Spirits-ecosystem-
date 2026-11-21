/* Generated from the original zero-dependency app.js — modular ES build. */
import { state, D, esc, t, money, toast, getProduct, sectionHead } from '../core.js';
import { render } from '../app.js';

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
        '<label class="field"><span>Bottle</span><select id="rfq-product">' + state.products.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
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


export { tradeTabBar, tradeOverview, tradeRfqs, tradeSuppliers, tradeOrders, tradeCredit, viewTrade, TRADE_TABS };
