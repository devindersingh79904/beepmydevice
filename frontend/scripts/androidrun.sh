#!/usr/bin/env bash
#
# Build the release APK, put it on a device or the emulator, and run it.
#
#   ./scripts/androidrun.sh                 # release, on whatever is attached (or boot the AVD)
#   ./scripts/androidrun.sh --debug         # debug build; needs `npm start` running
#   ./scripts/androidrun.sh --avd Pixel_10_Pro   # force a particular emulator
#   ./scripts/androidrun.sh --no-build      # install and launch the APK already built
#
# Release is the default on purpose. A debug APK loads its JavaScript from a
# Metro server on the developer's machine, so it is useless on a phone that is
# not tethered to one; a release APK carries the bundle inside it and runs
# standalone, which is what "test the app" means.
#
# Two things this script knows that a bare `gradlew` invocation does not:
#
#   * The build needs JDK 17. React Native 0.73 ships AGP 8.1, whose
#     JdkImageTransform shells out to jlink, and jlink from JDK 21 or newer
#     fails against it. The error names a jar and a cache path and never says
#     "wrong JDK", so it is resolved here rather than rediscovered.
#
#   * API_BASE_URL is baked in at BUILD time, not read at launch.
#     react-native-config compiles frontend/.env into BuildConfig, so editing
#     .env and re-installing the same APK changes nothing. Every run prints the
#     URL that actually went into the binary.
#
# Logs land in scripts/logs/ (gitignored), beside this script rather than in the
# project root: one file for the build, one for the device log of the run that
# follows it.

set -euo pipefail

# The script lives in frontend/scripts/ but every path below -- android/,
# node_modules/, .env -- is relative to frontend/, so run from there.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

MODE="release"
BUILD=1
AVD_NAME=""

while [ $# -gt 0 ]; do
  case "$1" in
    --debug)    MODE="debug" ;;
    --release)  MODE="release" ;;
    --no-build) BUILD=0 ;;
    --avd)      AVD_NAME="${2:-}"; shift ;;
    -h|--help)  sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)          echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="$SCRIPT_DIR/logs"
BUILD_LOG="$LOG_DIR/android-$STAMP-$MODE-build.log"
RUN_LOG="$LOG_DIR/android-$STAMP-$MODE-logcat.log"
mkdir -p "$LOG_DIR"

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1mxx  %s\033[0m\n' "$*" >&2; exit 1; }

# --- the SDK ---------------------------------------------------------------

EXE=""
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) EXE=".exe" ;; esac

if [ -z "${ANDROID_HOME:-}" ]; then
  for candidate in \
    "$HOME/AppData/Local/Android/Sdk" \
    "$HOME/Library/Android/sdk" \
    "$HOME/Android/Sdk"
  do
    [ -d "$candidate" ] && { ANDROID_HOME="$candidate"; break; }
  done
fi
[ -n "${ANDROID_HOME:-}" ] && [ -d "$ANDROID_HOME" ] \
  || fail "Android SDK not found. Set ANDROID_HOME to it."

ADB="$ANDROID_HOME/platform-tools/adb$EXE"
EMULATOR="$ANDROID_HOME/emulator/emulator$EXE"
[ -x "$ADB" ] || fail "adb not found at $ADB"

# Gradle reads the SDK location from here, and the file is gitignored because
# it is one absolute path from one machine.
if [ ! -f android/local.properties ]; then
  say "Writing android/local.properties"
  # Forward slashes: a .properties file treats a backslash as an escape, so
  # C:\Users\... silently becomes an invalid path and AGP reports only
  # "Invalid file path".
  printf 'sdk.dir=%s\n' "$(printf '%s' "$ANDROID_HOME" | sed 's#^/\([a-zA-Z]\)/#\1:/#')" \
    > android/local.properties
fi

# --- the JDK ---------------------------------------------------------------

jdk_major() {
  "$1/bin/java$EXE" -version 2>&1 | head -1 \
    | sed -E 's/.*version "([0-9]+).*/\1/'
}

if [ -z "${JAVA_HOME:-}" ] || [ "$(jdk_major "$JAVA_HOME" 2>/dev/null || echo 0)" != "17" ]; then
  FOUND=""
  # Gradle's own toolchain provisioning usually has one already; then the
  # common installer locations.
  for candidate in \
    "$HOME"/.gradle/jdks/*17*/ \
    /usr/lib/jvm/*17*/ \
    /Library/Java/JavaVirtualMachines/*17*/Contents/Home \
    "/c/Program Files/Eclipse Adoptium"/jdk-17*/ \
    "/c/Program Files/Java"/jdk-17*/
  do
    candidate="${candidate%/}"
    [ -x "$candidate/bin/java$EXE" ] || continue
    [ "$(jdk_major "$candidate")" = "17" ] || continue
    FOUND="$candidate"; break
  done
  [ -n "$FOUND" ] || fail "No JDK 17 found. AGP 8.1 cannot build with 21+.
  Install Temurin 17, or set JAVA_HOME to a JDK 17 you already have."
  JAVA_HOME="$FOUND"
fi
export JAVA_HOME
say "JDK: $("$JAVA_HOME/bin/java$EXE" -version 2>&1 | head -1)"

# --- a device to run on ----------------------------------------------------

attached() { "$ADB" devices | awk 'NR>1 && $2=="device" {print $1}'; }

SERIAL="$(attached | head -1)"
if [ -z "$SERIAL" ]; then
  [ -x "$EMULATOR" ] || fail "No device attached and no emulator binary found."
  if [ -z "$AVD_NAME" ]; then
    AVD_NAME="$("$EMULATOR" -list-avds | head -1)"
  fi
  [ -n "$AVD_NAME" ] || fail "No device attached and no AVD exists.
  Create one in Android Studio (Device Manager), or plug in a phone with USB
  debugging turned on."

  say "Booting emulator: $AVD_NAME"
  "$EMULATOR" -avd "$AVD_NAME" -netdelay none -netspeed full \
    > "$LOG_DIR/android-$STAMP-emulator.log" 2>&1 &

  "$ADB" wait-for-device
  printf '    waiting for Android to finish booting'
  until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
    printf '.'; sleep 2
  done
  printf ' up\n'
  SERIAL="$(attached | head -1)"
fi
say "Device: $SERIAL"

# --- build -----------------------------------------------------------------

APK="android/app/build/outputs/apk/$MODE/app-$MODE.apk"

if [ "$BUILD" = "1" ]; then
  TASK="assembleRelease"; [ "$MODE" = "debug" ] && TASK="assembleDebug"
  say "Building ($MODE) — log: $BUILD_LOG"
  # The log keeps everything; the console shows the tail on failure only, so a
  # successful run is not 400 lines of task names.
  if ! (cd android && ./gradlew "$TASK" --no-daemon) > "$BUILD_LOG" 2>&1; then
    tail -30 "$BUILD_LOG" >&2
    fail "Build failed. Full log: $BUILD_LOG"
  fi
  echo "    ok"
fi

[ -f "$APK" ] || fail "No APK at $APK (run without --no-build)."

# What actually went into the binary, rather than what .env says now.
CONFIG="android/app/build/generated/source/buildConfig/$MODE/com/beepmydevice/BuildConfig.java"
if [ -f "$CONFIG" ]; then
  say "Baked into this APK:"
  grep -E 'API_BASE_URL|WS_BASE_URL' "$CONFIG" | sed 's/^ */    /' || true
else
  echo "    (no BuildConfig found — is dotenv.gradle still applied?)" >&2
fi

# --- install and launch ----------------------------------------------------

say "Installing $(du -h "$APK" | cut -f1) APK"
# -r reinstalls over the top; -d allows going back to an older versionCode.
"$ADB" -s "$SERIAL" install -r -d "$APK" >> "$BUILD_LOG" 2>&1 \
  || fail "Install failed. Log: $BUILD_LOG
  If it complains about signatures, uninstall first:
      $ADB -s $SERIAL uninstall com.beepmydevice"

say "Launching com.beepmydevice"
"$ADB" -s "$SERIAL" shell monkey -p com.beepmydevice \
  -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1

if [ "$MODE" = "debug" ]; then
  echo "    debug build: it needs \`npm start\` running, or you get a red screen."
fi

cat <<EOF

    Grant both prompts or the app cannot work:
      Location      — Android only reveals the WiFi BSSID to apps holding it,
                      and that BSSID is the alert group's identity.
      Notifications — Android 13+; without it no alert can arrive.

EOF

# --- logs ------------------------------------------------------------------

say "Streaming device log — Ctrl-C to stop (kept in $RUN_LOG)"
"$ADB" -s "$SERIAL" logcat -c || true
"$ADB" -s "$SERIAL" logcat \
  | tee "$RUN_LOG" \
  | grep --line-buffered -Ei 'beepmydevice|ReactNative|ReactNativeJS|AndroidRuntime|FATAL' \
  || true
