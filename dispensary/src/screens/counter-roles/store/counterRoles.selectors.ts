import type { RootState } from '@/store';

export const selectRolesStatus = (state: RootState) => state.counterRoles.status;
export const selectRolesBanner = (state: RootState) => state.counterRoles.banner;
export const selectRoles = (state: RootState) => state.counterRoles.roles;
export const selectRolesCatalog = (state: RootState) => state.counterRoles.catalog;
export const selectRolesAddOpen = (state: RootState) => state.counterRoles.addOpen;
