#!/usr/bin/env bash
# Regenerate the native Android project and re-apply the local customisations
# that `expo prebuild` wipes (release signing + trimmed ABI list).
#
# The release keystore lives OUTSIDE android/ (in app/signing/) because
# `expo prebuild` clears android/ — keeping it there means every rebuild
# produces an APK with the SAME signature, so the app can be upgraded in
# place instead of being uninstalled first.
#
# Set MEDMATE_GENERATE_KEYSTORE=0 to skip creating a release keystore — CI
# does this so the build falls back to the debug signing key.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$APP_DIR/scripts/env.sh"

SIGNING_DIR="$APP_DIR/signing"
KEYSTORE_NAME="medmate-release.keystore"
KEYSTORE_PROPS="keystore.properties"

cd "$APP_DIR"

echo "▸ expo prebuild…"
npx expo prebuild --platform android --no-install

echo "▸ re-applying local build customisations…"
python3 - <<'PY'
import re, pathlib

# --- android/app/build.gradle : release signing config ---
p = pathlib.Path("android/app/build.gradle")
s = p.read_text()

if "keystore.properties" not in s:
    s = s.replace(
        """    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }""",
        """    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            // Credentials live in android/app/keystore.properties (git-ignored).
            // Without that file we fall back to the debug key so local release
            // builds still produce an installable APK.
            if (file('keystore.properties').exists()) {
                def props = new Properties()
                props.load(new FileInputStream(file('keystore.properties')))
                storeFile file(props['storeFile'])
                storePassword props['storePassword']
                keyAlias props['keyAlias']
                keyPassword props['keyPassword']
            }
        }
    }""",
    )
    s = s.replace(
        """        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug""",
        """        release {
            signingConfig file('keystore.properties').exists() ? signingConfigs.release : signingConfigs.debug""",
    )
    p.write_text(s)
    print("  patched build.gradle (release signing)")
else:
    print("  build.gradle already patched")

# --- android/gradle.properties : only the ABIs we actually ship ---
g = pathlib.Path("android/gradle.properties")
t = g.read_text()
t = re.sub(r"^reactNativeArchitectures=.*$", "reactNativeArchitectures=arm64-v8a,x86_64", t, flags=re.M)
g.write_text(t)
print("  reactNativeArchitectures=arm64-v8a,x86_64")
PY

# --- release keystore + credentials ---------------------------------------
# Kept in app/signing/ so it survives `expo prebuild` wiping android/.
if [ "${MEDMATE_GENERATE_KEYSTORE:-1}" = "1" ]; then
  mkdir -p "$SIGNING_DIR"

  if [ ! -f "$SIGNING_DIR/$KEYSTORE_NAME" ]; then
    echo "▸ generating release keystore…"
    keytool -genkeypair -v -storetype PKCS12 -keystore "$SIGNING_DIR/$KEYSTORE_NAME" -alias medmate \
      -keyalg RSA -keysize 2048 -validity 10000 \
      -storepass medmate2026 -keypass medmate2026 \
      -dname "CN=MedMate, OU=Mobile, O=Namma MedMate, L=Chennai, ST=TN, C=IN" >/dev/null 2>&1
  else
    echo "▸ reusing the existing release keystore"
  fi

  cp "$SIGNING_DIR/$KEYSTORE_NAME" "$APP_DIR/android/app/$KEYSTORE_NAME"
  printf 'storeFile=%s\nstorePassword=medmate2026\nkeyAlias=medmate\nkeyPassword=medmate2026\n' \
    "$KEYSTORE_NAME" > "$APP_DIR/android/app/$KEYSTORE_PROPS"
  cp "$APP_DIR/android/app/$KEYSTORE_PROPS" "$SIGNING_DIR/$KEYSTORE_PROPS"
else
  echo "▸ skipping keystore generation — release builds will use the debug key"
fi

echo "▸ done — run ./scripts/build-apk.sh release next"
