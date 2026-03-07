# Spec Viewer — Requirements

## Summary

A new `show_spec` tool and browser-based multi-page spec viewer for reviewing, annotating, and approving specifications at the end of SPEC mode. Extends the plan viewer's design language into a richer multi-document experience.

## Confirmed Requirements

### 1. New `show_spec` Tool
- Separate tool from `show_plan` — not a new mode
- Takes a **folder path** to a spec folder (e.g., `context-os/specs/2025-06-25-feature/`)
- Auto-discovers documents inside the folder
- Returns structured feedback (approval + comments) back to the agent

### 2. Multi-Step Wizard Layout
- Multi-page/step layout — user can switch between documents like a wizard
- Primary documents: **Spec** (`spec.md`), **Requirements** (`planning/requirements.md`), **Tasks** (if generated)
- Step indicators/navigation showing which document you're viewing
- Not tabs exactly — more like a wizard where you can navigate freely between steps

### 3. Google Docs-style Inline Comments
- User can click on any section/paragraph to add a comment thread
- Comments are saved to `spec-comments.json` in the spec folder
- Comments returned to the agent as structured feedback when requesting changes
- Visual indicator showing which sections have comments
- Comment threads (not just single comments)

### 4. Approval Flow
- Same pattern as plan viewer: **Approve** or **Request Changes**
- On approve: auto-send follow-up message to agent to proceed
- On request changes: return all comments as structured feedback to the agent
- Modified state tracking (same as plan viewer)

### 5. Visual Assets Support
- Display images from `planning/visuals/` — dedicated **Visuals** step/page
- Support HTML rendering of mockups (inline HTML files)
- Images displayed inline when referenced in spec markdown
- Serve image files from the spec folder via the HTTP server

### 6. Consistent Design Language
- Same dark theme and CSS variables as plan viewer
- Same font stack, header/footer pattern
- Extended with wizard navigation bar and comment system
- Same logo, badges, and modified-state indicators

### 7. Folder Auto-Discovery
- Scan the spec folder for known document types
- Intelligently order: Spec → Requirements → Tasks → Visuals → Other supporting docs
- Gracefully handle missing documents (not all spec folders will have all files)

## User's Key Phrases
- "multi step like a wizard"
- "switch between documents spec requirements tasks"
- "Google Docs-style comment threads"
- "even html rendering and mockups"
- "based on our existing plan viewer"
