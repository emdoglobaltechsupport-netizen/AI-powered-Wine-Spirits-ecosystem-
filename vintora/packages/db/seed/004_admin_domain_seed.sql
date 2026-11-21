-- Demo domain rows so the admin control center has real database records
-- to display in every tab. Idempotent; no real commerce is affected.
BEGIN;

SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true);

-- ---------- sellers ----------
INSERT INTO sellers (id, owner_user_id, legal_name, trading_name, country_code, licence_number, status, tier)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001', u.id, 'Château Bellevue SAS', 'Château Bellevue', 'FR', 'FR-BOR-8821', 'approved', '399'
FROM users u WHERE u.email = '{{USER_EMAIL}}'
AND NOT EXISTS (SELECT 1 FROM sellers WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001');

INSERT INTO sellers (id, owner_user_id, legal_name, trading_name, country_code, licence_number, status, tier)
SELECT 'aaaaaaaa-0000-4000-8000-000000000002', u.id, 'Napa Collective LLC', 'Napa Collective', 'US', 'US-CA-4471', 'review', '999'
FROM users u WHERE u.email = '{{USER_EMAIL}}'
AND NOT EXISTS (SELECT 1 FROM sellers WHERE id = 'aaaaaaaa-0000-4000-8000-000000000002');

INSERT INTO sellers (id, owner_user_id, legal_name, trading_name, country_code, licence_number, status, tier)
SELECT 'aaaaaaaa-0000-4000-8000-000000000003', u.id, 'Loire Selections SARL', 'Loire Selections', 'FR', 'FR-LOI-2290', 'approved', '99'
FROM users u WHERE u.email = '{{USER_EMAIL}}'
AND NOT EXISTS (SELECT 1 FROM sellers WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003');

INSERT INTO admin_seller_reviews
  (tenant_id, seller_id, review_type, licence_checked, kyc_checked, payout_state, dispute_rate_bps, decision)
SELECT '00000000-0000-0000-0000-000000000001'::uuid,
       'aaaaaaaa-0000-4000-8000-000000000002'::uuid,
       'licence_expiry', true, true, 'hold', 180, 'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM admin_seller_reviews
  WHERE seller_id = 'aaaaaaaa-0000-4000-8000-000000000002'::uuid
);

-- ---------- orders, payments, shipments ----------
INSERT INTO orders (id, order_number, user_id, status, currency_code, subtotal, total, placed_at)
SELECT 'bbbbbbbb-0000-4000-8000-000000000001', 'demo-ord-88120', u.id, 'paid', 'USD', 420, 445.20, now() - interval '2 hours'
FROM users u WHERE u.email = '{{USER_EMAIL}}'
AND NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'demo-ord-88120');

INSERT INTO orders (id, order_number, user_id, status, currency_code, subtotal, total, placed_at)
SELECT 'bbbbbbbb-0000-4000-8000-000000000002', 'demo-ord-88117', u.id, 'paid', 'USD', 1180, 1250.80, now() - interval '40 minutes'
FROM users u WHERE u.email = '{{USER_EMAIL}}'
AND NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'demo-ord-88117');

INSERT INTO payments (id, order_id, processor, amount, currency_code, status, idempotency_key)
SELECT 'cccccccc-0000-4000-8000-000000000001', o.id, 'stripe', 445.20, 'USD', 'captured', 'demo-pay-77120'
FROM orders o WHERE o.order_number = 'demo-ord-88120'
AND NOT EXISTS (SELECT 1 FROM payments WHERE idempotency_key = 'demo-pay-77120');

INSERT INTO payments (id, order_id, processor, amount, currency_code, status, idempotency_key)
SELECT 'cccccccc-0000-4000-8000-000000000002', o.id, 'adyen', 1250.80, 'USD', 'captured', 'demo-pay-77101'
FROM orders o WHERE o.order_number = 'demo-ord-88117'
AND NOT EXISTS (SELECT 1 FROM payments WHERE idempotency_key = 'demo-pay-77101');

INSERT INTO shipments (id, order_id, warehouse_id, carrier, tracking_number, status, temperature_excursion, insured_value, shipped_at)
SELECT 'dddddddd-0000-4000-8000-000000000001', o.id, w.id, 'DHL', 'DHL-5510', 'in_transit', false, 420, now() - interval '1 day'
FROM orders o, warehouses w
WHERE o.order_number = 'demo-ord-88120' AND w.code = 'CH-GVA'
AND NOT EXISTS (SELECT 1 FROM shipments WHERE id = 'dddddddd-0000-4000-8000-000000000001'::uuid);

INSERT INTO shipments (id, order_id, warehouse_id, carrier, tracking_number, status, temperature_excursion, insured_value, shipped_at)
SELECT 'dddddddd-0000-4000-8000-000000000002', o.id, w.id, 'FedEx', 'FX-5508', 'exception', true, 1180, now() - interval '3 days'
FROM orders o, warehouses w
WHERE o.order_number = 'demo-ord-88117' AND w.code = 'IT-ALB'
AND NOT EXISTS (SELECT 1 FROM shipments WHERE id = 'dddddddd-0000-4000-8000-000000000002'::uuid);

-- ---------- campaigns ----------
INSERT INTO marketing_campaigns (id, seller_id, channel, brief, compliance_status, brand_voice_score, human_approved)
SELECT 'eeeeeeee-0000-4000-8000-000000000001', s.id, 'paid social',
       '{"name":"Autumn Rioja","market":"GB"}'::jsonb, 'pass', 92, true
FROM sellers s WHERE s.trading_name = 'Château Bellevue'
AND NOT EXISTS (SELECT 1 FROM marketing_campaigns WHERE id = 'eeeeeeee-0000-4000-8000-000000000001'::uuid);

INSERT INTO marketing_campaigns (id, seller_id, channel, brief, compliance_status, brand_voice_score, human_approved)
SELECT 'eeeeeeee-0000-4000-8000-000000000002', s.id, 'email',
       '{"name":"Holiday Single Malt","market":"SG"}'::jsonb, 'warn', 84, false
FROM sellers s WHERE s.trading_name = 'Napa Collective'
AND NOT EXISTS (SELECT 1 FROM marketing_campaigns WHERE id = 'eeeeeeee-0000-4000-8000-000000000002'::uuid);

COMMIT;
