---
name: review-pr
description: "Private Bitbucket PR code review — collect URLs, verify access, apply review profile, generate per-PR reports."
argument-hint: "[url1 url2 ...]"
allowed-tools: ["Bash", "Read", "Write", "Edit", "show_pr_review_viewer", "show_pr_review_report", "chrome_devtools_mcp_connect", "chrome_devtools_mcp_verify_access", "mcp__chrome-devtools__navigate_page", "mcp__chrome-devtools__take_snapshot", "mcp__chrome-devtools__take_screenshot", "mcp__chrome-devtools__evaluate_script", "mcp__chrome-devtools__list_pages", "mcp__chrome-devtools__wait_for", "mcp__chrome-devtools__click", "mcp__chrome-devtools__new_page", "mcp__chrome-devtools__select_page", "show_reports", "commander_task", "commander_mailbox", "ask_user"]
---

# /review-pr — Private Bitbucket PR Review Workflow

You are running the private `/review-pr` workflow. Follow these steps exactly.

## Step 1: Bootstrap Review Profile

Check if `.context/pr-review/profile.json` exists.
- If it does NOT exist, create it with these defaults:
```json
{
  "version": 1,
  "createdAt": "<now>",
  "updatedAt": "<now>",
  "reviewRules": [
    "Flag correctness, reliability, maintainability, and security issues.",
    "Prefer actionable findings over stylistic commentary.",
    "Include file/path context whenever available."
  ],
  "severityLabels": ["critical", "high", "medium", "low"],
  "reportStyle": "standard",
  "requireFilePaths": true,
  "requireSuggestedFixes": true
}
```
- If it exists, read it and use the saved rules for all reviews.

## Step 2: Collect PR URLs

If the user provided URLs in arguments (`$ARGUMENTS`), use those directly.

If no URLs were provided, open the PR review request viewer to collect them:
```
show_pr_review_viewer { title: "PR Review Request" }
```

The viewer will:
1. Let the user enter one or more Bitbucket PR URLs
2. Verify access to each URL
3. Prompt the user to log in if any URL requires authentication
4. Return the confirmed accessible URLs

## Step 3: Verify Chrome DevTools MCP Access

Use Chrome DevTools MCP (native MCP tools) to verify browser access:

1. Call `list_pages` to check if Chrome is connected
   - If it works → Chrome DevTools MCP is available, proceed with it as the primary extraction method
   - If it fails → Fall back to `agent-browser` or HTTP-based extraction

2. If Chrome DevTools MCP is available, use the following for each PR URL:
   ```
   navigate_page { url: "<PR URL>" }
   take_snapshot {}
   ```
   Check the snapshot for login indicators ("Log in", "Sign in", "Repository not found").
   - If login required → Ask the user to log in in their Chrome browser, then retry
   - If accessible → Proceed to review

3. If Chrome DevTools MCP is NOT available:
   - Try `agent-browser` as fallback
   - Or use HTTP-based extraction
   - Do NOT block the workflow

## Step 4: Review Each PR

For each accessible URL:

### Content Extraction (prefer Chrome DevTools MCP)

Use `evaluate_script` to extract PR content:

```
evaluate_script {
  function: "() => { return { title: document.title, body: document.body.innerText.substring(0, 80000) }; }"
}
```

For Bitbucket PRs specifically:
```
evaluate_script {
  function: "() => { const pr = {}; pr.title = document.querySelector('[data-qa=\"pr-header-title\"]')?.textContent?.trim(); pr.description = document.querySelector('[data-qa=\"pr-description\"]')?.textContent?.trim(); pr.author = document.querySelector('[data-qa=\"pr-author\"]')?.textContent?.trim(); pr.state = document.querySelector('[data-qa=\"pr-header-state\"]')?.textContent?.trim(); const files = document.querySelectorAll('[data-qa=\"bk-filepath\"]'); pr.files = Array.from(files).map(f => f.textContent?.trim()); return pr; }"
}
```

To get diff content, navigate to the diff tab if needed:
```
evaluate_script {
  function: "() => { const diffs = document.querySelectorAll('.diff-container, [data-qa=\"pr-diff-file-container\"]'); return Array.from(diffs).map(d => ({ file: d.querySelector('[data-qa=\"bk-filepath\"], .filename')?.textContent?.trim(), additions: d.querySelectorAll('.addition, .udiff-line.addition').length, deletions: d.querySelectorAll('.deletion, .udiff-line.deletion').length, content: d.textContent?.substring(0, 10000) })); }"
}
```

### Apply Review Rules

Apply all review rules from the profile:
- Flag TODO/FIXME/HACK markers
- Flag debug/logging statements that should be removed
- Flag potential hardcoded secrets or credentials
- Flag large PRs (20+ files) that should be split
- Flag missing or insufficient PR descriptions
- Apply any custom rules from the review profile

### Produce Structured Findings

For each finding, include:
- **severity**: critical, high, medium, or low
- **title**: Short description of the issue
- **filePath**: File path where the issue was found
- **detail**: Full explanation of the issue
- **suggestion**: How to fix it

Generate a summary verdict per PR.

## Step 5: Generate Review Reports

After all PRs are reviewed, open the report viewer with the results:
```
show_pr_review_report {
  batch_title: "PR Review — <date>",
  reports: [
    {
      title: "<PR title>",
      url: "<PR URL>",
      summary: "<verdict>",
      profile_summary: ["<rule 1>", "<rule 2>", ...],
      findings: [
        { severity: "high", title: "...", filePath: "...", detail: "...", suggestion: "..." }
      ],
      metadata: { reviewedAt: "<now>", extractionMethod: "chrome-devtools-mcp | agent-browser | http" }
    }
  ]
}
```

The report viewer will:
- Show per-PR findings with severity badges
- Support tab navigation for multi-PR reviews
- Allow copying the report as markdown
- Persist reports for later browsing via `/reports`

## Important Notes
- Always use the saved review profile. Never skip profile loading.
- **Prefer Chrome DevTools MCP** for authenticated pages — it uses the user's real Chrome session.
- If Chrome DevTools MCP is not available, use `agent-browser` or HTTP fallback — don't fail.
- Generate one report entry per PR reviewed.
- Persist all reports so they appear in `/reports`.
- When extracting diff content, be aware of lazy-loading — you may need to scroll or expand collapsed diffs.
