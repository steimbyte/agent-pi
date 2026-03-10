# Corrective Plan: Real CLI Output for Toolkit Agents

## Goal
Make toolkit agents invoke the actual installed CLI applications so the widget shows real shell output from tools like Cursor, Codex, Droid, Gemini, etc., instead of synthetic filler/completion text.

## Problem Confirmed
- The current toolkit path still routes through `spawnToolkitWorker` in `agent/extensions/lib/toolkit-cli.ts`.
- That helper is still spawning `pi`, not the real installed CLI binaries.
- As a result, the widget is rendering prompt-completion text instead of true terminal output from the underlying apps.

## Plan
- [ ] Refactor `agent/extensions/lib/toolkit-cli.ts` so toolkit agents resolve to real CLI commands/binaries instead of spawning `pi` for toolkit execution.
- [ ] Introduce a clear per-toolkit-agent command mapping and execution strategy for installed CLIs like `cursor-agent`, `codex`, `droid`, `gemini`, `qwen`, `opencode`, `groq`, and `crush`.
- [ ] Stream real stdout/stderr from those child processes into the existing widget update path so the preview lines come from actual shell output.
- [ ] Preserve safe fallback/error behavior when a CLI is missing or exits unexpectedly.
- [ ] Verify with visible tests that at least `cursor-agent`, `codex-agent`, and `droid-agent` show real CLI-driven output rather than synthetic placeholder text.
- [ ] These changes should ONLY affect the toolkit cli agents not our normal agents like scout, reviewer, etc

## Notes
- This is a behavior fix, not just a styling fix.
- The terminal preview must come from the underlying app process output.
- Keep the current widget layout, but feed it real shell output.
