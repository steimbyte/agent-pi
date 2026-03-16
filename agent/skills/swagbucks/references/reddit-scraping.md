# Reddit Scraping Workaround

Reddit blocks headless browsers and returns "You've been blocked by network security" for direct access via `web_test`. This applies to:
- `reddit.com/r/SwagBucks/`
- `old.reddit.com/r/SwagBucks/`
- `reddit.com/r/SwagBucks.json`

Google and Bing also block headless browsers with CAPTCHAs.

## Working Method: Yahoo Search

Yahoo Search successfully indexes Reddit threads and returns rich snippets:

```
web_test {
  action: "content",
  url: "https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+<keywords>"
}
```

### Search Queries by Category

| Category | Search URL |
|----------|-----------|
| Survey DQs | `https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+survey+disqualified+banned+tracking` |
| Account Bans | `https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+banned+deactivated+account` |
| Game Tracking | `https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+game+tracking+not+credited+offer` |
| Receipts | `https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+receipt+rejected+magic+receipts` |
| Support | `https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+customer+support+help+ticket` |
| General Sentiment | `https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+scam+not+worth+waste+time` |

### What You Get from Yahoo

Each result contains:
- **Title**: The exact Reddit post title
- **URL**: The Reddit thread URL (can be used as a source link)
- **Excerpt**: 1-2 sentence snippet from the post body or top comment
- **Subreddit path**: Confirms it's from r/SwagBucks

### Extracting Data from Yahoo Results

The `web_test content` response contains page text in this format:

```
Reddit
www.reddit.com › r › SwagBucks
Post Title Here : r/SwagBucks - Reddit

Excerpt text from the post body or comment...
```

Parse each result block to extract:
1. Post title (the linked heading text)
2. Excerpt (the description text below)
3. URL slug (from the www.reddit.com path)

### Screenshot Evidence

Capture Yahoo search results as visual evidence:

```
web_test {
  action: "screenshot",
  url: "https://search.yahoo.com/search?p=site%3Areddit.com%2Fr%2FSwagBucks+survey+disqualified+banned+tracking",
  fullPage: true
}
```

These screenshots show the volume of Reddit threads on each topic, which itself is evidence of the complaint pattern's prevalence.

### Limitations

- Yahoo results are not real-time — they show indexed content which may lag days/weeks
- Upvote counts and comment counts are NOT available through Yahoo snippets
- Only ~7-10 results per page (can paginate but usually page 1 is sufficient)
- Cannot filter by date range precisely (Yahoo's `&t=` param is less reliable than Reddit's)

### Fallback: DuckDuckGo HTML Mode

If Yahoo is blocked, try DuckDuckGo's HTML-only mode (sometimes works):

```
web_test {
  action: "content",
  url: "https://html.duckduckgo.com/html/?q=site%3Areddit.com%2Fr%2FSwagBucks+<keywords>"
}
```

Note: DuckDuckGo may also show a CAPTCHA. Yahoo is the most reliable fallback as of March 2026.
