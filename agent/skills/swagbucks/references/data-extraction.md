# Data Extraction Reference

## iOS App Store Data Points

URL: `https://apps.apple.com/us/app/swagbucks-surveys-for-money/id640439547`

The `web_test content` response contains structured text. Key fields to extract:

```
148K RATINGS
4.4
AGES
13+
Years
CATEGORY
Lifestyle
DEVELOPER
Prodege LLC
LANGUAGE
EN
English
SIZE
117.4
MB
```

### Reviews Section

Look for the "Ratings & Reviews" section. Visible reviews appear as:

```
[Review Title]                                    [Date]
[Star Rating]                                     [Username]

[Review text body...]
```

Extract: title, date, star count, username, full review text.

### What's New Section

```
Version X.X.X
[Date]
```

### Information Section

```
Seller: [Company]
Size: [Size]
Category: [Category]
Compatibility: Requires iOS [version] or later.
Age Rating: [Rating]
Copyright: © [Year] [Company]
```

## Google Play Store Data Points

URL: `https://play.google.com/store/apps/details?id=com.prodege.swagbucksmobile`

The `web_test content` response contains:

```
[App Name]
[Developer]
Contains ads
[Rating]
star
[Count] reviews
[Downloads]
Downloads
[Content Rating]
```

### Reviews Section

Reviews appear with:
- Reviewer name
- Date
- Review text
- Helpfulness count (e.g., "553 people found this review helpful")
- Developer response (if any) with date

### Updated On

```
Updated on
[Date]
```

## Visual Verification

After extracting text, ALWAYS capture and read screenshots to verify:

1. `web_test screenshot` with `fullPage: true`
2. `Read` the PNG file to visually confirm:
   - Rating numbers match extracted text
   - Star distribution bars (visual ratio)
   - Review text is accurately captured
   - Developer responses are visible

## Cross-Referencing Protocol

For every data point, note:
- **Source**: Which store/search it came from
- **Date**: When it was captured
- **Confidence**: High (exact text match), Medium (visual match), Low (inferred)

When claims from the issue document don't match:
- Report the exact discrepancy
- Note which value is correct (live data takes precedence)
- Suggest correction for the issue document
