import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { routes } from '@/navigation/routes';
import { PulseLineIcon } from '@/components/icons';
import { BrandMark, Hero, Text } from '@/components/ui';

import { SPLASH } from '../constants';

/**
 * 01 · Splash — "Brand moment while the session restores. Wordmark rises,
 * gold pulse line draws, one soft beat." (Figma UX note)
 *
 * Geometry measured off the Figma frame: wordmark cap-top y≈393, pulse
 * y≈457, tagline y≈489, on a 390×844 viewport.
 */
export function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace(routes.login), SPLASH.durationMs);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Hero style={styles.hero}>
      <View style={styles.block}>
        <BrandMark size={SPLASH.wordmarkSize} tracking={SPLASH.wordmarkTracking} />
        <PulseLineIcon size={SPLASH.pulseSize} style={styles.pulse} />
        <Text variant="micro" tone="mint" style={styles.tagline}>
          CARE · DELIVERED IN MINUTES
        </Text>
      </View>
    </Hero>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1 },
  block: {
    position: 'absolute',
    top: SPLASH.blockTop,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pulse: { marginTop: SPLASH.pulseMarginTop },
  tagline: {
    letterSpacing: SPLASH.taglineTracking,
    marginTop: SPLASH.taglineMarginTop,
  },
});
