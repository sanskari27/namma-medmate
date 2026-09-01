# Auth event contract

`modules/auth/ui/src/events/events.contract.ts` augments `EventMap` with:

```ts
'auth.session.changed': {
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  sub?: string;
  user_id?: string;
  login_id?: string;
  role?: string;
  tenant_id?: string;
  location_id?: string;
}
```

Payloads are serializable and never include tokens, stores, OTP digits, or React nodes.
