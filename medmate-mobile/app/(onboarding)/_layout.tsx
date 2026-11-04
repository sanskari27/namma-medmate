import { Stack } from 'expo-router';

/** The onboarding flow: splash → login → otp → consent → location. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
