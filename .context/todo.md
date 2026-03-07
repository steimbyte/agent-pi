# Security Guard Persistent Widget

Replace the transient `console.error` log line when injections are stripped with a persistent, styled widget block (similar to subagent widgets) that stays visible in the output log.

## Plan

- [ ] **1. Add widget infrastructure to security-guard.ts**
  - Store a reference to the UI context (`widgetCtx`) from `session_start` and `session_switch` events (same pattern as subagent-widget.ts)
  - Track a `nextWidgetId` counter and a map of security event states
  - Import `Box`, `Text` from `@mariozechner/pi-tui`

- [ ] **2. Create widget rendering for security events**
  - Render a persistent dark-gray background block (similar to subagent widget pattern)
  - Format: `security-guard | action blocked | {reason}` with padding
  - Use dark gray ANSI background (`\x1b[48;2;50;50;50m`) with white bold text
  - Widget should be 2 lines: header line + detail line showing tool name and what was stripped
  - Auto-remove after 60 seconds (like subagent widgets auto-remove after 30s)

- [ ] **3. Wire up widget display for BOTH event types**
  - **Context hook (injection stripping)**: Replace `console.error(...)` with widget creation showing: `security-guard | stripped {n} injection(s) | {toolName}`
  - **Tool_call hook (blocked commands)**: Add widget creation alongside the existing `return { block: true, reason }` showing: `security-guard | action blocked | {reason summary}`

- [ ] **4. Test by examining rendering output**
  - Verify the widget renders correctly with proper padding and dark gray background
  - Verify auto-removal timer works
