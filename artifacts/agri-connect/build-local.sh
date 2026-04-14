#!/usr/bin/env bash
# ============================================================
#  Phytoclinic – Local Android Build (AAB + APK)
#  Run this script on your own PC/Mac after setup.
# ============================================================
set -e

EAS_BIN=$(which eas 2>/dev/null || echo "")
if [ -z "$EAS_BIN" ]; then
  echo "Installing EAS CLI..."
  npm install -g eas-cli
fi

echo ""
echo "=============================="
echo "  Phytoclinic – Local Build"
echo "=============================="
echo ""

# Check Java
if ! command -v java &>/dev/null; then
  echo "❌ Java not found. Install JDK 17: https://adoptium.net"
  exit 1
fi
JAVA_VER=$(java -version 2>&1 | head -1)
echo "✓ Java: $JAVA_VER"

# Check Android SDK
if [ -z "$ANDROID_HOME" ]; then
  echo "❌ ANDROID_HOME not set. Install Android Studio and set ANDROID_HOME."
  echo "   Typical paths:"
  echo "   Windows: C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk"
  echo "   macOS:   ~/Library/Android/sdk"
  echo "   Linux:   ~/Android/Sdk"
  exit 1
fi
echo "✓ Android SDK: $ANDROID_HOME"

# Check pnpm
if ! command -v pnpm &>/dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi
echo "✓ pnpm: $(pnpm --version)"

echo ""
echo "--> Installing dependencies..."
cd "$(dirname "$0")/../.."
pnpm install

echo ""
echo "--> Building AAB (Play Store)..."
cd "$(dirname "$0")"
EXPO_TOKEN=$EXPO_TOKEN_NEW eas build --platform android --profile production --local --non-interactive \
  --output ./build-output/phytoclinic-production.aab
echo "✅ AAB saved to: artifacts/agri-connect/build-output/phytoclinic-production.aab"

echo ""
echo "--> Building APK (direct install)..."
EXPO_TOKEN=$EXPO_TOKEN_NEW eas build --platform android --profile preview --local --non-interactive \
  --output ./build-output/phytoclinic-preview.apk
echo "✅ APK saved to: artifacts/agri-connect/build-output/phytoclinic-preview.apk"

echo ""
echo "=============================="
echo "  Build complete!"
echo "  Files in: artifacts/agri-connect/build-output/"
echo "=============================="
