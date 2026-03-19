# Plan: Install agent-browser Skill — Local Browser for Localhost and Remote Testing

## Context

The project has a `web_test` tool (registered as an extension at `agent/extensions/web-test.ts`) that uses **Cloudflare Browser Rendering** — a remote service that deploys a Cloudflare Worker to take screenshots, extract content, and run a11y audits. Because it's a remote service, **it cannot access localhost or local network URLs** — it can only reach publicly-accessible websites. The agent currently has no way to test localhost dev servers, local web apps, or do interactive browser automation like form filling, clicking, scrolling, etc.

# Also rename the skil from web_test to web_remote and our new one to web_local

The `agent-browser` CLI tool (v0.21.2, available on npm) is a Playwright-based **local** headless browser that runs directly on the machine. It can access localhost, fill forms, click buttons, take screenshots, manage sessions, and do everything a real browser can do. A comprehensive skill already exists in the repo at `agent/skills/agent-browser/` with a well-written `SKILL.md`, 7 reference documents, and 3 template scripts. The skill has also already been copied to `~/.pi/agent/skills/agent-browser/` — however, the underlying `agent-browser` CLI binary is **broken** (the npm global install was removed, leaving a dangling symlink at `/Users/ricardo/.nvm/versions/node/v20.19.5/bin/agent-browser`).

The critical gap: The agent's SKILL.md does not clearly warn against using `web_test` for localhost testing, and the `agent-browser` binary itself needs to be reinstalled. The skill also needs a clear directive about when to use `agent-browser` vs `web_test`.

**Current state:**
- `web_test` tool: Working, remote-only (Cloudflare Worker), registered as Pi extension
- `agent-browser` CLI: Broken symlink, needs `npm install -g agent-browser`
- `agent-browser` skill: Fully written in repo at `agent/skills/agent-browser/` and copied to `~/.pi/agent/skills/agent-browser/`
- Playwright browsers: Unknown if installed (need `agent-browser install` after CLI install)

**What needs to happen:**
1. Reinstall the `agent-browser` CLI globally
2. Install Playwright browser binaries
3. Update the SKILL.md to clearly distinguish local vs remote browser capabilities
4. Add a "when to use" section that explicitly tells the agent NOT to use `web_test` for localhost
5. Sync the updated skill to `~/.pi/agent/skills/agent-browser/`
6. Verify everything works end-to-end

---

## Phase 1: Reinstall agent-browser CLI + Browser Binaries

**Why:** The CLI binary is a broken symlink. Without a working binary, the entire skill is useless.

**Run commands:**
- `npm install -g agent-browser` — reinstall the CLI globally
- `agent-browser install` — install Playwright Chromium binary
- `agent-browser --version` — verify installation

---

## Phase 2: Update SKILL.md with Localhost Guidance + web_test Warning

**Why:** The agent must clearly understand that `web_test` is a remote service that CANNOT reach localhost, and that `agent-browser` is the ONLY tool for local testing. Without this explicit guidance, the agent will default to `web_test` and fail on localhost URLs.

**Modify** → `agent/skills/agent-browser/SKILL.md`
- Add a prominent "IMPORTANT" section at the top, right after the frontmatter and before "Core Workflow"
- Title: "When to Use This Skill (IMPORTANT)"
- Content must cover:
  - `agent-browser` is a LOCAL browser — it runs on this machine and can reach localhost, 127.0.0.1, local network IPs, and any remote URL
  - `web_test` tool is a REMOTE service (Cloudflare Browser Rendering) — it CANNOT access localhost, 127.0.0.1, or any local network address. Do NOT use `web_test` for localhost testing.
  - Use `agent-browser` for: localhost testing, form automation, multi-step workflows, interactive testing, screenshots of local dev servers, any URL
  - Use `web_test` for: quick remote-only screenshots and a11y audits of publicly-accessible URLs (when no interaction is needed)
- Update the description in frontmatter to mention localhost capability explicitly

**Modify** → `agent/skills/agent-browser/references/commands.md`  
- No changes needed (already comprehensive)

---

## Phase 3: Sync Updated Skill to Global Location + Verify

**Why:** The skill at `~/.pi/agent/skills/agent-browser/` is what Pi actually loads. We need to sync our updated version there and verify the full chain works.

**Run commands:**
- Copy updated skill from `agent/skills/agent-browser/` to `~/.pi/agent/skills/agent-browser/`
- Verify: `agent-browser open http://localhost:3000` or `agent-browser open https://example.com` + `agent-browser snapshot -i` + `agent-browser close`
- Verify skill files: `ls -R ~/.pi/agent/skills/agent-browser/`

---

## Critical Files

| File | Action |
|------|--------|
| `agent/skills/agent-browser/SKILL.md` | Modify (add localhost guidance + web_test warning) |
| `~/.pi/agent/skills/agent-browser/SKILL.md` | Sync (copy from repo) |
| `~/.pi/agent/skills/agent-browser/references/*` | Sync (copy from repo) |
| `~/.pi/agent/skills/agent-browser/templates/*` | Sync (copy from repo) |

## Reusable Components (no changes needed)

- **references/commands.md** — Full command reference, already comprehensive
- **references/web-search.md** — Web search patterns, already written
- **references/session-management.md** — Session isolation patterns
- **references/authentication.md** — Auth flow patterns
- **references/snapshot-refs.md** — Ref lifecycle documentation
- **references/video-recording.md** — Recording workflows
- **references/proxy-support.md** — Proxy configuration
- **templates/*.sh** — Three ready-to-use automation scripts

## Verification

1. `agent-browser --version` returns 0.21.2 (or current)
2. `agent-browser open https://example.com && agent-browser snapshot -i && agent-browser close` succeeds
3. `~/.pi/agent/skills/agent-browser/SKILL.md` contains the "When to Use" section with localhost guidance
4. `~/.pi/agent/skills/agent-browser/SKILL.md` contains explicit warning about NOT using `web_test` for localhost
5. Skill frontmatter description mentions localhost capability
6. All 7 reference files present in `~/.pi/agent/skills/agent-browser/references/`
7. All 3 template scripts present in `~/.pi/agent/skills/agent-browser/templates/`
