# OAuth Environment Variable Provider

## Overview

The `oauth-provider` extension replaces Pi's built-in browser-based OAuth login flow with a simpler environment-variable-based approach. Instead of running `/login`, opening a browser, completing PKCE auth, and storing tokens in `auth.json`, you set a single environment variable and you're done.

## Why?

The built-in OAuth flow:
- Requires opening a browser for every login
- Tokens expire and need frequent re-authentication
- Stores sensitive credentials in `auth.json` on disk
- Creates extra API requests for token refresh

The env-var approach:
- Set once in your shell profile — never login again
- No browser popups
- Token managed externally (Claude Code handles rotation)
- Fewer API requests (no refresh dance)

## Setup

### 1. Get Your OAuth Token

The easiest way to get a `CLAUDE_CODE_OAUTH_TOKEN` is from Claude Code (the VS Code extension or CLI). When you authenticate with Claude Code using your Max Plan, it creates this token.

You can also obtain one from the [Anthropic Console](https://console.anthropic.com/).

### 2. Set the Environment Variable

Add to your `~/.zshrc` (macOS) or `~/.bashrc` (Linux):

```bash
export CLAUDE_CODE_OAUTH_TOKEN="your-token-here"
```

Then reload your shell config.

### 3. Clear Old Credentials (Optional)

If you previously used `/login`, clear those credentials so only the env-var auth is used:

```
/auth-logout
```

### 4. Verify

```
/auth-status
```

Should show:

```
═══ Authentication Status ═══

✅ Env var auth ACTIVE
   Source:  CLAUDE_CODE_OAUTH_TOKEN
   Token:   sk-ant-oa...xyz4
   Method:  Environment variable (no login required)

📄 auth.json: No anthropic entry
```

## Environment Variables

| Variable | Priority | Description |
|----------|----------|-------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | Primary | Standard Claude Code OAuth token |
| `PI_CLAUDE_OAUTH_TOKEN` | Fallback | Pi-specific alias (if you want separation) |

The extension checks `CLAUDE_CODE_OAUTH_TOKEN` first, then falls back to `PI_CLAUDE_OAUTH_TOKEN`.

## Commands

### `/auth-status`

Shows the current authentication state:
- Whether env-var auth is active and which variable is set
- Whether auth.json has an Anthropic entry (and if it's expired)
- Which method takes priority

### `/auth-logout`

Removes the `anthropic` entry from `auth.json`. Use this to clean up after migrating from the built-in OAuth flow to env-var auth. Asks for confirmation before removing.

### `/auth-clear`

Alias for `/auth-logout`.

## How It Works

The extension uses Pi's `registerProvider()` API to override the built-in Anthropic provider:

1. **On load**: reads the OAuth token from the environment
2. **If token exists**: calls `pi.registerProvider("anthropic", { oauth: { ... } })` which replaces the built-in Anthropic OAuth provider
3. **On API calls**: the provider's `getApiKey()` returns the env-var token directly
4. **On "refresh"**: re-reads the env var (picks up any changes without restart)
5. **On "login"**: returns synthetic credentials from the env var (no browser needed)

## Troubleshooting

### "Could not resolve authentication method"

The env var isn't set. Verify it's present in your shell environment, set it in your shell profile, and restart Pi.

### Token stopped working

Your token may have expired. Get a fresh one from Claude Code:
1. Open Claude Code (VS Code or CLI)
2. Authenticate with your Max Plan
3. Copy the new token value
4. Update your shell profile
5. Restart Pi

### Still being prompted to login

The old auth.json entry may be interfering. Run:
```
/auth-logout
```

Then restart Pi.

### Want to go back to built-in OAuth

1. Remove `"extensions/oauth-provider.ts"` from `agent/settings.json` packages
2. Restart Pi
3. Run `/login` to authenticate via browser

## Technical Details

- Extension file: `agent/extensions/oauth-provider.ts`
- Loaded first in packages list to ensure auth is ready before other extensions
- Uses `import.meta.dirname` to locate `auth.json` relative to the extension
- Token is re-read from env on every `refreshToken()` call (no stale cache)
- Sets a 1-year synthetic expiry to prevent unnecessary refresh attempts
