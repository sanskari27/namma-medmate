---
name: rtk-query-api-client
description: Call APIs from module UI via generated createApiClient and queryEnvelope. Use when adding RTK Query endpoints. Never add axios or a per-module HTTP wrapper.
---

# RTK Query + api-client

Copy `modules/auth/ui/src/store/api/auth-api.ts`:

```ts
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { createApiClient, queryEnvelope } from '@namma-medmate/api-client';

export const featureApi = createApi({
  reducerPath: 'featureApi',
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    getThing: builder.query({
      async queryFn(_arg, api) {
        const extra = api.extra as { baseUrl: string };
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/slug/thing', { params: { query: { location_id } } });
        });
      },
    }),
  }),
});
```

Run `pnpm codegen` after swagger changes so client methods exist. UI must not import `modules/*/api`.
