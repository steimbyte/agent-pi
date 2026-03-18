# Plan: Test Plan Viewer — Verify Interactive Review Experience

## Context

This is a test plan to verify the plan viewer is working correctly. The plan viewer should render markdown with checkboxes, phases, tables, and allow the user to review, edit, reorder, and approve or decline the plan.

We want to confirm that all visual elements render properly — headings, code blocks, tables, checkboxes, and narrative text. No actual code changes will be made.

---

## Phase 1: Verify Markdown Rendering

**Why:** Ensure all markdown elements display correctly in the viewer.

- [ ] Code blocks render with syntax highlighting
- [ ] Headings render at correct sizes (H1, H2, H3)
- [ ] Tables render with proper alignment
- [ ] Bold, italic, and inline code render correctly

**Reference file** → `.context/todo.md`
- This file itself is the test artifact

---

## Phase 2: Test Interactive Features

**Why:** Confirm the viewer supports user interaction — editing, reordering, and toggling checkboxes.

- [ ] Checkboxes can be toggled on/off
- [ ] Plan items can be reordered via drag or controls
- [ ] User can edit text inline
- [ ] Approve and Decline buttons are functional

---

## Phase 3: Test Approval Flow

**Why:** Verify that approving or declining sends the correct signal back to the CLI.

- [ ] Clicking "Approve" sends an approval message
- [ ] Clicking "Decline" prompts for feedback
- [ ] The CLI receives and processes the response

---

## Critical Files

| File | Action |
|------|--------|
| `.context/todo.md` | New (this test plan) |

## Reusable Components (no changes needed)

- **Plan Viewer** — the interactive markdown viewer overlay being tested

## Verification

1. Open the plan viewer and confirm all sections render
2. Toggle a checkbox and verify it updates
3. Click Approve and confirm the CLI receives the approval
