/**
 * Typed route parameters for the root stack.
 *
 * expo-router's typed routes are not enabled yet; this map is the contract
 * the stack will use once `experiments.typedRoutes` is switched on.
 */
export interface RootStackParamList {
  index: undefined;
  login: undefined;
  otp: undefined;
  consent: undefined;
  location: undefined;

  home: undefined;
  search: undefined;
  cart: undefined;
  orders: undefined;
  prescriptions: undefined;
  consult: undefined;
  account: undefined;
  notifications: undefined;
  help: undefined;
  offers: undefined;
  pharmacies: undefined;
  uploadPrescription: undefined;
  schedule: undefined;
  terms: undefined;
  privacy: undefined;

  category: { id: string };
  product: { id: string };
  pharmacy: { id: string };
}
