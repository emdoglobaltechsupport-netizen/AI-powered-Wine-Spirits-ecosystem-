/* =========================================================
   Vintora Admin — guarded local action handlers.
   Every mutation is simulated, attributable and appended to the local audit.
   ========================================================= */

import { render } from '../app.js';
import {
  adminState, adminReset, adminLog, adminPersist, adminGuard, toastAdmin,
  normalizeAdminTab, ADMIN_MODULES,
} from './state.js';
import {
  adminCommandHTML, adminExport, adminSelectFromEvent, adminDrawer,
} from './components.js';
import { adminDetailFor } from './sections.js';

function find(list, key, id) {
  for (var i = 0; i < list.length; i++) if (String(list[i][key]) === String(id)) return list[i];
  return null;
}

function setStatus(list, key, id, field, value) {
  var rec = find(list, key, id);
  if (rec) rec[field] = value;
  return !!rec;
}

function requireReason(reason) {
  if (!reason || !reason.trim()) { toastAdmin('A reason is required for this action'); return false; }
  return true;
}

function guarded(selection, tier, label, id, mutate) {
  if (!adminGuard(selection.reason, selection.approver, tier)) return;
  var changed = mutate ? mutate() : true;
  if (changed === false) { toastAdmin('Record not found — no change made'); return; }
  adminLog(label + ' · ' + id, tier, 'approver ' + selection.approver + ' · ' + selection.reason);
  adminPersist();
  render();
  toastAdmin('✓ ' + label + ' approved — simulated');
}

function simple(action, tier, label, id, mutate) {
  var changed = mutate ? mutate() : true;
  if (changed === false) { toastAdmin('Record not found — no change made'); return; }
  adminLog(label + ' · ' + id, tier, 'Simulated local action');
  adminPersist();
  render();
  toastAdmin('✓ ' + label + ' — simulated');
}

function openDetail(id) {
  adminState.drawer = adminDetailFor(id);
  adminPersist();
  render();
}

export function adminHandle(action, id) {
  var selection = adminSelectFromEvent(action, id);
  var s = adminState;
  var i, x;

  if (action === 'goto') {
    var target = normalizeAdminTab(id);
    s.tab = target;
    s.drawer = null;
    adminPersist();
    render();
    return;
  }
  if (action === 'command') {
    var host = document.getElementById('admin-command-host');
    if (host) {
      host.innerHTML = adminCommandHTML();
      var input = document.getElementById('admin-command-input');
      if (input) input.focus();
    }
    return;
  }
  if (action === 'close-command') {
    var h = document.getElementById('admin-command-host');
    if (h) h.innerHTML = '';
    return;
  }
  if (action === 'detail') { openDetail(id); return; }
  if (action === 'close-detail') { s.drawer = null; adminPersist(); render(); return; }
  if (action === 'log-review') {
    if (id === 'model-governance') {
      adminLog('Open model card', 'T2', 'owner ai_ops · eval gates pass · kill-switch target < 1 min');
      render();
      toastAdmin('Model card: owner ai_ops · eval gates pass · SLO < 1 min halt');
      return;
    }
    adminLog('Review ' + id, 'T1', 'PII masked · purpose recorded');
    adminPersist(); render();
    toastAdmin('✓ Review logged — simulated, no record changed');
    return;
  }
  if (action === 'export') { adminExport(); render(); return; }
  if (action === 'reset') { adminReset(); render(); toastAdmin('↺ Admin demo data reset'); return; }

  if (action === 'elevate') {
    s.elevated = true; s.seconds = 900; s.breakGlass = false;
    adminLog('JIT elevation', 'T2', id + ' · scope all');
    adminPersist(); render(); toastAdmin('✓ Elevated for 15:00 — simulated'); return;
  }
  if (action === 'breakglass') {
    if (!adminGuard(selection.reason, selection.approver, 'T4', { allowUnelevated: true })) return;
    s.elevated = true; s.breakGlass = true; s.seconds = 7200;
    adminLog('Break-glass session', 'T4', 'approver ' + selection.approver + ' · 2h · ' + selection.reason);
    adminPersist(); render(); toastAdmin('⚠ Break-glass active for 2h — simulated'); return;
  }
  if (action === 'extend') {
    s.seconds = s.breakGlass ? 7200 : 900;
    adminLog('Elevation extended', 'T1', 'MFA re-verified');
    adminPersist(); render(); toastAdmin('✓ Session extended — simulated'); return;
  }
  if (action === 'demote') {
    s.elevated = false; s.breakGlass = false; s.seconds = 900;
    adminLog('Session ended', 'T1', 'auto-demote simulated');
    adminPersist(); render(); toastAdmin('Session ended'); return;
  }

  if (action === 'bulk-preview') {
    if (!selection.checked.length) { toastAdmin('Select at least one row for a dry run'); return; }
    adminLog('Bulk dry run · ' + id, 'T2', selection.checked.length + ' rows previewed · no changes');
    adminPersist(); render();
    toastAdmin('✓ Dry run: ' + selection.checked.length + ' rows would be affected — no changes made');
    return;
  }
  if (action === 'bulk-approve') {
    if (!selection.checked.length) { toastAdmin('Select at least one row'); return; }
    guarded(selection, 'T3', 'Bulk apply · ' + id, selection.checked.join(','), function () {
      return true;
    });
    return;
  }

  if (action === 'kill') {
    var halting = !s.killSwitch;
    guarded(selection, 'T4', halting ? 'Kill switch activated' : 'Models resumed', 'all', function () {
      s.killSwitch = halting;
      for (i = 0; i < s.models.length; i++) {
        s.models[i].status = halting ? 'halted' : (s.models[i].key === 'forecast-v7' ? 'halted' : 'active');
      }
      return true;
    });
    return;
  }
  if (action === 'model-card') { openDetail('model-governance'); return; }
  if (action === 'promote') {
    guarded(selection, 'T4', 'Promote model ' + id, id, function () {
      return setStatus(s.models, 'key', id, 'stage', 'champion');
    });
    return;
  }
  if (action === 'rollback') {
    guarded(selection, 'T4', 'Rollback model ' + id, id, function () {
      return setStatus(s.models, 'key', id, 'stage', 'canary');
    });
    return;
  }

  if (action === 'approve' || action === 'reject') {
    x = find(s.approvals, 'id', id);
    if (!x) return;
    if (!adminGuard(selection.reason, selection.approver, x.tier)) return;
    x.status = action === 'approve' ? 'approved' : 'rejected';
    adminLog((action === 'approve' ? 'Approved ' : 'Rejected ') + x.action, x.tier,
      'approver ' + selection.approver + ' · ' + selection.reason);
    adminPersist(); render();
    toastAdmin((action === 'approve' ? '✓ Approved: ' : '✕ Rejected: ') + x.action + ' (simulated)');
    return;
  }

  if (action === 'assign' || action === 'resolve' || action === 'escalate') {
    x = find(s.cases, 'id', id);
    if (!x) return;
    if (action === 'assign') {
      simple(action, 'T1', 'Assign case', id, function () {
        x.assignee = s.actor; x.status = 'assigned'; return true;
      });
      return;
    }
    if (action === 'resolve') {
      if (!requireReason(selection.reason)) return;
      simple(action, 'T2', 'Resolve case', id, function () {
        x.status = 'resolved'; return true;
      });
      return;
    }
    if (action === 'escalate') {
      simple(action, 'T2', 'Escalate case', id, function () {
        x.severity = x.severity === 'P3' ? 'P2' : 'P1'; x.status = 'escalated'; return true;
      });
      return;
    }
  }

  if (action === 'restrict-user') {
    guarded(selection, 'T3', 'Restrict user', id, function () {
      return setStatus(s.users, 'id', id, 'status', 'Restricted');
    });
    return;
  }
  if (action === 'reverify') {
    simple(action, 'T2', 'Request re-verification', id, function () {
      return setStatus(s.users, 'id', id, 'kyc', 'pending');
    });
    return;
  }
  if (action === 'erasure') {
    guarded(selection, 'T3', 'Erasure handoff', id, function () { return true; });
    return;
  }

  if (action === 'grant') { guarded(selection, 'T3', 'Grant role', id, function () { return true; }); return; }
  if (action === 'revoke') { guarded(selection, 'T4', 'Revoke role', id, function () { return true; }); return; }
  if (action === 'review-access') { simple(action, 'T2', 'Access review', id, function () { return true; }); return; }

  if (action === 'hold-product') {
    guarded(selection, 'T3', 'Place product hold', id, function () { return true; });
    return;
  }
  if (action === 'release-product') { simple(action, 'T2', 'Release product hold', id, function () { return true; }); return; }

  if (action === 'suspend-seller') {
    guarded(selection, 'T3', 'Suspend seller + payout hold', id, function () {
      var ok = setStatus(s.sellers, 'id', id, 'status', 'Review');
      setStatus(s.sellers, 'id', id, 'payout', 'hold');
      return ok;
    });
    return;
  }
  if (action === 'payout-hold') {
    guarded(selection, 'T3', 'Payout hold', id, function () {
      return setStatus(s.sellers, 'id', id, 'payout', 'hold');
    });
    return;
  }

  if (action === 'initiate-refund') { guarded(selection, 'T3', 'Initiate refund', id, function () { return true; }); return; }
  if (action === 'cancel-order') {
    guarded(selection, 'T3', 'Cancel order', id, function () {
      return setStatus(s.orders, 'id', id, 'state', 'cancelled');
    });
    return;
  }
  if (action === 'reroute') { simple(action, 'T2', 'Re-route order', id, function () { return true; }); return; }

  if (action === 'cycle-count') { simple(action, 'T2', 'Start cycle count', id, function () { return true; }); return; }
  if (action === 'release-reserve') {
    guarded(selection, 'T3', 'Release reserve', id, function () { return true; });
    return;
  }

  if (action === 'export-segment') {
    if (!requireReason(selection.reason)) return;
    simple(action, 'T2', 'Export segment', id, function () { return true; });
    return;
  }
  if (action === 'suppress-segment') {
    simple(action, 'T2', 'Suppress segment', id, function () { return true; });
    return;
  }

  if (action === 'reconcile') { simple(action, 'T2', 'Run reconciliation', id, function () { return true; }); return; }
  if (action === 'hold-payout') {
    guarded(selection, 'T3', 'Hold payout', id, function () { return true; });
    return;
  }

  if (action === 'approve-campaign') {
    if (!requireReason(selection.reason)) return;
    simple(action, 'T2', 'Approve campaign for publish', id, function () {
      return setStatus(s.campaigns, 'id', id, 'status', 'Approved');
    });
    return;
  }
  if (action === 'pause-campaign') {
    simple(action, 'T2', 'Pause campaign', id, function () {
      return setStatus(s.campaigns, 'id', id, 'status', 'Paused');
    });
    return;
  }
  if (action === 'force-review') { simple(action, 'T2', 'Force re-review', id, function () { return true; }); return; }

  if (action === 'adjust-points') {
    guarded(selection, 'T3', 'Adjust loyalty points', id, function () { return true; });
    return;
  }
  if (action === 'pause-subscription') {
    simple(action, 'T2', 'Pause subscription', id, function () {
      return setStatus(s.subscriptions, 'id', id, 'state', 'Paused');
    });
    return;
  }
  if (action === 'save-subscription') { simple(action, 'T2', 'Save offer', id, function () { return true; }); return; }

  if (action === 'escalate-shipment') {
    simple(action, 'T2', 'Escalate carrier', id, function () { return true; });
    return;
  }
  if (action === 'open-claim') {
    guarded(selection, 'T3', 'Open insurance claim', id, function () { return true; });
    return;
  }

  if (action === 'verify-control') { simple(action, 'T2', 'Verify control', id, function () { return true; }); return; }
  if (action === 'verify-licence') { simple(action, 'T2', 'Verify seller licence', id, function () { return true; }); return; }
  if (action === 'publish-policy') {
    guarded(selection, 'T4', 'Publish policy', id, function () { return true; });
    return;
  }

  if (action === 'assign-ticket') {
    simple(action, 'T1', 'Assign ticket', id, function () {
      return setStatus(s.tickets, 'id', id, 'agent', s.actor) && setStatus(s.tickets, 'id', id, 'status', 'Assigned');
    });
    return;
  }
  if (action === 'close-ticket') {
    if (!requireReason(selection.reason)) return;
    simple(action, 'T2', 'Close ticket', id, function () {
      return setStatus(s.tickets, 'id', id, 'status', 'Resolved');
    });
    return;
  }
  if (action === 'escalate-ticket') {
    simple(action, 'T2', 'Escalate ticket', id, function () {
      return setStatus(s.tickets, 'id', id, 'status', 'Escalated');
    });
    return;
  }

  if (action === 'rotate-key') {
    guarded(selection, 'T4', 'Rotate signing key', id, function () { return true; });
    return;
  }
  if (action === 'revoke-session') {
    guarded(selection, 'T3', 'Revoke session', id, function () {
      return setStatus(s.security, 'id', id, 'state', 'Revoked');
    });
    return;
  }

  if (action === 'region-review') { simple(action, 'T2', 'Review market', id, function () { return true; }); return; }
  if (action === 'adapter-status') { simple(action, 'T1', 'Adapter status check', id, function () { return true; }); return; }
  if (action === 'fx-review') { simple(action, 'T2', 'FX lock review', id, function () { return true; }); return; }

  if (action === 'techops-run-check') {
    simple(action, 'T2', 'Run agent check', id, function () { return !!find(s.techopsAgents, 'id', id); });
    return;
  }
  if (action === 'techops-ack') {
    simple(action, 'T2', 'Acknowledge alert', id, function () {
      return setStatus(s.techopsAlerts, 'id', id, 'status', 'Acknowledged');
    });
    return;
  }
  if (action === 'techops-ticket') {
    simple(action, 'T2', 'Create TechOps ticket', id, function () {
      var alert = find(s.techopsAlerts, 'id', id);
      if (!alert) return false;
      s.tickets.unshift({
        id: alert.ticket, subject: alert.summary, channel: 'TechOps', priority: alert.severity,
        sla: '15m', status: 'Open', agent: 'unassigned', market: alert.market,
      });
      return true;
    });
    return;
  }
  if (action === 'techops-selfheal') {
    guarded(selection, 'T3', 'Safe self-heal', id, function () {
      return setStatus(s.techopsAlerts, 'id', id, 'status', 'Monitoring');
    });
    return;
  }
  if (action === 'techops-escalate') {
    guarded(selection, 'T4', 'Critical escalation', id, function () {
      return setStatus(s.techopsAlerts, 'id', id, 'status', 'Escalated');
    });
    return;
  }
  if (action === 'techops-mode') {
    guarded(selection, 'T3', 'Set TechOps mode', id, function () {
      s.techopsMode = id === 'OBSERVE' ? 'OBSERVE' : 'AUTO-SAFE';
      return true;
    });
    return;
  }
  if (action === 'techops-report') {
    simple(action, 'T2', 'Generate report', id, function () { return !!find(s.techopsReports, 'id', id); });
    return;
  }
}

export default adminHandle;
