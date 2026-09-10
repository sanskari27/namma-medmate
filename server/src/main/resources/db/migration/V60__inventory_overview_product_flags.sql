-- Inventory overview listing flags and optional default MRP for retail valuation.
ALTER TABLE product
  ADD COLUMN default_mrp_paise BIGINT NULL,
  ADD COLUMN loose_selling_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN online_listed BOOLEAN NOT NULL DEFAULT FALSE;
