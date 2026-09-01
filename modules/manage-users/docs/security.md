# Security

- Never trust client-sent `tenant_id` or role. Session JWT claims win; query `location_id` must match.
- Other tenant or location Users return 404 with no leak.
- Mutations require `permissions["manage-users"]`. Seat GET is any authenticated tenant staff.
- Temp password is returned once over TLS. Copy after first password login is `TEMP_PASSWORD_UNAVAILABLE`.
- Owner role and permission map cannot be reduced. Sole Owner cannot be deactivated or removed.
- Share credentials is `https://wa.me/?text=` only. `sent` is always false.
