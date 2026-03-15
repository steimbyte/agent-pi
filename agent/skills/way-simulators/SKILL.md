---
name: way-simulators
description: Boot and control both Way app simulators (iOS + Android) side by side using agent-device CLI. Use when testing, comparing, inspecting, or capturing screens across both platforms. Invoke when user says "bring up simulators", "compare iOS and Android", "test both platforms", "take baseline screenshots", "visual parity check", or any task requiring simultaneous iOS and Android Way app interaction.
allowed-tools: Bash(agent-device:*) Bash(xcrun:*) Bash(adb:*) Bash(open:*) Bash(find:*) Read
---

# way-simulators

Side-by-side iOS Simulator and Android Emulator control for the Way app using the `agent-device` CLI.

## When to Use

- Bringing up both simulators for testing or visual comparison
- Capturing baseline screenshots across platforms
- Inspecting UI, flows, or behavior on both iOS and Android
- Verifying porting parity between iOS and Android Way app
- Any task requiring simultaneous interaction with both platforms

## Device Inventory

### iOS Simulator

| Field | Value |
|-------|-------|
| Device | iPhone 17 Pro |
| UDID | `EA2BF44C-98A8-48D0-A7CA-9E7C5BB5F06C` |
| Runtime | iOS 26.1 |
| Bundle ID | `com.eatmyway.wayapp` |
| agent-device session | `default` |

### Android Emulator

| Field | Value |
|-------|-------|
| AVD Name | `Pixel_9a` |
| Serial | `emulator-5554` |
| Package | `com.way.android` |
| agent-device session | `android` |

## Project Paths

| Project | Path |
|---------|------|
| iOS (source of truth) | `/Users/ricardo/Workshop/GitHub/way-ios-prd` |
| Android (port target) | `/Users/ricardo/Workshop/GitHub/way-ios-prd/WayAppAndroid` |
| iOS workspace | `Way.xcworkspace` (scheme: `Way`) |
| Android build | `./gradlew assembleDebug` from the WayAppAndroid directory |

## Full Startup Sequence

Use this sequence to bring both simulators up from cold with the Way app running.

### Step 1: Boot iOS Simulator

```bash
xcrun simctl boot EA2BF44C-98A8-48D0-A7CA-9E7C5BB5F06C 2>&1 || true
open -a Simulator
```

If already booted, the boot command returns a non-zero exit (error 149) — this is safe to ignore.

### Step 2: Boot Android Emulator

```bash
nohup /Users/ricardo/Library/Android/sdk/emulator/emulator -avd Pixel_9a -no-snapshot-load > /tmp/emu.log 2>&1 &
```

Wait for the emulator to finish booting:

```bash
for i in $(seq 1 30); do
  BOOT=$(/Users/ricardo/Library/Android/sdk/platform-tools/adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  if [ "$BOOT" = "1" ]; then
    echo "Android emulator booted after ~$((i*2))s"
    break
  fi
  sleep 2
done
```

### Step 3: Verify Both Devices Are Visible

```bash
agent-device devices --json
```

Confirm both appear with `"booted": true`:
- `ios` / `iPhone 17 Pro` / `EA2BF44C-...`
- `android` / `Pixel 9a` / `emulator-5554`

### Step 4: Launch Way App on iOS

```bash
agent-device open com.eatmyway.wayapp --platform ios --device "iPhone 17 Pro" --udid EA2BF44C-98A8-48D0-A7CA-9E7C5BB5F06C
```

This binds the `default` agent-device session to iOS.

### Step 5: Launch Way App on Android

```bash
agent-device open com.way.android --platform android --serial emulator-5554 --session android
```

This creates a separate `android` agent-device session. The `--session android` flag is required because the default session is already bound to iOS.

### Step 6: Capture Baseline Screenshots

```bash
agent-device screenshot /tmp/way-ios-baseline.png --platform ios --session default
agent-device screenshot /tmp/way-android-baseline.png --platform android --session android
```

## Session Management

agent-device binds each session to one platform. Always use the correct session flag:

| Platform | Session Flag | Example |
|----------|-------------|---------|
| iOS | `--session default` (or omit) | `agent-device snapshot --session default` |
| Android | `--session android` | `agent-device snapshot --session android` |

To list active sessions:

```bash
agent-device session list
```

## Common Operations

### Take Screenshots (Both Platforms)

```bash
agent-device screenshot /tmp/ios-screen.png --session default
agent-device screenshot /tmp/android-screen.png --session android
```

### Capture Accessibility Snapshots

```bash
agent-device snapshot --session default      # iOS
agent-device snapshot --session android      # Android
```

Use `-i` for interactive element refs, `--depth 3` to limit tree depth, `--raw` for full output.

### Navigate and Interact

```bash
# iOS
agent-device click @e1 --session default
agent-device fill @e3 "some text" --session default
agent-device swipe 200 800 200 200 --session default
agent-device scroll down --session default

# Android
agent-device click @e1 --session android
agent-device fill @e3 "some text" --session android
agent-device swipe 200 800 200 200 --session android
agent-device scroll down --session android
```

### Go Home / Go Back

```bash
agent-device home --session default          # iOS
agent-device home --session android          # Android
agent-device back --session default          # iOS
agent-device back --session android          # Android
```

### Check Foreground App

```bash
agent-device appstate --session default      # iOS
agent-device appstate --session android      # Android
```

### Wait for Content

```bash
agent-device wait text "SESSION 1" --session default
agent-device wait text "Session 1" --session android
```

### Relaunch the App (Fresh State)

```bash
agent-device open com.eatmyway.wayapp --session default --relaunch
agent-device open com.way.android --session android --relaunch
```

## Installing / Reinstalling Apps

### iOS — Build and Install

```bash
cd /Users/ricardo/Workshop/GitHub/way-ios-prd
xcodebuild -workspace Way.xcworkspace \
  -scheme Way \
  -destination 'platform=iOS Simulator,id=EA2BF44C-98A8-48D0-A7CA-9E7C5BB5F06C' \
  build

# Find the built .app
find ~/Library/Developer/Xcode/DerivedData -path '*Build/Products/*-iphonesimulator/Way.app' | head -1

# Install
xcrun simctl install booted '<path-to-Way.app>'
```

### Android — Build and Install

```bash
cd /Users/ricardo/Workshop/GitHub/way-ios-prd/WayAppAndroid
./gradlew assembleDebug

# Install (use -t for debug/test APKs, -r to replace existing)
/Users/ricardo/Library/Android/sdk/platform-tools/adb install -t -r app/build/outputs/apk/debug/app-debug.apk
```

## Checking If Way App Is Installed

### iOS

```bash
# Check simulator filesystem directly
find ~/Library/Developer/CoreSimulator/Devices/EA2BF44C-98A8-48D0-A7CA-9E7C5BB5F06C/data/Containers/Bundle/Application -name "Way.app" 2>/dev/null
```

### Android

```bash
/Users/ricardo/Library/Android/sdk/platform-tools/adb shell pm list packages | grep way
```

## Shutdown Sequence

```bash
# Close agent-device sessions
agent-device close --session default
agent-device close --session android

# Shutdown simulators
xcrun simctl shutdown EA2BF44C-98A8-48D0-A7CA-9E7C5BB5F06C
/Users/ricardo/Library/Android/sdk/platform-tools/adb emu kill
```

## Troubleshooting

### agent-device says "No device named Pixel 9a"
The Android emulator is not fully booted yet, or agent-device cannot see it. Verify with `adb devices` and wait for boot to complete.

### Session bound to wrong platform
You will see: `Session "default" is bound to ios device...`. Use `--session android` for Android commands, or `agent-device close --session default` to release the binding.

### iOS simulator already booted (error 149)
Safe to ignore. The simulator is already running. Just `open -a Simulator` to bring the window forward.

### Android APK install fails with INSTALL_FAILED_TEST_ONLY
Add the `-t` flag: `adb install -t <path-to-apk>`

### Way app not listed in `agent-device apps`
The app may not be installed on this specific simulator/emulator. Use the install steps above. For iOS, make sure you are targeting the correct UDID (the iOS 26.1 simulator, not 26.2).

### Choosing the right iOS simulator
There are two sets of simulators (iOS 26.1 and 26.2). The Way app is pre-installed on the **iOS 26.1** iPhone 17 Pro (`EA2BF44C`). The iOS 26.2 version (`1C29C3E6`) does NOT have the app.

## Quick Reference — Copy-Paste Startup

```bash
# 1. Boot iOS
xcrun simctl boot EA2BF44C-98A8-48D0-A7CA-9E7C5BB5F06C 2>&1 || true
open -a Simulator

# 2. Boot Android
nohup /Users/ricardo/Library/Android/sdk/emulator/emulator -avd Pixel_9a -no-snapshot-load > /tmp/emu.log 2>&1 &
while [ "$(/Users/ricardo/Library/Android/sdk/platform-tools/adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do sleep 2; done
echo "Android ready"

# 3. Launch Way on iOS (default session)
agent-device open com.eatmyway.wayapp --platform ios --device "iPhone 17 Pro" --udid EA2BF44C-98A8-48D0-A7CA-9E7C5BB5F06C

# 4. Launch Way on Android (android session)
agent-device open com.way.android --platform android --serial emulator-5554 --session android

# 5. Baseline screenshots
agent-device screenshot /tmp/way-ios-baseline.png --session default
agent-device screenshot /tmp/way-android-baseline.png --session android
```
