# Fix Plan Viewer False Negative

## Problem
`show_plan` returns "Plan viewer closed without approval" even though the page loads fine.
Introduced when viewer-session.ts was added (commit 53a3654).

## Root Cause
`notifyViewerOpen()` calls `ctx.ui.addMessage("assistant", ...)` DURING tool execution,
which injects a message into the conversation while `waitForResult()` is still blocking.
This likely causes the framework to misinterpret the tool state.

## Plan

- [x] 1. Explore codebase and identify root cause
- [ ] 2. Fix `notifyViewerOpen` — remove `addMessage` call, keep only `ctx.ui.notify`
- [ ] 3. Add abort signal handling to `waitForResult()` so the tool responds to framework cancellation
- [ ] 4. Apply same fixes to completion-report.ts and spec-viewer.ts
- [ ] 5. Remove Commander file:open references from mode-prompts.ts
- [ ] 6. Test by building the project
