-- Offer card display fields for dispensary Offers UI (coupon + online channel)

ALTER TABLE sales_offer
    ADD COLUMN coupon_code VARCHAR(32),
    ADD COLUMN online_visible BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX uq_sales_offer_tenant_coupon
    ON sales_offer (tenant_id, coupon_code)
    WHERE coupon_code IS NOT NULL;
