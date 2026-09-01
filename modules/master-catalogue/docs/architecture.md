# Architecture

`master-catalogue-api` is an Express Lambda (`lambda-bootstrap`) with platform-scoped routes under `/master-catalogue/skus`.

HQ JWT is required for list, create, patch, ceiling, ban, unban, substitutes write, and stocking pharmacies. Pharmacy session or service token may GET by id, GET substitutes, and POST assert-price.

Rows live in `platform_master_skus` and `platform_master_sku_substitutes` via `@namma-medmate/db-services`. Inventory un-map is a client stub until `inventory` exists. Audit ingest uses `POST /audit/events`.
