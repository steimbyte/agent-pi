# Plan: Add Scout-Based Context Gathering to PLAN Mode

## Context

When PLAN mode is activated (via `set_mode` or Shift+Tab), the system injects `PLAN_PROMPT` from `agent/extensions/lib/mode-prompts.ts` as the system prompt. This prompt instructs the main agent to follow a 5-phase workflow: Analyze → Plan → Approve → Implement → Report. During "Phase 1: Analyze," the main agent is told to "explore the codebase to understand existing patterns, dependencies, and architecture" — but it does all of this exploration itself, using its own tool calls (Read, Bash, grep, etc.).

The PIPELINE mode already has a dedicated GATHER phase that spawns multiple scout subagents in parallel to explore different areas of the codebase concurrently. The subagent infrastructure (`subagent_create`, `subagent_create_batch`) is mature and supports named agent definitions — when `name: "scout"` is passed, the scout's model, tools, and system prompt are auto-applied from `agent/.pi/agents/scout.md`.

The goal is to modify the PLAN mode prompt so that during "Phase 1: Analyze," the main agent spawns multiple scout subagents to gather context in parallel, rather than doing all the exploration itself. The scouts report back their findings, and the main agent synthesizes those findings into the context needed for Phase 2 (writing the plan). For simple tasks where multi-scout exploration isn't warranted, the agent should use its own judgment and may skip scouts entirely or spawn just one.

# We should spawn 4 sub-agents scouts, unless its a simple task

Key files involved:
- `agent/extensions/lib/mode-prompts.ts` — contains `PLAN_PROMPT` (the system prompt for PLAN mode)
- `agent/extensions/__tests__/mode-prompts.test.ts` — tests for `PLAN_PROMPT`
- `agent/extensions/mode-cycler.ts` — injects the prompt via `before_agent_start`

The change is purely a **prompt engineering change** — we modify the `PLAN_PROMPT` string to teach the agent a new behavior pattern. No new tools, no new TypeScript logic. The existing `subagent_create_batch` and `subagent_create` tools are already available to the agent.

---

## Phase 1: Modify PLAN_PROMPT — Scout-Based Context Gathering

**Why:** The PLAN_PROMPT currently tells the agent to gather context itself. We need to replace the "Phase 1: Analyze" instructions with a new pattern that spawns targeted scout subagents for parallel codebase exploration, while preserving the agent's judgment to skip scouts for trivial tasks.

**Modify** → `agent/extensions/lib/mode-prompts.ts`
- Rewrite the "Phase 1: Analyze" section of `PLAN_PROMPT` to instruct the agent to:
  1. Read the task and classify its scope/complexity
  2. For non-trivial tasks, identify 2-4 distinct reconnaissance areas (e.g., "map the directory structure," "find all files related to X," "trace the data flow for Y," "check test patterns")
  3. Spawn scouts via `subagent_create_batch` with `name: "scout"` for each area, giving each scout a focused, targeted task
  4. Wait for all scouts to report back (they deliver results as follow-up messages)
  5. Synthesize scout findings into the context needed for planning
- Add guidance on when NOT to spawn multiple scouts:
  - Single-file changes → just use one scout or read directly
  - When the task is already well-scoped → fewer scouts needed
  - Simple renames, config changes, etc. → skip scouts entirely
- Add example `subagent_create_batch` call showing the pattern
- Keep the remaining phases (Plan, Approve, Implement, Report) unchanged

---

## Phase 2: Update Tests

**Why:** Tests must validate the new scout-related content in PLAN_PROMPT.

**Modify** → `agent/extensions/__tests__/mode-prompts.test.ts`
- Add tests verifying PLAN_PROMPT contains scout-related keywords:
  - Contains 'scout' (agent name reference)
  - Contains 'subagent_create_batch' (the tool to use)
  - Contains guidance about when NOT to spawn scouts
  - Contains the concept of "targeted" or "focused" scout tasks
- Keep existing tests unchanged (they validate other invariants)

---

## Phase 3: Verify

**Why:** Ensure no regressions and the prompt reads well.

- Run the test suite: `cd agent/extensions && npx vitest run __tests__/mode-prompts.test.ts`
- Run the full suite: `cd agent/extensions && npx vitest run`
- Review the final PLAN_PROMPT for readability and correct formatting

---

## Critical Files

| File | Action |
|------|--------|
| `agent/extensions/lib/mode-prompts.ts` | Modify (rewrite Phase 1 of PLAN_PROMPT) |
| `agent/extensions/__tests__/mode-prompts.test.ts` | Modify (add scout-related test cases) |
| `agent/extensions/mode-cycler.ts` | Reference (injects PLAN_PROMPT, no changes) |
| `agent/extensions/subagent-widget.ts` | Reference (provides subagent_create_batch, no changes) |
| `agent/.pi/agents/scout.md` | Reference (scout agent definition, no changes) |

## Reusable Components (no changes needed)

- **subagent_create_batch** — already supports spawning multiple named agents in parallel with automatic agent definition resolution
- **scout agent definition** (`agent/.pi/agents/scout.md`) — provides the scout's system prompt, tools (read, grep, find, ls), and model configuration
- **subagent_create** — fallback for spawning a single scout when only one area needs exploration

## Verification

1. `cd agent/extensions && npx vitest run __tests__/mode-prompts.test.ts` — all existing + new tests pass
2. `cd agent/extensions && npx vitest run` — full suite passes, no regressions
3. Manual review: read the PLAN_PROMPT and confirm the scout instructions are clear, with good examples
4. Edge case: verify the prompt still works for simple tasks (agent should know to skip scouts)
