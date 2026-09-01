# Architecture

```
dispensary-app-web
  ├── go-live-kyc-ui (/account/go-live)
  └── go-live-kyc-ui HQ widgets (/hq/go-live-kyc)
        └── @namma-medmate/api-client
              └── go-live-kyc-api Lambda
                    ├── db-services pharmacies KYC columns
                    ├── audit ingest
                    ├── manage-users / auth PIN (step 5)
                    └── inventory / books-gst / account-settings stubs
```
