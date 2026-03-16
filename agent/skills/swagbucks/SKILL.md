---
name: swagbucks
description: >
  Swagbucks app store & community sentiment validation. Scrapes live data from
  iOS App Store, Google Play Store, and Reddit r/SwagBucks to validate issue
  claims, extract reviews, perform sentiment analysis, and generate a self-contained
  HTML validation report with embedded screenshots. Invoke with /swagbucks or when
  the user asks to "validate swagbucks", "check swagbucks reviews", "swagbucks
  analysis", "swagbucks report", or "app store sentiment analysis".
allowed-tools: Bash Read Write Edit web_test subagent_create_batch show_report
---

# Swagbucks App Review & Sentiment Validation

Scrape live app store and Reddit data, cross-reference against issue document claims, and generate a comprehensive HTML validation report with embedded screenshots and sentiment analysis.

## When to Activate

- User invokes `/swagbucks` or `/skill:swagbucks`
- User asks to validate Swagbucks issue claims, check app reviews, or run sentiment analysis
- Any request involving Swagbucks app store data or Reddit community feedback

## Data Sources

| Source | URL | Method |
|--------|-----|--------|
| iOS App Store | https://apps.apple.com/us/app/swagbucks-surveys-for-money/id640439547 | `web_test` content + screenshot |
| Google Play Store | https://play.google.com/store/apps/details?id=com.prodege.swagbucksmobile | `web_test` content + screenshot |
| Reddit r/SwagBucks | https://www.reddit.com/r/SwagBucks/ | Yahoo Search indexing (Reddit blocks headless browsers) |

## Phase 1: Data Collection

Collect data from all three sources in parallel where possible.

### 1A. App Store Scraping

Extract content and capture screenshots from both stores:

```
web_test { action: "content", url: "https://apps.apple.com/us/app/swagbucks-surveys-for-money/id640439547" }
web_test { action: "content", url: "https://play.google.com/store/apps/details?id=com.prodege.swagbucksmobile" }
web_test { action: "screenshot", url: "https://apps.apple.com/us/app/swagbucks-surveys-for-money/id640439547", fullPage: true }
web_test { action: "screenshot", url: "https://play.google.com/store/apps/details?id=com.prodege.swagbucksmobile", fullPage: true }
```

**Extract from iOS App Store:**
- Overall rating (e.g., 4.4/5)
- Total number of ratings (e.g., 148K)
- App version and update date
- Developer name
- Compatibility requirements
- Age rating
- Visible review text (reviewer name, star count, date, full text)
- Developer responses to reviews

**Extract from Google Play:**
- Overall rating (e.g., 4.2/5)
- Total number of reviews
- Download count (e.g., 10M+)
- Update date
- Content rating
- Visible review text (reviewer name, star count, date, full text)
- Developer responses to reviews
- Helpfulness vote counts on reviews

### 1B. Reddit Sentiment Scraping

Reddit blocks headless browsers directly. Use Yahoo Search to index Reddit threads:

```
web_test { action: "content", url: "https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+survey+disqualified+banned+tracking" }
web_test { action: "content", url: "https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+banned+deactivated+account" }
web_test { action: "content", url: "https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+game+tracking+not+credited+offer" }
web_test { action: "content", url: "https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+receipt+rejected+magic+receipts" }
web_test { action: "content", url: "https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+customer+support+help+ticket" }
web_test { action: "content", url: "https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+scam+not+worth+waste+time" }
```

Also capture screenshots of the search results as evidence:

```
web_test { action: "screenshot", url: "https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+survey+disqualified+banned+tracking", fullPage: true }
web_test { action: "screenshot", url: "https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+banned+deactivated+account", fullPage: true }
```

**Extract from each Yahoo result:**
- Reddit post titles (exact text)
- Post excerpts/snippets
- Subreddit confirmation (r/SwagBucks)
- Source URLs for each thread

**Categorize every found thread into one of these buckets:**
1. Survey DQs / Disqualifications
2. Game / Offer Tracking Failures
3. Receipt Rejections (Magic Receipts)
4. Account Bans / Deactivations
5. Customer Support Issues
6. General Sentiment (scam/worth it/waste of time)

### 1C. Read Screenshots

Use the `Read` tool on every captured screenshot PNG to visually verify the data:

```
Read { path: "<screenshot-path>.png" }
```

This confirms ratings, review content, and review breakdown bars visually match the extracted text.

## Phase 2: Analysis

### 2A. Claim Validation (if issue document provided)

For each claim in the issue document, determine status:

| Status | Criteria |
|--------|----------|
| **Confirmed** | Exact match found in live data |
| **Partial** | Plausible but not directly observed in sampled data |
| **Incorrect** | Contradicted by live data |
| **Outdated** | Was correct but has since changed |

### 2B. Sentiment Analysis

Classify every extracted Reddit thread by sentiment:

| Sentiment | Criteria |
|-----------|----------|
| **Negative** | Clear frustration, anger, complaint, "scam" language |
| **Mixed** | Acknowledges value but cites significant pain points |
| **Positive** | Reports good earnings, defends platform |

Calculate approximate distribution across all threads and report the dominant sentiment.

### 2C. Issue Pattern Cross-Reference

For each complaint category, map evidence from ALL sources:

- Document claim → App Store evidence → Reddit evidence → Severity signal
- Identify which categories are confirmed by multiple independent sources
- Flag any categories with single-source evidence only

### 2D. Key Metrics to Track

Always extract and report these numbers:

| Metric | Source |
|--------|--------|
| iOS rating + count | App Store |
| Android rating + count | Play Store |
| Android downloads | Play Store |
| iOS app version + date | App Store |
| Android update date | Play Store |
| Developer name | Both stores |
| Review helpfulness votes | Play Store |
| Reddit thread count per category | Yahoo Search |
| Sentiment distribution % | Analysis |

## Phase 3: Report Generation

Generate a self-contained HTML report at `~/Desktop/swagbucks-validation-report.html`.

### Report Structure

The HTML report MUST include these sections (see `templates/report-template.md` for full HTML template):

1. **Header** — Title, date, severity, scope, method badges
2. **Key Metrics** — 4-stat cards (iOS rating, Android rating, downloads, version)
3. **Claim-by-Claim Validation** — Table with status badges (Confirmed/Incorrect/Partial)
4. **Validation Score Summary** — Confirmed count, incorrect count, validation rate %
5. **App Store Screenshots** — Embedded base64 PNG images (clickable zoom)
6. **App Store Reviews** — Extracted review cards with star ratings, tags, helpfulness votes
7. **Reddit Sentiment Analysis** — Sentiment distribution bar, per-category breakdown with thread cards
8. **Reddit Search Screenshots** — Embedded search result captures
9. **Issue Pattern Cross-Reference** — Multi-source evidence matrix
10. **Findings & Corrections** — Prioritized findings with check/warn/error icons
11. **Recommendations** — Numbered actionable items

### Screenshot Embedding

All screenshots MUST be embedded as base64 data URIs for a fully self-contained report:

```bash
# Convert screenshot to base64
base64 -i /path/to/screenshot.png > /tmp/screenshot_b64.txt

# Embed in HTML
<img src="data:image/png;base64,${BASE64_CONTENT}" alt="description" onclick="showFull(this)">
```

### Report Styling

Use dark theme (GitHub-dark inspired):
- Background: `#0d1117`
- Surface: `#161b22`
- Text: `#e6edf3`
- Accent: `#58a6ff`
- Green (confirmed): `#3fb950`
- Red (error): `#f85149`
- Yellow (warning): `#d29922`

Include a fullscreen overlay for clicking screenshots to zoom.

## Phase 4: Delivery

1. Save report to `~/Desktop/swagbucks-validation-report.html`
2. Open it in the browser: `open ~/Desktop/swagbucks-validation-report.html`
3. Report file size and section count
4. Summarize key findings to the user

## Complaint Categories Reference

These are the known Swagbucks complaint categories to look for across all sources:

| Category | Keywords to Search | Tags |
|----------|-------------------|------|
| Survey DQs | disqualified, DQ, kicked out, survey, 1 SB | `t-survey` |
| Game Tracking | tracking, not credited, game, offer, expired | `t-track` |
| Receipt Rejections | receipt, rejected, magic receipts, invalid, OCR | `t-receipt` |
| Account Bans | banned, deactivated, suspended, fraud, abuse | `t-ban` |
| Customer Support | support, ticket, response, bot, help, ignored | `t-support` |
| General Sentiment | scam, waste, not worth, worth it | `t-general` |

## Critical Rules

1. **Only use verified data** — Never fabricate post titles, usernames, upvote counts, or review text
2. **All screenshots must be real** — Captured live via `web_test`, never placeholder images
3. **Reddit workaround** — Use Yahoo Search indexing since Reddit blocks headless browsers
4. **Self-contained report** — All images embedded as base64, no external dependencies
5. **Cross-reference everything** — Every claim should be checked against multiple sources
6. **Note data limitations** — If a claim can't be verified, say so — don't assume
7. **Timestamp the report** — Include capture date/time so data freshness is clear
