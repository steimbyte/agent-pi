# HTML Report Template

This is the reference template for generating the Swagbucks validation report. The report is a single self-contained HTML file with embedded base64 screenshots.

## Build Process

1. Capture all screenshots via `web_test`
2. Convert each to base64: `base64 -i /path/to/screenshot.png > /tmp/name_b64.txt`
3. Use a bash heredoc script to inject base64 strings into the HTML template
4. Write the final file to `~/Desktop/swagbucks-validation-report.html`

## Shell Script Pattern

```bash
# Prepare base64 images
base64 -i <ios-screenshot>.png > /tmp/ios_b64.txt
base64 -i <android-screenshot>.png > /tmp/android_b64.txt
base64 -i <reddit-surveys-screenshot>.png > /tmp/reddit_surveys_b64.txt
base64 -i <reddit-bans-screenshot>.png > /tmp/reddit_bans_b64.txt

# Build report with variable injection
IOS_B64=$(cat /tmp/ios_b64.txt)
ANDROID_B64=$(cat /tmp/android_b64.txt)
REDDIT_SURVEYS_B64=$(cat /tmp/reddit_surveys_b64.txt)
REDDIT_BANS_B64=$(cat /tmp/reddit_bans_b64.txt)

cat > ~/Desktop/swagbucks-validation-report.html << HTMLEOF
<!DOCTYPE html>
<html lang="en">
...
<img src="data:image/png;base64,${IOS_B64}" alt="iOS App Store" onclick="showFull(this)">
...
HTMLEOF
```

## CSS Variables (Dark Theme)

```css
:root {
  --bg: #0d1117;
  --surface: #161b22;
  --surface2: #1c2129;
  --border: #30363d;
  --text: #e6edf3;
  --muted: #8b949e;
  --accent: #58a6ff;
  --green: #3fb950;
  --red: #f85149;
  --yellow: #d29922;
  --orange: #db6d28;
  --purple: #bc8cff;
}
```

## Required Sections

### 1. Header
- Title with emoji: "📱 Swagbucks Issue Validation Report"
- Subtitle describing scope
- Meta badges: date, severity, scope, method

### 2. Table of Contents
- Linked section list using anchor IDs

### 3. Key Metrics (4-column stat grid)
- iOS rating + count
- Android rating + count
- Android downloads
- Latest app version

### 4. Claim Validation Table
- Columns: Claim | Status (badge) | Evidence
- Status badges: `.s-ok` (green), `.s-err` (red), `.s-warn` (yellow), `.s-info` (blue)

### 5. Validation Score Summary (4-column stat grid)
- Confirmed count
- Incorrect count
- Validation rate %
- Data sources used

### 6. App Store Screenshots (2-column grid)
- iOS screenshot card with label + footer
- Android screenshot card with label + footer
- Both clickable for fullscreen zoom

### 7. App Store Reviews (stacked cards)
- Each card: star rating, reviewer name, date, platform
- Review text excerpt
- Category tags (`.t-survey`, `.t-track`, `.t-receipt`, `.t-support`, `.t-ban`)
- Helpfulness vote count
- Developer response quote block (if present)

### 8. Reddit Sentiment Analysis
- 3-stat overview: Dominant/Secondary/Minority sentiment
- Sentiment distribution bar (red/yellow/green segments with %)
- Per-category sections with Reddit post cards:
  - Post title (linked)
  - Excerpt text
  - Sentiment tag
  - Source meta line

### 9. Reddit Search Screenshots (2-column grid)
- Survey/tracking search results screenshot
- Ban/deactivation search results screenshot

### 10. Issue Pattern Cross-Reference Table
- Columns: Category | Document Claim | App Store Evidence | Reddit Evidence | Signal
- Signal badges: Critical (red), High (orange), Medium (yellow), Unverified (blue)

### 11. Findings & Corrections (icon list)
- Icon types: `.ok` (✓ green), `.err` (✗ red), `.warn` (! yellow), `.inf` (i blue)
- Each finding: bold title + muted description paragraph

### 12. Recommendations (numbered icon list)
- Numbered items with warning/info icons
- Bold action title + description

### 13. Footer
- Generation attribution
- Source URLs (linked)

## Interactive Features

### Fullscreen Screenshot Overlay
```html
<div class="overlay" id="ov" onclick="this.classList.remove('active')">
  <img id="ov-img" src="" alt="Full screenshot">
</div>

<script>
function showFull(img) {
  var o = document.getElementById('ov');
  var i = document.getElementById('ov-img');
  i.src = img.src;
  o.classList.add('active');
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') document.getElementById('ov').classList.remove('active');
});
</script>
```

## Tag Classes Reference

| Class | Color | Category |
|-------|-------|----------|
| `.t-survey` | Purple | Surveys / DQs |
| `.t-track` | Red | Game/Offer Tracking |
| `.t-receipt` | Yellow | Receipt Rejections |
| `.t-support` | Blue | Customer Support |
| `.t-ban` | Red (darker) | Account Bans |
| `.t-neg` | Red | Negative sentiment |
| `.t-mix` | Yellow | Mixed sentiment |
| `.t-pos` | Green | Positive sentiment |
