-- Local-only consistency checks. Fail the seed if invariants are broken.

DO $$
DECLARE
    v_neg int;
    v_completed int;
    v_products int;
    v_customers int;
    v_mismatch int;
BEGIN
    SELECT COUNT(*) INTO v_products
    FROM product
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

    SELECT COUNT(*) INTO v_customers
    FROM customer
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
      AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_completed
    FROM sales_invoice
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
      AND status = 'COMPLETED';

    SELECT COUNT(*) INTO v_neg
    FROM stock_balance
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
      AND quantity < 0;

    SELECT COUNT(*) INTO v_mismatch
    FROM stock_balance sb
    JOIN LATERAL (
        SELECT m.balance_after
        FROM stock_movement m
        WHERE m.balance_id = sb.id
        ORDER BY m.occurred_at DESC, m.id DESC
        LIMIT 1
    ) last ON TRUE
    WHERE sb.tenant_id = '11111111-1111-1111-1111-111111111111'
      AND sb.quantity <> last.balance_after;

    IF v_products < 100 THEN
        RAISE EXCEPTION 'demo seed: expected 100+ products, got %', v_products;
    END IF;
    IF v_customers < 80 THEN
        RAISE EXCEPTION 'demo seed: expected 80+ customers, got %', v_customers;
    END IF;
    IF v_completed < 300 OR v_completed > 500 THEN
        RAISE EXCEPTION 'demo seed: expected 300-500 completed invoices, got %', v_completed;
    END IF;
    IF v_neg > 0 THEN
        RAISE EXCEPTION 'demo seed: % stock balances are negative', v_neg;
    END IF;
    IF v_mismatch > 0 THEN
        RAISE EXCEPTION 'demo seed: % stock balances do not match last movement', v_mismatch;
    END IF;

    RAISE NOTICE 'demo seed ok: products=% customers=% completed_invoices=%',
        v_products, v_customers, v_completed;
END $$;

DROP FUNCTION IF EXISTS local_demo_uuid(text, integer);
DROP FUNCTION IF EXISTS local_demo_tax(bigint, numeric);
