# WhatsApp architecture

```text
dispensary-app-web
  └── whatsapp-ui (inbox, MandatoryWhatsAppBanner, ShareWhatsAppButton)
        └── @namma-medmate/api-client
              └── /whatsapp/*
                    └── whatsapp-api Lambda
                          ├── libs/db-services (WhatsAppMessage + Location lookup)
                          └── Meta Cloud API (single Namma WABA)
```

Other modules request a send with `template_key`. They never call Meta. Shop name comes from Location `display_name` via tenancy tables in `db-services`.
