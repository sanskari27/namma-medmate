/**
 * Onboarding feature.
 *
 * The five screens of the Figma "01 · Onboarding" section, the pieces they
 * are built from, and the hooks that hold their state.
 */

export {
  SplashScreen,
  LoginScreen,
  OtpScreen,
  ConsentScreen,
  LocationScreen,
} from './screens';

export { FeatureStrip, ProductCollage, OtpInput, AddressCard } from './components';
export type { OtpInputProps, AddressCardProps } from './components';

export { useOtpTimer, usePhoneValidation } from './hooks';
export type { OtpTimer, PhoneValidation } from './hooks';

export { SPLASH, LOGIN, OTP, CONSENT, LOCATION, REFERENCE_VIEWPORT } from './constants';
