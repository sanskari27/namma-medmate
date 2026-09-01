import { appConfig } from '../../config/app-config.ts';

export function getAccessToken(storage?: Pick<Storage, 'getItem'> | null): string | undefined {
  const resolved = storage === undefined ? globalThis.window?.sessionStorage : storage;
  return resolved?.getItem(appConfig.tokenStorageKey) ?? undefined;
}

export function setAccessToken(token: string): void {
  window.sessionStorage.setItem(appConfig.tokenStorageKey, token);
}

export function clearAccessToken(): void {
  window.sessionStorage.removeItem(appConfig.tokenStorageKey);
}

export function getLocationId(storage?: Pick<Storage, 'getItem'> | null): string | undefined {
  const resolved = storage === undefined ? globalThis.window?.sessionStorage : storage;
  return resolved?.getItem(appConfig.locationStorageKey) ?? undefined;
}

export function setLocationId(locationId: string): void {
  window.sessionStorage.setItem(appConfig.locationStorageKey, locationId);
}

export function getDeviceToken(storage?: Pick<Storage, 'getItem'> | null): string | undefined {
  const resolved = storage === undefined ? globalThis.window?.localStorage : storage;
  return resolved?.getItem(appConfig.deviceStorageKey) ?? undefined;
}

export function setDeviceToken(token: string): void {
  window.localStorage.setItem(appConfig.deviceStorageKey, token);
}

export function clearDeviceToken(): void {
  window.localStorage.removeItem(appConfig.deviceStorageKey);
}

export function getStoredLoginId(storage?: Pick<Storage, 'getItem'> | null): string | undefined {
  const resolved = storage === undefined ? globalThis.window?.localStorage : storage;
  return resolved?.getItem(appConfig.loginIdStorageKey) ?? undefined;
}

export function setStoredLoginId(loginId: string): void {
  window.localStorage.setItem(appConfig.loginIdStorageKey, loginId);
}

export function clearStoredLoginId(): void {
  window.localStorage.removeItem(appConfig.loginIdStorageKey);
}

export function persistChemistSession(session: {
  session_token: string;
  location_id: string;
  login_id: string;
  device_token: string | null;
}): void {
  setAccessToken(session.session_token);
  setLocationId(session.location_id);
  setStoredLoginId(session.login_id);
  if (session.device_token) {
    setDeviceToken(session.device_token);
  }
}

export function clearChemistSession(): void {
  clearAccessToken();
}

export function navigateTo(path: string): void {
  window.location.assign(path);
}
