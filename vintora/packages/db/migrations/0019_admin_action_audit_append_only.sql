-- =============================================================
-- VINTORA — database-enforced append-only privileged action audit
-- Source of truth: config/runtime-boundaries.json privilegedActions.
--
-- Admin actions already had an application-level append-only convention. This
-- migration enforces it in PostgreSQL so an UPDATE or DELETE cannot rewrite a
-- privileged action record. This is a local durability control, not a
-- centralised retained/WORM audit store.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION reject_admin_action_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'admin_actions is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_actions_append_only ON admin_actions;
CREATE TRIGGER admin_actions_append_only
  BEFORE UPDATE OR DELETE ON admin_actions
  FOR EACH ROW EXECUTE FUNCTION reject_admin_action_mutation();

COMMENT ON TABLE admin_actions IS
  'Append-only privileged action accountability log; local constraint only, no retained external sink.';

COMMIT;
