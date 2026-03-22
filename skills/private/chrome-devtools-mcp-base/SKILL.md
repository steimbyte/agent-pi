---
name: chrome-devtools-mcp-base
description: Private base skill for Chrome DevTools MCP-driven browser workflows in agent-pi. Use when a private extension-backed workflow needs authenticated browser navigation, page inspection, access checks, or structured page extraction.
---

# Chrome DevTools MCP Base

This private skill documents the reusable browser-automation foundation for extension-backed workflows.

## Use this when
- A workflow needs authenticated browser access to internal tools or PR pages
- Page access must be verified before work continues
- A custom extension is exposing Chrome DevTools MCP tools to Pi

## Expected flow
1. Connect to the private Chrome DevTools MCP bridge
2. Open or inspect the target page
3. Verify whether the page is accessible or requires login
4. Extract structured page metadata for downstream workflow logic

## Notes
- This skill is documentation/support for private extensions; the runtime behavior lives in private extension code.
- Keep this skill private alongside the review workflow.
