# Raw Idea: Spec Viewer

## User's Request

We have SPEC mode where we create a specification document. At the END of the spec process, we need to show a new **Spec Viewer** — similar to the existing Plan Viewer but designed for multi-page specs.

## Key Points

- **Multi-page viewer**: Supports multiple documents — requirements spec, tasks, and possible other supporting docs
- **Browser-based**: Works like plan viewer via web browser window
- **Rich interaction**: Allow questions/notes/comments on sections — like plan viewer but richer
- **End-of-spec workflow**: Presented at Phase 4 of SPEC mode as the approval/review step

## Context

- Existing `show_plan` tool opens a browser-based viewer for single markdown files
- Plan viewer supports "plan" mode (approve/edit/checkboxes/reorder) and "questions" mode (inline answers)
- Spec mode currently uses `commander_session file:open` or just prints the spec path
- A spec typically consists of:
  - `spec.md` — the main spec document
  - `planning/requirements.md` — gathered requirements
  - `planning/questions.md` — Q&A from shaping
  - `planning/initialization.md` — raw idea
  - `planning/visuals/` — mockup images
  - `implementation/` — implementation artifacts
