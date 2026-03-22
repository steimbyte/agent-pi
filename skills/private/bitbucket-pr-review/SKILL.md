---
name: bitbucket-pr-review
description: Private Bitbucket pull request review workflow built on the Chrome DevTools MCP base. Use for authenticated multi-URL PR reviews with persisted review rules and browser-rendered reports.
---

# Bitbucket PR Review

This private skill defines the intended behavior for `/review-pr`.

## Workflow
1. Collect one or more Bitbucket PR URLs
2. Ensure the persistent review profile exists on first run
3. Verify page access and ask the user to log in if needed
4. Apply saved review rules to every PR reviewed
5. Produce one persisted report per PR

## Persistent profile
The first review run creates a JSON profile under `.context/pr-review/` so future reviews reuse the same rules and report style.

## Output
Every reviewed PR should produce a structured report view suitable for later browsing.
