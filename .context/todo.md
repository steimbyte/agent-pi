# Implementation Plan

- [x] Add a small shared viewer session registry to track the currently open browser viewer and close it programmatically.
- [x] Update `show_file`, `show_plan`, `show_spec`, and `show_report` to register/unregister active viewers and print a CLI-visible close hint when opened.
- [x] Add a CLI command/tool entry point to close the active viewer from the terminal, returning a sensible result for each viewer type.
- [x] Verify TypeScript/build health and confirm each viewer now supports browser-close and CLI-close flows without hanging.

## Verification

- `bunx tsc --noEmit` from repo root and `agent/` only showed TypeScript help because this repo currently has no `tsconfig.json`.
- Reviewed the diff to confirm all four viewers now register themselves and can be closed through the shared `close_viewer` / `/close-viewer` path.
