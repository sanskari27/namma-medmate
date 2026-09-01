create extension if not exists pg_trgm;

create table if not exists platform_master_skus (
  platform_master_sku_id uuid primary key,
  name varchar(256) not null,
  composition varchar(512) not null,
  manufacturer varchar(256),
  brand varchar(256),
  pack varchar(128),
  form varchar(64),
  category varchar(128) not null,
  schedule varchar(8) not null,
  rx_only boolean not null,
  hsn varchar(16) not null,
  gst_slab integer not null,
  dpco_ceiling numeric(12, 2),
  banned boolean not null default false,
  banned_at timestamptz,
  banned_by_user_id varchar(128),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint platform_master_skus_schedule_chk check (schedule in ('OTC', 'H', 'H1', 'X')),
  constraint platform_master_skus_gst_slab_chk check (gst_slab in (0, 5, 12, 18, 28))
);

create index if not exists platform_master_skus_schedule_idx on platform_master_skus (schedule);
create index if not exists platform_master_skus_banned_idx on platform_master_skus (banned);
create index if not exists platform_master_skus_gst_slab_idx on platform_master_skus (gst_slab);
create index if not exists platform_master_skus_category_idx on platform_master_skus (category);
create index if not exists platform_master_skus_name_trgm_idx on platform_master_skus using gin (name gin_trgm_ops);
create index if not exists platform_master_skus_composition_trgm_idx on platform_master_skus using gin (composition gin_trgm_ops);
create index if not exists platform_master_skus_brand_trgm_idx on platform_master_skus using gin (brand gin_trgm_ops);

create table if not exists platform_master_sku_substitutes (
  platform_master_sku_id uuid not null references platform_master_skus (platform_master_sku_id),
  substitute_platform_master_sku_id uuid not null references platform_master_skus (platform_master_sku_id),
  sort_order integer not null,
  primary key (platform_master_sku_id, substitute_platform_master_sku_id)
);

create index if not exists platform_master_sku_substitutes_sort_idx
  on platform_master_sku_substitutes (platform_master_sku_id, sort_order);
