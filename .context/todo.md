# Fix Logo Loading in Plan Viewer

## Problem
The plan viewer logo doesn't load because `plan-viewer.ts` resolves the logo path using `process.cwd()`:
```ts
const logoPath = join(process.cwd(), ".pi", "assets", "agent-logo.png");
```
This is fragile — `process.cwd()` can differ depending on where the user runs the agent from. The logo source lives at `agent/extensions/assets/agent-logo.png` (relative to the project root).

## Solution
Use `import.meta.url` to resolve the logo path relative to the extension file itself — the same pattern used by other extensions (`agent-chain.ts`, `agent-team.ts`, etc.). This guarantees the logo is always found regardless of the user's working directory.

## Steps

- [ ] **1. Update `agent/extensions/plan-viewer.ts`** — Add `import { fileURLToPath } from "node:url"` and `import { dirname } from "node:path"`. In the logo-serving handler (line ~67), replace `join(process.cwd(), ".pi", "assets", "agent-logo.png")` with `join(dirname(fileURLToPath(import.meta.url)), "assets", "agent-logo.png")` so the path is resolved relative to the extension's own location.
- [ ] **2. Verify the logo file exists** at `agent/extensions/assets/agent-logo.png` (already confirmed ✓).
- [ ] **3. Test** — Run `/plan` or `show_plan` and confirm the logo renders in the browser viewer header.
