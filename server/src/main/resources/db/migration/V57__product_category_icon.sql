ALTER TABLE product_category
  ADD COLUMN icon VARCHAR(16);

COMMENT ON COLUMN product_category.icon IS
  'Optional short emoji/mark shown on medicine cards and category lists';
