import { appConfig } from '../../config/app-config.ts';

export function getAccessToken(storage?: Pick<Storage, 'getItem'> | null): string | undefined {
  const resolved = storage === undefined ? globalThis.window?.sessionStorage : storage;
  return resolved?.getItem(appConfig.tokenStorageKey) ?? undefined;
}

export function setAccessToken(token: string): void {
  window.sessionStorage.setItem(appConfig.tokenStorageKey, token);
}
