---
name: reco-simulators
description: Boot and control both Reco app simulators (iOS + Android) side by side using agent-device CLI. Use when testing, comparing, inspecting, or capturing screens across both platforms. Invoke when user says "bring up simulators", "compare iOS and Android", "test both platforms", "take baseline screenshots", "visual parity check", or any task requiring simultaneous iOS and Android Reco app interaction.
allowed-tools: Bash(agent-device:*) Bash(xcrun:*) Bash(adb:*) Bash(open:*) Bash(find:*) Bash(npx:*) Read
---

# reco-simulators

Side-by-side iOS Simulator and Android Emulator control for the Reco app using the `agent-device` CLI.

## When to Use

- Bringing up both simulators for testing or visual comparison
- Capturing baseline screenshots across platforms
- Inspecting UI, flows, or behavior on both iOS and Android
- Verifying porting parity between iOS and Android Reco app
- Any task requiring simultaneous interaction with both platforms

## Device Inventory

### iOS Simulator

| Field | Value |
|-------|-------|
| Device | iPhone 17 Pro |
| UDID | `EA2BF44C-98A8-48D0-A7CA-9E7C5BB5F06C` |
| Runtime | iOS 26.1 |
| Bundle ID (Dev) | `com.recoapp.dev` |
| Bundle ID (Prod) | `com.recoapp` |
| agent-device session | `default` |

### Android Emulator

| Field | Value |
|-------|-------|
| AVD Name | `Pixel_9a` |
| Serial | `emulator-5554` |
| Package (Dev) | `com.recoapp.dev` |
| Package (Prod) | `com.reco.app` |
| agent-device session | `android` |

## Project Paths

| Project | Path |
|---------|------|
| Reco (source) | `/Users/ricardo/Workshop/GitHub/reco` |
| iOS workspace | `ios/` (Expo managed workflow) |
| Android workspace | `android/` (Expo managed workflow) |
| Build system | Expo CLI (`npx expo run:ios`, `npx expo run:android`) |

## Full Startup Sequence

Use this sequence to bring both simulators up from cold with the Reco app running.

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

### Step 4: Build and Launch Reco App on iOS

From `/Users/ricardo/Workshop/GitHub/reco`:

```bash
cd /Users/ricardo/Workshop/GitHub/reco
npx expo run:ios --device "iPhone 17 Pro"
```

This builds the Reco app and launches it on the iOS simulator. The Expo workflow handles all build and install steps automatically.

Alternatively, to use the dev or prod bundle ID explicitly:

```bash
npx expo run:ios --device "iPhone 17 Pro" --bundle-identifier com.recoapp.dev
```

### Step 5: Launch Reco App on Android

From the same directory:

```bash
cd /Users/ricardo/Workshop/GitHub/reco
npx expo run:android --device emulator-5554
```

This builds and launches Reco on the Android emulator.

### Step 6: Verify Apps Are Running

```bash
agent-device appstate --session default      # iOS
agent-device appstate --session android      # Android
```

### Step 7: Capture Baseline Screenshots

```bash
agent-device screenshot /tmp/reco-ios-baseline.png --session default
agent-device screenshot /tmp/reco-android-baseline.png --session android
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
agent-device screenshot /tmp/reco-ios-screen.png --session default
agent-device screenshot /tmp/reco-android-screen.png --session android
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
agent-device wait text "Some Text" --session default
agent-device wait text "Some Text" --session android
```

### Relaunch the App (Fresh State)

```bash
agent-device open com.recoapp.dev --session default --relaunch
agent-device open com.recoapp.dev --session android --relaunch
```

## Building and Installing Apps (Expo Workflow)

### iOS — Build and Install with Expo

From `/Users/ricardo/Workshop/GitHub/reco`:

```bash
npx expo run:ios --device "iPhone 17 Pro"
```

This command:
1. Builds the Reco app for iOS
2. Installs it on the iPhone 17 Pro simulator
3. Launches it automatically

To specify the bundle ID:

```bash
npx expo run:ios --device "iPhone 17 Pro" --bundle-identifier com.recoapp.dev
```

### Android — Build and Install with Expo

From `/Users/ricardo/Workshop/GitHub/reco`:

```bash
npx expo run:android --device emulator-5554
```

This command:
1. Builds the Reco app for Android
2. Installs it on the Pixel_9a emulator
3. Launches it automatically

To specify the package:

```bash
npx expo run:android --device emulator-5554
```

(The package is determined by the app.json configuration.)

## Checking If Reco App Is Installed

### iOS

```bash
# Check if bundle ID is installed
xcrun simctl openurl booted "reco://" 2>&1 || true
```

Or check the app list:

```bash
agent-device apps --session default | grep -i reco
```

### Android

```bash
# Check if package is installed
/Users/ricardo/Library/Android/sdk/platform-tools/adb shell pm list packages | grep recoapp
```

Or via agent-device:

```bash
agent-device apps --session android | grep -i reco
```

## Rebuilding Fresh (Full Clean Build)

### iOS

```bash
cd /Users/ricardo/Workshop/GitHub/reco
npx expo run:ios --device "iPhone 17 Pro" --clear
```

### Android

```bash
cd /Users/ricardo/Workshop/GitHub/reco
npx expo run:android --device emulator-5554 --clear
```

The `--clear` flag clears build cache before rebuilding.

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

### Expo build fails: "Could not find any connected device"
Verify both simulators are booted and visible:
```bash
xcrun simctl list devices
/Users/ricardo/Library/Android/sdk/platform-tools/adb devices
```

### agent-device says "No device named Pixel_9a"
The Android emulator is not fully booted yet, or agent-device cannot see it. Verify with `adb devices` and wait for boot to complete.

### Session bound to wrong platform
You will see: `Session "default" is bound to ios device...`. Use `--session android` for Android commands, or `agent-device close --session default` to release the binding.

### iOS simulator already booted (error 149)
Safe to ignore. The simulator is already running. Just `open -a Simulator` to bring the window forward.

### Reco app not listed in `agent-device apps`
The app may not be installed. Run `npx expo run:ios` or `npx expo run:android` again to rebuild and install.

### Build fails with "Unsupported platform"
Ensure you are in the `/Users/ricardo/Workshop/GitHub/reco` directory before running `npx expo run:ios` or `npx expo run:android`.

## Quick Reference — Copy-Paste Startup

```bash
# 1. Boot iOS
xcrun simctl boot EA2BF44C-98A8-48D0-A7CA-9E7C5BB5F06C 2>&1 || true
open -a Simulator

# 2. Boot Android
nohup /Users/ricardo/Library/Android/sdk/emulator/emulator -avd Pixel_9a -no-snapshot-load > /tmp/emu.log 2>&1 &
while [ "$(/Users/Ricardo/Library/Android/sdk/platform-tools/adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do sleep 2; done
echo "Android ready"

# 3. Build and launch Reco on iOS
cd /Users/ricardo/Workshop/GitHub/reco
npx expo run:ios --device "iPhone 17 Pro"

# 4. Build and launch Reco on Android
# (In a new terminal or after iOS build completes)
cd /Users/ricardo/Workshop/GitHub/reco
npx expo run:android --device emulator-5554

# 5. Baseline screenshots
agent-device screenshot /tmp/reco-ios-baseline.png --session default
agent-device screenshot /tmp/reco-android-baseline.png --session android
```
