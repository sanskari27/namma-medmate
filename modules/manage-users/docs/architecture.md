# Architecture

`manage-users-api` is an Express Lambda (`lambda-bootstrap`) with pharmacy routes under `/manage-users`.

```
dispensary-app-web
  └── manage-users-ui (list + user drawer)
                    └── @namma-medmate/api-client
                          └── manage-users-api Lambda
                                ├── db-services users + devices
                                ├── plan-gating entitlements (seat cap)
                                └── audit ingest
```

Credential hashes never leave `AuthRepository`. `manage-users.seats.changed` is a structured log until `plan-gating` can read seats without a cycle.
