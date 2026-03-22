---
name: review-pr
description: "Private Bitbucket PR code review — collect URLs, verify access, apply review profile, generate per-PR reports."
argument-hint: "[url1 url2 ...]"
allowed-tools: ["Bash", "Read", "Write", "Edit", "show_pr_review_viewer", "show_pr_review_report", "chrome_devtools_mcp_connect", "chrome_devtools_mcp_verify_access", "chrome_devtools_mcp_call", "show_reports", "commander_task", "commander_mailbox", "ask_user"]
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

## Step 3: Connect Chrome DevTools MCP (if available)

Try to connect to the Chrome DevTools MCP bridge for richer page inspection:
```
chrome_devtools_mcp_connect {}
```
If this fails, fall back to HTTP-based page inspection. Do NOT block the workflow.

## Step 4: Review Each PR

For each accessible URL:
1. Fetch the PR page content (via Chrome DevTools MCP or HTTP fallback)
2. Apply all review rules from the profile
3. Produce structured findings with severity, title, file path, detail, and suggestion
4. Generate a summary verdict per PR

Review rules to apply:
- Flag TODO/FIXME/HACK markers
- Flag debug/logging statements that should be removed
- Flag potential hardcoded secrets or credentials
- Flag large PRs (20+ files) that should be split
- Flag missing or insufficient PR descriptions
- Apply any custom rules from the review profile

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
      metadata: { reviewedAt: "<now>", extractionMethod: "..." }
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
- If Chrome DevTools MCP is not available, use HTTP fallback — don't fail.
- Generate one report entry per PR reviewed.
- Persist all reports so they appear in `/reports`.
