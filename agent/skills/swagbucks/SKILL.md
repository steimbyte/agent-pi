---
name: swagbucks
description: >
  Swagbucks app store & community sentiment validation. Scrapes live data from
  iOS App Store, Google Play Store, and Reddit r/SwagBucks to validate issue
  claims, extract reviews, perform sentiment analysis, and generate a self-contained
  HTML validation report with embedded screenshots. Supports optional deep scraping
  via agent-browser for richer Reddit thread evidence (upvotes, comments, full content)
  and expanded app store reviews with visual proof screenshots. Invoke with /swagbucks
  or when the user asks to "validate swagbucks", "check swagbucks reviews", "swagbucks
  analysis", "swagbucks report", or "app store sentiment analysis".
allowed-tools: Bash(agent-browser:*) Bash Read Write Edit web_test subagent_create_batch show_report show_swagbucks
---

# Swagbucks App Review & Sentiment Validation

Scrape live app store and Reddit data, cross-reference against issue document claims, and generate a comprehensive interactive report with embedded screenshots and sentiment analysis.

## When to Activate

- User invokes `/swagbucks` or `/skill:swagbucks`
- User asks to validate Swagbucks issue claims, check app reviews, or run sentiment analysis
- Any request involving Swagbucks app store data or Reddit community feedback

## Setup-First Flow

When `/swagbucks` is invoked, ALWAYS open the setup page first:

1. Call `show_swagbucks` (mode: "setup") to open the configuration page
2. User configures: time interval, data sources, complaint categories, output format
3. User clicks "Run Analysis" — config is returned to the agent
4. Agent runs the data collection and analysis using the config
5. Call `show_swagbucks` (mode: "report", report_data: JSON) to display the interactive report

The report viewer matches the design of plan-viewer and spec-viewer with:
- Sidebar navigation between report sections
- Metric cards, sentiment bars, review cards, claim tables
- Screenshot gallery with fullscreen zoom
- Export and save functionality

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

### 1D. Agent-Browser Deep Scraping (Optional — when config.deepScrape.enabled is true)

When the user enables "Deep Scrape" in the setup config, use `agent-browser` to directly navigate Reddit threads and app store pages for richer evidence. This runs **alongside** the existing web_test scraping — it does NOT replace it.

See [references/agent-browser-scraping.md](references/agent-browser-scraping.md) for detailed patterns.

#### Reddit Thread Deep Scraping (when config.deepScrape.reddit is true)

From the Yahoo search results gathered in Phase 1B, identify the most significant threads — both critical complaints and positive testimonials. Open each directly with agent-browser:

```bash
# Open a Reddit thread found from Yahoo results
agent-browser open "https://www.reddit.com/r/SwagBucks/comments/THREAD_ID/title/"
agent-browser wait --load networkidle
agent-browser wait 2000

# Dismiss any login/cookie modals
agent-browser snapshot -i
# If modal found, click dismiss/close button

# Screenshot the full thread as evidence
agent-browser screenshot --full

# Extract thread metadata via snapshot
agent-browser snapshot -i -C
# Extract: title, upvote count, comment count, post age, author, flair
agent-browser get text body > /tmp/thread_content.txt
```

**Selection criteria for threads to deep-scrape:**
- **Critical posts** (aim for 3-5): High upvote threads with complaint keywords (banned, scam, DQ, not credited, rejected). Prioritize recent posts within the config.days window with active discussion (many comments).
- **Positive posts** (aim for 2-3): Threads with positive sentiment (earned, legitimate, tips, success, worth it) and high engagement. Look for earnings reports, success stories, and defense-of-platform posts.

**For each scraped thread, extract:**
- Post title (exact text)
- Upvote count (number)
- Comment count (number)
- Post age / date
- Author username
- Full post body text
- Top 3-5 comments with their text and upvote counts
- Full-page screenshot as visual evidence

#### App Store Deep Review Scraping (when config.deepScrape.appStore is true)

Navigate to the full reviews section of each app store to capture expanded reviews not visible in the initial web_test scrape:

```bash
# iOS App Store — navigate to reviews section
agent-browser open "https://apps.apple.com/us/app/swagbucks-surveys-for-money/id640439547"
agent-browser wait --load networkidle
agent-browser snapshot -i
# Find and click "See All Ratings and Reviews" or scroll to reviews section
agent-browser scroll down 2000
agent-browser snapshot -i
# Screenshot the reviews section
agent-browser screenshot --full

# Google Play — expand reviews
agent-browser open "https://play.google.com/store/apps/details?id=com.prodege.swagbucksmobile"
agent-browser wait --load networkidle
agent-browser snapshot -i
# Find and click "See all reviews" button
# Screenshot expanded reviews
agent-browser screenshot --full
```

**For each store, capture:**
- 3-5 critical review screenshots (1-2 star reviews with detailed complaints)
- 2-3 positive review screenshots (4-5 star reviews praising the platform)
- Screenshot of the overall ratings breakdown bar chart
- Any developer responses to critical reviews

#### Evidence Organization

After deep scraping, organize all captured evidence:

```
Evidence collected:
├── reddit_critical/
│   ├── thread_1.png (title, upvotes, context)
│   ├── thread_2.png
│   └── thread_3.png
├── reddit_positive/
│   ├── thread_1.png
│   └── thread_2.png
├── appstore_critical/
│   ├── ios_review_1.png
│   ├── android_review_1.png
│   └── ...
└── appstore_positive/
    ├── ios_review_1.png
    └── android_review_1.png
```

All screenshots are converted to base64 and embedded in the report as evidence sections.

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

Generate report data and display it in the interactive Swagbucks Report Viewer.

### Building the Report Data

Construct a `SwagbucksReportData` JSON object with these sections:

```typescript
{
  title: "Swagbucks App Review & Sentiment Validation",
  generatedAt: "2025-06-28T12:00:00Z",
  config: { /* user's setup config */ },
  metrics: {
    iosRating: "4.4",
    iosCount: "148K",
    androidRating: "4.2",
    androidCount: "245K",
    androidDownloads: "10M+",
    appVersion: "8.2.1"
  },
  sections: [
    { id: "summary", title: "Executive Summary", type: "summary", content: "<p>HTML content...</p>" },
    { id: "metrics", title: "Key Metrics", type: "metrics", content: "..." },
    { id: "claims", title: "Claim Validation", type: "claims", content: "..." },
    { id: "ios-reviews", title: "iOS Reviews", type: "reviews", content: "..." },
    { id: "android-reviews", title: "Android Reviews", type: "reviews", content: "..." },
    { id: "sentiment", title: "Reddit Sentiment", type: "sentiment", content: "..." },
    { id: "screenshots", title: "Screenshots", type: "screenshots", content: "..." },
    { id: "findings", title: "Findings", type: "findings", content: "..." },
    { id: "recommendations", title: "Recommendations", type: "recommendations", content: "..." },
    // Deep scrape evidence sections at the bottom (only when deepScrape was enabled):
    { id: "reddit-evidence", title: "Reddit Thread Evidence", type: "evidence", content: "..." },
    { id: "appstore-evidence", title: "App Store Review Evidence", type: "evidence", content: "..." }
  ]
}
```

### Displaying the Report

Call `show_swagbucks` with mode "report" and the JSON data:

```
show_swagbucks { mode: "report", report_data: JSON.stringify(reportData) }
```

The report viewer provides:
- Sidebar navigation with section icons
- Glass-morphism card design matching plan-viewer/spec-viewer
- Metric cards with color-coded values
- Sentiment distribution bars
- Review cards with platform badges and category tags
- Claim validation tables with status badges
- Screenshot gallery with fullscreen zoom
- Copy, Save, and Export buttons

### Report Section Content

Each section's `content` field should contain pre-rendered HTML using these CSS classes:

**Metrics Grid:**
```html
<div class="metrics-grid">
  <div class="metric-card"><div class="metric-value">4.4</div><div class="metric-label">iOS Rating</div><div class="metric-sub">148K ratings</div></div>
</div>
```

**Review Cards:**
```html
<div class="review-card">
  <div class="review-header">
    <span class="review-source ios">iOS</span>
    <span class="review-stars">★★★★☆</span>
    <span class="review-author">user123 · Jun 2025</span>
  </div>
  <div class="review-text">Review text here...</div>
  <div class="review-tags"><span class="tag t-survey">Survey DQs</span></div>
</div>
```

**Sentiment Bar:**
```html
<div class="sentiment-bar-wrap">
  <div class="sentiment-bar">
    <div class="seg neg" style="width:60%">60%</div>
    <div class="seg mix" style="width:25%">25%</div>
    <div class="seg pos" style="width:15%">15%</div>
  </div>
</div>
```

**Claims Table:**
```html
<table class="claims-table">
  <tr><th>Claim</th><th>Status</th><th>Evidence</th></tr>
  <tr><td>Survey DQs are frequent</td><td><span class="status-badge confirmed">Confirmed</span></td><td>Found in 12 reviews...</td></tr>
</table>
```

**Findings:**
```html
<div class="finding-item">
  <div class="finding-icon ok">✓</div>
  <div class="finding-content">
    <div class="finding-title">Finding title</div>
    <div class="finding-desc">Description text</div>
  </div>
</div>
```

**Evidence Grid (Deep Scrape — for type "evidence" sections):**
```html
<div class="evidence-summary">
  <div class="metric-card"><div class="metric-value">5</div><div class="metric-label">Threads Scraped</div></div>
  <div class="metric-card negative"><div class="metric-value">3</div><div class="metric-label">Critical Posts</div></div>
  <div class="metric-card positive"><div class="metric-value">2</div><div class="metric-label">Positive Posts</div></div>
</div>

<div class="evidence-grid">
  <div class="evidence-column">
    <h3 class="evidence-column-title critical">⚠ Critical Posts</h3>
    <div class="evidence-card">
      <div class="evidence-header">
        <span class="evidence-badge critical">Critical</span>
        <span class="evidence-source reddit">Reddit</span>
      </div>
      <div class="evidence-metadata">⬆ 245 · 💬 89 comments · 📅 3 days ago · r/SwagBucks</div>
      <img src="data:image/png;base64,..." alt="Reddit thread screenshot" onclick="showFull(this)">
      <div class="evidence-caption">User reports account banned after $50 cashout — 89 comments confirm similar experiences</div>
      <div class="thread-preview">
        <div class="thread-title">Got permanently banned after my first cashout attempt</div>
        <div class="thread-comment">Top comment: "Same happened to me last week, support hasn't responded in 2 weeks"</div>
        <div class="thread-comment">Top comment: "File a BBB complaint, that's the only thing that worked for me"</div>
      </div>
    </div>
  </div>

  <div class="evidence-column">
    <h3 class="evidence-column-title positive">✓ Positive Posts</h3>
    <div class="evidence-card">
      <div class="evidence-header">
        <span class="evidence-badge positive">Positive</span>
        <span class="evidence-source reddit">Reddit</span>
      </div>
      <div class="evidence-metadata">⬆ 178 · 💬 45 comments · 📅 5 days ago · r/SwagBucks</div>
      <img src="data:image/png;base64,..." alt="Reddit thread screenshot" onclick="showFull(this)">
      <div class="evidence-caption">User earned $500 in 3 months — detailed strategy with proof</div>
      <div class="thread-preview">
        <div class="thread-title">Just hit $500 lifetime earnings — here's my strategy</div>
        <div class="thread-comment">Top comment: "Great tips! I average about $50/month using similar approach"</div>
      </div>
    </div>
  </div>
</div>
```

### Legacy HTML Report (Optional)

If the user's config requested format "both" or "html", also generate a self-contained HTML file at `~/Desktop/swagbucks-validation-report.html` using the legacy template pattern (see `templates/report-template.md`).

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

1. Call `show_swagbucks` with mode "report" and the constructed report data
2. The interactive report viewer opens in the browser with sidebar navigation
3. User can browse sections, zoom screenshots, copy/export the report
4. If config format was "email" or "both", also send via AgentMail using `send_email`
5. If config format was "html" or "both", also save standalone HTML to `~/Desktop/`
6. Summarize key findings to the user after the viewer closes

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
2. **All screenshots must be real** — Captured live via `web_test` or `agent-browser`, never placeholder images
3. **Reddit workaround** — Use Yahoo Search indexing for discovery since Reddit blocks headless browsers. When deep scrape is enabled, use `agent-browser` to open actual Reddit threads for richer data and thread screenshots
4. **Self-contained report** — All images embedded as base64, no external dependencies
5. **Cross-reference everything** — Every claim should be checked against multiple sources
6. **Note data limitations** — If a claim can't be verified, say so — don't assume
7. **Timestamp the report** — Include capture date/time so data freshness is clear
8. **Deep scrape is additive** — agent-browser deep scraping supplements, never replaces, the existing web_test flow. If agent-browser fails on a page (e.g., Reddit anti-bot), fall back gracefully to web_test data
9. **Evidence selection** — When deep scraping, aim for a balanced view: capture both critical complaint posts AND positive testimonials to present fair, comprehensive evidence
