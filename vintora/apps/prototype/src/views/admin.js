/* =========================================================
   Vintora Admin — internal operations plane shell.
   Eighteen workspaces; canonical ten market-facing modules unchanged.
   ========================================================= */

import { esc } from '../core.js';
import {
  adminState, adminSeedData, adminPersist, adminFmt, adminTime, adminLog,
  adminHash, adminGuard, ADMIN_MODULES, ADMIN_GROUPS, ADMIN_SECTIONS,
  ADMIN_APPROVERS, normalizeAdminTab,
} from '../admin/state.js';
import {
  adminPill, adminTable, adminTr, adminAttrs, adminRowAttrs, adminBar,
  adminFields, adminApplyFilters, adminExport, adminCommandHTML,
  adminToolbar, adminDrawer, adminActionButton,
} from '../admin/components.js';
import { adminSection } from '../admin/sections.js';
import { adminHandle } from '../admin/actions.js';

function currentModule() {
  for (var i = 0; i < ADMIN_MODULES.length; i++) {
    if (ADMIN_MODULES[i].id === adminState.tab) return ADMIN_MODULES[i];
  }
  return ADMIN_MODULES[0];
}

function adminSidebar() {
  return ADMIN_GROUPS.map(function (group) {
    var items = ADMIN_MODULES.filter(function (m) { return m.group === group; });
    return '<div class="admin-group"><p class="admin-group-label">' + esc(group) + '</p>' +
      items.map(function (m) {
        return '<button class="' + (adminState.tab === m.id ? 'active' : '') + '" data-admin-tab="' + m.id + '">' +
          '<span aria-hidden="true">' + esc(m.icon) + '</span><small>' + esc(m.code + ' · ' + m.short) + '</small></button>';
      }).join('') + '</div>';
  }).join('');
}

function adminContextBar(module) {
  var coverage = adminState.coverage;
  var dataLabel = coverage && coverage.summary
    ? coverage.summary.dbBacked + ' / ' + coverage.summary.modules + ' DB'
    : 'Local simulation';
  return '<div class="admin-context-bar">' +
    '<span class="admin-context-chip"><small>ENV</small><strong>' + esc(adminState.environment) + '</strong></span>' +
    '<span class="admin-context-chip"><small>TENANT</small><strong>' + esc(adminState.tenant) + '</strong></span>' +
    '<span class="admin-context-chip"><small>MARKET</small><strong>' + esc(adminState.market === 'All' ? 'All markets' : adminState.market) + '</strong></span>' +
    '<span class="admin-context-chip"><small>WINDOW</small><strong>' + esc(adminState.range) + '</strong></span>' +
    '<span class="admin-context-chip"><small>ACTOR</small><strong>' + esc(adminState.actor) + '</strong></span>' +
    '<span class="admin-context-chip"><small>DATA</small><strong>' + esc(dataLabel) + '</strong></span>' +
    '<span class="admin-context-chip"><small>SESSION</small><strong id="admin-timer">' + adminFmt(adminState.seconds) + '</strong></span>' +
    '</div>';
}

export function viewAdmin() {
  var normalized = normalizeAdminTab(adminState.tab);
  if (normalized !== adminState.tab) {
    adminState.tab = normalized;
    adminPersist();
  }
  var module = currentModule();
  var banner = adminState.elevated
    ? '<div class="admin-alert ' + (adminState.breakGlass ? 'danger' : '') + '">⚠ ' +
      (adminState.breakGlass ? 'BREAK-GLASS' : 'ELEVATED') +
      ' · scope all · expires in <strong id="admin-timer-elevated">' + adminFmt(adminState.seconds) +
      '</strong> · approver ' + esc(adminState.approver) +
      adminActionButton('extend', 'session', 'Re-verify MFA', 'btn-sm btn-ghost') +
      adminActionButton('demote', 'session', 'End session', 'btn-sm btn-ghost') + '</div>'
    : '<div class="admin-banner"><span class="pill gold">SIMULATION · NO REAL ACTIONS</span>' +
      '<span>Read-only by default. Request elevation to enable guarded actions; all activity is logged locally.</span></div>';

  return '<section class="section admin-shell" data-admin-module="' + esc(adminState.tab) + '">' +
    '<div class="section-head"><div>' +
      '<p class="eyebrow">Internal operations plane · not a market-facing module</p>' +
      '<h1 class="serif">VINTORA ADMIN · CONTROL CENTER</h1>' +
      '<p>' + esc(module.code + ' · ' + module.title) + ' — ' + esc(module.kicker) + '.</p>' +
    '</div><button class="btn btn-ghost btn-sm" data-view="home">← Back to cellar</button></div>' +
    adminContextBar(module) +
    '<div class="admin-layout">' +
      '<aside class="admin-side" aria-label="Admin workspaces">' + adminSidebar() +
        '<div class="admin-side-foot"><span class="fine-print">19 workspaces · ten canonical modules unchanged</span>' +
        '<span class="fine-print">All provider calls: simulated</span></div>' +
      '</aside>' +
      '<div class="admin-main">' + banner + adminToolbar() + adminFields() + adminSection() +
        '<p class="fine-print">Deterministic local simulation. No real users, orders, payments, campaigns, loyalty balances or model controls are affected. ' +
        'Design authority: <code>vintora/21-admin-panel-module.md</code>.</p>' +
      '</div>' +
    '</div>' +
    '<div id="admin-command-host"></div>' + adminDrawer() +
    '</section>';
}

export {
  adminSeedData, adminState, adminPersist, adminFmt, adminTime, adminLog,
  adminHash, adminPill, adminTable, adminTr, adminAttrs, adminRowAttrs,
  adminBar, adminGuard, adminFields, adminApplyFilters, adminExport,
  adminCommandHTML, adminSection, adminHandle, adminToolbar,
  ADMIN_SECTIONS, ADMIN_MODULES, ADMIN_APPROVERS,
};

export default viewAdmin;
