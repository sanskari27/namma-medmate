# Add Flyway migration (server/)

1. Next version: check latest `V{n}__` in `server/src/main/resources/db/migration/`
2. Create `V{n+1}__short_description.sql` — never edit existing files
3. All tenant tables need `tenant_id UUID NOT NULL REFERENCES tenant(id)`
4. Run `cd server && ./mvnw test`
