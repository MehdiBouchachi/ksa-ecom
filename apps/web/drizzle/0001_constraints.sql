-- Custom constraints Drizzle cannot express.
-- Requires the btree_gist extension (available on mainstream managed PostgreSQL providers;
-- verify on the merchant-selected provider — see docs/RUNBOOK.md).
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
-- Active quantity tiers for the same variant+mode must not overlap (inclusive ranges, NULL max = unbounded).
ALTER TABLE "price_tiers"
  ADD CONSTRAINT "price_tiers_no_overlap_ex"
  EXCLUDE USING gist (
    "variant_id" WITH =,
    "mode" WITH =,
    int4range("min_qty", "max_qty", '[]') WITH &&
  ) WHERE ("active");
--> statement-breakpoint
-- Append-only ledgers: block UPDATE/DELETE on stock adjustments and audit logs.
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '42501';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER inventory_adjustments_append_only
  BEFORE UPDATE OR DELETE ON "inventory_adjustments"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
-- Arabic/English product-name search support.
CREATE INDEX IF NOT EXISTS "products_name_search_idx"
  ON "products" USING gin (to_tsvector('simple', coalesce("name",'') || ' ' || coalesce("name_en",'')));
