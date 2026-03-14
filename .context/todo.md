# Plan: Build Disk Cleanup Web App — Scan & Delete Junk Files with AI Intelligence

## Context

The goal is to create a small, self-contained web application that helps clean up a macOS hard drive by finding and deleting temporary files, compiled artifacts, and archives. The app runs locally as a Node.js + Express server with a vanilla HTML/CSS/JS frontend.

The app integrates the **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) for AI intelligence — following the OAuth token pattern from the [specbook OAuth implementation](/Users/ricardo/Workshop/Github-Work/specbook/docs/oauth-token-implementation.md). The SDK's `query()` function automatically reads `CLAUDE_CODE_OAUTH_TOKEN` from the environment, using the user's Max Plan instead of billable API keys. When a scan completes, users can click "Analyze with AI" to get Claude's assessment of which files are safe to delete and personalized cleanup recommendations.

**OAuth Pattern (from specbook):**
- The SDK `query()` function is called with **no API key parameter** — it reads `CLAUDE_CODE_OAUTH_TOKEN` from the environment automatically
- This uses the Max Plan (no API costs)
- The `CLAUDE_CODE_OAUTH_TOKEN` is already set in the current environment

The app will scan user-specified directories (defaulting to `~`) for common junk file categories:

| Category | Patterns | Examples |
|----------|----------|---------|
| **Temp Files** | `*.tmp`, `*.temp`, `*.swp`, `*.swo`, `*.bak`, `*.old`, `.DS_Store`, `Thumbs.db`, `*.log` | System/editor temp files, stale logs |
| **Compiled/Build Artifacts** | `*.o`, `*.obj`, `*.pyc`, `*.pyo`, `*.class`, `__pycache__/`, `*.dSYM/`, `node_modules/`, `dist/`, `build/`, `.next/`, `target/` | Compiler outputs, package caches, build dirs |
| **Archives** | `*.zip`, `*.tar`, `*.tar.gz`, `*.tgz`, `*.rar`, `*.7z`, `*.bz2`, `*.xz`, `*.gz`, `*.dmg`, `*.iso` | Compressed files, disk images |

**Safety is critical** — the app will:
- Never auto-delete anything; the user must explicitly select and confirm
- Show a confirmation dialog before any deletion
- Skip system-protected directories (`/System`, `/Library`, `/usr`, etc.)
- Only scan directories the user explicitly provides
- Log all deletions for audit trail

The app will be created in a new `disk-cleanup/` directory at the project root.

---

## Phase 1: Backend — Express Server, Scan API & AI Analysis with OAuth

**Why:** The core value is scanning + AI-powered recommendations. We need the server, scan logic, and Agent SDK integration (with OAuth token pattern) together since the AI analysis depends on scan results.

**New file** → `disk-cleanup/package.json`
- Type: `"module"` (ESM — required by Agent SDK)
- Dependencies: `express`, `@anthropic-ai/claude-agent-sdk`
- Start script: `node server.js`

**New file** → `disk-cleanup/server.js`
- Express server on port 3456
- Serves static files from `public/`
- **Scan endpoints:**
  - `POST /api/scan` — accepts `{ directory, categories }`, recursively walks the directory tree, returns grouped results with file paths, sizes, and modified dates
  - `GET /api/default-dir` — returns the user's home directory
- **Delete endpoint:**
  - `POST /api/delete` — accepts `{ files: string[] }`, deletes selected files, returns success/failure per file, logs to `deletion-log.json`
- **AI Analysis endpoint (OAuth pattern):**
  - `POST /api/analyze` — accepts scan results summary, calls Agent SDK `query()` with NO API key (reads `CLAUDE_CODE_OAUTH_TOKEN` from env automatically — Max Plan, no cost). Streams Claude's response via SSE to the frontend. The prompt asks Claude to analyze the file list, categorize safety levels, and recommend what to delete.
  - Options: `{ allowedTools: [] }` (no tools needed — pure text analysis), `systemPrompt` set to disk cleanup expert persona
- File scanning logic:
  - Uses `fs.readdir` with `{ recursive: true }` for walking directories
  - Uses `fs.stat` for file sizes and modification dates
  - Skips protected system directories (`/System`, `/Library`, `/usr`, `/bin`, `/sbin`, `/private`)
  - Skips symlinks to prevent loops
  - Returns human-readable sizes (KB, MB, GB)
  - Groups results by category (temp, compiled, archives)
  - Max depth: 10 levels, max files: 10,000

---

## Phase 2: Frontend — UI for Scanning, AI Analysis, Reviewing & Deleting

**Why:** Users need a clear visual interface to browse results, get AI recommendations, select files, and trigger deletions safely.

**New file** → `disk-cleanup/public/index.html`
- Clean, modern single-page layout with dark theme
- **Header:** App title + disk space summary
- **Scan controls:** Directory input (pre-filled via `/api/default-dir`), category checkboxes (all checked by default), "Scan" button
- **Results area:** Grouped by category with expandable/collapsible sections
  - Each file: checkbox, name, path, size, last modified
  - "Select all / Deselect all" per category
  - Color-coded: orange=temp, blue=compiled, green=archives
- **AI Analysis panel:** "🤖 Analyze with AI" button
  - Streams Claude's response in a styled card with markdown-like formatting
  - Shows safety ratings, recommendations, estimated space savings
- **Action bar (sticky bottom):** "Delete Selected" button with count + total size
- **Confirmation modal:** Lists files to be deleted, requires explicit confirm
- **Progress/status:** Loading spinners during scan, delete, and AI analysis

**New file** → `disk-cleanup/public/style.css`
- CSS custom properties for dark theme
- Responsive flexbox/grid layout
- Category color coding
- Collapsible sections with smooth transitions
- Styled checkboxes, buttons, modals
- AI panel with subtle background, streaming text animation
- Progress bars and loading states
- Sticky action bar

**New file** → `disk-cleanup/public/app.js`
- `fetchDefaultDir()` — pre-fill directory input on load
- `scanDirectory()` — POST to `/api/scan`, render grouped results
- `analyzeWithAI()` — POST to `/api/analyze` with SSE streaming, render AI response
- `deleteSelected()` — POST to `/api/delete` after confirmation modal
- DOM rendering: category groups, file rows, checkboxes
- Select/deselect logic with running count + size totals
- Modal management (show/hide confirmation)
- Error handling with user-friendly messages
- Format helpers (file sizes, dates)

---

## Phase 3: Polish — Safety, Logging & UX Enhancements

**Why:** A disk cleanup tool must be safe and user-friendly — this phase adds guardrails and final polish.

**Modify** → `disk-cleanup/server.js`
- Add path validation — `fs.realpath` to resolve symlinks, reject paths outside scan root
- Add deletion audit log: append to `deletion-log.json` with `{ timestamp, path, size, success }`
- Add `GET /api/history` endpoint to serve deletion log
- Improve error messages for permission denied, file not found, etc.

**Modify** → `disk-cleanup/public/app.js`
- Add deletion history view (fetches `/api/history`, renders in collapsible panel)
- Add scan statistics display (time taken, files found, dirs scanned)
- Add keyboard shortcuts (Ctrl+A select all, Escape close modal)
- Improve error recovery for partial failures

**Modify** → `disk-cleanup/public/index.html`
- Add deletion history panel (collapsible, shows recent deletions)
- Add footer with scan statistics
- Add "Clear results" button

---

## Critical Files

| File | Action |
|------|--------|
| `disk-cleanup/package.json` | New |
| `disk-cleanup/server.js` | New → Modify (Phase 3 hardening) |
| `disk-cleanup/public/index.html` | New → Modify (Phase 3 history panel) |
| `disk-cleanup/public/style.css` | New |
| `disk-cleanup/public/app.js` | New → Modify (Phase 3 enhancements) |

## Reusable Components (no changes needed)

- **Node.js `fs/promises`** — recursive directory reading, file stats, unlinking
- **Node.js `path`** — cross-platform path handling
- **Node.js `os.homedir()`** — default scan directory
- **`@anthropic-ai/claude-agent-sdk` `query()`** — AI analysis via OAuth token (reads `CLAUDE_CODE_OAUTH_TOKEN` from env, no API key needed)

## Verification

1. `cd disk-cleanup && npm install && npm start` — server starts on port 3456
2. Open `http://localhost:3456` — UI loads with directory input defaulting to home dir
3. Click "Scan" on a small test directory — results appear grouped by category with correct sizes
4. Click "Analyze with AI" — Claude streams analysis using OAuth token (Max Plan, no cost)
5. Select some files and click "Delete" — confirmation modal appears, files are removed after confirm
6. Verify protected directories (`/System`, `/Library`) are skipped during scan
7. Check `deletion-log.json` records all deletions with timestamps
8. Check deletion history panel shows recent deletions
