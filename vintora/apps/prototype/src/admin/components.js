/* =========================================================
   Vintora Admin — shared presentation components and filters.
   ========================================================= */

import { esc, toast, $$ } from '../core.js';
import {
  adminState, ADMIN_MODULES, ADMIN_GROUPS, ADMIN_APPROVERS,
  adminGuard, adminHash, adminLog, adminPersist, setAdminToast,
} from './state.js';

setAdminToast(toast);

export function adminPill(text, kind) {
  return '<span class="pill ' + (kind || '') + '">' + esc(text) + '</span>';
}

export function adminAttrs(o) {
  return Object.keys(o).map(function (k) { return 'data-' + k + '="' + esc(o[k]) + '"'; }).join(' ');
}

export function adminTr(attrs, cells) {
  return '<tr ' + attrs + '>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
}

export function adminRowAttrs(o) {
  var a = {
    'admin-row': '',
    'search-text': o.text || '',
    severity: o.severity || '',
    status: o.status || '',
    market: o.market || '',
  };
  if (o.select) a['admin-select-value'] = o.select;
  return adminAttrs(a);
}

export function adminTable(heads, rows, opts) {
  var options = opts || {};
  var selectable = !!options.selectable;
  var head = selectable ? '<th><input type="checkbox" data-admin-select-all aria-label="Select all rows"></th>' : '';
  head += heads.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('');
  if (options.actions) head += '<th>Action</th>';
  var body = rows.length ? rows.join('') :
    '<tr><td colspan="' + (heads.length + (selectable ? 1 : 0) + (options.actions ? 1 : 0)) + '">' +
    '<p class="fine-print">No records match the current saved view.</p></td></tr>';
  var bulk = selectable ? '<div class="admin-bulk"><span data-admin-bulk-count>0 selected</span>' +
    '<button class="btn btn-sm btn-ghost" data-admin-action="bulk-preview" data-id="' + esc(options.bulkId || 'rows') + '">Dry run</button>' +
    '<button class="btn btn-sm btn-ghost" data-admin-action="bulk-approve" data-id="' + esc(options.bulkId || 'rows') + '">Apply (T3)</button></div>' : '';
  return '<div class="admin-table-block">' + bulk + '<div class="table-wrap"><table><thead><tr>' + head +
    '</tr></thead><tbody>' + body + '</tbody></table></div></div>';
}

export function adminSelectCell(id) {
  return '<input type="checkbox" data-admin-select value="' + esc(id) + '" aria-label="Select ' + esc(id) + '">';
}

export function adminKpis(items) {
  return '<div class="kpi-grid">' + items.map(function (k) {
    return '<div class="kpi"><small>' + esc(k.label) + '</small><strong>' + esc(k.value) + '</strong>' +
      '<em class="' + (k.kind || '') + '">' + esc(k.note || 'Simulated') + '</em></div>';
  }).join('') + '</div>';
}

export function adminPanel(kicker, title, body, footer) {
  return '<section class="card admin-panel">' +
    '<div class="section-head"><div><p class="eyebrow">' + esc(kicker) + '</p>' +
    (title ? '<h3>' + esc(title) + '</h3>' : '') + '</div></div>' + body +
    (footer ? '<div class="admin-panel-foot">' + footer + '</div>' : '') + '</section>';
}

export function adminBar(label, value, pct, kind) {
  return '<div class="admin-bar"><span>' + esc(label) + '</span><div class="admin-bar-track">' +
    '<div class="admin-bar-fill ' + (kind || '') + '" style="width:' + Math.max(0, Math.min(100, pct)) + '%"></div></div>' +
    '<strong>' + esc(value) + '</strong></div>';
}

export function adminBars(bars) {
  return bars.map(function (b) { return adminBar(b[0], b[1], b[2], b[3]); }).join('');
}

export function adminChecklist(items) {
  return '<div class="admin-checklist">' + items.map(function (i) {
    var ok = i[0] !== false && i[0] !== 'warn' && i[0] !== 'block';
    var mark = i[0] === 'warn' ? '!' : i[0] === 'block' ? '×' : '✓';
    return '<div class="' + (ok ? 'ok' : i[0] === 'warn' ? 'warn' : 'block') + '"><b>' + mark + '</b><span>' + esc(i[1]) + '</span></div>';
  }).join('') + '</div>';
}

export function adminTimeline(items) {
  return '<div class="admin-timeline">' + items.map(function (i) {
    return '<div class="admin-timeline-row"><code>' + esc(i[0]) + '</code><span>' + esc(i[1]) + '</span>' +
      adminPill(i[2] || 'T1', i[2] === 'T4' ? 'red' : i[2] === 'T3' ? 'gold' : '') + '</div>';
  }).join('') + '</div>';
}

export function adminDetailButton(id, label) {
  return '<button class="btn btn-sm btn-ghost" data-admin-action="detail" data-id="' + esc(id) + '">' +
    esc(label || 'Inspect') + '</button>';
}

export function adminActionButton(action, id, label, kind) {
  return '<button class="btn btn-sm ' + (kind || 'btn-ghost') + '" data-admin-action="' + esc(action) +
    '" data-id="' + esc(id) + '">' + esc(label) + '</button>';
}

export function adminFields() {
  return '<div class="admin-fields">' +
    '<label class="admin-field">Reason / evidence<textarea id="admin-reason" rows="2" placeholder="Required for T3/T4 actions">' + esc(adminState.reason || '') + '</textarea></label>' +
    '<label class="admin-field">Approver<select id="admin-approver">' + ADMIN_APPROVERS.map(function (a) {
      return '<option value="' + a + '"' + (adminState.approver === a ? ' selected' : '') + '>' + a + '</option>';
    }).join('') + '</select></label></div>';
}

export function adminToolbar() {
  return '<div class="admin-toolbar">' +
    '<label class="admin-field">Search<input id="admin-search" value="' + esc(adminState.query) + '" placeholder="Users, orders, cases, models…"></label>' +
    '<label class="admin-field">Severity<select id="admin-severity">' +
      ['All', 'P1', 'P2', 'P3'].map(function (v) { return '<option' + (adminState.severity === v ? ' selected' : '') + '>' + v + '</option>'; }).join('') +
    '</select></label>' +
    '<label class="admin-field">Status<select id="admin-status">' +
      ['All', 'open', 'assigned', 'in_progress', 'escalated', 'resolved', 'active', 'halted', 'Approved', 'Review', 'Restricted', 'Acknowledged', 'Monitoring', 'Containing', 'Tracking', 'Queued'].map(function (v) {
        return '<option' + (adminState.status === v ? ' selected' : '') + '>' + v + '</option>';
      }).join('') +
    '</select></label>' +
    '<label class="admin-field">Market<select id="admin-market">' +
      ['All', 'US', 'GB', 'SG', 'FR', 'AE', 'JP', 'Global'].map(function (v) {
        return '<option' + (adminState.market === v ? ' selected' : '') + '>' + v + '</option>';
      }).join('') +
    '</select></label>' +
    '<label class="admin-field">Window<select id="admin-range">' +
      ['1h', '24h', '7d', '30d'].map(function (v) { return '<option' + (adminState.range === v ? ' selected' : '') + '>' + v + '</option>'; }).join('') +
    '</select></label>' +
    '<label class="admin-field">Saved view<select id="admin-saved-view">' +
      ['Default', 'Critical only', 'My queue', 'Approvals due'].map(function (v) {
        return '<option' + (adminState.savedView === v ? ' selected' : '') + '>' + v + '</option>';
      }).join('') +
    '</select></label>' +
    '<button class="btn btn-sm btn-ghost" data-admin-action="command" data-id="palette">⌘K</button>' +
    '<div class="admin-toolbar-actions">' +
      adminActionButton('elevate', 'session', 'JIT elevate', 'btn-sm') +
      adminActionButton('breakglass', 'session', 'Break glass (T4)', 'btn-sm') +
      adminActionButton('demote', 'session', 'End session', 'btn-sm btn-ghost') +
      adminActionButton('reset', 'demo', 'Reset demo', 'btn-sm btn-ghost') +
    '</div>' +
    '</div>';
}

function adminSavedViewMatch(view, hay, sev, st) {
  if (view === 'Critical only') {
    return sev === 'P1' || /critical|high|blocked|block|halted|anomaly|detected|refund requested/i.test(hay);
  }
  if (view === 'My queue') {
    return /^(open|assigned|in_progress|escalated)$/i.test(st) ||
      /awaiting|review|pending/i.test(st) || /ops_support/.test(hay);
  }
  if (view === 'Approvals due') {
    return /awaiting|pending|approval|approve|re-review/i.test(hay + ' ' + st);
  }
  return true;
}

export function adminApplyFilters() {
  var q = (adminState.query || '').toLowerCase();
  var selected = adminState.bulk || [];
  var visibleChecked = [];
  $$('[data-admin-row]').forEach(function (row) {
    var hay = (row.getAttribute('data-search-text') || '').toLowerCase();
    var sev = row.getAttribute('data-severity') || '';
    var st = row.getAttribute('data-status') || '';
    var mk = row.getAttribute('data-market') || '';
    var ok = (!q || hay.indexOf(q) >= 0) &&
      (adminState.severity === 'All' || sev === adminState.severity) &&
      (adminState.status === 'All' || st === adminState.status) &&
      (adminState.market === 'All' || mk === adminState.market || mk === 'Global') &&
      adminSavedViewMatch(adminState.savedView || 'Default', hay, sev, st);
    row.hidden = !ok;
    var box = row.querySelector('[data-admin-select]');
    if (box) {
      var value = box.getAttribute('value');
      if (selected.indexOf(value) >= 0) box.checked = true;
      if (!ok) box.checked = false;
      if (box.checked) visibleChecked.push(value);
    }
  });
  adminState.bulk = visibleChecked;
  var boxes = $$('[data-admin-select]');
  var all = document.querySelector('[data-admin-select-all]');
  if (all) all.checked = boxes.length > 0 && boxes.every(function (box) { return box.checked; });
  adminUpdateBulkCount();
}

export function adminUpdateBulkCount() {
  var el = document.querySelector('[data-admin-bulk-count]');
  if (el) el.textContent = adminState.bulk.length + ' selected';
}

export function adminCommandHTML() {
  var groups = ADMIN_GROUPS.map(function (group) {
    var items = ADMIN_MODULES.filter(function (m) { return m.group === group; });
    return '<div class="admin-command-group"><p class="fine-print">' + esc(group.toUpperCase()) + '</p><div class="row">' +
      items.map(function (m) {
        return '<button class="btn btn-sm btn-ghost" data-command-action="goto" data-id="' + m.id + '">' +
          esc(m.code + ' · ' + m.short) + '</button>';
      }).join('') + '</div></div>';
  }).join('');
  return '<div class="admin-command" id="admin-command"><div class="admin-command-card">' +
    '<div class="section-head"><div><p class="eyebrow">Command palette · simulation</p>' +
    '<h3>Jump to a workspace or run a guarded action</h3></div>' +
    '<button class="btn btn-sm btn-ghost" data-command-action="action" data-id="close-command">Close</button></div>' +
    '<input id="admin-command-input" placeholder="Type a module name, code, or action…" aria-label="Admin command">' +
    groups +
    '<div class="admin-command-group"><p class="fine-print">GUARDED ACTIONS</p><div class="row">' +
      '<button class="btn btn-sm" data-command-action="action" data-id="elevate">Request elevation</button>' +
      '<button class="btn btn-sm" data-command-action="action" data-id="breakglass">Break glass</button>' +
      '<button class="btn btn-sm" data-command-action="action" data-id="kill">Toggle kill switch</button>' +
      '<button class="btn btn-sm" data-command-action="action" data-id="export">Export evidence</button>' +
      '<button class="btn btn-sm btn-ghost" data-command-action="action" data-id="reset">Reset demo</button>' +
    '</div></div></div></div>';
}

export function adminDrawer() {
  if (!adminState.drawer) return '';
  var d = adminState.drawer;
  return '<div class="admin-drawer-backdrop" data-admin-action="close-detail" data-id="drawer"></div>' +
    '<aside class="admin-drawer" role="dialog" aria-label="Record detail">' +
      '<div class="section-head"><div><p class="eyebrow">' + esc(d.kicker || 'Record detail') + '</p>' +
      '<h3>' + esc(d.title || d.id) + '</h3></div>' +
      '<button class="btn btn-sm btn-ghost" data-admin-action="close-detail" data-id="drawer">✕</button></div>' +
      '<p class="admin-drawer-summary">' + esc(d.summary || 'Deterministic simulation record. No live system data is shown.') + '</p>' +
      '<div class="admin-drawer-meta">' + (d.meta || []).map(function (m) {
        return '<div><span>' + esc(m[0]) + '</span><strong>' + esc(m[1]) + '</strong></div>';
      }).join('') + '</div>' +
      adminPanel('LINKED RECORDS', '', (d.links || []).length
        ? adminTimeline(d.links) : '<p class="fine-print">No linked records in this simulation.</p>') +
      adminFields() +
      '<div class="row">' + (d.actions || []).map(function (a) {
        return adminActionButton(a[0], a[1], a[2], a[3]);
      }).join('') + '</div>' +
      '<p class="fine-print">Every privileged action in this drawer is logged locally and remains simulated.</p>' +
    '</aside>';
}

export function adminExport() {
  var manifest = { hash: adminHash(JSON.stringify(adminState.audit)), records: adminState.audit.length };
  var payload = {
    exportedBy: adminState.actor,
    note: 'Simulated evidence export — no live system data',
    environment: adminState.environment,
    tenant: adminState.tenant,
    cases: adminState.cases,
    approvals: adminState.approvals,
    audit: adminState.audit,
    manifest: manifest,
  };
  try {
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'vintora-admin-evidence.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  } catch (e) { /* download unavailable in some contexts */ }
  adminLog('Evidence export', 'T4', 'manifest ' + manifest.hash + ' · ' + manifest.records + ' records');
  toast('✓ Evidence manifest exported (simulated)');
}

export function adminSelectFromEvent(action, id) {
  var reasonEl = document.getElementById('admin-reason');
  var approverEl = document.getElementById('admin-approver');
  var reason = reasonEl ? reasonEl.value : '';
  var approver = approverEl ? approverEl.value : adminState.approver;
  adminState.reason = reason || '';
  adminState.approver = approver || adminState.approver;
  var checked = $$('[data-admin-select]:checked').map(function (el) { return el.getAttribute('value'); });
  adminState.bulk = checked;
  if (action === 'bulk-preview' || action === 'bulk-approve') adminUpdateBulkCount();
  return { reason: reason, approver: approver, checked: checked, id: id };
}

export { adminGuard, adminLog, adminPersist, ADMIN_MODULES, ADMIN_GROUPS, ADMIN_APPROVERS };
