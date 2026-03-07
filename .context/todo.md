# Verification and Implementation Plan 

## Remove commander dependcey

- [x] Inspect the current repo to identify where the Pi extension and Commander app/file-viewer implementations live.
- [x] Compare current code paths for `commander_session file:open` and the Commander app file viewer to determine whether the old external viewer was replaced by an in-app local web overlay.
- [x] Check git status and modified files in both likely directories to see where the recent file-viewer changes actually landed.
- [x] Summarize the result with concrete evidence: whether the replacement exists, what is still using MCP, and whether edits appear to be in the intended repo.
- [ ] The goal is to remove the dep on commander for the file viewer and instead copy our plan viewer/ spec viewer and use this as the base for a file viewer/editor light wight to open files from the cli directly
  - [x] Review existing `plan-viewer` / `spec-viewer` patterns and identify the minimal reusable structure.
  - [x] Implement a native `show_file` viewer/editor tool in `agent/extensions`.
  - [x] Add the supporting HTML generator for the new local file viewer.
  - [x] Update prompts/docs to reference the local file viewer where safe and appropriate.
  - [x] Verify the new flow with focused tests or inspection.
  - [ ] Present completion report.
