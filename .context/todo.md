# Fix Plan/Spec Approval UI

**Problem:** When a plan or spec is approved, the entire page content is replaced with a grayed-out "Plan approved / You can close this tab" message. The user wants the full plan/spec to remain visible but in a read-only state with an approved header banner.

**Solution:** After approval, instead of replacing `document.body.innerHTML`, transition the viewer into an "approved" state that:
1. Shows a prominent "✓ APPROVED" banner at the top
2. Renders the full plan/spec content below (read-only)
3. Disables all editing, commenting, drag-and-drop, and interactive controls
4. Removes the footer action buttons (Approve/Decline/etc.)

## Plan

- [ ] **Plan Viewer** (`agent/extensions/lib/plan-viewer-html.ts`): Update the `sendResult` function's approved branch
  - Add CSS for `.approved-banner` header style (green accent, prominent)
  - Add CSS for `.approved-state` body class that disables all interactions
  - On approval: add `approved-state` class to body, insert approved banner, hide footer, disable checkboxes/editing/drag-and-drop, hide toggle bar
  - Keep content fully visible and scrollable (NOT grayed out)

- [ ] **Spec Viewer** (`agent/extensions/lib/spec-viewer-html.ts`): Update the `sendResult` function's approved branch
  - Add same `.approved-banner` CSS styling
  - Add `.approved-state` class that disables commenting, editing, step navigation
  - On approval: add approved banner, hide footer, disable comment popups and commentable hover effects
  - Keep all spec documents navigable (step bar still works for reading) but non-editable
  - Hide comment sidebar and toggle bar

- [ ] **Test both viewers** by opening them and verifying the approval flow
