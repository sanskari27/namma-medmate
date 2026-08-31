import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { createApiClient, queryEnvelope } from '@namma-medmate/api-client';

export interface CurrentPharmacy {
  tenant_id: string;
  gst_dealer_type: 'regular';
  business_type: 'retail';
  location: {
    location_id: string;
    tenant_id: string;
    display_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface TenancyApiContext {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  getLocationId?: () => string | undefined;
  fetchImpl?: typeof fetch;
}

export const tenancyApi = createApi({
  reducerPath: 'tenancyApi',
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    getCurrent: builder.query<CurrentPharmacy, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as TenancyApiContext;
        const locationId = extra.getLocationId?.();
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/tenancy/current', {
            params: {
              header: { authorization: 'Bearer session' },
              query: { location_id: locationId },
            },
          });
        });
      },
    }),
    patchCurrent: builder.mutation<CurrentPharmacy, { displayName: string; locationId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as TenancyApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.PATCH('/tenancy/current', {
            params: {
              header: { authorization: 'Bearer session' },
              query: { location_id: arg.locationId },
            },
            body: { location_id: arg.locationId, display_name: arg.displayName },
          });
        });
      },
    }),
  }),
});

export const { useGetCurrentQuery, usePatchCurrentMutation } = tenancyApi;
