# Sub-agent Widget Redesign

**Goal:** Make the sub-agent widget a full-width box with the status color as the entire box background (accent/blue while running, green when done, red on error).

## Plan

### 1. Update `subagent-widget.ts` — Use `Box` for full-width colored background
- Import `Box` from `@mariozechner/pi-tui`
- In `updateWidgets()`, replace the current `Container` + `Text` approach with a `Box` component
- The `Box`'s `bgFn` will convert the status color (accent/success/error) from foreground to background ANSI using `theme.getFgAnsi()` with `38→48` replacement
- The `Box` provides automatic full-width padding (every line padded to terminal width)
- Use `paddingX=1, paddingY=0` for slight horizontal padding

### 2. Update `subagent-render.ts` — Adapt text colors for colored background
- Since the background is now a vivid color, adjust text styling for readability
- Use bold white text for the title/status instead of the current inverse pill
- Use lighter colors for secondary text (task preview, elapsed time, tool count)

### 3. Update `subagent-widget.ts` widget render — Skip `outputBox` wrapper
- `outputBox()` is currently a no-op pass-through, but remove its usage since the Box handles everything

### 4. Update tests in `subagent-widget-render.test.ts`
- Adjust any assertions that depend on the old rendering format

### 5. Verify
- Run existing tests: `npx vitest run agent/extensions/__tests__/subagent-widget-render.test.ts`
- Visual confirmation by checking render output structure
