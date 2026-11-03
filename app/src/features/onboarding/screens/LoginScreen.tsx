import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { routes } from '@/navigation/routes';
import { ChevronRightIcon } from '@/components/icons';
import { BrandMark, Button, Hero, Input, Text } from '@/components/ui';
import { useKeyboardVisible } from '@/hooks';
import { useAuthStore } from '@/store';
import { colors, fontFamily } from '@/theme';

import { FeatureStrip } from '../components/FeatureStrip';
import { ProductCollage } from '../components/ProductCollage';
import { LOGIN } from '../constants';
import { usePhoneValidation } from '../hooks/usePhoneValidation';

/**
 * 02 · Login — "One field, one action." (Figma UX note)
 *
 * Geometry measured off the live MVP at a 390×844 viewport
 * (see _ref/mvp/dom_login.json).
 */
export function LoginScreen() {
  const router = useRouter();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const keyboardVisible = useKeyboardVisible();

  const requestCode = useAuthStore((state) => state.requestCode);
  const status = useAuthStore((state) => state.status);

  const [phone, setPhone] = useState('');
  const { isValid } = usePhoneValidation(phone);

  const isSending = status === 'requesting';

  // The keyboard covers the "Get code" button, so bring it into view as soon
  // as the number is complete.
  useEffect(() => {
    if (isValid && keyboardVisible) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [isValid, keyboardVisible]);

  const handleSubmit = async () => {
    const sent = await requestCode(phone);
    if (sent) {
      router.push(routes.otp);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <ScrollView
        ref={scrollRef}
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ------------------------------- HERO ------------------------------- */}
        <Hero height={LOGIN.heroHeight} style={styles.hero}>
          <View style={styles.brandBlock}>
            <BrandMark size={LOGIN.logoSize} tracking={LOGIN.logoTracking} />
            <Text variant="micro" tone="mint" style={styles.tagline}>
              CARE · DELIVERED IN MINUTES
            </Text>
          </View>

          <ProductCollage />

          <FeatureStrip />
        </Hero>

        {/* -------------------------------- CARD ------------------------------- */}
        <View style={styles.card}>
          <Text variant="hero" tone="primary">
            Medicines from your{'\n'}
            <Text tone="accent">neighbourhood pharmacy</Text>
          </Text>

          <Text variant="body" tone="muted" style={styles.subtitle}>
            Log in or sign up with your mobile number.
          </Text>

          <Input
            label="Mobile number"
            value={phone}
            onChangeText={(text) => setPhone(text.replace(/[^\d ]/g, '').slice(0, 14))}
            placeholder="98450 12345"
            prefix="+91"
            keyboardType="number-pad"
            maxLength={14}
            hint="We’ll send a 4-digit code by SMS."
            style={styles.field}
          />

          <Button
            label="Get code"
            onPress={handleSubmit}
            disabled={!isValid || isSending}
            loading={isSending}
            style={styles.button}
            trailing={
              <ChevronRightIcon size={16} color={isValid ? colors.white : colors.muted} />
            }
            accessibilityLabel="Get code"
          />

          <Text variant="caption" tone="muted" align="center" style={styles.terms}>
            You will review our{' '}
            <Text variant="caption" tone="accent" style={styles.link}>
              Terms
            </Text>{' '}
            and{' '}
            <Text variant="caption" tone="accent" style={styles.link}>
              Privacy Policy
            </Text>{' '}
            next.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { flexGrow: 1 },

  hero: { alignItems: 'center' },

  brandBlock: {
    marginTop: LOGIN.brandBlockTop,
    alignItems: 'center',
  },
  tagline: {
    letterSpacing: LOGIN.taglineTracking,
    marginTop: LOGIN.taglineMarginTop,
  },

  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: LOGIN.card.radius,
    borderTopRightRadius: LOGIN.card.radius,
    paddingHorizontal: LOGIN.horizontalPadding,
    paddingTop: LOGIN.card.paddingTop,
  },

  subtitle: { marginTop: LOGIN.headlineMarginBottom },
  field: { marginTop: LOGIN.fieldMarginTop },
  button: { marginTop: LOGIN.buttonMarginTop },
  terms: { marginTop: LOGIN.termsMarginTop },

  link: {
    fontFamily: fontFamily.bold,
    textDecorationLine: 'underline',
  },
});
