# Add a REST endpoint (server/)

1. Add controller method in `server/src/main/java/.../feature/`
2. Add service in `application/`
3. Add Flyway migration if schema changes: `server/src/main/resources/db/migration/V{n}__*.sql`
4. Map to requirement rule ID in spec if applicable
5. Run `cd server && ./mvnw test`
