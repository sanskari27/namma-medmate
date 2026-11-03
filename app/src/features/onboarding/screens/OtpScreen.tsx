import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { routes } from '@/navigation/routes';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
} from '@/components/icons';
import { BrandMark, Button, Hero, Text } from '@/components/ui';
import { useKeyboardVisible } from '@/hooks';
import { useAuthStore } from '@/store';
import { colors, fontFamily, overlays, spacing } from '@/theme';
import { formatPhoneWithCountry } from '@/utils';

import { OtpInput } from '../components/OtpInput';
import { OTP } from '../constants';
import { useOtpTimer } from '../hooks/useOtpTimer';

/**
 * 03 · Verify OTP — "Four large boxes, auto-advance, paste-friendly. Resend
 * countdown only after 30 seconds." (Figma UX note)
 *
 * Geometry measured off the live MVP at 390×844 (see _ref/mvp/dom_otp.json).
 */
export function OtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const keyboardVisible = useKeyboardVisible();

  const phone = useAuthStore((state) => state.phone);
  const verifyCode = useAuthStore((state) => state.verifyCode);
  const status = useAuthStore((state) => state.status);

  const [code, setCode] = useState('');
  const { seconds, canResend, reset } = useOtpTimer(OTP.initialCountdownSeconds);

  const isVerifying = status === 'verifying';
  const isComplete = code.length === OTP.codeLength;
  const displayPhone = formatPhoneWithCountry(phone) || '+91 98450 12345';

  // Once the code is complete the keyboard covers the CTA, so bring it into
  // view — otherwise the user has to guess that the screen scrolls.
  useEffect(() => {
    if (isComplete && keyboardVisible) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [isComplete, keyboardVisible]);

  const handleVerify = async () => {
    if (!isComplete || isVerifying) return;

    const verified = await verifyCode(code);
    if (verified) {
      router.push(routes.consent);
    }
  };

  const handleResend = () => {
    reset(OTP.resendAfterSeconds);
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
        <Hero height={OTP.heroHeight + insets.top}>
          <Pressable
            style={[styles.backButton, { top: insets.top + OTP.backButton.top }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ChevronLeftIcon size={20} color={colors.white} />
          </Pressable>

          <BrandMark
            size={OTP.headerBrandSize}
            tracking={OTP.headerBrandTracking}
            style={[styles.headerBrand, { top: insets.top + OTP.headerBrandTop }]}
          />

          <View style={[styles.iconWrap, { top: insets.top + OTP.iconWrap.top }]}>
            <MessageSquareIcon size={36} color={colors.gold} />
            <View style={styles.iconBadge}>
              <ShieldCheckIcon size={14} color={colors.forest} />
            </View>
          </View>

          <Text
            variant="hero"
            tone="inverse"
            align="center"
            style={[styles.title, { top: insets.top + OTP.titleTop }]}
          >
            Enter the <Text tone="gold">4-digit code</Text>
          </Text>

          <Text
            variant="bodyS"
            tone="mint"
            align="center"
            style={[styles.sentTo, { top: insets.top + OTP.sentToTop }]}
          >
            Sent by SMS to{' '}
            <Text variant="bodyS" tone="inverse" style={styles.sentToNumber}>
              {displayPhone}
            </Text>
          </Text>

          <Pressable
            style={[styles.changeNumber, { top: insets.top + OTP.changeNumberTop }]}
            onPress={() => router.replace(routes.login)}
            accessibilityRole="button"
            accessibilityLabel="Change number"
          >
            <Text variant="bodyS" tone="gold" style={styles.changeNumberText}>
              Change number
            </Text>
          </Pressable>
        </Hero>

        <View
          style={[styles.card, { paddingBottom: insets.bottom + OTP.card.paddingBottom }]}
        >
          <OtpInput value={code} onChange={setCode} />

          {canResend ? (
            <Pressable
              onPress={handleResend}
              accessibilityRole="button"
              style={styles.resend}
            >
              <Text variant="bodyS" tone="muted">
                Didn’t get it?{' '}
                <Text variant="bodyS" tone="accent" style={styles.resendTimer}>
                  Resend code
                </Text>
              </Text>
            </Pressable>
          ) : (
            <Text variant="bodyS" tone="muted" align="center" style={styles.resend}>
              Didn’t get it? Resend in{' '}
              <Text variant="bodyS" tone="primary" style={styles.resendTimer}>
                {Math.floor(seconds / 60)}: {String(seconds % 60).padStart(2, '0')}
              </Text>
            </Text>
          )}

          <Button
            label="Verify and continue"
            disabled={!isComplete || isVerifying}
            loading={isVerifying}
            onPress={handleVerify}
            style={styles.verify}
            trailing={
              <ChevronRightIcon
                size={16}
                color={isComplete ? colors.white : colors.muted}
              />
            }
          />

          <View style={styles.privacy}>
            <ShieldCheckIcon size={16} color={colors.green700} />
            <Text variant="caption" tone="secondary" style={styles.privacyText}>
              We only use your number to sign you in and update you about orders.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { flexGrow: 1 },

  backButton: {
    position: 'absolute',
    left: OTP.backButton.left,
    width: OTP.backButton.size,
    height: OTP.backButton.size,
    borderRadius: 999,
    backgroundColor: overlays.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },

  iconWrap: {
    position: 'absolute',
    alignSelf: 'center',
    width: OTP.iconWrap.size,
    height: OTP.iconWrap.size,
    borderRadius: 999,
    backgroundColor: overlays.white07,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute',
    right: OTP.iconBadge.right,
    bottom: OTP.iconBadge.bottom,
    width: OTP.iconBadge.size,
    height: OTP.iconBadge.size,
    borderRadius: 999,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  sentTo: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  sentToNumber: { fontFamily: fontFamily.bold },

  changeNumber: {
    position: 'absolute',
    alignSelf: 'center',
    height: OTP.changeNumberHeight,
    paddingHorizontal: OTP.changeNumberPaddingHorizontal,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: overlays.white20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeNumberText: { fontFamily: fontFamily.bold },

  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: OTP.card.radius,
    borderTopRightRadius: OTP.card.radius,
    paddingHorizontal: OTP.horizontalPadding,
    paddingTop: OTP.card.paddingTop,
  },

  resend: { marginTop: OTP.resendMarginTop },
  resendTimer: { fontFamily: fontFamily.bold },

  verify: { marginTop: OTP.verifyMarginTop },

  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.mint50,
    borderRadius: OTP.privacyRadius,
    paddingHorizontal: OTP.privacyPaddingHorizontal,
    paddingVertical: OTP.privacyPaddingVertical,
    marginTop: OTP.privacyMarginTop,
  },
  privacyText: { flex: 1 },
});
