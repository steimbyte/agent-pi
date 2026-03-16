# Plan: Add Email Button to Completion Report Viewer & Wire to send_email Backend

## Context

The completion report viewer (`agent/extensions/lib/completion-report-html.ts`) currently has a footer toolbar with Copy, Save, Standalone, Rollback All, and Done buttons. There is **no email functionality** in the viewer — the `send_email.ts` extension we created is a standalone tool the agent can call programmatically, but it's not connected to the report viewer's browser UI.

The goal is to add an **Email button** to the report viewer toolbar that:
1. Opens a small modal dialog asking for the recipient email address (pre-filled with the user's default from settings)
2. Posts to a new `/email` endpoint on the report viewer's local Express server
3. The server calls the Resend API directly (same logic as `send-email.ts`) to send the report as a formatted HTML email
4. Shows success/error toast feedback in the viewer

This means changes to three files:
- `completion-report-html.ts` — Add email button, modal dialog, and client-side JS
- `completion-report.ts` — Add `/email` POST route on the server
- `send-email.ts` — Export the `sendViaResend` and `buildReportHtml` functions so they can be reused

---

## Phase 1: Export Reusable Email Functions from send-email.ts

**Why:** The report server needs to call the same Resend API logic. Exporting these functions avoids code duplication.

**Modify** → `agent/extensions/send-email.ts`
- Export `sendViaResend()` function
- Export `buildReportHtml()` function  
- Export `escapeHtml()` helper
- Export `getUserEmail()` for pre-filling the recipient field
- Export `getResendApiKey()` for checking availability

---

## Phase 2: Add /email POST Route to Report Server

**Why:** The browser viewer needs a backend endpoint to send emails through.

**Modify** → `agent/extensions/completion-report.ts`
- Import the exported functions from `send-email.ts`
- Add `POST /email` route that:
  - Accepts `{ to: string }` from the viewer
  - Builds report HTML using `buildReportHtml()` with the current report data
  - Calls `sendViaResend()` with the Resend API key
  - Returns `{ ok: true, messageId }` or `{ ok: false, error }`
- Add `GET /email-config` route that returns:
  - `{ available: boolean, defaultEmail?: string }` — so the viewer knows if email is configured

---

## Phase 3: Add Email Button, Modal & JS to Report Viewer HTML

**Why:** Give users a visual email button in the toolbar alongside Copy/Save/Standalone.

**Modify** → `agent/extensions/lib/completion-report-html.ts`
- Add email button to footer toolbar (envelope icon, between Standalone and Rollback All)
- Add email modal dialog HTML (input field for recipient, Send/Cancel buttons)
- Add CSS for email modal (reuse existing modal styles from rollback modal)
- Add `emailReport()` JS function:
  - On page load, fetch `/email-config` to check if Resend is available
  - If not available, disable/hide the email button
  - On click, show modal with pre-filled default email
  - On send, POST to `/email` with recipient address
  - Show loading state, then success/error toast
- Also add email button to the "done" banner actions (so user can email after clicking Done)

---

## Phase 4: Tests

**Why:** Verify the new routes and UI integration work correctly.

**Modify** → `agent/extensions/__tests__/send-email.test.ts`
- Add tests for the newly exported functions
- Test `buildReportHtml()` directly with various inputs
- Test `getUserEmail()` and `getResendApiKey()` edge cases

---

## Critical Files

| File | Action |
|------|--------|
| `agent/extensions/send-email.ts` | Modify — export reusable functions |
| `agent/extensions/completion-report.ts` | Modify — add /email and /email-config routes |
| `agent/extensions/lib/completion-report-html.ts` | Modify — add email button, modal, JS |
| `agent/extensions/__tests__/send-email.test.ts` | Modify — add tests for exported functions |

## Reusable Components (no changes needed)

- **`sendViaResend()`** — Already handles Resend API call, auth, error parsing
- **`buildReportHtml()`** — Already formats report into styled HTML email
- **Report viewer modal pattern** — Existing rollback modal CSS/JS to reuse for email modal
- **Toast system** — Existing `showToast()` function for success/error feedback

## Verification

1. `vitest run __tests__/send-email.test.ts` — All tests pass including new export tests
2. Open a report viewer → Email button visible in toolbar
3. Click Email → Modal appears with pre-filled default email
4. Send email → Toast shows "Email sent successfully" 
5. If no RESEND_API_KEY → Email button is disabled/hidden
6. Agent can still call `send_email` tool independently (no regression)
