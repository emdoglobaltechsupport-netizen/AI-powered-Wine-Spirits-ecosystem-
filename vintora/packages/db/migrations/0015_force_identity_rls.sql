-- =============================================================
-- VINTORA — force RLS for the prototype database owner.
-- PostgreSQL lets table owners bypass row-level security unless
-- FORCE ROW LEVEL SECURITY is set. 0014 enabled RLS; this follow-up
-- closes the owner-bypass path for every identity-boundary table.
-- =============================================================

BEGIN;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','b2b_accounts','app_sessions','login_attempts',
    'business_account_members','trade_contracts','authorization_decisions',
    'b2b_licences','b2b_trading_profiles','b2b_verification_cases',
    'b2b_wholesale_offers','b2b_rfq_invitations','b2b_quotes','b2b_quote_lines',
    'b2b_counter_offers','b2b_credit_facilities','b2b_credit_authorisations',
    'b2b_inventory_lots','b2b_inventory_reservations','b2b_purchase_orders',
    'b2b_po_lines','b2b_distributor_agreements','b2b_sub_distributors',
    'b2b_invoices','b2b_disputes','b2b_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

COMMENT ON TABLE authorization_decisions IS
  'Append-only deny-by-default authorization evidence. RLS is forced, including for the table owner.';

COMMIT;
