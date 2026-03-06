# Completion Report Viewer

A summary/completion report overlay that opens in the browser (same style as the Plan Viewer). Shows work done, files changed with diffs, and the ability to rollback changes.

## Architecture

- **New extension file**: `agent/extensions/completion-report.ts` — registers the `show_report` tool and `/report` command
- **New HTML generator**: `agent/extensions/lib/completion-report-html.ts` — self-contained HTML page (same pattern as `plan-viewer-html.ts`)
- **Reuses**: HTTP server pattern, browser opener, theme system from `plan-viewer.ts`

## Implementation Plan

- [ ] **1. Create `completion-report-html.ts`** — The self-contained HTML template
  - Same CSS design system as plan-viewer (dark theme, same vars, header, footer)
  - **Summary Section**: Title, task count, duration, status badges
  - **Files Changed Section**: Collapsible list of files with change stats (+/- lines)
  - **Diff Viewer**: Syntax-highlighted unified diffs per file (expand/collapse each)
  - **Rollback Section**: Per-file rollback buttons + "Rollback All" in footer
  - Rollback sends POST to server with file paths to revert
  - Copy report and Save to desktop buttons (reuse pattern)

- [ ] **2. Create `completion-report.ts`** — The extension file
  - `show_report` tool: accepts `title`, optional `summary` markdown, optional `base_ref` (git ref to diff against, defaults to HEAD~1 or auto-detect)
  - Gathers git diff data: `git diff --stat`, `git diff` for full diffs, file list
  - Gathers task completion data from `.context/todo.md` if it exists
  - Starts HTTP server (same pattern as plan-viewer), serves HTML + handles rollback POST
  - `/rollback` endpoint: runs `git checkout <ref> -- <file>` for selected files
  - `/report` command: opens report for current session's changes
  - Registers in theme map

- [ ] **3. Wire up the extension**
  - Add `completion-report` to `themeMap.ts` THEME_MAP
  - Add tool description to system prompt in `mode-prompts.ts` if needed

- [ ] **4. Test the viewer**
  - Run the extension and verify the browser opens with the report
  - Test diff display, file collapsing, rollback per-file and rollback-all
  - Verify the same look and feel as the plan viewer

## Key Design Decisions

- **Git-based diffs**: Uses `git diff` against a base ref (auto-detects merge-base or uses stash)
- **Rollback = git checkout**: Safe rollback via `git checkout <base_ref> -- <file>` per file
- **No raw markdown view**: As requested — rendered-only report
- **Self-contained HTML**: Single file, no external deps except marked.js CDN (same as plan viewer)
- **Data flow**: Extension gathers git data → serializes into JSON → embeds in HTML → browser renders
