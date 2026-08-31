---
name: whatsapp-send-only
description: Send WhatsApp only through the whatsapp module template_key contract. Use when a spec says OTP, receipts, or campaigns go out on WhatsApp. Never call Meta from other modules.
---

# WhatsApp send only

`whatsapp` is the only outbound channel. Other modules request a send (`template_key`, e.g. `login_otp`); they do not talk to Meta.

No SMS backup. No chemist-owned WABA from random modules. Handle undeliverable codes from the `whatsapp` contract (e.g. `WHATSAPP_OTP_UNDELIVERABLE`).
