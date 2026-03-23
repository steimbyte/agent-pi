---
name: qa-setup
description: >
  Verify and install all dependencies for the QA Automation skill package.
  Checks for agent-device, agent-browser, Node.js, iOS/Android tools, and
  the 'ws' WebSocket library. Installs missing tools automatically.
  Invoke when user says "check qa setup", "install qa tools", "verify qa dependencies",
  "set up qa automation", "prepare for testing", or any task requiring QA tool verification.
allowed-tools: Bash(agent-device:*) Bash(agent-browser:*) Bash(npm:*) Bash(npx:*) Bash(node:*) Bash(which:*) Bash(xcrun:*) Bash(brew:*) Read
---

# qa-setup

Dependency verification and installation for the QA Automation skill package. Ensures both **agent-device** (native app testing) and **agent-browser** (web app testing) are installed and functional, along with all supporting tools.

## What Gets Checked

| Dependency | Purpose | Auto-Install? |
|------------|---------|---------------|
| **agent-device** | Native iOS/Android simulator control, screenshots, gestures | ✅ `npm install -g agent-device` |
| **agent-browser** | Web browser automation, form filling, screenshots | ✅ `npm install -g agent-browser` |
| **Node.js** | Runtime for CDP WebSocket and JSON processing | ❌ Manual install required |
| **npm / npx** | Package management | ❌ Comes with Node.js |
| **ws** | WebSocket library for CDP connections | ✅ `npm install ws` |
| **Xcode / xcrun** | iOS Simulator management | ❌ Manual install (Mac App Store) |
| **adb** | Android emulator management | ❌ Manual install (Android Studio) |
| **Bash 4.0+** | Required for array support in test scripts | ❌ `brew install bash` |
| **curl** | HTTP requests for health checks | ❌ Usually pre-installed |
| **jq** | JSON processing (optional) | ❌ `brew install jq` |

## Usage

### Full check + auto-install
```bash
bash .pi/skills/qa-automation/install.sh
```

### Check only (don't install anything)
```bash
bash .pi/skills/qa-automation/install.sh --check
```

### Manual install commands
```bash
# Core tools
npm install -g agent-device
npm install -g agent-browser

# CDP dependency (in your project)
cd /path/to/your/project
npm install ws

# iOS tools
xcode-select --install

# Android tools
brew install android-platform-tools

# Optional
brew install jq
brew install bash  # If Bash < 4.0
```

## After Setup

1. **Configure**: Copy `qa.config.sh` and set your app-specific values:
   ```bash
   export APP_BUNDLE_ID="com.yourapp.dev"
   export PROJECT_DIR="/path/to/your/project"
   ```

2. **Verify**: Run the setup guard to check everything works:
   ```bash
   source .pi/skills/qa-automation/qa-scroll/lib/setup-guard.sh
   run_setup_guard
   ```

3. **Test**: Run an example test flow:
   ```bash
   bash .pi/skills/qa-automation/qa-scroll/run.sh
   ```

## Architecture

The QA Automation package uses a **dual-driver architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    QA Automation Skills                       │
├──────────────────────┬──────────────────────────────────────┤
│  Native App Testing  │       Web App Testing                │
│                      │                                       │
│  ┌──────────────┐    │    ┌──────────────┐                  │
│  │ agent-device  │    │    │ agent-browser │                  │
│  │              │    │    │               │                  │
│  │ • Screenshots │    │    │ • Screenshots │                  │
│  │ • Gestures    │    │    │ • Click/Fill  │                  │
│  │ • A11y tree   │    │    │ • A11y tree   │                  │
│  │ • App launch  │    │    │ • Navigation  │                  │
│  └──────┬───────┘    │    └──────┬────────┘                  │
│         │            │           │                            │
│  ┌──────▼───────┐    │    ┌──────▼────────┐                  │
│  │ CDP (Hermes)  │    │    │ Browser DOM    │                  │
│  │              │    │    │               │                  │
│  │ • JS eval     │    │    │ • JS eval     │                  │
│  │ • Navigation  │    │    │ • State check │                  │
│  │ • State query │    │    │ • Network     │                  │
│  │ • Debug hooks │    │    │ • Cookies     │                  │
│  └──────────────┘    │    └───────────────┘                  │
└──────────────────────┴──────────────────────────────────────┘
```

Both drivers are required for full functionality. agent-device handles the physical device/simulator layer, while CDP (or agent-browser for web) handles the application runtime layer.
