-- Speed up customer directory aggregates over completed sales.
CREATE INDEX IF NOT EXISTS idx_sales_invoice_tenant_customer_completed
  ON sales_invoice (tenant_id, customer_id, completed_at DESC)
  WHERE status = 'COMPLETED' AND customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_invoice_tenant_walkin_completed
  ON sales_invoice (tenant_id, completed_at DESC)
  WHERE status = 'COMPLETED' AND customer_id IS NULL;
