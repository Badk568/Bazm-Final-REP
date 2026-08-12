-- PostgreSQL production contract for Stage 3. The application currently runs
-- the equivalent transaction through SQLite BEGIN IMMEDIATE.
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'EVENT_MANAGER';
ALTER TABLE ticket_tier ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE ticket_tier ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE ticket_tier ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION reserve_ticket_inventory(
  p_order_id uuid,
  p_tier_id uuid,
  p_quantity integer,
  p_expires_at timestamptz
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  locked_tier ticket_tier%ROWTYPE;
  active_holds integer;
BEGIN
  SELECT tier.* INTO locked_tier
  FROM ticket_tier tier
  JOIN event e ON e.id = tier.event_id
  WHERE tier.id = p_tier_id
    AND tier.active
    AND e.status = 'UPCOMING'
    AND e.published_at IS NOT NULL
  FOR UPDATE OF tier;

  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket tier is not available'; END IF;
  IF locked_tier.sales_start IS NOT NULL AND locked_tier.sales_start > now() THEN RAISE EXCEPTION 'Ticket sales have not started'; END IF;
  IF locked_tier.sales_end IS NOT NULL AND locked_tier.sales_end <= now() THEN RAISE EXCEPTION 'Ticket sales have ended'; END IF;
  IF p_quantity < 1 OR p_quantity > locked_tier.per_order_limit THEN RAISE EXCEPTION 'Ticket quantity is outside the tier limit'; END IF;

  UPDATE inventory_hold SET released_at = now()
  WHERE tier_id = p_tier_id AND released_at IS NULL AND converted_at IS NULL AND expires_at <= now();

  SELECT COALESCE(SUM(quantity), 0) INTO active_holds
  FROM inventory_hold
  WHERE tier_id = p_tier_id AND released_at IS NULL AND converted_at IS NULL AND expires_at > now();

  IF locked_tier.sold + active_holds + p_quantity > locked_tier.capacity THEN
    RAISE EXCEPTION 'There are not enough tickets remaining';
  END IF;

  INSERT INTO inventory_hold(order_id,tier_id,quantity,expires_at)
  VALUES(p_order_id,p_tier_id,p_quantity,p_expires_at);
END;
$$;

-- Call reserve_ticket_inventory in the same transaction that creates the
-- customer_order and order_item. FOR UPDATE serialises final-seat contenders.
