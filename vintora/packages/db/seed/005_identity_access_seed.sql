-- Deterministic, clearly simulated identities for deny-by-default boundary
-- tests. These are not real businesses, licences, credit approvals or investors.

SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true);

INSERT INTO b2b_accounts (
  id, tenant_id, company_name, country_code, vat_number, credit_limit, status,
  kyc_tier, verification_status, verification_score, risk_tier, credit_currency,
  credit_used, credit_terms, updated_at, owner_user_id, authorised_buyer_user_id,
  permitted_jurisdictions, licence_jurisdictions, verification_evidence_json,
  reserved_credit, contract_status
) VALUES (
  '00000000-0000-0000-0000-000000000101'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Vintora Demo Distribution (simulated)',
  'US',
  'SIMULATED-VAT-101',
  200000,
  'active',
  'verified',
  'verified',
  92,
  'A',
  'USD',
  84200,
  'Net 30',
  now(),
  (SELECT id FROM users WHERE email = 'business@vintora.local'),
  (SELECT id FROM users WHERE email = 'business@vintora.local'),
  ARRAY['US','GB'],
  ARRAY['US','GB'],
  '{"simulated":true,"provider":"deterministic-demo","licence":"not-a-real-licence"}'::jsonb,
  0,
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  verification_status = EXCLUDED.verification_status,
  kyc_tier = EXCLUDED.kyc_tier,
  credit_limit = EXCLUDED.credit_limit,
  credit_used = EXCLUDED.credit_used,
  permitted_jurisdictions = EXCLUDED.permitted_jurisdictions,
  licence_jurisdictions = EXCLUDED.licence_jurisdictions,
  authorised_buyer_user_id = EXCLUDED.authorised_buyer_user_id,
  reserved_credit = EXCLUDED.reserved_credit,
  contract_status = EXCLUDED.contract_status,
  updated_at = now();

UPDATE users
SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid,
    primary_commerce_role = 'distributor',
    access_jurisdictions = ARRAY['US','GB'],
    business_account_id = '00000000-0000-0000-0000-000000000101'::uuid
WHERE email = 'business@vintora.local';

UPDATE users
SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid,
    primary_commerce_role = 'merchant',
    access_jurisdictions = ARRAY['US','GB'],
    business_account_id = NULL
WHERE email = 'seller@vintora.local';

UPDATE users
SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid,
    primary_commerce_role = 'customer',
    access_jurisdictions = ARRAY['US','GB'],
    investor_status = 'unverified'
WHERE email <> 'business@vintora.local'
  AND email <> 'seller@vintora.local';

INSERT INTO business_account_members (
  tenant_id, business_account_id, user_id, member_role, active
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000101'::uuid,
  id,
  'owner',
  true
FROM users
WHERE email = 'business@vintora.local'
ON CONFLICT DO NOTHING;

INSERT INTO trade_contracts (
  id, tenant_id, business_account_id, contract_code, version, status,
  permitted_jurisdictions, currency_code, credit_limit, terms_json,
  approved_by, approved_at, effective_from
)
VALUES (
  '00000000-0000-0000-0000-000000000201'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000101'::uuid,
  'SIM-TRADE-TERMS',
  1,
  'active',
  ARRAY['US','GB'],
  'USD',
  200000,
  '{"paymentTerms":"Net 30","incoterms":["DAP","DDP"],"simulated":true}'::jsonb,
  (SELECT id FROM users WHERE email = 'finance_ops@vintora.local'),
  now(),
  now()
)
ON CONFLICT (tenant_id, business_account_id, contract_code, version) DO UPDATE SET
  status = EXCLUDED.status,
  permitted_jurisdictions = EXCLUDED.permitted_jurisdictions,
  credit_limit = EXCLUDED.credit_limit,
  terms_json = EXCLUDED.terms_json;
