#!/usr/bin/env bash
#
# Build the Release app and run it on an iOS simulator.
#
#   ./scripts/applerun.sh                          # Release, first available iPhone
#   ./scripts/applerun.sh --device "iPhone 15 Pro" # a named simulator
#   ./scripts/applerun.sh --debug                  # Debug build; needs `npm start`
#   ./scripts/applerun.sh --list                   # what simulators exist here
#
# This only runs on macOS. The iOS toolchain — xcodebuild, simctl, the
# simulator runtimes — ships with Xcode and exists nowhere else, so there is no
# arrangement under which a Windows or Linux machine builds this. The script
# says so and stops rather than failing three steps in with something obscure.
#
# Release is the default for the same reason as the Android script: a Debug
# build fetches its JavaScript from a Metro server, so it is not the app, it is
# the app plus your laptop.
#
# Logs land in scripts/logs/ (gitignored), beside this script rather than in the
# project root: one file for the build, one for the simulator log of the run
# that follows it.

set -euo pipefail

# The script lives in frontend/scripts/ but every path below -- ios/,
# node_modules/, .env -- is relative to frontend/, so run from there.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

MODE="Release"
DEVICE=""
LIST=0

while [ $# -gt 0 ]; do
  case "$1" in
    --debug)   MODE="Debug" ;;
    --release) MODE="Release" ;;
    --device)  DEVICE="${2:-}"; shift ;;
    --list)    LIST=1 ;;
    -h|--help) sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)         echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1mxx  %s\033[0m\n' "$*" >&2; exit 1; }

# --- macOS only ------------------------------------------------------------

if [ "$(uname -s)" != "Darwin" ]; then
  fail "iOS builds require macOS.

  You are on $(uname -s). Xcode, xcodebuild and the simulator runtimes are
  macOS-only and cannot be installed here, so this script has nothing to drive.

  To test on iOS you need a Mac (or a hosted one) with Xcode installed. Copy
  the repo across and run this script there; everything it needs is checked in
  except Pods/, which it installs itself.

  For Android on this machine, use ./scripts/androidrun.sh."
fi

command -v xcodebuild >/dev/null 2>&1 \
  || fail "xcodebuild not found. Install Xcode from the App Store, then:
      sudo xcode-select --switch /Applications/Xcode.app"

if [ "$LIST" = "1" ]; then
  xcrun simctl list devices available | sed -n '/-- iOS/,/^--/p'
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="$SCRIPT_DIR/logs"
BUILD_LOG="$LOG_DIR/ios-$STAMP-$(echo "$MODE" | tr 'A-Z' 'a-z')-build.log"
RUN_LOG="$LOG_DIR/ios-$STAMP-$(echo "$MODE" | tr 'A-Z' 'a-z')-simulator.log"
mkdir -p "$LOG_DIR"

# --- the .env gap ----------------------------------------------------------
#
# On Android, react-native-config reaches the app through dotenv.gradle. On
# iOS the equivalent is a "Build DotEnv Config" run-script phase in the Xcode
# project, and this project does not have one. Without it the library links,
# `Config` resolves, and every field on it is undefined -- so the app builds,
# installs, launches, and then talks to nothing, with no error anywhere.
#
# Checked rather than fixed: editing project.pbxproj blind, from a machine that
# cannot open or build the project, risks corrupting it outright.
if ! grep -q "react-native-config" ios/BeepMyDevice.xcodeproj/project.pbxproj 2>/dev/null; then
  cat >&2 <<'WARN'

    !!  frontend/.env will NOT reach the iOS app.

        react-native-config has no build phase in the Xcode project, so
        Config.API_BASE_URL is undefined at runtime and the axios baseURL
        comes out empty. Every request then goes to a relative path and the
        app reaches no server -- silently, with nothing in the log.

        To fix, in Xcode: select the BeepMyDevice target > Build Phases >
        + > New Run Script Phase, drag it ABOVE "Bundle React Native code
        and images", and set the script to:

            "${SRCROOT}/../node_modules/react-native-config/ios/ReactNativeConfig/BuildDotenvConfig.sh"

        Continuing anyway -- the build will succeed either way.

WARN
fi

# --- pods ------------------------------------------------------------------

if [ ! -d ios/Pods ] || [ ! -d ios/BeepMyDevice.xcworkspace ]; then
  command -v pod >/dev/null 2>&1 \
    || fail "CocoaPods not installed. Run:  sudo gem install cocoapods"
  say "Installing pods (first run takes a few minutes) — log: $BUILD_LOG"
  if ! (cd ios && pod install) > "$BUILD_LOG" 2>&1; then
    tail -30 "$BUILD_LOG" >&2
    fail "pod install failed. Full log: $BUILD_LOG"
  fi
  echo "    ok"
fi

# --- a simulator to run on -------------------------------------------------

if [ -z "$DEVICE" ]; then
  # Newest available iPhone. `simctl list` prints oldest first, so take the
  # last rather than the first.
  DEVICE="$(xcrun simctl list devices available \
    | grep -E '^\s+iPhone' \
    | sed -E 's/^[[:space:]]+([^(]+) \(.*/\1/' \
    | sed 's/[[:space:]]*$//' \
    | tail -1)"
fi
[ -n "$DEVICE" ] || fail "No iPhone simulator available.
  Xcode > Settings > Platforms, install an iOS runtime. Then ./scripts/applerun.sh --list"

say "Simulator: $DEVICE"
UDID="$(xcrun simctl list devices available \
  | grep -F "$DEVICE (" | head -1 \
  | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')"
[ -n "$UDID" ] || fail "Could not resolve '$DEVICE'. Try ./scripts/applerun.sh --list"

# `simctl boot` errors if it is already booted, which is not a failure here.
xcrun simctl boot "$UDID" 2>/dev/null || true
open -a Simulator

# --- build, install, launch ------------------------------------------------

say "Building ($MODE) — log: $BUILD_LOG"
if ! npx react-native run-ios \
      --mode "$MODE" \
      --udid "$UDID" \
      >> "$BUILD_LOG" 2>&1; then
  tail -40 "$BUILD_LOG" >&2
  fail "Build failed. Full log: $BUILD_LOG"
fi
echo "    ok"

if [ "$MODE" = "Debug" ]; then
  echo "    debug build: it needs \`npm start\` running, or you get a red screen."
fi

cat <<'EOF'

    The simulator cannot test the core feature.

    There is no WiFi BSSID on a simulator, so device registration has nothing
    to group by -- the network identity the whole product is built on is
    missing. Sign-in, layout and navigation are what a simulator is good for
    here; alerting needs two real devices on one real network.

EOF

# --- logs ------------------------------------------------------------------

say "Streaming simulator log — Ctrl-C to stop (kept in $RUN_LOG)"
xcrun simctl spawn "$UDID" log stream \
    --level debug \
    --predicate 'processImagePath CONTAINS "BeepMyDevice"' \
  | tee "$RUN_LOG" \
  || true
