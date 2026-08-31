# @namma-medmate/db-services

All PostgreSQL access lives here. Lambdas must not contain a local `/db` folder.

Pharmacy and Location tables are owned by `tenancy`. Import `createMemoryTenancyRepository` / `createSqlTenancyRepository` and `getLocationForTenant` from this package.
