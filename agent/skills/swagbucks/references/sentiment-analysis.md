# Sentiment Analysis Framework

## Classification Rules

### Negative Sentiment Indicators
- Explicit frustration: "scam", "waste of time", "don't bother", "terrible", "hate"
- Reporting leaving: "I quit", "uninstalled", "found something better", "switched to"
- Financial loss: "lost money", "never paid", "wasted time and money"
- Helplessness: "no one helps", "ignored", "can't reach support"
- Accusatory: "they cheat", "rigged", "fraud", "steal"
- Emotional: "infuriating", "frustrating", "angry", "furious"

### Mixed Sentiment Indicators
- Qualified positive: "it works but...", "used to be good", "decent if you..."
- Acknowledges both sides: "has pros and cons", "worth it if you're patient"
- Comparative: "better than X but worse than Y"
- Conditional: "only worth it for certain demographics"
- Resigned acceptance: "it is what it is", "don't expect much"

### Positive Sentiment Indicators
- Success reports: "earned $X", "paid out", "legitimate"
- Defending platform: "it's not a scam", "people don't understand how it works"
- Tips and optimization: "here's how to maximize earnings"
- Long-term satisfaction: "been using for years, still good"
- Recommending to others: "try it", "sign up", "worth it"

## Quantification

Count threads by sentiment category and calculate approximate distribution:

```
Negative %  = (negative threads / total threads) × 100
Mixed %     = (mixed threads / total threads) × 100
Positive %  = (positive threads / total threads) × 100
```

Report as a visual bar in the HTML report:
```html
<div class="sent-bar">
  <div class="seg" style="width:65%;background:var(--red);"></div>
  <div class="seg" style="width:25%;background:var(--yellow);"></div>
  <div class="seg" style="width:10%;background:var(--green);"></div>
</div>
```

## Per-Category Sentiment

Break down sentiment within each complaint category:

| Category | Typical Sentiment | Why |
|----------|------------------|-----|
| Survey DQs | 90% Negative | Time investment lost |
| Game Tracking | 85% Negative | Effort + sometimes money lost |
| Receipts | 80% Negative | Physical proof ignored |
| Account Bans | 95% Negative | Total loss, no recourse |
| Support | 75% Negative | Frustration amplifier |
| General | 60% Negative, 30% Mixed | Community debates value |

## Comparing App Store vs Reddit Sentiment

App store ratings (4.2-4.4) typically mask underlying issues because:
1. **Selection bias**: Happy users rate, frustrated users churn silently
2. **Rating inertia**: Historical high ratings dilute recent low ones
3. **Simple ratings**: 1-5 stars don't capture nuance
4. **Reddit is self-selected**: Active community members who engage enough to post

Always note this discrepancy in the findings section:
> "Reddit sentiment is significantly more negative than app store ratings suggest. The 4.2+ ratings mask a vocal, frustrated core user base."

## Reporting Integrity

- **Never fabricate data** — Only report threads and quotes that actually appear in search results
- **Note sample size** — "Based on N indexed threads" — be honest about the sample
- **Acknowledge limitations** — Yahoo snippets are partial; full thread context may differ
- **Use verbatim quotes** — Copy exact text from search results, don't paraphrase
- **Source every claim** — Every Reddit post cited must have a URL or title that can be traced
