# Tenancy architecture

```text
dispensary-app-web
  └── tenancy-ui (TenantBootstrap + ShopIdentityBadge)
        └── @namma-medmate/api-client
              └── GET/PATCH /tenancy/current
                    └── tenancy-api Lambda
                          └── libs/db-services (Pharmacy + Location)
```

HQ callers use POST/GET `/tenancy/pharmacies`. A Namma HQ principal is never issued pharmacy tenant context.

JWT claims used until chemist login (`06-auth`) issues them: `principal_type`, `tenant_id`, `location_id`, `role`.
