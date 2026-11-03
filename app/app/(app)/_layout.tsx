import { Stack } from 'expo-router';

/** The signed-in app: home, search, cart, orders, account. */
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
