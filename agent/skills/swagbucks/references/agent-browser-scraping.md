# Agent-Browser Deep Scraping Reference

Detailed patterns for using `agent-browser` to deep-scrape Reddit threads and app store review pages for the Swagbucks analysis. This supplements the existing `web_remote` scraping — it does NOT replace it.

## Reddit Thread Scraping

### URL Formats

Reddit threads from r/SwagBucks follow this pattern:
```
https://www.reddit.com/r/SwagBucks/comments/{thread_id}/{slug}/
```

Thread URLs are discovered from Yahoo Search results in Phase 1B. Extract the actual Reddit URLs from the search snippets.

### Opening a Thread

```bash
# Open the Reddit thread
agent-browser open "https://www.reddit.com/r/SwagBucks/comments/abc123/thread_title/"

# Wait for content to load — Reddit is JS-heavy
agent-browser wait --load networkidle
agent-browser wait 2000

# Take initial snapshot to check for modals/blockers
agent-browser snapshot -i
```

### Handling Reddit Modals & Blockers

Reddit may show login prompts, cookie banners, or "use the app" modals:

```bash
# After snapshot, look for dismiss/close buttons
# Common patterns:
agent-browser snapshot -i -C

# Close cookie consent if present
# Look for buttons like "Accept", "Close", "X", "Continue"
agent-browser find text "Accept all" click    # Cookie banner
agent-browser find text "Continue" click       # Age gate or login prompt

# If a full-screen login modal blocks content:
agent-browser press Escape

# Re-snapshot after dismissing
agent-browser wait 1000
agent-browser snapshot -i
```

### Extracting Thread Data

```bash
# Get the full page text for parsing
agent-browser get text body > /tmp/thread_content.txt

# Snapshot interactive elements to find specific data
agent-browser snapshot -i

# Extract key data points from the page text:
# - Post title
# - Upvote count (look for numbers near vote buttons)
# - Comment count (usually in the thread header)
# - Post age/date
# - Author username
# - Post body text
# - Top comments and their text
```

### Taking Thread Screenshots

```bash
# Full page screenshot (captures entire thread with comments)
agent-browser screenshot --full

# Standard viewport screenshot (captures above-the-fold content)
agent-browser screenshot
```

**Important:** Always take full-page screenshots for evidence. These capture the thread title, vote count, post body, and top comments in a single image.

### Scrolling for More Content

```bash
# Scroll down to load more comments
agent-browser scroll down 1000
agent-browser wait 1000
agent-browser scroll down 1000
agent-browser wait 1000

# Take another screenshot of the comments section
agent-browser screenshot
```

### Selection Criteria: Critical Posts

Select 3-5 threads that demonstrate the most significant complaints:

| Priority | Criteria |
|----------|----------|
| **High** | Upvotes > 50, complaint keywords (banned, scam, DQ, not credited, rejected), many comments |
| **Medium** | Upvotes > 20, complaint keywords, within config.days window |
| **Low** | Any complaint thread with active discussion |

Keywords to prioritize:
- Account bans: "banned", "deactivated", "suspended", "fraud flag"
- Survey DQs: "disqualified", "DQ'd", "kicked out", "wasted time"
- Tracking: "not credited", "pending forever", "offer didn't track"
- Receipts: "rejected", "magic receipts", "invalid receipt"
- Support: "no response", "bot reply", "ignored", "ticket"
- Scam claims: "scam", "waste of time", "not worth it", "fraud"

### Selection Criteria: Positive Posts

Select 2-3 threads showing positive experiences:

| Priority | Criteria |
|----------|----------|
| **High** | Earnings reports with proof, tips/strategies, platform defense with engagement |
| **Medium** | "Worth it" testimonials, success stories |
| **Low** | Any positive thread with reasonable engagement |

Keywords to prioritize:
- Earnings: "earned $X", "payment proof", "cashed out", "lifetime earnings"
- Tips: "strategy", "how I earned", "best offers", "tips for"
- Defense: "legit", "not a scam", "worth it if", "patient"

## App Store Deep Review Scraping

### iOS App Store

```bash
# Navigate to the Swagbucks app page
agent-browser open "https://apps.apple.com/us/app/swagbucks-surveys-for-money/id640439547"
agent-browser wait --load networkidle
agent-browser wait 2000

# Snapshot to find review elements
agent-browser snapshot -i

# Scroll to the reviews section
agent-browser scroll down 2000
agent-browser wait 1000
agent-browser snapshot -i

# Look for "See All Ratings and Reviews" link
# Click it to expand the full reviews list
agent-browser find text "See All" click
agent-browser wait --load networkidle
agent-browser wait 1000

# Screenshot the reviews section
agent-browser screenshot --full

# Extract review text
agent-browser get text body > /tmp/ios_reviews.txt
```

### Google Play Store

```bash
# Navigate to the Swagbucks app page
agent-browser open "https://play.google.com/store/apps/details?id=com.prodege.swagbucksmobile"
agent-browser wait --load networkidle
agent-browser wait 2000

# Snapshot to find review elements
agent-browser snapshot -i

# Scroll to the reviews section
agent-browser scroll down 2000
agent-browser wait 1000
agent-browser snapshot -i

# Look for "See all reviews" button
agent-browser find text "See all reviews" click
agent-browser wait --load networkidle
agent-browser wait 1000

# Screenshot the reviews page
agent-browser screenshot --full

# Sort by most relevant or newest
agent-browser snapshot -i
# Look for sort dropdown and select "Most relevant" or "Newest"

# Extract review text
agent-browser get text body > /tmp/android_reviews.txt
```

### Capturing Individual Reviews

For both stores, capture screenshots of specific critical and positive reviews:

```bash
# After expanding reviews, snapshot to get element refs
agent-browser snapshot -i

# Identify individual review elements by their text/ratings
# Take targeted screenshots or use full page and crop mentally

# For critical reviews (1-2 stars):
# Look for low star ratings and complaint text
agent-browser screenshot --full
# Note: use full page screenshot and reference specific reviews in evidence caption

# For positive reviews (4-5 stars):
# Look for high star ratings and praise text
agent-browser screenshot --full
```

### Review Selection Criteria

**Critical Reviews (capture 3-5):**
- 1-2 star ratings
- Detailed complaint text (not just "bad app")
- Recent (within config.days window)
- Mentions specific issues: surveys, bans, tracking, receipts, support
- Has developer response (shows company engagement or lack thereof)

**Positive Reviews (capture 2-3):**
- 4-5 star ratings
- Detailed praise or earnings reports
- Recent
- Practical tips or balanced perspective
- High helpfulness votes (Google Play)

## Fallback Strategy

If agent-browser fails to load a page (e.g., Reddit anti-bot, rate limiting):

1. **Retry once** with a longer wait:
   ```bash
   agent-browser close
   agent-browser open "URL"
   agent-browser wait 5000
   ```

2. **If retry fails**, fall back gracefully:
   - Log the failure in the evidence section
   - Use the web_remote data from Phase 1A/1B instead
   - Note in the report: "Direct thread scraping unavailable — using search index data"

3. **Never block the report** on deep scrape failures — the existing web_remote data is always sufficient for a complete report

## Output Format

For each deep-scraped item, prepare this data structure for the report:

```
{
  type: "critical" | "positive",
  source: "reddit" | "ios" | "android",
  title: "Post/review title text",
  metadata: {
    upvotes: 245,         // Reddit only
    comments: 89,         // Reddit only
    age: "3 days ago",    // Relative age
    stars: 2,             // App store only
    author: "username",
    subreddit: "r/SwagBucks"  // Reddit only
  },
  screenshotPath: "/tmp/evidence_reddit_1.png",
  caption: "Brief explanation of why this post is significant",
  topComments: [          // Reddit only, top 3-5
    { text: "Comment text", upvotes: 45 },
    { text: "Another comment", upvotes: 32 }
  ]
}
```

Convert screenshots to base64 for embedding:
```bash
base64 -i /tmp/evidence_reddit_1.png > /tmp/evidence_reddit_1_b64.txt
```

Then use in evidence card HTML:
```html
<img src="data:image/png;base64,${BASE64}" alt="Reddit thread evidence" onclick="showFull(this)">
```
