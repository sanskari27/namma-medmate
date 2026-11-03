import {
  clampSystemFontScale,
  clampUserFontScale,
  fontScalePolicy,
  resolveTextScale,
  scaleTypography,
  typography,
} from './typography';

/**
 * These tests are the regression guard for the cross-device font-size bug:
 * a handset whose OS font scale sits below 1.0 used to render MedMate's copy
 * too small while the containers kept their measured heights.
 */
describe('font scale policy', () => {
  describe('clampSystemFontScale', () => {
    it('ignores a system scale below 1 so every device renders identically', () => {
      expect(clampSystemFontScale(0.85)).toBe(1);
      expect(clampSystemFontScale(0.5)).toBe(1);
    });

    it('caps an extreme system scale', () => {
      expect(clampSystemFontScale(3)).toBe(fontScalePolicy.system.max);
    });

    it('passes a normal system scale through', () => {
      expect(clampSystemFontScale(1.15)).toBeCloseTo(1.15);
    });
  });

  describe('clampUserFontScale', () => {
    it('allows the in-app "small" step', () => {
      expect(clampUserFontScale(0.9)).toBeCloseTo(0.9);
    });

    it('never lets the preference shrink the type below the floor', () => {
      expect(clampUserFontScale(0.1)).toBe(fontScalePolicy.user.min);
    });
  });

  describe('resolveTextScale', () => {
    it('combines the in-app preference with the system scale', () => {
      expect(resolveTextScale(1.1, 1)).toBeCloseTo(1.1);
      expect(resolveTextScale(1, 1.2)).toBeCloseTo(1.2);
      expect(resolveTextScale(1.1, 1.2)).toBeCloseTo(1.32);
    });

    it('never lets the OS shrink the type below the measured design', () => {
      expect(resolveTextScale(1, 0.8)).toBe(1);
    });

    it('never exceeds the effective ceiling', () => {
      expect(resolveTextScale(1.3, 1.3)).toBeLessThanOrEqual(
        fontScalePolicy.effective.max,
      );
    });
  });

  describe('scaleTypography', () => {
    it('returns the base scale untouched at 1', () => {
      expect(scaleTypography(1)).toBe(typography);
    });

    it('scales font size and line height together to keep the rhythm', () => {
      const scaled = scaleTypography(1.5);

      expect(scaled.h1.fontSize).toBeCloseTo(typography.h1.fontSize * 1.5);
      expect(scaled.h1.lineHeight).toBeCloseTo(typography.h1.lineHeight * 1.5);
    });

    it('scales letter spacing along with the glyphs', () => {
      expect(scaleTypography(2).h1.letterSpacing).toBeCloseTo(
        typography.h1.letterSpacing * 2,
      );
    });

    it('leaves tokens without letter spacing alone', () => {
      expect(scaleTypography(2).body.letterSpacing).toBeUndefined();
    });
  });
});
