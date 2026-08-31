# Auth event contract

`modules/auth/ui/src/events/events.contract.ts` augments `EventMap` with:

```ts
'auth.session.changed': {
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  sub?: string;
}
```

Payloads are serializable and never include tokens, stores, or React nodes.
