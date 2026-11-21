/* =========================================================
   Vintora Admin — state, module registry and deterministic seed.
   Internal operations plane; not one of the ten market modules.
   ========================================================= */

import { state as appState } from '../core.js';

export var ADMIN_MODULES = [
  { id: 'overview', code: 'ADM-01', icon: '⌂', group: 'Platform', label: 'Super Admin', title: 'Super Admin Dashboard', kicker: 'Platform command centre', short: 'Overview' },
  { id: 'users', code: 'ADM-02', icon: '◉', group: 'Platform', label: 'Users', title: 'User Management', kicker: 'Identity, age and safety', short: 'Users' },
  { id: 'roles', code: 'ADM-03', icon: '⚿', group: 'Platform', label: 'Roles & Permissions', title: 'Role & Permissions', kicker: 'Least privilege and recertification', short: 'Roles' },
  { id: 'products', code: 'ADM-04', icon: '▧', group: 'Commerce', label: 'Products', title: 'Product Management', kicker: 'Catalogue governance', short: 'Products' },
  { id: 'sellers', code: 'ADM-05', icon: '▤', group: 'Commerce', label: 'Sellers', title: 'Seller Management', kicker: 'Merchant health and licensing', short: 'Sellers' },
  { id: 'orders', code: 'ADM-06', icon: '▣', group: 'Commerce', label: 'Orders', title: 'Order Management', kicker: 'Exceptions and refunds', short: 'Orders' },
  { id: 'inventory', code: 'ADM-07', icon: '▥', group: 'Commerce', label: 'Inventory', title: 'Inventory Management', kicker: 'Stock, reserves and replenishment', short: 'Inventory' },
  { id: 'crm', code: 'ADM-08', icon: '◎', group: 'Customer & Growth', label: 'CRM', title: 'CRM', kicker: 'Segments, consent and journeys', short: 'CRM' },
  { id: 'finance', code: 'ADM-09', icon: '◈', group: 'Operations', label: 'Finance & Accounting', title: 'Finance & Accounting', kicker: 'Ledger, reconciliation and payouts', short: 'Finance' },
  { id: 'marketing', code: 'ADM-10', icon: '✧', group: 'Customer & Growth', label: 'Marketing', title: 'Marketing Management', kicker: 'Human-approved campaigns', short: 'Marketing' },
  { id: 'loyalty', code: 'ADM-11', icon: '✦', group: 'Customer & Growth', label: 'Loyalty', title: 'Loyalty Program Management', kicker: 'VIP tiers and point liability', short: 'Loyalty' },
  { id: 'subscriptions', code: 'ADM-12', icon: '↻', group: 'Customer & Growth', label: 'Subscriptions', title: 'Subscription Management', kicker: 'Club plans and lifecycle', short: 'Subscriptions' },
  { id: 'logistics', code: 'ADM-13', icon: '➤', group: 'Operations', label: 'Logistics', title: 'Logistics Management', kicker: 'Carriers, cold chain and claims', short: 'Logistics' },
  { id: 'compliance', code: 'ADM-14', icon: '⚖', group: 'Governance', label: 'Compliance', title: 'Compliance Management', kicker: 'Age, KYC and licensing controls', short: 'Compliance' },
  { id: 'support', code: 'ADM-15', icon: '☎', group: 'Operations', label: 'Support', title: 'Customer Support Management', kicker: 'Tickets, SLA and QA', short: 'Support' },
  { id: 'ai', code: 'ADM-16', icon: '◇', group: 'Intelligence', label: 'AI Operations', title: 'AI Operations Center', kicker: 'Models, eval gates and kill switch', short: 'AI Ops' },
  { id: 'security', code: 'ADM-17', icon: '⛨', group: 'Governance', label: 'Security Center', title: 'Security Center', kicker: 'Sessions, keys and access reviews', short: 'Security' },
  { id: 'global', code: 'ADM-18', icon: '◐', group: 'Governance', label: 'Global Operations', title: 'Global Operations Center', kicker: 'Markets, FX and local readiness', short: 'Global' },
  { id: 'techops', code: 'ADM-19', icon: '⚙', group: 'Intelligence', label: 'Ultimate AI TechOps', title: 'Ultimate AI TechOps', kicker: 'Autonomous AI Technology Operations Team', short: 'AI TechOps' },
];

export var ADMIN_GROUPS = ['Platform', 'Commerce', 'Customer & Growth', 'Operations', 'Governance', 'Intelligence'];

/* Legacy aliases keep saved views and deep links working after the 10 -> 19 expansion. */
var LEGACY_TABS = {
  cases: 'security',
  access: 'roles',
  payments: 'finance',
  campaigns: 'marketing',
  ai: 'ai',
};

export function normalizeAdminTab(tab) {
  if (!tab) return 'overview';
  if (LEGACY_TABS[tab]) return LEGACY_TABS[tab];
  for (var i = 0; i < ADMIN_MODULES.length; i++) if (ADMIN_MODULES[i].id === tab) return tab;
  return 'overview';
}

/* Backwards-compatible shape used by the original self-test and documentation. */
export var ADMIN_SECTIONS = ADMIN_MODULES.map(function (m) {
  return [m.id, m.icon, m.code + ' ' + m.short];
});

export var ADMIN_APPROVERS = ['finance_ops', 'seller_ops', 'ai_ops', 'growth_ops', 'auditor', 'trust_safety'];

export function adminSeedData() {
  return {
    tab: 'overview',
    query: '',
    severity: 'All',
    status: 'All',
    market: 'All',
    range: '24h',
    tenant: 'All tenants',
    environment: 'SIMULATION',
    savedView: 'Default',
    selectedCase: 'case-901',
    selectedTicket: 'SUP-3301',
    drawer: null,
    coverage: null,
    actor: 'ops_support',
    approver: 'finance_ops',
    elevated: false,
    breakGlass: false,
    seconds: 900,
    killSwitch: false,
    clock: 872,
    reason: '',
    bulk: [],
    cases: [
      { id: 'case-901', domain: 'orders', severity: 'P1', sla: '12m', status: 'open', assignee: 'unassigned', market: 'US', entity: 'ord-88117', summary: 'Refund above threshold', detail: 'Buyer requested a refund after a delivery delay. Simulated payment is captured; age, KYC and licence checks cleared at checkout.' },
      { id: 'case-897', domain: 'finance', severity: 'P2', sla: '1h 20m', status: 'assigned', assignee: 'finance_ops', market: 'GB', entity: 'pay-77101', summary: 'Chargeback response due', detail: 'Simulated settlement shows an open dispute. Evidence pack is pending human review.' },
      { id: 'case-884', domain: 'marketing', severity: 'P3', sla: '3h', status: 'open', assignee: 'unassigned', market: 'SG', entity: 'cmp-4402', summary: 'Creative flagged WARN', detail: 'Generated email creative has a brand-voice warning. No publish is permitted until a named human acknowledges it.' },
      { id: 'case-879', domain: 'sellers', severity: 'P2', sla: '45m', status: 'in_progress', assignee: 'seller_ops', market: 'FR', entity: 'sel-882', summary: 'Licence expiring', detail: 'Seller licence expires in 14 days. Payout hold is recommended pending verification.' },
      { id: 'case-871', domain: 'ai', severity: 'P1', sla: '8m', status: 'escalated', assignee: 'ai_ops', market: 'Global', entity: 'forecast-v7', summary: 'Model drift detected', detail: 'Canary model breached its drift gate. Automatic fallback to champion is available.' }
    ],
    approvals: [
      { id: 'apr-441', action: 'Refund $1,180', tier: 'T3', requester: 'ops_support', status: 'pending', reason: 'Delivery exception — case-901', entity: 'case-901' },
      { id: 'apr-438', action: 'Suspend seller + payout hold', tier: 'T3', requester: 'seller_ops', status: 'pending', reason: 'Licence verification failed', entity: 'sel-882' },
      { id: 'apr-435', action: 'Promote model to production', tier: 'T4', requester: 'ai_ops', status: 'pending', reason: 'Eval gates passed', entity: 'studio-voice v2.1' },
      { id: 'apr-430', action: 'Rotate global signing key', tier: 'T4', requester: 'security_ops', status: 'pending', reason: 'Scheduled key rotation', entity: 'kms-global-01' }
    ],
    models: [
      { key: 'sommelier-rank', version: 'v9.2', stage: 'champion', status: 'active', drift: 'none', cap: '$12k/mo', eval: 'PASS', owner: 'ai_ops' },
      { key: 'forecast-v7', version: 'v7.4', stage: 'canary', status: 'halted', drift: 'detected', cap: '$8k/mo', eval: 'FAIL', owner: 'ai_ops' },
      { key: 'studio-voice', version: 'v2.1', stage: 'shadow', status: 'active', drift: 'none', cap: '$5k/mo', eval: 'PASS', owner: 'growth_ops' },
      { key: 'growth-planner', version: 'v1.3', stage: 'shadow', status: 'active', drift: 'none', cap: '$4k/mo', eval: 'WARN', owner: 'growth_ops' }
    ],
    users: [
      { id: 'usr_1042', market: 'US', kyc: 'verified', age: '21+', flag: 'none', status: 'Active', risk: 'Low', last: '2m', tier: 'Gold' },
      { id: 'usr_2077', market: 'GB', kyc: 'review', age: '18+', flag: 'velocity', status: 'Under review', risk: 'High', last: '11m', tier: 'Silver' },
      { id: 'usr_3188', market: 'SG', kyc: 'verified', age: '18+', flag: 'none', status: 'Active', risk: 'Low', last: '1h', tier: 'Bronze' },
      { id: 'usr_4410', market: 'AE', kyc: 'pending', age: '—', flag: 'documents', status: 'Restricted', risk: 'High', last: '3d', tier: 'Bronze' },
      { id: 'usr_5124', market: 'FR', kyc: 'verified', age: '18+', flag: 'chargeback', status: 'Active', risk: 'Medium', last: '26m', tier: 'Platinum' }
    ],
    roles: [
      { code: 'super_admin', scope: 'Global', members: 4, controls: 42, review: 'Q3 2027', status: 'JIT + MFA' },
      { code: 'finance_ops', scope: 'Tenant', members: 9, controls: 18, review: 'Q3 2027', status: 'T3 dual' },
      { code: 'seller_ops', scope: 'Tenant', members: 12, controls: 15, review: 'Q3 2027', status: 'T3 dual' },
      { code: 'trust_safety', scope: 'Market', members: 16, controls: 11, review: 'Q4 2027', status: 'JIT' },
      { code: 'auditor', scope: 'Global read', members: 7, controls: 10, review: 'Q3 2027', status: 'Read only' }
    ],
    sellers: [
      { id: 'sel-110', name: 'Château Bellevue', tier: '$399', licence: 'valid', payout: 'clear', disputes: '0.2%', status: 'Approved', market: 'FR', gmv: '$1.8M' },
      { id: 'sel-882', name: 'Napa Collective', tier: '$999', licence: 'expiring', payout: 'hold', disputes: '1.8%', status: 'Review', market: 'US', gmv: '$4.2M' },
      { id: 'sel-301', name: 'Loire Selections', tier: '$99', licence: 'valid', payout: 'clear', disputes: '0.0%', status: 'Approved', market: 'FR', gmv: '$620k' },
      { id: 'sel-417', name: 'Kyoto Spirits KK', tier: '$399', licence: 'valid', payout: 'clear', disputes: '0.4%', status: 'Approved', market: 'JP', gmv: '$910k' }
    ],
    orders: [
      { id: 'ord-88120', buyer: 'usr_1042', value: '$420', state: 'stuck', sla: '18m', risk: 'Low', market: 'US', payment: 'captured', shipment: 'pending' },
      { id: 'ord-88117', buyer: 'usr_2077', value: '$1,180', state: 'refund requested', sla: '42m', risk: 'High', market: 'GB', payment: 'captured', shipment: 'delayed' },
      { id: 'ord-88103', buyer: 'usr_3188', value: '$96', state: 'in fulfilment', sla: '2h', risk: 'Low', market: 'SG', payment: 'settled', shipment: 'in transit' },
      { id: 'ord-88099', buyer: 'usr_5124', value: '$2,240', state: 'anomaly', sla: '7m', risk: 'High', market: 'FR', payment: 'review', shipment: 'held' }
    ],
    inventory: [
      { sku: 'sku-1002', warehouse: 'EU-1 · Bordeaux', onHand: 184, reserved: 32, reorder: 60, cover: '24d', status: 'Healthy', market: 'FR' },
      { sku: 'sku-1007', warehouse: 'US-2 · Napa', onHand: 41, reserved: 18, reorder: 50, cover: '6d', status: 'Reorder', market: 'US' },
      { sku: 'sku-1010', warehouse: 'APAC-1 · Singapore', onHand: 12, reserved: 9, reorder: 30, cover: '3d', status: 'Critical', market: 'SG' },
      { sku: 'sku-1005', warehouse: 'UK-1 · London', onHand: 96, reserved: 21, reorder: 40, cover: '18d', status: 'Healthy', market: 'GB' }
    ],
    crm: [
      { name: 'High-intent Bordeaux', size: '84.2k', source: 'Taste graph', consent: 'Opt-in', conversion: '4.8%', status: 'Active', market: 'FR' },
      { name: 'Gift buyers · Q4', size: '112.9k', source: 'Browse behaviour', consent: 'Opt-in', conversion: '3.1%', status: 'Active', market: 'GB' },
      { name: 'Lapsed collectors', size: '27.4k', source: 'RFM', consent: 'Limited', conversion: '1.2%', status: 'Suppressed', market: 'US' },
      { name: 'Trade re-order', size: '9.6k', source: 'B2B history', consent: 'B2B', conversion: '8.7%', status: 'Active', market: 'Global' }
    ],
    finance: [
      { id: 'led-7741', type: 'Capture', amount: '$1,180', status: 'Settled', controls: '3DS2 · ledger', market: 'GB' },
      { id: 'led-7738', type: 'Payout', amount: '$84,200', status: 'Scheduled', controls: 'Dual approval', market: 'FR' },
      { id: 'led-7731', type: 'Refund', amount: '$240', status: 'Pending', controls: 'T3 approval', market: 'US' },
      { id: 'led-7724', type: 'FX adjustment', amount: '$1,940', status: 'Reconciled', controls: '15m lock', market: 'SG' }
    ],
    campaigns: [
      { id: 'cmp-4391', name: 'Autumn Rioja', channel: 'paid social', compliance: 'PASS', voice: '92/100', spend: '$4,200', status: 'Approved', market: 'GB' },
      { id: 'cmp-4402', name: 'Holiday Single Malt', channel: 'email', compliance: 'WARN', voice: '84/100', spend: '$1,100', status: 'Awaiting human', market: 'SG' },
      { id: 'cmp-4410', name: 'Spring Rosé', channel: 'search', compliance: 'BLOCK', voice: '71/100', spend: '—', status: 'Rejected', market: 'US' }
    ],
    loyalty: [
      { tier: 'Bronze', members: '812k', liability: '$1.2M', accrual: '1×', status: 'Active', market: 'Global' },
      { tier: 'Silver', members: '394k', liability: '$2.6M', accrual: '1.25×', status: 'Active', market: 'Global' },
      { tier: 'Gold', members: '121k', liability: '$3.1M', accrual: '1.5×', status: 'Active', market: 'Global' },
      { tier: 'Platinum', members: '18k', liability: '$1.8M', accrual: '2×', status: 'Active', market: 'Global' }
    ],
    subscriptions: [
      { id: 'sub-2201', plan: 'Better · monthly', member: 'usr_1042', state: 'Active', next: '12 Dec', mrr: '$89', market: 'US' },
      { id: 'sub-2204', plan: 'Good · quarterly', member: 'usr_3188', state: 'Paused', next: '—', mrr: '$0', market: 'SG' },
      { id: 'sub-2210', plan: 'Icon · annual', member: 'usr_5124', state: 'Active', next: '02 Feb', mrr: '$399', market: 'FR' },
      { id: 'sub-2218', plan: 'Best · monthly', member: 'usr_2077', state: 'Payment retry', next: '24 Nov', mrr: '$189', market: 'GB' }
    ],
    shipments: [
      { id: 'shp-5510', carrier: 'DHL', state: 'in transit', temp: 'in range', eta: '2d', exception: 'None', market: 'US' },
      { id: 'shp-5508', carrier: 'FedEx', state: 'delayed', temp: 'excursion', eta: '4d', exception: 'Claim', market: 'GB' },
      { id: 'shp-5499', carrier: 'UPS', state: 'delivered', temp: 'in range', eta: '—', exception: 'None', market: 'SG' },
      { id: 'shp-5532', carrier: 'Maersk', state: 'customs hold', temp: 'in range', eta: '6d', exception: 'Docs', market: 'FR' }
    ],
    compliance: [
      { id: 'AGE-01', control: 'Age assurance before order', state: 'Enforced', evidence: 'DB assertion', owner: 'trust_safety', market: 'Global' },
      { id: 'KYC-02', control: 'Seller licence verification', state: 'Enforced', evidence: 'Document review', owner: 'seller_ops', market: 'EU' },
      { id: 'AD-03', control: 'Advertising ≤ 8% of revenue', state: 'Enforced', evidence: 'Spend gate', owner: 'growth_ops', market: 'Global' },
      { id: 'AI-04', control: 'Human approval before publish', state: 'Enforced', evidence: 'Approval record', owner: 'ai_ops', market: 'Global' },
      { id: 'PCI-05', control: 'No raw PAN/CVV in logs', state: 'Enforced', evidence: 'Log scan', owner: 'finance_ops', market: 'Global' }
    ],
    tickets: [
      { id: 'SUP-3301', subject: 'Delivery delay — refund request', channel: 'Email', priority: 'P1', sla: '18m', status: 'Open', agent: 'unassigned', market: 'GB' },
      { id: 'SUP-3298', subject: 'Age verification re-check', channel: 'Chat', priority: 'P2', sla: '1h', status: 'Assigned', agent: 'ops_support', market: 'AE' },
      { id: 'SUP-3294', subject: 'Seller licence document upload', channel: 'Portal', priority: 'P3', sla: '4h', status: 'Waiting', agent: 'seller_ops', market: 'FR' },
      { id: 'SUP-3289', subject: 'Loyalty points correction', channel: 'Email', priority: 'P2', sla: '2h', status: 'Escalated', agent: 'finance_ops', market: 'US' }
    ],
    security: [
      { id: 'SEC-881', event: 'Hardware MFA challenge', state: 'Passed', actor: 'admin@vintora.local', risk: 'Low', market: 'Global' },
      { id: 'SEC-884', event: 'Impossible travel signal', state: 'Review', actor: 'usr_2077', risk: 'High', market: 'GB' },
      { id: 'SEC-887', event: 'Break-glass session', state: 'Approved', actor: 'finance_ops', risk: 'Medium', market: 'Global' },
      { id: 'SEC-890', event: 'Key rotation due', state: 'Scheduled', actor: 'security_ops', risk: 'Low', market: 'Global' }
    ],
    regions: [
      { code: 'US', name: 'North America', currency: 'USD', age: '21+', readiness: 'Ready', adapter: 'Simulated', status: 'Active' },
      { code: 'GB', name: 'United Kingdom', currency: 'GBP', age: '18+', readiness: 'Ready', adapter: 'Simulated', status: 'Active' },
      { code: 'FR', name: 'European Union', currency: 'EUR', age: '18+', readiness: 'Ready', adapter: 'Simulated', status: 'Active' },
      { code: 'SG', name: 'South-east Asia', currency: 'SGD', age: '18+', readiness: 'Review', adapter: 'Simulated', status: 'Monitor' },
      { code: 'AE', name: 'Middle East', currency: 'AED', age: '21+', readiness: 'Policy review', adapter: 'Simulated', status: 'Monitor' },
      { code: 'JP', name: 'Japan', currency: 'JPY', age: '20+', readiness: 'Ready', adapter: 'Simulated', status: 'Active' }
    ],
    audit: [
      { time: '14:31', actor: 'finance_ops', action: 'Payout hold · sel-882', tier: 'T3', detail: 'Approved by ai_ops · evidence case-879' },
      { time: '14:28', actor: 'ai_ops', action: 'Halt model forecast-v7', tier: 'T4', detail: 'Drift gate breach · fallback to champion' },
      { time: '14:22', actor: 'ops_support', action: 'Refund initiated · case-901', tier: 'T3', detail: 'Pending dual approval' },
      { time: '14:09', actor: 'growth_ops', action: 'Campaign paused · cmp-4402', tier: 'T2', detail: 'Compliance WARN acknowledged by human' },
      { time: '13:54', actor: 'auditor', action: 'Evidence export', tier: 'T4', detail: 'Hash manifest generated' }
    ],
    techopsMode: 'GUARDED',
    techopsAgents: [
      { id: 'CTO-01', name: 'CTO Agent', domain: 'Architecture', status: 'Healthy', mode: 'Assist', tier: 'T4', lastRun: '2m', actions: '18', health: 'PASS', stack: 'Node.js · Azure' },
      { id: 'DEV-01', name: 'DevOps Agent', domain: 'Delivery', status: 'Healthy', mode: 'Guarded auto', tier: 'T3', lastRun: '4m', actions: '42', health: 'PASS', stack: 'Azure · Node.js' },
      { id: 'SRE-01', name: 'SRE Agent', domain: 'Reliability', status: 'Watching', mode: 'Guarded auto', tier: 'T3', lastRun: '30s', actions: '76', health: 'WARN', stack: 'Azure · PostgreSQL' },
      { id: 'QA-01', name: 'QA Agent', domain: 'Quality', status: 'Healthy', mode: 'Assist', tier: 'T2', lastRun: '9m', actions: '31', health: 'PASS', stack: 'Next.js · React' },
      { id: 'SEC-01', name: 'Security Agent', domain: 'Security', status: 'Healthy', mode: 'Guarded auto', tier: 'T4', lastRun: '1m', actions: '24', health: 'PASS', stack: 'Azure · Supabase' },
      { id: 'DBA-01', name: 'Database Agent', domain: 'Data', status: 'Healthy', mode: 'Guarded auto', tier: 'T3', lastRun: '3m', actions: '15', health: 'PASS', stack: 'PostgreSQL · Supabase' },
      { id: 'API-01', name: 'API Agent', domain: 'Platform', status: 'Healthy', mode: 'Guarded auto', tier: 'T2', lastRun: '20s', actions: '88', health: 'PASS', stack: 'Node.js · Stripe' },
      { id: 'MOB-01', name: 'Mobile App Agent', domain: 'Clients', status: 'Standby', mode: 'Observe', tier: 'T2', lastRun: '22m', actions: '7', health: 'PASS', stack: 'FlutterFlow' },
      { id: 'WEB-01', name: 'Web App Agent', domain: 'Clients', status: 'Healthy', mode: 'Assist', tier: 'T2', lastRun: '6m', actions: '35', health: 'PASS', stack: 'Next.js · React' },
      { id: 'CLD-01', name: 'Cloud Agent', domain: 'Infrastructure', status: 'Healthy', mode: 'Guarded auto', tier: 'T3', lastRun: '45s', actions: '53', health: 'PASS', stack: 'Azure' },
      { id: 'SUP-01', name: 'Technical Support Agent', domain: 'Support', status: 'Healthy', mode: 'Assist', tier: 'T1', lastRun: '2m', actions: '64', health: 'PASS', stack: 'Node.js' },
      { id: 'COST-01', name: 'Cost Optimization Agent', domain: 'FinOps', status: 'Watching', mode: 'Assist', tier: 'T2', lastRun: '12m', actions: '11', health: 'WARN', stack: 'Azure · PostgreSQL' },
      { id: 'REL-01', name: 'Release Management Agent', domain: 'Delivery', status: 'Healthy', mode: 'Assist', tier: 'T3', lastRun: '8m', actions: '19', health: 'PASS', stack: 'Azure · Node.js' },
      { id: 'MDL-01', name: 'AI Model Monitoring Agent', domain: 'AI Ops', status: 'Watching', mode: 'Guarded auto', tier: 'T4', lastRun: '10s', actions: '29', health: 'WARN', stack: 'OpenAI adapter' },
      { id: 'CMP-01', name: 'Compliance Agent', domain: 'Governance', status: 'Healthy', mode: 'Assist', tier: 'T4', lastRun: '5m', actions: '13', health: 'PASS', stack: 'PostgreSQL' },
      { id: 'PM-01', name: 'AI Product Manager Agent', domain: 'Product', status: 'Healthy', mode: 'Assist', tier: 'T2', lastRun: '18m', actions: '9', health: 'PASS', stack: 'Next.js' },
      { id: 'SCRUM-01', name: 'AI Scrum Master Agent', domain: 'Delivery', status: 'Healthy', mode: 'Assist', tier: 'T1', lastRun: '15m', actions: '27', health: 'PASS', stack: 'Node.js' },
      { id: 'BA-01', name: 'AI Business Analyst Agent', domain: 'Product', status: 'Healthy', mode: 'Observe', tier: 'T1', lastRun: '26m', actions: '6', health: 'PASS', stack: 'PostgreSQL' },
      { id: 'DA-01', name: 'AI Data Analyst Agent', domain: 'Data', status: 'Healthy', mode: 'Assist', tier: 'T2', lastRun: '7m', actions: '22', health: 'PASS', stack: 'Supabase · PostgreSQL' },
      { id: 'REV-01', name: 'AI Revenue Optimization Agent', domain: 'Growth', status: 'Healthy', mode: 'Assist', tier: 'T3', lastRun: '11m', actions: '14', health: 'PASS', stack: 'Stripe adapter' },
      { id: 'FRD-01', name: 'AI Fraud Detection Agent', domain: 'Risk', status: 'Watching', mode: 'Guarded auto', tier: 'T3', lastRun: '12s', actions: '38', health: 'WARN', stack: 'Stripe · PostgreSQL' },
      { id: 'LIC-01', name: 'AI Compliance & License Verification Agent', domain: 'Governance', status: 'Healthy', mode: 'Assist', tier: 'T3', lastRun: '4m', actions: '17', health: 'PASS', stack: 'Supabase' },
      { id: 'VEN-01', name: 'AI Vendor Management Agent', domain: 'Vendor', status: 'Healthy', mode: 'Observe', tier: 'T2', lastRun: '31m', actions: '5', health: 'PASS', stack: 'Azure' },
      { id: 'MQC-01', name: 'AI Marketplace Quality Control Agent', domain: 'Quality', status: 'Healthy', mode: 'Assist', tier: 'T2', lastRun: '14m', actions: '21', health: 'PASS', stack: 'Next.js · PostgreSQL' },
    ],
    techopsWorkflows: [
      { id: 'WF-INC', name: 'Detect → triage → contain → ticket → escalate', owner: 'SRE-01', agents: 'SRE-01, SEC-01, SUP-01', trigger: 'SLO breach or anomaly', steps: ['Detect', 'Correlate', 'Open ticket', 'Safe self-heal', 'Human escalation'], sla: 'P0 5m · P1 15m', guard: 'T4 for critical escalation', status: 'Active' },
      { id: 'WF-REL', name: 'Commit → canary → QA → security → release', owner: 'REL-01', agents: 'DEV-01, QA-01, SEC-01', trigger: 'Release candidate', steps: ['Build', 'Canary 5%', 'QA gate', 'Security gate', 'Human approve', 'Progressive rollout'], sla: '30m target', guard: 'Named human approval', status: 'Active' },
      { id: 'WF-COST', name: 'Cost anomaly → rightsize → approval', owner: 'COST-01', agents: 'CLD-01, DBA-01', trigger: 'Spend variance > 10%', steps: ['Detect', 'Attribute', 'Model saving', 'Approve', 'Apply'], sla: '24h target', guard: 'T3 for infrastructure change', status: 'Monitoring' },
      { id: 'WF-FRD', name: 'Fraud signal → hold → human review', owner: 'FRD-01', agents: 'REV-01, SEC-01', trigger: 'Velocity or chargeback signal', steps: ['Score', 'Freeze safely', 'Ticket', 'Human review', 'Decision'], sla: 'P1 15m', guard: 'No autonomous adverse decision', status: 'Active' },
      { id: 'WF-MDL', name: 'Model drift → fallback → promotion gate', owner: 'MDL-01', agents: 'CTO-01, CMP-01', trigger: 'Eval or drift breach', steps: ['Detect', 'Fallback champion', 'Evidence pack', 'Human approve', 'Promote or rollback'], sla: '< 1 min halt target', guard: 'T4 dual approval', status: 'Active' },
      { id: 'WF-LIC', name: 'Seller licence → verify → hold payout', owner: 'LIC-01', agents: 'MQC-01, CMP-01', trigger: 'Licence expiry or mismatch', steps: ['Match registry', 'Flag', 'Payout hold', 'Human verify', 'Resolve'], sla: 'Same-day target', guard: 'T3 payout hold', status: 'Active' },
    ],
    techopsAlerts: [
      { id: 'OPS-501', severity: 'P1', source: 'API latency', agent: 'SRE-01', summary: 'p99 above target in EU checkout edge', status: 'Open', autoAction: 'Trace captured · canary isolated', ticket: 'OPS-T-2201', time: '14:42', market: 'EU' },
      { id: 'OPS-502', severity: 'P2', source: 'Cloud cost', agent: 'COST-01', summary: 'Azure egress 12% above weekly baseline', status: 'Acknowledged', autoAction: 'Rightsizing candidate prepared', ticket: 'OPS-T-2202', time: '14:36', market: 'Global' },
      { id: 'OPS-503', severity: 'P1', source: 'Model drift', agent: 'MDL-01', summary: 'Forecast canary breached drift gate', status: 'Escalated', autoAction: 'Fallback to champion', ticket: 'OPS-T-2203', time: '14:28', market: 'Global' },
      { id: 'OPS-504', severity: 'P2', source: 'Fraud signal', agent: 'FRD-01', summary: 'Velocity cluster above threshold', status: 'Monitoring', autoAction: 'Safe hold applied · human queue', ticket: 'OPS-T-2204', time: '14:19', market: 'US' },
      { id: 'OPS-505', severity: 'P3', source: 'Vendor SLA', agent: 'VEN-01', summary: 'Provider status page stale for 40m', status: 'Open', autoAction: 'Alternate status source queued', ticket: 'OPS-T-2205', time: '13:58', market: 'Global' },
      { id: 'OPS-506', severity: 'P2', source: 'Licence check', agent: 'LIC-01', summary: 'Seller licence expires in 14 days', status: 'Open', autoAction: 'Review packet assembled', ticket: 'OPS-T-2206', time: '13:47', market: 'FR' },
    ],
    techopsIncidents: [
      { time: '14:42', title: 'EU checkout latency · trace captured', tier: 'T3', status: 'Containing' },
      { time: '14:28', title: 'Forecast drift · champion fallback', tier: 'T4', status: 'Escalated' },
      { time: '14:19', title: 'Velocity cluster · safe hold', tier: 'T3', status: 'Monitoring' },
      { time: '13:58', title: 'Vendor status source degraded', tier: 'T2', status: 'Tracking' },
      { time: '13:47', title: 'Seller licence renewal review', tier: 'T2', status: 'Queued' },
    ],
    techopsReports: [
      { id: 'RPT-OPS', name: 'Operations health digest', cadence: 'Hourly', owner: 'CTO-01', status: 'Ready', format: 'JSON · Markdown' },
      { id: 'RPT-SLO', name: 'SLO and error budget', cadence: 'Daily', owner: 'SRE-01', status: 'Ready', format: 'PDF · CSV' },
      { id: 'RPT-COST', name: 'Cloud unit economics', cadence: 'Weekly', owner: 'COST-01', status: 'Draft', format: 'CSV' },
      { id: 'RPT-AUDIT', name: 'Agent action evidence pack', cadence: 'On demand', owner: 'CMP-01', status: 'Ready', format: 'JSON manifest' },
    ],
  };
}

function hydrate() {
  var fresh = adminSeedData();
  var saved = null;
  try {
    var raw = localStorage.getItem('vintora.admin.prototype');
    if (raw) saved = JSON.parse(raw);
  } catch (e) { /* storage unavailable — use seed */ }
  if (!saved || typeof saved !== 'object') return fresh;
  Object.keys(fresh).forEach(function (key) {
    if (key === 'coverage') return;
    if (saved[key] !== undefined && saved[key] !== null) fresh[key] = saved[key];
  });
  fresh.tab = normalizeAdminTab(fresh.tab);
  fresh.drawer = null;
  fresh.bulk = [];
  return fresh;
}

export var adminState = hydrate();

export function adminPersist() {
  try { localStorage.setItem('vintora.admin.prototype', JSON.stringify(adminState)); } catch (e) { /* ignore */ }
}

export function adminReset() {
  var fresh = adminSeedData();
  Object.keys(adminState).forEach(function (key) { delete adminState[key]; });
  Object.keys(fresh).forEach(function (key) { adminState[key] = fresh[key]; });
  adminPersist();
}

export function adminFmt(sec) {
  var m = Math.floor(sec / 60), s = sec % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

export function adminTime() {
  var h = Math.floor(adminState.clock / 60) % 24, m = adminState.clock % 60;
  adminState.clock++;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

export function adminLog(action, tier, detail) {
  adminState.audit.unshift({ time: adminTime(), actor: adminState.actor, action: action, tier: tier || 'T1', detail: detail || '' });
  if (adminState.audit.length > 60) adminState.audit.length = 60;
  adminPersist();
}

export function adminHash(str) {
  var h = 5381;
  for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return 'sha-sim-' + ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

export function adminGuard(reason, approver, tier, options) {
  var opts = options || {};
  if (tier === 'T3' || tier === 'T4') {
    if (!reason || !reason.trim()) { toastAdmin('Reason is required for ' + tier + ' actions'); return false; }
    if (!approver || approver === adminState.actor) { toastAdmin('A distinct approver is required — requester cannot approve'); return false; }
    // Break-glass is itself the elevation path, so it may run unelevated.
    if (!opts.allowUnelevated && !adminState.elevated) {
      toastAdmin('Elevate this session before ' + tier + ' actions');
      return false;
    }
  }
  return true;
}

/* Toast is injected by components.js to avoid a circular import at module load. */
var toastFn = function () {};
export function setAdminToast(fn) { toastFn = fn; }
export function toastAdmin(msg) { toastFn(msg); }

export function adminMarket(m) {
  return adminState.market === 'All' || !m || m === 'Global' || m === adminState.market;
}

export function adminProducts() {
  var products = (appState.products && appState.products.length ? appState.products : []) ;
  if (!products.length) return [];
  return products.map(function (p) {
    return {
      id: p.id,
      name: p.name,
      category: p.type || 'Wine',
      market: (p.country || p.region || 'Global').slice(0, 2).toUpperCase(),
      stock: p.stock == null ? '—' : p.stock,
      status: p.stock < 15 ? 'Review' : 'Published',
      provenance: p.provenance,
    };
  });
}

export default adminState;
