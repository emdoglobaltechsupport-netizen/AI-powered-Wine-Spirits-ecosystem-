-- VINTORA — seed for the modular API: admin roles, cases, approvals,
-- model controls and daily metrics. Idempotent. All rows are illustrative.
BEGIN;

-- Admin tables are RLS-protected; tenant context is mandatory and fail-closed.
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true);

-- ---------- roles ----------
INSERT INTO admin_roles (tenant_id, code, name, description, system_role) VALUES
  ('00000000-0000-0000-0000-000000000001','super_admin','Super Admin','Full global operations access',true),
  ('00000000-0000-0000-0000-000000000001','finance_ops','Finance Ops','Payments and seller payouts',true),
  ('00000000-0000-0000-0000-000000000001','seller_ops','Seller Ops','Merchant compliance',true),
  ('00000000-0000-0000-0000-000000000001','ai_ops','AI Ops','Model inventory and controls',true),
  ('00000000-0000-0000-0000-000000000001','growth_ops','Growth Ops','Campaign review',true),
  ('00000000-0000-0000-0000-000000000001','auditor','Auditor','Read-only evidence access',true)
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO admin_staff_roles (tenant_id, staff_user_id, role_id, scope_json, active)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, u.id, r.id, '{}'::jsonb, true
FROM users u
JOIN admin_roles r ON r.code = 'super_admin'
WHERE u.email = '{{ADMIN_EMAIL}}'
AND NOT EXISTS (
  SELECT 1 FROM admin_staff_roles sr WHERE sr.staff_user_id = u.id AND sr.role_id = r.id
);

-- ---------- case queue ----------
INSERT INTO admin_cases
  (tenant_id, case_code, domain, severity, status, entity_type, entity_id, title, description, sla_due_at)
VALUES
  ('00000000-0000-0000-0000-000000000001','case-901','orders','P1','open','order','ord-88117',
   'Refund above threshold','Buyer requested a refund after a delivery delay.',now() + interval '12 minutes'),
  ('00000000-0000-0000-0000-000000000001','case-897','payments','P2','assigned','payment','pay-77101',
   'Chargeback response due','SEPA settlement shows an open dispute.',now() + interval '80 minutes'),
  ('00000000-0000-0000-0000-000000000001','case-884','campaigns','P3','open','campaign','cmp-4402',
   'Creative flagged WARN','Generated email creative has a brand-voice warning.',now() + interval '3 hours'),
  ('00000000-0000-0000-0000-000000000001','case-879','sellers','P2','in_progress','seller','sel-882',
   'Licence expiring','Seller licence expires in 14 days.',now() + interval '45 minutes'),
  ('00000000-0000-0000-0000-000000000001','case-871','ai','P1','escalated','model','forecast-v7',
   'Model drift detected','Canary model breached its drift gate.',now() + interval '8 minutes')
ON CONFLICT (tenant_id, case_code) DO NOTHING;

-- ---------- approvals (requester can never equal approver) ----------
INSERT INTO admin_approvals
  (tenant_id, tier, action, domain, entity_type, entity_id, requester_id, status, reason, evidence_json)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, a.tier, a.action, a.domain,
       a.entity_type, a.entity_id, u.id, 'pending', a.reason, '{}'::jsonb
FROM (VALUES
  ('T3','Refund $1,180','orders','case','case-901','{{USER_EMAIL}}','Delivery exception — case-901'),
  ('T3','Suspend seller + payout hold','sellers','seller','sel-882','{{USER_EMAIL}}','Licence verification failed'),
  ('T4','Promote model to production','ai','model','studio-voice v2.1','{{USER_EMAIL}}','Eval gates passed')
) AS a(tier, action, domain, entity_type, entity_id, requester_email, reason)
JOIN users u ON u.email = a.requester_email
WHERE NOT EXISTS (
  SELECT 1 FROM admin_approvals ap WHERE ap.entity_id = a.entity_id AND ap.action = a.action
);

-- ---------- model inventory ----------
INSERT INTO admin_ai_model_controls
  (tenant_id, model_key, model_version, stage, status, rollout_pct, spend_cap_usd, kill_switch, fallback_model_version, eval_summary_json)
VALUES
  ('00000000-0000-0000-0000-000000000001','sommelier-rank','v9.2','champion','active',100,12000,false,null,'{"drift":"none"}'),
  ('00000000-0000-0000-0000-000000000001','forecast-v7','v7.4','staging','halted',0,8000,false,'sommelier-rank','{"drift":"detected"}'),
  ('00000000-0000-0000-0000-000000000001','studio-voice','v2.1','shadow','active',0,5000,false,null,'{"drift":"none"}'),
  ('00000000-0000-0000-0000-000000000001','growth-planner','v1.3','shadow','active',0,4000,false,null,'{"drift":"none"}')
ON CONFLICT (tenant_id, model_key, model_version) DO NOTHING;

-- ---------- daily metrics for the overview KPIs ----------
INSERT INTO admin_metrics_daily (tenant_id, metric_date, domain, metric_name, metric_value)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, current_date, m.domain, m.metric_name, m.metric_value
FROM (VALUES
  ('users','active_users_24h',2400000),
  ('sellers','active_sellers_24h',18420),
  ('orders','orders_24h',91208),
  ('payments','payment_success_pct',99.2),
  ('payments','ad_spend_pct_revenue',7.4)
) AS m(domain, metric_name, metric_value)
WHERE NOT EXISTS (
  SELECT 1 FROM admin_metrics_daily md
  WHERE md.metric_date = current_date AND md.metric_name = m.metric_name
);

COMMIT;
