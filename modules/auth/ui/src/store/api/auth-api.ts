import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { createApiClient, queryEnvelope } from '@namma-medmate/api-client';

export interface SessionResult {
  authenticated: true;
  sub: string;
}

export interface AuthApiContext {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  fetchImpl?: typeof fetch;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    getSession: builder.query<SessionResult, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as AuthApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/auth/session', {
            params: { header: { authorization: 'Bearer session' } },
          });
        });
      },
    }),
  }),
});

export const { useGetSessionQuery } = authApi;
