import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { createApiClient, queryEnvelope } from '@namma-medmate/api-client';
import type { GstSlab, Schedule } from '../../lib/constants.ts';
import type { SkuFilters } from '../../lib/filters.ts';

export interface MasterSkuListItem {
  platform_master_sku_id: string;
  name: string;
  composition: string;
  category: string;
  schedule: string;
  rx_only: boolean;
  gst_slab: number;
  dpco_ceiling?: string | null;
  banned: boolean;
}

export interface SubstituteItem {
  platform_master_sku_id: string;
  name: string;
  schedule: string;
  banned: boolean;
}

export interface MasterSkuDetail extends MasterSkuListItem {
  manufacturer?: string | null;
  brand?: string | null;
  pack?: string | null;
  form?: string | null;
  hsn: string;
  substitutes: SubstituteItem[];
}

export interface StockingPharmacy {
  tenant_id: string;
  location_id: string;
  display_name: string;
}

export interface MasterSkuPage {
  items: MasterSkuListItem[];
  next_cursor: string | null;
}

export interface CreateMasterSkuInput {
  name: string;
  composition: string;
  manufacturer?: string | null;
  brand?: string | null;
  pack?: string | null;
  form?: string | null;
  category: string;
  schedule: Schedule;
  rx_only?: boolean;
  hsn: string;
  gst_slab: GstSlab;
  dpco_ceiling?: string | null;
}

export interface MasterCatalogueApiContext {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  fetchImpl?: typeof fetch;
}

function authHeader() {
  return { authorization: 'Bearer session' as const };
}

export const masterCatalogueApi = createApi({
  reducerPath: 'masterCatalogueApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Skus', 'Sku'],
  endpoints: (builder) => ({
    listSkus: builder.query<MasterSkuPage, SkuFilters | void>({
      async queryFn(arg, api) {
        const extra = api.extra as MasterCatalogueApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/master-catalogue/skus', {
            params: {
              header: authHeader(),
              query: {
                category: arg?.category,
                schedule: arg?.schedule,
                gst_slab: arg?.gstSlab,
                rx_only: arg?.rxOnly,
                banned: arg?.banned,
                q: arg?.q,
              },
            },
          });
        });
      },
      providesTags: ['Skus'],
    }),
    getSku: builder.query<MasterSkuDetail, { skuId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as MasterCatalogueApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/master-catalogue/skus/{platform_master_sku_id}', {
            params: {
              header: authHeader(),
              path: { platform_master_sku_id: arg.skuId },
            },
          });
        });
      },
      providesTags: ['Sku'],
    }),
    listStocking: builder.query<{ items: StockingPharmacy[] }, { skuId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as MasterCatalogueApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/master-catalogue/skus/{platform_master_sku_id}/stocking-pharmacies', {
            params: {
              header: authHeader(),
              path: { platform_master_sku_id: arg.skuId },
            },
          });
        });
      },
    }),
    createSku: builder.mutation<MasterSkuListItem, CreateMasterSkuInput>({
      async queryFn(arg, api) {
        const extra = api.extra as MasterCatalogueApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.POST('/master-catalogue/skus', {
            params: { header: authHeader() },
            body: arg,
          });
        });
      },
      invalidatesTags: ['Skus'],
    }),
    putCeiling: builder.mutation<MasterSkuListItem, { skuId: string; dpcoCeiling: string | null }>({
      async queryFn(arg, api) {
        const extra = api.extra as MasterCatalogueApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.PUT('/master-catalogue/skus/{platform_master_sku_id}/ceiling', {
            params: {
              header: authHeader(),
              path: { platform_master_sku_id: arg.skuId },
            },
            body: { dpco_ceiling: arg.dpcoCeiling },
          });
        });
      },
      invalidatesTags: ['Skus', 'Sku'],
    }),
    banSku: builder.mutation<{ banned: true }, { skuId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as MasterCatalogueApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.POST('/master-catalogue/skus/{platform_master_sku_id}/ban', {
            params: {
              header: authHeader(),
              path: { platform_master_sku_id: arg.skuId },
            },
          });
        });
      },
      invalidatesTags: ['Skus', 'Sku'],
    }),
    unbanSku: builder.mutation<{ banned: false }, { skuId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as MasterCatalogueApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.POST('/master-catalogue/skus/{platform_master_sku_id}/unban', {
            params: {
              header: authHeader(),
              path: { platform_master_sku_id: arg.skuId },
            },
          });
        });
      },
      invalidatesTags: ['Skus', 'Sku'],
    }),
    putSubstitutes: builder.mutation<
      { items: SubstituteItem[] },
      { skuId: string; substituteIds: string[] }
    >({
      async queryFn(arg, api) {
        const extra = api.extra as MasterCatalogueApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.PUT('/master-catalogue/skus/{platform_master_sku_id}/substitutes', {
            params: {
              header: authHeader(),
              path: { platform_master_sku_id: arg.skuId },
            },
            body: { substitute_ids: arg.substituteIds },
          });
        });
      },
      invalidatesTags: ['Sku'],
    }),
  }),
});

export const {
  useListSkusQuery,
  useGetSkuQuery,
  useListStockingQuery,
  useCreateSkuMutation,
  usePutCeilingMutation,
  useBanSkuMutation,
  useUnbanSkuMutation,
  usePutSubstitutesMutation,
} = masterCatalogueApi;
