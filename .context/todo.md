# Replace Editor Button Text With Icons

## Goal
Swap the `Cursor`, `Windsurf`, and `VS Code` text labels in the file viewer toolbar for clean inline SVG icons.

## Approach
- Use **inline monochrome SVGs** embedded directly in the HTML template
- Keep buttons accessible with `title` and `aria-label`
- Keep buttons the same size and clickable area as today
- Preserve existing launch behavior exactly

## Plan
- [ ] Add small inline SVG icon markup for Cursor, Windsurf, and VS Code buttons
- [ ] Keep tooltips / aria-labels so the buttons remain understandable
- [ ] Add compact icon-button styling (centered, same toolbar alignment)
- [ ] Keep fallback text hidden visually only if needed
- [ ] Test that buttons still launch editors correctly

## Notes
- No external icon assets
- No emoji
- No dependency changes
- Prefer crisp monochrome icons that fit the current dark UI
