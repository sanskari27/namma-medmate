# Architecture

```
dispensary-app-web
  └── employees-ui (/account/employees)
                    └── @namma-medmate/api-client
                          └── employees-api Lambda
                                ├── db-services employees
                                ├── plan-gating entitlements (Starter)
                                ├── storage-client presign
                                └── audit ingest
```
