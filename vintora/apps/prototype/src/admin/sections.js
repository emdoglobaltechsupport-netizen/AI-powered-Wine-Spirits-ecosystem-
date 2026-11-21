/* =========================================================
   Vintora Admin — the 19 operations workspaces.
   All values are deterministic simulation or labelled projections.
   ========================================================= */

import { state as appState, esc } from '../core.js';
import { adminState, adminProducts, normalizeAdminTab } from './state.js';
import {
  adminPill, adminTable, adminTr, adminRowAttrs, adminSelectCell,
  adminKpis, adminPanel, adminBars, adminChecklist, adminTimeline,
  adminDetailButton, adminActionButton,
} from './components.js';

function pill(text) {
  var k = /block|critical|halted|high|fail|reject|blocked|breach|delayed|review|expiring|pending|warn|escalated|restricted|excursion|hold|claim/i.test(String(text))
    ? (/pass|resolved|approved|clear|active|valid|delivered|healthy|enforced|ready/i.test(String(text)) ? 'green' : 'red')
    : (/pass|resolved|approved|clear|active|valid|delivered|healthy|enforced|ready|low|none|settled|captured|in range/i.test(String(text)) ? 'green' : 'gold');
  return adminPill(text, k);
}

function grid(panels) { return '<div class="grid grid-2 section">' + panels.join('') + '</div>'; }

function detailButton(id, label) { return adminDetailButton(id, label); }

function statusRowAttrs(o) { return adminRowAttrs(o); }

/* ---------------- ADM-01 Super Admin Dashboard ---------------- */
function renderOverview() {
  var s = adminState;
  var openP1 = s.cases.filter(function (c) { return c.severity === 'P1' && c.status !== 'closed'; }).length;
  var pending = s.approvals.filter(function (a) { return a.status === 'pending'; }).length;
  return adminKpis([
    { label: 'Representative users · 24h', value: '2.4M', note: 'Projection · demo' },
    { label: 'Representative orders · 24h', value: '91,208', note: 'Projection · demo' },
    { label: 'Payment success · demo', value: '99.2%', note: 'Simulated' },
    { label: 'Open P1 cases', value: String(openP1), note: 'Local queue' },
  ]) +
  grid([
    adminPanel('PLATFORM PULSE', 'Control surface health', adminBars([
      ['Catalogue API', 'Nominal', 96, 'green'],
      ['Checkout adapter', 'Simulated', 88, ''],
      ['Age / KYC adapter', 'Local labels', 74, 'gold'],
      ['AI model traffic', s.killSwitch ? 'Halted' : 'Guarded', s.killSwitch ? 24 : 92, s.killSwitch ? 'red' : 'green'],
      ['Advertising cap', '7.4% / 8.0%', 92.5, 'green'],
    ]) + '<p class="fine-print">No live infrastructure telemetry is connected. Bars are deterministic design examples.</p>'),
    adminPanel('GUARDRAILS', 'Non-negotiable controls', adminChecklist([
      [true, 'Age + jurisdiction check before order acceptance'],
      [true, 'Human approval before any campaign publish'],
      [true, 'Four-eyes rule for T3/T4 privileged actions'],
      [true, 'Advertising capped at 8% of revenue'],
      [true, 'AI kill switch propagation target < 1 minute'],
      [true, 'No autonomous publishing, ad spend or email send'],
    ])),
  ]) +
  adminDataBoundary() +
  grid([
    adminPanel('CASE PRESSURE', 'Unified queue', adminBars([
      ['P1 · critical', String(openP1), openP1 * 34, 'red'],
      ['P2 · high', String(s.cases.filter(function (c) { return c.severity === 'P2'; }).length), 60, 'gold'],
      ['Pending approvals', String(pending), pending * 22, ''],
    ]) + '<div class="row"><button class="btn btn-sm" data-admin-action="goto" data-id="security">Open cases & audit →</button>' +
      '<button class="btn btn-sm btn-ghost" data-admin-action="export" data-id="audit">Export evidence</button></div>'),
    adminPanel('RELEASE INBOX', 'Approvals awaiting human decision', adminTable(['ID', 'Action', 'Tier', 'Status'], s.approvals.slice(0, 4).map(function (a) {
      return adminTr(adminAttrsSimple(a.id, a.action), [esc(a.id), esc(a.action), adminPill(a.tier, a.tier === 'T4' ? 'red' : 'gold'), pill(a.status)]);
    })), '<span class="fine-print">Requester can never approve their own action.</span>'),
  ]) +
  adminPanel('RECENT PRIVILEGED ACTIONS', 'Append-only simulation log', adminTimeline(s.audit.slice(0, 8).map(function (a) {
    return [a.time, a.actor + ' · ' + a.action + ' · ' + a.detail, a.tier];
  }))) +
  '<div class="admin-module-grid section">' + adminModulesOverview() + '</div>';
}

function adminAttrsSimple(id, text) {
  return adminRowAttrs({ text: id + ' ' + text, status: 'pending', market: 'Global' });
}

function adminDataBoundary() {
  var c = adminState.coverage;
  if (!c || !c.summary) {
    return adminPanel('DATA BOUNDARY', 'Offline simulation',
      '<p class="fine-print">The API is not connected. All workspaces use deterministic local demo rows. ' +
      'With the API running, this panel reports count-only coverage from seeded PostgreSQL tables.</p>');
  }
  var s = c.summary;
  return adminPanel('DATA BOUNDARY', 'Count-only DB coverage', adminBars([
    ['DB-backed workspaces', s.dbBacked + ' / ' + s.modules, (s.dbBacked / Math.max(1, s.modules)) * 100, 'green'],
    ['Partial policy reads', String(s.partial), (s.partial / Math.max(1, s.modules)) * 100, 'gold'],
    ['RLS tenant counts', String(s.rlsTenantCounts), (s.rlsTenantCounts / Math.max(1, s.totalCounts)) * 100, ''],
    ['Explicit tenant counts', String(s.explicitTenantCounts), (s.explicitTenantCounts / Math.max(1, s.totalCounts)) * 100, ''],
  ]) + '<p class="fine-print">' + esc(c.disclaimer) + ' Source ' + esc(c.source || 'seeded-postgres-demo') +
    ' · computed ' + esc(c.computedAt || c.generatedAt) + ' · as of ' + esc(c.asOf || 'seeded-demo-data') + '.</p>');
}

function adminModulesOverview() {
  var ids = ['users', 'roles', 'products', 'sellers', 'orders', 'inventory', 'crm', 'finance',
    'marketing', 'loyalty', 'subscriptions', 'logistics', 'compliance', 'support', 'ai', 'security', 'global'];
  return ids.map(function (id) {
    return '<button class="admin-module-tile" data-admin-action="goto" data-id="' + id + '">' +
      '<span class="fine-print">' + esc(id.toUpperCase()) + '</span><strong>' + esc(id.replace(/^./, function (c) { return c.toUpperCase(); })) + '</strong>' +
      '<small>Open workspace →</small></button>';
  }).join('');
}

/* ---------------- ADM-02 User Management ---------------- */
function renderUsers() {
  var rows = adminState.users.map(function (u) {
    return adminTr(statusRowAttrs({ text: [u.id, u.market, u.kyc, u.risk, u.status, u.tier].join(' '), status: u.status, market: u.market, select: u.id }), [
      adminSelectCell(u.id) + '<code>' + esc(u.id) + '</code>', esc(u.market), esc(u.kyc), esc(u.age),
      pill(u.risk), esc(u.flag), pill(u.status), detailButton(u.id, 'Review'),
    ]);
  });
  return adminKpis([
    { label: 'Profiles in view', value: String(adminState.users.length), note: 'Sample' },
    { label: 'Age assertions', value: '4 / 5', note: 'Simulated' },
    { label: 'High-risk flags', value: '2', note: 'Local queue' },
    { label: 'Erasure handoffs', value: '1', note: 'Simulated' },
  ]) +
  adminPanel('ADM-02 · IDENTITY & SAFETY', 'User management',
    adminTable(['', 'User', 'Market', 'KYC', 'Age', 'Risk', 'Flag', 'Status', 'Action'], rows, { selectable: true, bulkId: 'users' }) +
    '<p class="fine-print">PII is masked by default. Reveal requests record a purpose in the append-only audit. Restriction is T3 and reversible.</p>',
    adminActionButton('restrict-user', 'usr_2077', 'Restrict selected (T3)', 'btn-sm') +
    adminActionButton('reverify', 'usr_4410', 'Request re-verification') +
    adminActionButton('erasure', 'usr_4410', 'Erasure handoff')) +
  grid([
    adminPanel('IDENTITY FUNNEL', 'Verification stages', adminBars([
      ['Registered', '100%', 100, 'green'],
      ['Age asserted', '82%', 82, 'green'],
      ['KYC complete', '68%', 68, ''],
      ['Risk cleared', '61%', 61, 'gold'],
    ])),
    adminPanel('PRIVACY CONTROLS', 'Data-handling posture', adminChecklist([
      [true, 'Purpose recorded before any PII reveal'],
      [true, 'Erasure is a documented handoff, never a direct delete'],
      [true, 'Masked identifiers in export manifests'],
      ['warn', 'AE document review pending human decision'],
    ])),
  ]);
}

/* ---------------- ADM-03 Role & Permissions ---------------- */
function renderRoles() {
  var rows = adminState.roles.map(function (r) {
    return adminTr(statusRowAttrs({ text: [r.code, r.scope, r.status].join(' '), status: r.status, market: 'Global' }), [
      '<code>' + esc(r.code) + '</code>', esc(r.scope), String(r.members), String(r.controls), esc(r.status), esc(r.review),
      adminActionButton('grant', r.code, 'Grant', 'btn-sm') + adminActionButton('revoke', r.code, 'Revoke'),
    ]);
  });
  var matrix = [
    ['users', true, true, true, true, true, false],
    ['sellers', true, true, true, true, true, false],
    ['orders', true, true, true, true, true, true],
    ['finance', false, true, true, true, true, true],
    ['campaigns', true, true, true, true, true, false],
    ['ai', true, true, true, true, true, true],
    ['audit', true, true, false, false, true, false],
  ];
  var matrixRows = matrix.map(function (m) {
    return adminTr(adminRowAttrs({ text: m.join(' '), status: 'active', market: 'Global' }), [
      '<code>' + esc(m[0]) + '</code>',
    ].concat(m.slice(1).map(function (v) { return v ? '<span class="admin-yes">✓</span>' : '<span class="admin-no">·</span>'; })).concat([
      adminActionButton('review-access', m[0], 'Review'),
    ]));
  });
  return adminKpis([
    { label: 'Active roles', value: String(adminState.roles.length), note: 'Sample' },
    { label: 'Permission scopes', value: '18', note: 'Designed' },
    { label: 'Recertification due', value: 'Q3 2027', note: 'Projection' },
    { label: 'Wildcard roles', value: '0', note: 'Deny by default' },
  ]) +
  adminPanel('ADM-03 · LEAST PRIVILEGE', 'Roles and staff assignment',
    adminTable(['Role', 'Scope', 'Members', 'Controls', 'Elevation', 'Review', 'Action'], rows, { actions: true }) +
    '<p class="fine-print">Effective permission is the intersection of role permissions, staff scope and active elevation. No wildcard role exists.</p>') +
  adminPanel('PERMISSION MATRIX', 'Domain × capability',
    adminTable(['Domain', 'Read', 'Search', 'Modify', 'Approve', 'Export', 'Elevate', 'Action'], matrixRows, { actions: true })) +
  grid([
    adminPanel('ACCESS REVIEW', 'Quarterly recertification', adminChecklist([
      [true, 'Every privileged role has a named owner'],
      [true, 'Quarterly recertification scheduled'],
      [true, 'Auditor role is read-only'],
      [true, 'Break-glass is time-boxed and approved'],
    ])),
    adminPanel('SOD GUARDRAILS', 'Separation of duties', adminBars([
      ['Requester ≠ approver', 'Enforced', 100, 'green'],
      ['T3/T4 reason required', 'Enforced', 100, 'green'],
      ['Standing admin access', 'Disabled', 4, 'green'],
      ['Hardware MFA coverage', 'Target 100%', 94, 'gold'],
    ])),
  ]);
}

/* ---------------- ADM-04 Product Management ---------------- */
function renderProducts() {
  var products = adminProducts();
  var rows = products.map(function (p) {
    return adminTr(statusRowAttrs({ text: [p.id, p.name, p.category, p.market].join(' '), status: p.status, market: p.market, select: p.id }), [
      adminSelectCell(p.id) + '<code>' + esc(p.id) + '</code>', esc(p.name), esc(p.category), esc(p.market),
      esc(p.stock), esc(p.provenance), pill(p.status), detailButton(p.id, 'Inspect'),
    ]);
  });
  return adminKpis([
    { label: 'Catalogue SKUs', value: String(products.length || appState.products.length), note: 'Bundled / API' },
    { label: 'Published', value: String(products.filter(function (p) { return p.status === 'Published'; }).length), note: 'Sample' },
    { label: 'Stock review', value: String(products.filter(function (p) { return p.status === 'Review'; }).length), note: 'Local queue' },
    { label: 'Provenance verified', value: '100%', note: 'Canonical data' },
  ]) +
  adminPanel('ADM-04 · CATALOGUE GOVERNANCE', 'Product management',
    (rows.length ? adminTable(['', 'SKU', 'Product', 'Category', 'Market', 'Stock', 'Provenance', 'Status', 'Action'], rows, { selectable: true, bulkId: 'products' })
      : '<p class="fine-print">Catalogue data is available after the API hydration step; offline fallback is active.</p>') +
    '<p class="fine-print">Listings cannot be published by AI alone. Label scans and provenance remain human-reviewed.</p>',
    adminActionButton('hold-product', 'sku-1007', 'Place review hold (T3)', 'btn-sm') +
    adminActionButton('release-product', 'sku-1007', 'Release hold')) +
  grid([
    adminPanel('CONTENT QUALITY', 'Catalogue readiness', adminBars([
      ['Canonical producer', '100%', 100, 'green'],
      ['Tasting fingerprint', '92%', 92, 'green'],
      ['Label scan', '84%', 84, ''],
      ['Alcohol-policy copy', '100%', 100, 'green'],
    ])),
    adminPanel('CHANGE CONTROL', 'Publishing rules', adminChecklist([
      [true, 'Human approval before any listing publish'],
      [true, 'Provenance score required'],
      [true, 'Jurisdiction-specific copy check'],
      [true, 'Immutable revision history'],
    ])),
  ]);
}

/* ---------------- ADM-05 Seller Management ---------------- */
function renderSellers() {
  var rows = adminState.sellers.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.id, x.name, x.tier, x.licence, x.status].join(' '), status: x.status, market: x.market, select: x.id }), [
      adminSelectCell(x.id) + '<code>' + esc(x.id) + '</code>', esc(x.name), esc(x.tier), esc(x.gmv),
      pill(x.licence), esc(x.payout), esc(x.disputes), pill(x.status), detailButton(x.id, 'Review'),
    ]);
  });
  return adminKpis([
    { label: 'Sellers in view', value: String(adminState.sellers.length), note: 'Sample' },
    { label: 'Licence warnings', value: '1', note: 'Local queue' },
    { label: 'Payout holds', value: '1', note: 'Simulated' },
    { label: 'Dispute rate cap', value: '<2.0%', note: 'Policy' },
  ]) +
  adminPanel('ADM-05 · MERCHANT HEALTH', 'Seller management',
    adminTable(['', 'Seller', 'Name', 'Tier', 'GMV', 'Licence', 'Payout', 'Disputes', 'Status', 'Action'], rows, { selectable: true, bulkId: 'sellers' }) +
    '<p class="fine-print">Suspension is T3: dual approval, automatic payout hold and a case record. No direct ledger edits.</p>',
    adminActionButton('suspend-seller', 'sel-882', 'Suspend + payout hold (T3)', 'btn-sm') +
    adminActionButton('payout-hold', 'sel-882', 'Payout hold only')) +
  grid([
    adminPanel('ONBOARDING FUNNEL', 'Merchant review stages', adminBars([
      ['Application', '100%', 100, 'green'],
      ['Licence verified', '86%', 86, 'green'],
      ['Financial screen', '74%', 74, ''],
      ['Approved', '68%', 68, 'gold'],
    ])),
    adminPanel('MARKET COVERAGE', 'Active seller markets', adminChecklist([
      [true, 'FR · EU licence register'],
      [true, 'US · state-by-state matrix'],
      [true, 'JP · import documentation'],
      ['warn', 'AE · policy review in progress'],
    ])),
  ]);
}

/* ---------------- ADM-06 Order Management ---------------- */
function renderOrders() {
  var rows = adminState.orders.map(function (o) {
    return adminTr(statusRowAttrs({ text: [o.id, o.buyer, o.state, o.risk].join(' '), severity: o.risk === 'High' ? 'P1' : 'P3', status: o.state, market: o.market, select: o.id }), [
      adminSelectCell(o.id) + '<code>' + esc(o.id) + '</code>', esc(o.buyer), esc(o.value), esc(o.state), esc(o.sla),
      pill(o.risk), esc(o.payment), esc(o.shipment), detailButton(o.id, 'Inspect'),
    ]);
  });
  return adminKpis([
    { label: 'Orders in view', value: String(adminState.orders.length), note: 'Sample' },
    { label: 'Exception rate', value: '2.4%', note: 'Projection' },
    { label: 'High-risk cases', value: '2', note: 'Local queue' },
    { label: 'Refund approvals', value: '1', note: 'Pending' },
  ]) +
  adminPanel('ADM-06 · ORDER EXCEPTIONS', 'Order management',
    adminTable(['', 'Order', 'Buyer', 'Value', 'State', 'SLA', 'Risk', 'Payment', 'Shipment', 'Action'], rows, { selectable: true, bulkId: 'orders' }) +
    '<p class="fine-print">Refunds above threshold require human approval and execute through the payment adapter — never a direct DB edit.</p>',
    adminActionButton('initiate-refund', 'ord-88117', 'Initiate refund (T3)', 'btn-sm') +
    adminActionButton('cancel-order', 'ord-88099', 'Cancel order (T3)') +
    adminActionButton('reroute', 'ord-88120', 'Re-route')) +
  grid([
    adminPanel('SLA HEATMAP', 'Exception aging', adminBars([
      ['Under 15m', '2 orders', 46, 'green'],
      ['15m – 1h', '1 order', 30, 'gold'],
      ['Over 1h', '1 order', 22, 'red'],
    ])),
    adminPanel('ORDER CONTROLS', 'Check gates', adminChecklist([
      [true, 'Age assertion present'],
      [true, 'Jurisdiction licence checked'],
      [true, 'Payment idempotency key required'],
      [true, 'Ledger entry on every state change'],
    ])),
  ]);
}

/* ---------------- ADM-07 Inventory Management ---------------- */
function renderInventory() {
  var rows = adminState.inventory.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.sku, x.warehouse, x.status].join(' '), status: x.status, market: x.market, select: x.sku }), [
      adminSelectCell(x.sku) + '<code>' + esc(x.sku) + '</code>', esc(x.warehouse), String(x.onHand), String(x.reserved),
      String(x.reorder), esc(x.cover), pill(x.status), detailButton(x.sku, 'Inspect'),
    ]);
  });
  return adminKpis([
    { label: 'Stocked SKUs', value: String(adminState.inventory.length), note: 'Sample' },
    { label: 'Reorder alerts', value: '1', note: 'Local queue' },
    { label: 'Critical cover', value: '1', note: 'Simulation' },
    { label: 'Reserve accuracy', value: '99.8%', note: 'Projection' },
  ]) +
  adminPanel('ADM-07 · STOCK & RESERVES', 'Inventory management',
    adminTable(['', 'SKU', 'Warehouse', 'On hand', 'Reserved', 'Reorder at', 'Cover', 'Status', 'Action'], rows, { selectable: true, bulkId: 'inventory' }) +
    '<p class="fine-print">Cycle counts and reserve releases are logged. No physical warehouse system is connected.</p>',
    adminActionButton('cycle-count', 'sku-1010', 'Start cycle count', 'btn-sm') +
    adminActionButton('release-reserve', 'sku-1010', 'Release reserve (T3)')) +
  grid([
    adminPanel('COVER DISTRIBUTION', 'Days of cover', adminBars([
      ['EU-1 · Bordeaux', '24d', 80, 'green'],
      ['US-2 · Napa', '6d', 32, 'gold'],
      ['APAC-1 · Singapore', '3d', 16, 'red'],
      ['UK-1 · London', '18d', 64, 'green'],
    ])),
    adminPanel('REPLENISHMENT RULES', 'Policy checks', adminChecklist([
      [true, 'Reorder point derived from rolling cover'],
      [true, 'Cold-chain capacity checked before transfer'],
      [true, 'Reserves released only on order state change'],
      ['warn', 'APAC-1 below safety stock'],
    ])),
  ]);
}

/* ---------------- ADM-08 CRM ---------------- */
function renderCrm() {
  var rows = adminState.crm.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.name, x.source, x.consent, x.status].join(' '), status: x.status, market: x.market, select: x.name }), [
      adminSelectCell(x.name) + esc(x.name), esc(x.size), esc(x.source), esc(x.consent), esc(x.conversion), pill(x.status),
      detailButton(x.name, 'View segment'),
    ]);
  });
  return adminKpis([
    { label: 'Active segments', value: '3', note: 'Sample' },
    { label: 'Reachable profiles', value: '197.7k', note: 'Projection' },
    { label: 'Consent suppressed', value: '1', note: 'Policy' },
    { label: 'Journey attribution', value: 'Multi-touch', note: 'Design' },
  ]) +
  adminPanel('ADM-08 · CUSTOMER RELATIONSHIPS', 'CRM',
    adminTable(['', 'Segment', 'Size', 'Source', 'Consent', 'Conversion', 'Status', 'Action'], rows, { selectable: true, bulkId: 'segments' }) +
    '<p class="fine-print">Exports are audited. No email is sent from the admin surface without a separate human-approved campaign.</p>',
    adminActionButton('export-segment', 'gift', 'Export segment (audited)', 'btn-sm') +
    adminActionButton('suppress-segment', 'lapsed', 'Suppress segment')) +
  grid([
    adminPanel('LIFECYCLE JOURNEYS', 'Journey performance', adminBars([
      ['Discovery → first order', '3.8%', 38, ''],
      ['First → second order', '11.2%', 62, 'green'],
      ['Club retention · 90d', '78%', 78, 'green'],
      ['Win-back', '1.2%', 14, 'gold'],
    ])),
    adminPanel('CONSENT POSTURE', 'Data-use controls', adminChecklist([
      [true, 'Opt-in recorded per segment'],
      [true, 'Suppressed profiles excluded from export'],
      [true, 'Purpose limitation enforced'],
      [true, 'No automated email send'],
    ])),
  ]);
}

/* ---------------- ADM-09 Finance & Accounting ---------------- */
function renderFinance() {
  var rows = adminState.finance.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.id, x.type, x.status].join(' '), status: x.status, market: x.market, select: x.id }), [
      adminSelectCell(x.id) + '<code>' + esc(x.id) + '</code>', esc(x.type), esc(x.amount), pill(x.status), esc(x.controls), esc(x.market), detailButton(x.id, 'Inspect'),
    ]);
  });
  return adminKpis([
    { label: 'Ledger entries in view', value: String(adminState.finance.length), note: 'Sample' },
    { label: 'Reconciliation variance', value: '$0', note: 'Simulated' },
    { label: 'FX quote lock', value: '15 min', note: 'Canonical' },
    { label: 'Advertising spend', value: '7.4%', note: 'Cap 8.0%' },
  ]) +
  adminPanel('ADM-09 · FINANCE & ACCOUNTING', 'Ledger and reconciliation',
    adminTable(['', 'Entry', 'Type', 'Amount', 'Status', 'Controls', 'Market', 'Action'], rows, { selectable: true, bulkId: 'finance' }) +
    '<p class="fine-print">Payments are simulated. Ledger-shaped rows demonstrate double-entry discipline; no processor is contacted and no raw PAN/CVV is stored.</p>',
    adminActionButton('reconcile', 'led-7724', 'Run reconciliation', 'btn-sm') +
    adminActionButton('hold-payout', 'led-7738', 'Hold payout (T3)')) +
  grid([
    adminPanel('FINANCIAL GUARDRAILS', 'Hard controls', adminBars([
      ['Advertising / revenue', '7.4% / 8.0%', 92.5, 'green'],
      ['FX stale-rate protection', '15m lock', 100, 'green'],
      ['3DS2 / SCA coverage', 'Target 100%', 96, 'green'],
      ['Ledger reconciliation', 'Variance 0', 100, 'green'],
    ])),
    adminPanel('PROVIDER MIX', 'Simulated adapter labels', adminChecklist([
      [true, 'Stripe · primary 60%'],
      [true, 'Adyen · primary 40%'],
      [true, 'PayPal / Razorpay · additive'],
      [true, 'Apple Pay / Google Pay · wallets'],
    ])),
  ]);
}

/* ---------------- ADM-10 Marketing Management ---------------- */
function renderMarketing() {
  var rows = adminState.campaigns.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.id, x.name, x.channel, x.compliance, x.status].join(' '), status: x.status, market: x.market, select: x.id }), [
      adminSelectCell(x.id) + '<code>' + esc(x.id) + '</code>', esc(x.name), esc(x.channel),
      adminPill(x.compliance, x.compliance === 'PASS' ? 'green' : x.compliance === 'WARN' ? 'gold' : 'red'),
      esc(x.voice), esc(x.spend), pill(x.status), detailButton(x.id, 'Review'),
    ]);
  });
  return adminKpis([
    { label: 'Campaigns in review', value: '1', note: 'Human gate' },
    { label: 'Compliance blocks', value: '1', note: 'Local queue' },
    { label: 'Spend / revenue', value: '7.4%', note: 'Cap 8.0%' },
    { label: 'Published by AI', value: '0', note: 'By design' },
  ]) +
  adminPanel('ADM-10 · MARKETING MANAGEMENT', 'Campaign governance',
    adminTable(['', 'ID', 'Campaign', 'Channel', 'Compliance', 'Voice', 'Spend', 'Decision', 'Action'], rows, { selectable: true, bulkId: 'campaigns' }) +
    '<p class="fine-print">No publish without named human approval. No health or intoxication claims. Minors are never targeted. No autonomous ad spend or email send.</p>',
    adminActionButton('approve-campaign', 'cmp-4402', 'Approve publish (human)', 'btn-sm') +
    adminActionButton('pause-campaign', 'cmp-4402', 'Pause campaign') +
    adminActionButton('force-review', 'cmp-4391', 'Force re-review')) +
  grid([
    adminPanel('COMPLIANCE GATE', 'Creative checks', adminChecklist([
      [true, 'Age-gate targeting applied'],
      [true, 'Jurisdiction ad rules checked'],
      ['warn', 'Holiday Single Malt · WARN acknowledged'],
      ['block', 'Spring Rosé · BLOCKED copy'],
    ])),
    adminPanel('SPEND CONTROL', 'Allocation discipline', adminBars([
      ['Paid social', '$4,200', 58, 'green'],
      ['Email + CRM', '$1,100', 24, 'green'],
      ['Search', 'Blocked', 4, 'red'],
      ['Hard cap', '8.0% revenue', 100, 'gold'],
    ])),
  ]);
}

/* ---------------- ADM-11 Loyalty Program Management ---------------- */
function renderLoyalty() {
  var rows = adminState.loyalty.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.tier, x.accrual, x.status].join(' '), status: x.status, market: x.market, select: x.tier }), [
      adminSelectCell(x.tier) + esc(x.tier), esc(x.members), esc(x.liability), esc(x.accrual), pill(x.status), esc(x.market),
      adminActionButton('adjust-points', x.tier, 'Adjust (T3)'),
    ]);
  });
  return adminKpis([
    { label: 'VIP tiers', value: '4', note: 'Bronze → Platinum' },
    { label: 'Point liability', value: '$8.7M', note: 'Projection' },
    { label: 'Fraud flags', value: '2', note: 'Local queue' },
    { label: 'Ledger adjustments', value: '0 today', note: 'Simulated' },
  ]) +
  adminPanel('ADM-11 · LOYALTY', 'VIP tiers and point liability',
    adminTable(['', 'Tier', 'Members', 'Liability', 'Accrual', 'Status', 'Market', 'Action'], rows, { selectable: true, bulkId: 'loyalty' }) +
    '<p class="fine-print">VIP tiers are distinct from Club tiers (Good / Better / Best / Icon). Point changes use documented adjustments, never direct ledger row edits.</p>') +
  grid([
    adminPanel('LIABILITY DISTRIBUTION', 'Projected balance', adminBars([
      ['Bronze', '$1.2M', 22, ''],
      ['Silver', '$2.6M', 44, ''],
      ['Gold', '$3.1M', 58, 'gold'],
      ['Platinum', '$1.8M', 34, 'gold'],
    ])),
    adminPanel('INTEGRITY CONTROLS', 'Fraud and appeal', adminChecklist([
      [true, 'Immutable points ledger'],
      [true, 'Automated adverse decisions require appeal path'],
      [true, 'Adjustments require reason + distinct approver'],
      ['warn', '2 velocity flags awaiting human review'],
    ])),
  ]);
}

/* ---------------- ADM-12 Subscription Management ---------------- */
function renderSubscriptions() {
  var rows = adminState.subscriptions.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.id, x.plan, x.member, x.state].join(' '), status: x.state, market: x.market, select: x.id }), [
      adminSelectCell(x.id) + '<code>' + esc(x.id) + '</code>', esc(x.plan), esc(x.member), pill(x.state), esc(x.next), esc(x.mrr), esc(x.market),
      adminActionButton('pause-subscription', x.id, 'Pause') + adminActionButton('save-subscription', x.id, 'Save offer'),
    ]);
  });
  return adminKpis([
    { label: 'Subscriptions in view', value: String(adminState.subscriptions.length), note: 'Sample' },
    { label: 'Active MRR', value: '$677', note: 'Simulation' },
    { label: 'Retention · 90d', value: '78%', note: 'Projection' },
    { label: 'Payment retries', value: '1', note: 'Local queue' },
  ]) +
  adminPanel('ADM-12 · SUBSCRIPTIONS', 'Club plan lifecycle',
    adminTable(['', 'Subscription', 'Plan', 'Member', 'State', 'Next', 'MRR', 'Market', 'Action'], rows, { selectable: true, bulkId: 'subscriptions' }) +
    '<p class="fine-print">Pause/save actions are simulated and logged. No billing provider is contacted from this surface.</p>') +
  grid([
    adminPanel('LIFECYCLE FUNNEL', 'Retention stages', adminBars([
      ['Active', '78%', 78, 'green'],
      ['Paused', '9%', 18, 'gold'],
      ['Payment retry', '7%', 14, 'gold'],
      ['Cancelled', '6%', 12, 'red'],
    ])),
    adminPanel('PLAN GOVERNANCE', 'Club contract rules', adminChecklist([
      [true, 'Skip or cancel any time'],
      [true, 'Sommelier personalisation logged'],
      [true, 'Provenance disclosure included'],
      [true, 'No auto-charge without saved consent'],
    ])),
  ]);
}

/* ---------------- ADM-13 Logistics Management ---------------- */
function renderLogistics() {
  var rows = adminState.shipments.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.id, x.carrier, x.state, x.exception].join(' '), status: x.state, market: x.market, select: x.id }), [
      adminSelectCell(x.id) + '<code>' + esc(x.id) + '</code>', esc(x.carrier), esc(x.state), pill(x.temp), esc(x.eta),
      pill(x.exception), esc(x.market), detailButton(x.id, 'Track'),
    ]);
  });
  return adminKpis([
    { label: 'Shipments in view', value: String(adminState.shipments.length), note: 'Sample' },
    { label: 'Cold-chain excursion', value: '1', note: 'Local queue' },
    { label: 'Customs hold', value: '1', note: 'Simulation' },
    { label: 'On-time target', value: '96%', note: 'Projection' },
  ]) +
  adminPanel('ADM-13 · VINTORA FLOW', 'Logistics management',
    adminTable(['', 'Shipment', 'Carrier', 'State', 'Temperature', 'ETA', 'Exception', 'Market', 'Action'], rows, { selectable: true, bulkId: 'shipments' }) +
    '<p class="fine-print">Insurance claims reference insured value; no manual payout is made from the admin surface.</p>',
    adminActionButton('escalate-shipment', 'shp-5508', 'Escalate carrier (T2)', 'btn-sm') +
    adminActionButton('open-claim', 'shp-5508', 'Open insurance claim (T3)')) +
  grid([
    adminPanel('COLD CHAIN', 'Temperature integrity', adminBars([
      ['In range', '3 shipments', 82, 'green'],
      ['Excursion', '1 shipment', 28, 'red'],
      ['Sensor coverage target', '100%', 96, 'gold'],
    ])),
    adminPanel('CARRIER SLA', 'Design targets', adminChecklist([
      [true, 'DHL · 2d express'],
      [true, 'FedEx · insured wine lane'],
      [true, 'UPS · APAC route'],
      ['warn', 'Maersk · customs docs pending'],
    ])),
  ]);
}

/* ---------------- ADM-14 Compliance Management ---------------- */
function renderCompliance() {
  var rows = adminState.compliance.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.id, x.control, x.state, x.owner].join(' '), status: x.state, market: x.market, select: x.id }), [
      '<code>' + esc(x.id) + '</code>', esc(x.control), pill(x.state), esc(x.evidence), esc(x.owner), esc(x.market),
      adminActionButton('verify-control', x.id, 'Verify'),
    ]);
  });
  return adminKpis([
    { label: 'Mapped controls', value: String(adminState.compliance.length), note: 'Design' },
    { label: 'Controls enforced', value: String(adminState.compliance.length), note: 'Simulation' },
    { label: 'Evidence artifacts', value: '38', note: 'Local manifest' },
    { label: 'Open policy reviews', value: '1', note: 'AE market' },
  ]) +
  adminPanel('ADM-14 · COMPLIANCE', 'Control register',
    adminTable(['ID', 'Control', 'State', 'Evidence', 'Owner', 'Market', 'Action'], rows) +
    '<p class="fine-print">SOC 2, ISO 27001 and privacy controls are design targets. No certification or real audit finding is claimed.</p>',
    adminActionButton('verify-licence', 'sel-882', 'Verify seller licence', 'btn-sm') +
    adminActionButton('publish-policy', 'POL-07', 'Publish policy (T4)')) +
  grid([
    adminPanel('JURISDICTION MATRIX', 'Age and licence rules', adminBars([
      ['US · 21+', 'Enforced', 100, 'green'],
      ['EU / GB · 18+', 'Enforced', 100, 'green'],
      ['AE · 21+', 'Policy review', 72, 'gold'],
      ['JP · 20+', 'Enforced', 100, 'green'],
    ])),
    adminPanel('AUDIT READINESS', 'Evidence posture', adminChecklist([
      [true, 'Append-only action log'],
      [true, 'Purpose recorded for PII access'],
      [true, 'Immutable evidence manifest hash'],
      [true, 'Retention policy documented'],
    ])),
  ]);
}

/* ---------------- ADM-15 Customer Support Management ---------------- */
function renderSupport() {
  var rows = adminState.tickets.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.id, x.subject, x.channel, x.status].join(' '), severity: x.priority, status: x.status, market: x.market, select: x.id }), [
      adminSelectCell(x.id) + '<code>' + esc(x.id) + '</code>', esc(x.subject), esc(x.channel),
      adminPill(x.priority, x.priority === 'P1' ? 'red' : 'gold'), esc(x.sla), pill(x.status), esc(x.agent), esc(x.market), detailButton(x.id, 'Open'),
    ]);
  });
  return adminKpis([
    { label: 'Tickets in queue', value: String(adminState.tickets.length), note: 'Sample' },
    { label: 'P1 breaches', value: '1', note: 'Local queue' },
    { label: 'CSAT target', value: '4.7 / 5', note: 'Projection' },
    { label: 'Automated sends', value: '0', note: 'Human only' },
  ]) +
  adminPanel('ADM-15 · CUSTOMER SUPPORT', 'Ticket management',
    adminTable(['', 'Ticket', 'Subject', 'Channel', 'Priority', 'SLA', 'Status', 'Agent', 'Market', 'Action'], rows, { selectable: true, bulkId: 'tickets' }) +
    '<p class="fine-print">Macros draft replies only. A named human must review and send; refunds and account changes still follow their own approvals.</p>',
    adminActionButton('assign-ticket', 'SUP-3301', 'Assign to me', 'btn-sm') +
    adminActionButton('escalate-ticket', 'SUP-3289', 'Escalate') +
    adminActionButton('close-ticket', 'SUP-3301', 'Close with reason')) +
  grid([
    adminPanel('SERVICE QUALITY', 'Support targets', adminBars([
      ['First response · P1', '15m target', 88, 'green'],
      ['First response · P2', '1h target', 76, ''],
      ['QA sample coverage', 'Target 10%', 68, 'gold'],
      ['Human send review', '100%', 100, 'green'],
    ])),
    adminPanel('APPROVED MACROS', 'Draft-only responses', adminChecklist([
      [true, 'Delivery delay · empathy + tracking'],
      [true, 'Age re-verification · secure link'],
      [true, 'Refund · approval required'],
      [true, 'No autonomous account changes'],
    ])),
  ]);
}

/* ---------------- ADM-16 AI Operations Center ---------------- */
function renderAI() {
  var rows = adminState.models.map(function (m) {
    return adminTr(statusRowAttrs({ text: [m.key, m.version, m.stage, m.owner].join(' '), status: m.status, market: 'Global', select: m.key }), [
      adminSelectCell(m.key) + '<code>' + esc(m.key) + '</code>', esc(m.version), esc(m.stage), pill(m.status),
      adminPill(m.eval, m.eval === 'PASS' ? 'green' : m.eval === 'FAIL' ? 'red' : 'gold'), pill(m.drift), esc(m.cap),
      adminActionButton('promote', m.key, 'Promote (T4)'),
    ]);
  });
  return adminKpis([
    { label: 'Models in registry', value: String(adminState.models.length), note: 'Simulated' },
    { label: 'Active incidents', value: adminState.killSwitch ? 'All halted' : '1 drift', note: adminState.killSwitch ? 'Kill switch' : 'Local queue' },
    { label: 'Kill switch target', value: '< 1 min', note: 'Design SLO' },
    { label: 'Monthly cap', value: '$29k', note: 'Simulated' },
  ]) +
  adminPanel('ADM-16 · AI OPERATIONS CENTER', 'Model governance',
    (adminState.killSwitch ? '<div class="admin-alert danger">⚠ KILL SWITCH ACTIVE — all model traffic halted; fallback to champion. Propagation target &lt; 1 min.</div>' : '') +
    adminTable(['', 'Model', 'Version', 'Stage', 'Status', 'Eval', 'Drift', 'Cap', 'Action'], rows, { selectable: true, bulkId: 'models' }) +
    '<div class="row">' +
      adminActionButton('kill', 'all', adminState.killSwitch ? 'Resume models (T4)' : 'Activate kill switch (T4)', 'btn-sm') +
      adminActionButton('model-card', 'model-governance', 'Open model card') +
      adminActionButton('rollback', 'forecast-v7', 'Rollback canary') +
    '</div>' +
    '<p class="fine-print">Promotion, rollback and kill-switch transitions are T4 dual approval: reason + distinct approver. Propagation target &lt; 1 min remains a design SLO; no live model is controlled here.</p>') +
  grid([
    adminPanel('EVAL GATES', 'Release criteria', adminBars([
      ['Offline accuracy', 'PASS', 96, 'green'],
      ['Fairness audit', 'WARN', 74, 'gold'],
      ['Red team', 'PASS', 92, 'green'],
      ['Cost envelope', 'PASS', 88, 'green'],
    ])),
    adminPanel('INCIDENT TIMELINE', 'Model events', adminTimeline([
      ['14:28', 'forecast-v7 · drift gate breach', 'T4'],
      ['14:12', 'sommelier-rank · champion stable', 'T1'],
      ['13:46', 'studio-voice · eval gates passed', 'T2'],
      ['12:31', 'growth-planner · cost cap reviewed', 'T2'],
    ])),
  ]);
}

/* ---------------- ADM-17 Security Center ---------------- */
function renderSecurity() {
  var rows = adminState.security.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.id, x.event, x.actor, x.state].join(' '), severity: x.risk === 'High' ? 'P1' : 'P3', status: x.state, market: x.market, select: x.id }), [
      '<code>' + esc(x.id) + '</code>', esc(x.event), esc(x.actor), pill(x.risk), pill(x.state), esc(x.market),
      adminActionButton('revoke-session', x.id, 'Revoke') + adminActionButton('detail', x.id, 'Review'),
    ]);
  });
  var caseRows = adminState.cases.map(function (c) {
    return adminTr(statusRowAttrs({ text: [c.id, c.domain, c.summary, c.assignee].join(' '), severity: c.severity, status: c.status, market: c.market, select: c.id }), [
      '<code>' + esc(c.id) + '</code>', esc(c.domain), adminPill(c.severity, c.severity === 'P1' ? 'red' : 'gold'),
      esc(c.sla), esc(c.assignee), pill(c.status), esc(c.market),
      adminActionButton('assign', c.id, 'Assign') + adminActionButton('resolve', c.id, 'Resolve') + adminActionButton('escalate', c.id, 'Escalate'),
    ]);
  });
  return adminKpis([
    { label: 'Security signals', value: String(adminState.security.length), note: 'Sample' },
    { label: 'Open cases', value: String(adminState.cases.length), note: 'Unified queue' },
    { label: 'Standing admin access', value: '0', note: 'Design' },
    { label: 'Hardware MFA', value: 'Required', note: 'Policy' },
  ]) +
  adminPanel('ADM-17 · SECURITY CENTER', 'Access, sessions and keys',
    adminTable(['ID', 'Signal', 'Actor', 'Risk', 'State', 'Market', 'Action'], rows, { actions: true }) +
    '<p class="fine-print">Impersonation is read-only, time-boxed and logged. Admin roles never bypass tenant predicates or RLS.</p>',
    adminActionButton('rotate-key', 'kms-global-01', 'Rotate signing key (T4)', 'btn-sm') +
    adminActionButton('review-access', 'super_admin', 'Run access review') +
    adminActionButton('demote', 'self', 'End elevated session')) +
  adminPanel('CASES & AUDIT', 'Unified case queue', adminTable(['Case', 'Domain', 'Severity', 'SLA', 'Assignee', 'Status', 'Market', 'Action'], caseRows, { actions: true }) +
    '<div class="row"><button class="btn btn-sm" data-admin-action="command" data-id="palette">Open command palette</button>' +
    adminActionButton('export', 'audit', 'Export evidence') + '</div>') +
  grid([
    adminPanel('SESSION CONTROLS', 'Elevation posture', adminBars([
      ['JIT elevation', '15m', 40, 'gold'],
      ['Break-glass', '2h max', 72, ''],
      ['MFA re-verification', 'Required', 100, 'green'],
      ['Auto-demote', 'On expiry', 100, 'green'],
    ])),
    adminPanel('PRIVILEGED ACTION LOG', 'Append-only', adminTimeline(adminState.audit.slice(0, 8).map(function (a) {
      return [a.time, a.actor + ' · ' + a.action, a.tier];
    }))),
  ]);
}

/* ---------------- ADM-18 Global Operations Center ---------------- */
function renderGlobal() {
  var rows = adminState.regions.map(function (x) {
    return adminTr(statusRowAttrs({ text: [x.code, x.name, x.currency, x.readiness].join(' '), status: x.status, market: x.code, select: x.code }), [
      '<code>' + esc(x.code) + '</code>', esc(x.name), esc(x.currency), esc(x.age), pill(x.readiness),
      esc(x.adapter), pill(x.status), detailButton(x.code, 'Review'),
    ]);
  });
  return adminKpis([
    { label: 'Markets in scope', value: String(adminState.regions.length), note: 'Design' },
    { label: 'Currencies', value: '8', note: 'Locked demo rates' },
    { label: 'FX quote lock', value: '15 min', note: 'Canonical' },
    { label: 'Provider adapters', value: 'Simulated', note: 'No live calls' },
  ]) +
  adminPanel('ADM-18 · GLOBAL OPERATIONS CENTER', 'Market readiness',
    adminTable(['Code', 'Market', 'Currency', 'Min age', 'Readiness', 'Adapter', 'State', 'Action'], rows, { selectable: true, bulkId: 'regions' }) +
    '<p class="fine-print">All provider labels, licences and readiness states are illustrative. No real supplier, carrier, processor or regulator integration is asserted.</p>',
    adminActionButton('region-review', 'AE', 'Review market (T2)', 'btn-sm') +
    adminActionButton('adapter-status', 'all', 'Adapter status') +
    adminActionButton('fx-review', 'USD', 'FX lock review')) +
  grid([
    adminPanel('LOCALISATION COVERAGE', 'Design targets', adminBars([
      ['Currency formatting', '8 / 8', 100, 'green'],
      ['Locale copy', '3 / 3', 100, 'green'],
      ['Age rules', '6 / 6', 100, 'green'],
      ['Tax rules', '4 / 6', 68, 'gold'],
    ])),
    adminPanel('OPERATING MODEL', 'Internal vs market-facing', adminChecklist([
      [true, 'Ten canonical market modules unchanged'],
      [true, 'Admin Panel remains an internal operations layer'],
      [true, 'Global Payments remains internal/platform'],
      [true, 'AI Marketing Automation remains internal/platform'],
    ])),
  ]);
}

/* ---------------- ADM-19 Ultimate AI TechOps ---------------- */
function renderTechOps() {
  var s = adminState;
  var agentRows = s.techopsAgents.map(function (a) {
    return adminTr(statusRowAttrs({ text: [a.id, a.name, a.domain, a.mode, a.stack].join(' '), status: a.status, market: 'Global' }), [
      '<code>' + esc(a.id) + '</code>', esc(a.name), esc(a.domain), pill(a.status),
      esc(a.mode), esc(a.tier), esc(a.lastRun), esc(a.actions),
      adminPill(a.health, a.health === 'WARN' ? 'gold' : 'green'),
      adminActionButton('techops-run-check', a.id, 'Check', 'btn-sm btn-ghost') + detailButton(a.id, 'Runbook'),
    ]);
  });
  var alertRows = s.techopsAlerts.map(function (a) {
    return adminTr(statusRowAttrs({ text: [a.id, a.agent, a.source, a.summary, a.ticket].join(' '), status: a.status, market: a.market, select: a.id }), [
      adminSelectCell(a.id) + '<code>' + esc(a.id) + '</code>',
      adminPill(a.severity, a.severity === 'P1' ? 'red' : a.severity === 'P2' ? 'gold' : 'neutral'),
      esc(a.source), esc(a.agent), esc(a.summary), pill(a.status), esc(a.ticket),
      detailButton(a.id, 'Inspect'),
    ]);
  });
  var workflowRows = s.techopsWorkflows.map(function (w) {
    return adminTr(statusRowAttrs({ text: [w.id, w.name, w.owner, w.trigger].join(' '), status: w.status, market: 'Global' }), [
      '<code>' + esc(w.id) + '</code>', esc(w.name), esc(w.owner), esc(w.agents),
      esc(w.steps.join(' → ')), esc(w.sla), esc(w.guard), pill(w.status),
    ]);
  });
  var reportRows = s.techopsReports.map(function (r) {
    return adminTr(statusRowAttrs({ text: [r.id, r.name, r.owner, r.cadence].join(' '), status: r.status, market: 'Global' }), [
      '<code>' + esc(r.id) + '</code>', esc(r.name), esc(r.cadence), esc(r.owner), esc(r.format), pill(r.status),
      adminActionButton('techops-report', r.id, 'Generate', 'btn-sm btn-ghost'),
    ]);
  });

  return adminKpis([
    { label: 'Specialist agents', value: String(s.techopsAgents.length), note: 'Simulated roster' },
    { label: 'Multi-agent workflows', value: String(s.techopsWorkflows.length), note: 'Designed' },
    { label: 'Open alert signals', value: String(s.techopsAlerts.filter(function (a) { return a.status === 'Open'; }).length), note: 'Local queue' },
    { label: 'Autonomy mode', value: esc(s.techopsMode), note: 'Human gates active' },
  ]) +
  adminPanel('ADM-19 · ULTIMATE AI TECHOPS', 'Autonomous operations control room',
    '<p class="fine-print">24 specialist agents cooperate across delivery, reliability, security, data, compliance and product. This is a deterministic simulation: agents do not run continuously, no provider is contacted, and no ticket, alert or self-heal action leaves this board.</p>' +
    '<div class="row">' +
      ['Next.js', 'React', 'Node.js', 'Supabase', 'PostgreSQL', 'OpenAI adapter', 'Azure', 'Stripe adapter', 'FlutterFlow'].map(function (tag) {
        return adminPill(tag, 'blue');
      }).join('') +
    '</div>' +
    adminTable(['ID', 'Alert', 'Severity', 'Source', 'Agent', 'Summary', 'Status', 'Ticket', 'Action'], alertRows, { selectable: true, bulkId: 'techops-alerts' }) +
    '<p class="fine-print">P0/P1 signals page a human on-call owner. Self-heal is limited to pre-approved, reversible playbooks; critical escalation is T4 with reason and a distinct approver.</p>',
    adminActionButton('techops-ack', 'OPS-501', 'Acknowledge selected', 'btn-sm') +
    adminActionButton('techops-ticket', 'OPS-501', 'Create ticket', 'btn-sm') +
    adminActionButton('techops-selfheal', 'OPS-501', 'Run safe self-heal (T3)', 'btn-sm') +
    adminActionButton('techops-escalate', 'OPS-503', 'Escalate critical (T4)', 'btn-sm btn-ghost')) +
  grid([
    adminPanel('AGENT ARCHITECTURE', '24 specialist roster',
      adminTable(['ID', 'Agent', 'Domain', 'State', 'Mode', 'Tier', 'Last run', 'Runs', 'Health', 'Action'], agentRows) +
      '<p class="fine-print">Observe = read only · Assist = proposes · Guarded auto = pre-approved reversible playbooks only. Every run writes an auditable event.</p>'),
    adminPanel('MULTI-AGENT WORKFLOWS', 'Orchestration paths',
      adminTable(['ID', 'Workflow', 'Owner', 'Agents', 'Steps', 'SLA', 'Guard', 'State'], workflowRows)),
    adminPanel('INCIDENT RESPONSE', 'Append-only timeline',
      adminTimeline(s.techopsIncidents.map(function (i) { return [i.time, i.title + ' · ' + i.status, i.tier]; })) +
      '<p class="fine-print">Detect → correlate → contain → ticket → escalate → postmortem. Targets are design SLOs, not measured incident history.</p>'),
    adminPanel('ENTERPRISE SCALE', '100M+ user design targets', adminBars([
      ['Tenant-isolated core', 'RLS + tenant_id', 100, 'green'],
      ['Read path', 'Citus shards · regional replicas', 92, 'green'],
      ['Event bus', 'Partitioned · at-least-once', 88, ''],
      ['AI inference', 'Adapter + budget guards', 84, 'gold'],
      ['Audit retention', 'WARM 90d · WORM 7y', 96, 'green'],
    ])),
    adminPanel('GUARDRAILS', 'No silent autonomy', adminChecklist([
      [true, '24/7 coverage is a design target; local agents are simulated'],
      [true, 'Self-heal limited to reversible, pre-approved playbooks'],
      [true, 'T3/T4 changes require elevation, reason and distinct approver'],
      [true, 'No autonomous publish, ad spend or email send'],
      [true, 'AI kill switch target < 1 minute; human promotion gate'],
      [true, 'Append-only agent audit with correlation IDs'],
    ])),
    adminPanel('REPORTS & AUDIT', 'Generated evidence',
      adminTable(['ID', 'Report', 'Cadence', 'Owner', 'Format', 'State', 'Action'], reportRows) +
      '<div class="row">' +
        adminActionButton('techops-mode', 'AUTO-SAFE', 'Request auto-safe (T3)', 'btn-sm') +
        adminActionButton('techops-mode', 'OBSERVE', 'Return to observe', 'btn-sm btn-ghost') +
        adminActionButton('export', 'techops', 'Export evidence', 'btn-sm btn-ghost') +
      '</div>' +
      adminTimeline(s.audit.slice(0, 5).map(function (a) { return [a.time, a.action + ' · ' + a.detail, a.tier]; })) +
      '<p class="fine-print">Agent actions append to the shared immutable-style audit timeline. Local entries are simulated; production retention is WORM 7y.</p>'),
  ]);
}

var RENDERERS = {
  overview: renderOverview,
  users: renderUsers,
  roles: renderRoles,
  products: renderProducts,
  sellers: renderSellers,
  orders: renderOrders,
  inventory: renderInventory,
  crm: renderCrm,
  finance: renderFinance,
  marketing: renderMarketing,
  loyalty: renderLoyalty,
  subscriptions: renderSubscriptions,
  logistics: renderLogistics,
  compliance: renderCompliance,
  support: renderSupport,
  ai: renderAI,
  security: renderSecurity,
  global: renderGlobal,
  techops: renderTechOps,
};

export function adminSection() {
  var tab = normalizeAdminTab(adminState.tab);
  var fn = RENDERERS[tab] || renderOverview;
  return fn();
}

/* Generic drawer records for list-row inspect actions. */
export function adminDetailFor(id) {
  var s = adminState;
  var sources = [
    [s.users, 'id', 'User', 'Identity and safety record'],
    [s.roles, 'code', 'Role', 'Access-control role'],
    [s.sellers, 'id', 'Seller', 'Merchant compliance record'],
    [s.orders, 'id', 'Order', 'Commerce exception record'],
    [s.inventory, 'sku', 'SKU', 'Inventory position'],
    [s.crm, 'name', 'Segment', 'CRM audience'],
    [s.finance, 'id', 'Ledger entry', 'Finance control record'],
    [s.campaigns, 'id', 'Campaign', 'Marketing approval record'],
    [s.loyalty, 'tier', 'VIP tier', 'Loyalty programme record'],
    [s.subscriptions, 'id', 'Subscription', 'Club lifecycle record'],
    [s.shipments, 'id', 'Shipment', 'Logistics record'],
    [s.compliance, 'id', 'Control', 'Compliance register entry'],
    [s.tickets, 'id', 'Ticket', 'Support case'],
    [s.security, 'id', 'Security signal', 'Security event'],
    [s.cases, 'id', 'Case', 'Unified operations case'],
    [s.regions, 'code', 'Market', 'Global readiness record'],
    [s.techopsAgents, 'id', 'TechOps agent', 'Simulated specialist agent'],
    [s.techopsAlerts, 'id', 'TechOps alert', 'Simulated operations signal'],
    [s.techopsWorkflows, 'id', 'TechOps workflow', 'Simulated multi-agent workflow'],
    [s.techopsReports, 'id', 'TechOps report', 'Simulated report definition'],
    [adminProducts(), 'id', 'Product', 'Catalogue record'],
  ];
  for (var i = 0; i < sources.length; i++) {
    var list = sources[i][0], key = sources[i][1];
    for (var j = 0; j < list.length; j++) {
      var rec = list[j];
      if (rec[key] !== id) continue;
      var meta = Object.keys(rec).slice(0, 6).map(function (k) { return [k, rec[k]]; });
      return {
        kicker: sources[i][2] + ' · simulated record',
        title: id,
        summary: sources[i][3] + '. Values are deterministic demo data; no live system record is queried.',
        meta: meta,
        links: s.audit.slice(0, 4).map(function (a) { return [a.time, a.action, a.tier]; }),
        actions: [
          ['log-review', id, 'Log review', 'btn-sm'],
          ['close-detail', 'drawer', 'Close', 'btn-ghost'],
        ],
      };
    }
  }
  if (id === 'model-governance') {
    return {
      kicker: 'AI model card · simulated',
      title: 'Model governance',
      summary: 'Owner ai_ops · offline eval gates pass · canary fallback available · kill-switch target < 1 minute.',
      meta: [['Owner', 'ai_ops'], ['Registry', 'Simulated'], ['Red team', 'Quarterly'], ['Promotion', 'T4 dual approval']],
      links: [['14:28', 'forecast-v7 drift gate breach', 'T4'], ['13:46', 'studio-voice eval gates passed', 'T2']],
      actions: [['close-detail', 'drawer', 'Close', 'btn-ghost']],
    };
  }
  return {
    kicker: 'Record detail · simulated',
    title: id,
    summary: 'No matching demo record was found. The review is still logged locally.',
    meta: [['Environment', s.environment], ['Tenant', s.tenant], ['Actor', s.actor]],
    links: [],
    actions: [['log-review', id, 'Log review', 'btn-sm'], ['close-detail', 'drawer', 'Close', 'btn-ghost']],
  };
}

export { RENDERERS as ADMIN_RENDERERS };
