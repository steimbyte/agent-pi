# /debug-capture Extension — Implementation Plan

## Overview
A Pi extension that uses [charmbracelet/vhs](https://github.com/charmbracelet/vhs) to capture screenshots and GIFs of Pi's TUI, so the agent can visually inspect UI rendering via `Read` on the resulting PNG files.

## Key Findings from Research
- VHS is installed locally (`/opt/homebrew/bin/vhs`), deps `ttyd` + `ffmpeg` present
- `Screenshot subdir/file.png` works (must use subdirectory paths, not bare filenames)
- `Wait+Screen /regex/` works for waiting on specific output before capturing
- `Read` tool can display PNG images — **confirmed the full pipeline works end-to-end**
- VHS uses a virtual terminal that renders ANSI escape codes faithfully (colors, backgrounds, box-drawing)
- Pi supports `pi -p` (print/non-interactive mode) for scripted execution

## Architecture

### File: `agent/extensions/debug-capture.ts`

A standalone extension that registers:
1. **`/debug-capture <scenario>`** command — generates a `.tape` file, runs VHS, outputs screenshot paths
2. **`debug_capture` tool** — same thing but callable by the agent programmatically during work

### How It Works

```
User or Agent: /debug-capture "launch pi and add 3 tasks"
                    │
                    ▼
        ┌──────────────────────┐
        │ Generate .tape file  │  (dynamic tape from scenario description)
        │ with Screenshot cmds │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   Run `vhs tape`     │  (spawn subprocess)
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Return PNG paths     │  (agent can `Read` them to see the UI)
        └──────────────────────┘
```

### Tape Generation Strategy

Two modes:
1. **Predefined scenarios** — built-in tape templates for common Pi states (task list, pipeline, subagent widgets, mode switching). Fast, reliable.
2. **Custom commands** — user provides raw shell commands to type into the VHS terminal. Flexible, manual.

### Predefined Scenarios

| Scenario | What it captures |
|---|---|
| `tasks` | Launch pi, create a task list with sample tasks, screenshot the task widget |
| `modes` | Cycle through NORMAL→PLAN→TEAM→PIPELINE, screenshot each |
| `footer` | Launch pi, screenshot the footer bar |
| `theme <name>` | Launch pi with a specific theme, screenshot |
| `custom <cmds>` | Run arbitrary commands in a shell, screenshot the result |

### Output Location
- `.pi/debug-captures/` directory (gitignored)
- Timestamped: `capture-2024-03-03-124500.png`
- Also produces a `.gif` for animated scenarios

## Implementation Steps

- [ ] 1. Create `agent/extensions/debug-capture.ts` with extension boilerplate
  - Register `/debug-capture` command with argument completions
  - Register `debug_capture` tool (so agent can call it programmatically)
  
- [ ] 2. Implement tape generation engine
  - `generateTape(scenario, options)` → string (tape file contents)
  - Handle predefined scenarios with template functions
  - Handle custom commands mode
  - Always include `Screenshot` at key moments
  - Use `Wait+Screen /regex/` for reliable timing

- [ ] 3. Implement VHS runner
  - Write tape to temp file
  - Spawn `vhs` subprocess
  - Capture stdout/stderr for error reporting
  - Return paths to generated screenshots/GIFs

- [ ] 4. Wire up command + tool to tape generator + runner
  - `/debug-capture tasks` → generates tape → runs VHS → returns screenshot paths
  - `debug_capture` tool returns paths in result content so agent can `Read` them

- [ ] 5. Add to settings.json packages list

- [ ] 6. Test with a real capture of Pi's TUI
