# Swagbucks Report Viewer Upgrade Plan

## Objective
Upgrade the Swagbucks App Review & Sentiment Validation report to use a proper browser-based viewer (like plan-viewer and spec-viewer), and ensure `/swagbucks` shows a setup/config page first before generating the report.

---

## Current State Analysis

### What exists today:
- **`agent/skills/swagbucks/setup.html`** (793 lines) — A setup page with configuration controls (platform selection, review count, date range, sentiment thresholds, output format)
- **`agent/skills/swagbucks/SKILL.md`** (232 lines) — Skill definition describing the Swagbucks app review & sentiment validation workflow
- **`agent/skills/swagbucks/templates/report-template.md`** (154 lines) — Markdown template for generating the final report
- **`agent/skills/swagbucks/references/`** — Reference docs for data extraction, reddit scraping, and sentiment analysis
- **No TypeScript extension** — Unlike plan-viewer, spec-viewer, and completion-report, there is no `swagbucks-viewer.ts` or `swagbucks-viewer-html.ts`

### What plan-viewer and spec-viewer have (our design targets):
- **Extension entry point** (`plan-viewer.ts`, `spec-viewer.ts`) — Registers the tool, handles the HTTP server, opens the browser
- **HTML template generator** (`plan-viewer-html.ts`, `spec-viewer-html.ts`) — Full HTML/CSS/JS single-page app with:
  - Dark theme with gradient accents (purple/blue palette)
  - Glass-morphism cards with backdrop-filter blur
  - Professional header with branding
  - Responsive layout
  - Interactive elements (checkboxes, editing, navigation)
  - WebSocket or polling for live updates
  - Action buttons (Approve/Decline, Save, etc.)
  - Consistent design language across all viewers

---

## Plan

### Phase 1: Create the Swagbucks Viewer Extension
> Build the TypeScript extension infrastructure to register `show_swagbucks` as a tool

- [ ] **1.1** Create `agent/extensions/swagbucks-viewer.ts` — Extension entry point
  - Register as a local viewer tool (similar to plan-viewer.ts / spec-viewer.ts)
  - Accept parameters: `report_data` (the generated report content), `config` (setup options)
  - Spin up a local HTTP server, serve the HTML, and open the browser
  - Support the two-phase flow: setup page first, then report display

- [ ] **1.2** Create `agent/extensions/lib/swagbucks-viewer-html.ts` — HTML template generator
  - Match the design language of plan-viewer and spec-viewer (dark theme, glass cards, gradients)
  - Two views within the same page:
    1. **Setup View** — Configuration controls (migrated from existing setup.html but restyled to match)
    2. **Report View** — Rich formatted display of the sentiment analysis report
  - Include the standard Pi branding header
  - Add interactive elements: expandable review cards, sentiment charts, filtering

### Phase 2: Redesign the Setup Page
> Restyle the existing setup.html controls to match the plan-viewer/spec-viewer design system

- [ ] **2.1** Migrate setup controls into the new viewer design
  - Platform selection (App Store, Google Play, Reddit, Trustpilot)
  - Review count slider / input
  - Date range picker
  - Sentiment threshold configuration
  - Output format selection
  - "Generate Report" action button styled like plan-viewer's Approve button

- [ ] **2.2** Add a configuration summary panel
  - Show selected options in a glass card before running
  - "Start Analysis" button that posts config back to the CLI via the API endpoint

### Phase 3: Build the Report Display View
> Create a rich, interactive report view matching the viewer design patterns

- [ ] **3.1** Design report sections as glass-morphism cards
  - Executive Summary card
  - Sentiment Distribution (with visual bar/chart)
  - Top Positive Reviews (expandable cards)
  - Top Negative Reviews (expandable cards)
  - Key Themes & Topics
  - Platform Comparison (if multi-platform)
  - Recommendations card

- [ ] **3.2** Add interactive features
  - Filter reviews by sentiment score
  - Expand/collapse individual review details
  - Copy report as markdown
  - Export/save report

### Phase 4: Wire Up the /swagbucks Command Flow
> Ensure the `/swagbucks` slash command triggers the setup page first

- [ ] **4.1** Update the skill definition or command handler
  - When `/swagbucks` is invoked, call `show_swagbucks` with setup mode
  - Setup page opens in browser
  - User configures options and clicks "Generate Report"
  - Config is sent back to the CLI
  - CLI runs the analysis and calls `show_swagbucks` again with report data
  - Report viewer opens (or updates in place)

- [ ] **4.2** Add the tool registration to the extension system
  - Ensure `show_swagbucks` appears in the tool registry
  - Wire up proper parameter handling

### Phase 5: Testing & Polish
- [ ] **5.1** Test the full flow: `/swagbucks` -> setup page -> generate -> report view
- [ ] **5.2** Verify visual consistency with plan-viewer and spec-viewer
- [ ] **5.3** Test responsive layout (mobile, tablet, desktop)
- [ ] Present completion report

---

## Key Design Decisions

1. **Single viewer, two modes** — The swagbucks viewer will handle both setup and report display in one extension, switching views based on the mode parameter
2. **Match existing patterns exactly** — Use the same HTTP server approach, same CSS variables, same glass-card design from plan-viewer-html.ts and spec-viewer-html.ts
3. **Setup-first flow** — `/swagbucks` always opens the setup page first so the user can control the report parameters before any scraping/analysis begins
4. **Report data format** — The report will be passed as structured JSON (not just markdown), enabling rich interactive display with charts and filters

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `agent/extensions/swagbucks-viewer.ts` | **CREATE** | Extension entry point |
| `agent/extensions/lib/swagbucks-viewer-html.ts` | **CREATE** | HTML template generator |
| `agent/skills/swagbucks/setup.html` | **UPDATE** | Restyle to match viewer design (or replace with new viewer) |
| `agent/skills/swagbucks/SKILL.md` | **UPDATE** | Reference the new viewer in the workflow |
| `agent/skills/swagbucks/templates/report-template.md` | **UPDATE** | Align template with new report structure |
