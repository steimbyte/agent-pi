# Specification: Spec Viewer

## Goal

# Purple color/highlights are banned you may not use them

Build a new `show_spec` browser-based tool that presents a multi-page wizard for reviewing, annotating, and approving specifications at the end of SPEC mode — extending the plan viewer's design language with tabbed document navigation, Google Docs-style inline comment threads, and visual asset rendering.

## User Stories

- As a developer, I want to review my complete spec (spec.md, requirements, tasks, visuals) in a single cohesive browser view so I can approve or request changes without switching between files.
- As a developer, I want to add inline comments on specific sections of the spec so the agent receives structured, contextual feedback instead of me typing freeform corrections.

## Specific Requirements

### 1. New `show_spec` Extension + Tool

- New file `spec-viewer.ts` in `agent/extensions/` — separate extension from plan viewer
- Registers a `show_spec` tool with parameter `folder_path` (string, required) pointing to a spec folder (e.g. `context-os/specs/2025-06-25-feature/`)
- Optional `title` parameter (string) for the header display name
- On invocation: auto-discovers documents in the folder, starts an HTTP server on a random local port, opens the browser
- Blocks until user submits a result (approve or request-changes), then returns structured feedback to the agent
- Registers a `/spec` command as a shortcut (like `/plan` for the plan viewer)
- Uses `piRef.sendMessage()` with `deliverAs: "followUp"` + `triggerTurn: true` on approve (same pattern as plan viewer)

### 2. Folder Auto-Discovery and Document Ordering

- Scans the spec folder for known document types and organizes them into wizard steps
- Fixed step ordering: **Spec** → **Requirements** → **Tasks** → **Visuals** → **Other**
- Discovery rules:
  - `spec.md` in folder root → "Spec" step
  - `planning/requirements.md` → "Requirements" step
  - `planning/tasks.md` or any `tasks*.md` → "Tasks" step
  - `planning/visuals/` folder with files → "Visuals" step (images + HTML mockups)
  - Any other `.md` files in `planning/` → "Other" supporting docs step (grouped)
- Gracefully skip steps when files don't exist — minimum 1 document required
- If only `spec.md` exists, render as a single-page viewer (no step navigation)

### 3. Multi-Step Wizard Navigation

- Horizontal step bar below the header showing numbered steps with document names
- Active step highlighted with accent color, completed steps with checkmark, future steps dimmed
- Click any step to navigate directly — free navigation, not forced-linear
- Step bar shows: step number, short label (e.g. "1 Spec", "2 Requirements", "3 Tasks", "4 Visuals")
- Each step renders its markdown content independently in the main content area
- Current step state persists (scroll position, comments) when switching between steps
- Keyboard navigation: `←` / `→` arrows to move between steps

### 4. Google Docs-style Inline Comment Threads

- User can click on any heading (h1-h6) or paragraph to open a comment input
- Comment appears as a side-anchored card to the right of the content (or below on narrow screens)
- Each comment shows: user text, timestamp, which document and section it's anchored to
- Multiple comments on the same section form a thread
- Comments are persisted to `spec-comments.json` in the spec folder root
- Comment JSON structure: `{ "comments": [{ "id": string, "document": string, "sectionId": string, "sectionText": string, "text": string, "timestamp": string }] }`
- Visual indicators: sections with comments get a colored left border and a comment count badge
- Comments are deletable (click X on the comment card)
- Comment count shown in the header next to the step navigation

### 5. Visual Assets Rendering

- "Visuals" step scans `planning/visuals/` for image files (png, jpg, gif, webp, svg)
- Images displayed in a grid/gallery layout with filenames as captions
- HTML files in visuals folder rendered in sandboxed iframes for mockup preview
- Images served via the HTTP server with proper MIME types
- Clicking an image opens it in a larger lightbox overlay
- If no visual assets exist, the Visuals step is omitted entirely

### 6. HTTP Server and API Endpoints

- Same server pattern as plan viewer: `createServer` on `127.0.0.1`, random port
- Endpoints:
  - `GET /` — serves the full HTML page (self-contained, all CSS/JS inlined)
  - `GET /logo.png` — serves the agent logo
  - `GET /file?path=<relative>` — serves files from the spec folder (markdown, images, HTML)
  - `POST /result` — receives the user's action (`{ action: "approved" | "changes_requested", comments: [...], markdown_changes: {...} }`)
  - `POST /save` — saves comments to `spec-comments.json`
- File serving must be path-restricted to the spec folder (no directory traversal)

### 7. Approval / Request Changes Flow

- Footer has two primary actions: **Approve Spec** (green/success) and **Request Changes** (accent/primary)
- On **Approve**: sends `{ action: "approved" }` → agent receives confirmation and proceeds to implementation
- On **Request Changes**: sends `{ action: "changes_requested", comments: [...] }` → agent receives structured comment feedback
- Agent return format for request-changes includes formatted comment summary: `"Section: Requirements > Auth Provider\nComment: Should use OAuth2 not basic auth\n---\n..."`
- Close/decline (X button or Esc) treated as "closed without action" — same as plan viewer

### 8. HTML Generation (Self-Contained Page)

- New file `lib/spec-viewer-html.ts` with `generateSpecViewerHTML()` function
- Single self-contained HTML page with all CSS and JS inlined (no external deps except marked.js CDN)
- Reuses plan viewer's CSS variables, color palette, and font stack exactly
- Layout structure: Header → Step Navigation Bar → Content Area (scrollable) → Footer
- Responsive: step bar collapses to dropdown on narrow screens (<600px)
- Content area renders markdown with `marked.parse()` (same as plan viewer)
- All interactive behavior in inline `<script>` block (same pattern as plan viewer)

## Visual Design

Based on existing plan viewer design language. No separate mockups — extend the current dark theme:

- **Header**: Same layout as plan viewer — badge reads `SPEC` instead of `PLAN`, title from folder name, comment count instead of progress
- **Step Bar**: New element below header — horizontal pills/segments showing step labels, click to navigate
- **Content**: Same markdown rendering styles as plan viewer (headings, code, blockquotes, tables)
- **Comment Cards**: Floating cards anchored to right edge of content, subtle border, same surface/border colors
- **Footer**: Same pattern — left side has Copy/Save, right side has Close + primary action buttons
- **Visuals Step**: Image grid with 2-3 columns, dark surface backgrounds, subtle borders

## Existing Code to Leverage

**`plan-viewer.ts` — Extension structure and server pattern**
- HTTP server creation (`startViewerServer`), browser opening (`openBrowser`), result waiting pattern
- Tool registration with `pi.registerTool()`, command registration with `pi.registerCommand()`
- `piRef.sendMessage()` pattern for auto-continuing on approve
- `renderCall` / `renderResult` methods for TUI display
- Server cleanup on session shutdown

**`lib/plan-viewer-html.ts` — HTML template and CSS**
- Full CSS variable system (colors, fonts, spacing)
- Markdown rendering styles (`.markdown-body` class)
- Footer layout, button styles (`.btn`, `.btn-primary`, `.btn-success`, `.btn-ghost`)
- Toast notification system
- `marked.js` integration and configuration
- View toggle pattern (rendered vs raw) — reuse for step navigation

**`lib/plan-viewer-editor.ts` — Document parsing**
- `parseMarkdown()` / `serializeMarkdown()` functions for markdown processing
- `PlanItem` / `PlanDocument` types for structured document representation
- Question detection (`isQuestionItem`, `extractDefault`) patterns for comment detection

**`lib/completion-report-html.ts` — Multi-section HTML viewer**
- File-serving patterns for binary assets (images)
- Multi-section layout with expandable/collapsible sections
- MIME type detection for serving different file types

**`lib/output-box.ts` and `lib/themeMap.ts` — Shared utilities**
- `outputLine()` for TUI rendering
- `applyExtensionDefaults()` for session lifecycle
- Editing the spec markdown inline just like we acn in markdown mode for plan mode


## Out of Scope

- Real-time collaborative editing (multi-user) — this is a single-user review tool
- Version history or diff between spec versions
- Integration with external comment systems (GitHub Issues, Linear, etc.)
- Auto-generating tasks from the spec within the viewer (that's a separate workflow)
- PDF export or print styling
- Persistent comment history across spec revisions
- TUI-based spec viewer (browser-only, no in-terminal rendering)
- Drag-and-drop reordering of spec sections (unlike plan viewer checkboxes)
- Agent live-editing the spec while the viewer is open (static snapshot)
