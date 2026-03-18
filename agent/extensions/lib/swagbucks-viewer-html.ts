// ABOUTME: Self-contained HTML template for the Swagbucks Report Viewer GUI window.
// ABOUTME: Two modes: "setup" for configuration controls, "report" for rich sentiment analysis display.

/**
 * Report section data for structured display.
 */
export interface SwagbucksReportData {
	title: string;
	generatedAt: string;
	config: {
		days: number;
		sources: Record<string, boolean>;
		categories: Record<string, boolean>;
		format: string;
		deepScrape?: {
			enabled: boolean;
			reddit: boolean;
			appStore: boolean;
		};
	};
	metrics?: {
		iosRating?: string;
		iosCount?: string;
		androidRating?: string;
		androidCount?: string;
		androidDownloads?: string;
		appVersion?: string;
	};
	sections?: Array<{
		id: string;
		title: string;
		type: "summary" | "metrics" | "reviews" | "sentiment" | "claims" | "findings" | "recommendations" | "screenshots" | "evidence" | "custom";
		content: string; // markdown or HTML
	}>;
}

/**
 * Generate the Swagbucks Setup page HTML.
 */
export function generateSwagbucksSetupHTML(opts: {
	port: number;
	title?: string;
}): string {
	const { port, title } = opts;
	const displayTitle = title || "Swagbucks Analysis";

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${displayTitle} — Setup</title>
<style>
  :root {
    --bg: #1a1d23;
    --surface: #1e2228;
    --surface2: #252a32;
    --border: #2e343e;
    --text: #e2e8f0;
    --text-muted: #8892a0;
    --text-dim: #555d6e;
    --accent: #2980b9;
    --accent-hover: #3a9ad5;
    --accent-dim: rgba(41, 128, 185, 0.12);
    --success: #48d889;
    --success-bg: rgba(72, 216, 137, 0.08);
    --warning: #f0b429;
    --warning-bg: rgba(240, 180, 41, 0.08);
    --error: #e85858;
    --error-bg: rgba(232, 88, 88, 0.08);
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    --mono: "SF Mono", "Fira Code", "JetBrains Mono", Consolas, monospace;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { height: 100%; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    font-size: 15px;
    line-height: 1.65;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Inline SVG icons ────────────────── */
  .icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; }
  .icon svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

  .source-icon-wrap {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 6px; flex-shrink: 0;
  }
  .source-icon-wrap svg { width: 16px; height: 16px; stroke: var(--text-muted); fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .source-item.active .source-icon-wrap { border-color: var(--success); }
  .source-item.active .source-icon-wrap svg { stroke: var(--success); }

  .format-icon-wrap {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; margin: 0 auto 8px;
  }
  .format-icon-wrap svg { width: 22px; height: 22px; stroke: var(--text-dim); fill: none; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  .format-option.selected .format-icon-wrap svg { stroke: var(--accent); }

  /* ── Header ──────────────────────────── */
  .header {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 6px;
    margin: 12px 16px 0;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
  }
  .header-logo { height: 20px; width: auto; image-rendering: pixelated; opacity: 0.6; flex-shrink: 0; }
  .header .badge {
    background: transparent; color: var(--accent);
    font-size: 11px; font-weight: 700; padding: 3px 10px;
    border: 1px solid var(--accent); border-radius: 4px;
    text-transform: uppercase; letter-spacing: 1px; font-family: var(--mono);
  }
  .header .title { font-size: 15px; font-weight: 600; color: var(--text); flex: 1; }
  .header .header-meta { font-size: 12px; font-family: var(--mono); color: var(--text-muted); }

  /* ── Content ─────────────────────────── */
  .content {
    flex: 1; overflow-y: auto; padding: 16px 24px 120px;
    max-width: 720px; margin: 0 auto; width: 100%;
  }

  /* ── Section blocks ──────────────────── */
  .section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 0 8px 8px 0;
    padding: 20px 24px 16px;
    margin: 20px 0;
    position: relative;
    animation: fadeIn 0.3s ease backwards;
  }
  .section:nth-child(1) { animation-delay: 0s; }
  .section:nth-child(2) { animation-delay: 0.05s; }
  .section:nth-child(3) { animation-delay: 0.1s; }
  .section:nth-child(4) { animation-delay: 0.15s; }
  .section .section-number {
    position: absolute; top: -12px; left: 16px;
    background: var(--accent); color: var(--bg);
    font-size: 11px; font-weight: 700; font-family: var(--mono);
    padding: 3px 12px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: 0.8px;
  }
  .section h2 {
    font-size: 16px; color: var(--accent);
    text-transform: uppercase; letter-spacing: 0.8px;
    font-family: var(--mono); font-weight: 700;
    margin: 4px 0 12px;
  }
  .section p { color: var(--text-muted); font-size: 14px; margin: 8px 0; }

  /* ── Time interval selector ──────────── */
  .interval-group { display: flex; gap: 10px; margin: 16px 0; }
  .interval-btn {
    flex: 1; padding: 14px 16px;
    background: var(--surface2); border: 2px solid var(--border); border-radius: 8px;
    color: var(--text-muted); font-family: var(--mono); font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.2s; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
  }
  .interval-btn:hover { border-color: var(--accent); color: var(--text); background: var(--accent-dim); }
  .interval-btn.selected { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
  .interval-btn .interval-days { font-size: 28px; font-weight: 700; line-height: 1; }
  .interval-btn .interval-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-dim); }
  .interval-btn.selected .interval-label { color: var(--accent); }

  /* ── Source toggles ──────────────────── */
  .source-list { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
  .source-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 6px;
    cursor: pointer; transition: all 0.15s; border-left: 2px solid transparent;
  }
  .source-item:hover { background: rgba(78, 205, 196, 0.06); border-left-color: var(--accent); }
  .source-item.active { border-left-color: var(--success); }
  .source-item input[type="checkbox"] {
    appearance: none; width: 16px; height: 16px;
    border: 1.5px solid var(--text-dim); border-radius: 3px;
    cursor: pointer; flex-shrink: 0; position: relative; transition: all 0.15s;
  }
  .source-item input[type="checkbox"]:hover { border-color: var(--accent); }
  .source-item input[type="checkbox"]:checked { background: var(--success); border-color: var(--success); }
  .source-item input[type="checkbox"]:checked::after {
    content: ""; position: absolute; top: 1px; left: 4px;
    width: 5px; height: 8px;
    border: solid #1a1d23; border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  .source-item .source-info { flex: 1; }
  .source-item .source-name { font-size: 14px; font-weight: 600; color: var(--text); }
  .source-item .source-desc { font-size: 12px; color: var(--text-dim); font-family: var(--mono); }

  /* ── Category chips ──────────────────── */
  .category-grid { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
  .category-chip {
    padding: 6px 14px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 20px;
    font-size: 13px; color: var(--text-muted);
    cursor: pointer; transition: all 0.15s; font-weight: 500;
    user-select: none; display: inline-flex; align-items: center; gap: 6px;
  }
  .category-chip:hover { border-color: var(--accent); color: var(--text); }
  .category-chip.selected { border-color: var(--accent); background: var(--accent-dim); color: var(--accent); }
  .category-chip svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

  /* ── Output format ───────────────────── */
  .format-options { display: flex; gap: 10px; margin: 12px 0; }
  .format-option {
    flex: 1; padding: 14px 14px 12px;
    background: var(--surface2); border: 2px solid var(--border); border-radius: 8px;
    cursor: pointer; transition: all 0.2s; text-align: center;
  }
  .format-option:hover { border-color: var(--accent); }
  .format-option.selected { border-color: var(--accent); background: var(--accent-dim); }
  .format-option .format-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .format-option .format-desc { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
  .format-option.selected .format-name { color: var(--accent); }

  /* ── Deep Scrape Toggle ──────────────── */
  .deep-scrape-toggle {
    display: flex; align-items: center; gap: 14px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    padding: 16px 20px; margin: 12px 0; cursor: pointer; transition: all 0.15s;
  }
  .deep-scrape-toggle:hover { border-color: var(--accent); }
  .deep-scrape-toggle.active { border-color: var(--success); background: var(--success-bg); }
  .deep-scrape-toggle input[type="checkbox"] { display: none; }
  .toggle-switch {
    width: 44px; height: 24px; background: var(--border); border-radius: 12px;
    position: relative; transition: background 0.2s; flex-shrink: 0;
  }
  .toggle-switch::after {
    content: ''; position: absolute; top: 3px; left: 3px;
    width: 18px; height: 18px; background: var(--text-dim); border-radius: 50%;
    transition: all 0.2s;
  }
  .deep-scrape-toggle.active .toggle-switch { background: var(--success); }
  .deep-scrape-toggle.active .toggle-switch::after { left: 23px; background: white; }
  .toggle-info { flex: 1; }
  .toggle-info .toggle-name { font-size: 14px; font-weight: 600; color: var(--text); }
  .toggle-info .toggle-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
  .toggle-badge {
    font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;
    font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.5px;
    background: var(--accent-dim); color: var(--accent); border: 1px solid var(--accent);
  }
  .deep-scrape-sub {
    margin: 12px 0 0 0; padding: 0;
  }
  .deep-scrape-sub label {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 16px; background: var(--surface2); border: 1px solid var(--border);
    border-radius: 6px; margin: 6px 0; cursor: pointer; transition: all 0.15s;
  }
  .deep-scrape-sub label:hover { border-color: var(--text-dim); }
  .deep-scrape-sub label.active { border-color: var(--success); }
  .deep-scrape-sub label .sub-icon {
    width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    background: var(--surface); border: 1px solid var(--border); border-radius: 6px; flex-shrink: 0;
  }
  .deep-scrape-sub label.active .sub-icon { border-color: var(--success); }
  .deep-scrape-sub label .sub-icon svg { width: 14px; height: 14px; stroke: var(--text-muted); fill: none; stroke-width: 1.8; }
  .deep-scrape-sub label.active .sub-icon svg { stroke: var(--success); }
  .deep-scrape-sub input[type="checkbox"] { display: none; }
  .sub-info .sub-name { font-size: 13px; font-weight: 500; color: var(--text); }
  .sub-info .sub-desc { font-size: 11px; color: var(--text-dim); }
  .deep-scrape-note {
    font-size: 11px; color: var(--text-dim); margin-top: 10px;
    padding: 8px 12px; background: var(--accent-dim); border-radius: 6px;
    border-left: 3px solid var(--accent);
  }

  /* ── Summary preview ─────────────────── */
  .preview-box {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    padding: 16px; margin: 16px 0 0;
    font-family: var(--mono); font-size: 12px; color: var(--text-dim); line-height: 1.7;
  }
  .preview-box .pv-label { color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-size: 11px; }
  .preview-box .pv-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .preview-box .pv-key { color: var(--text-muted); }
  .preview-box .pv-val { color: var(--text); font-weight: 600; }
  .preview-box .pv-val.accent { color: var(--accent); }

  /* ── Footer ──────────────────────────── */
  .footer-wrapper { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; display: flex; flex-direction: column; }
  .footer {
    background: var(--surface); border-top: 1px solid var(--border);
    padding: 10px 20px; display: flex; align-items: center; gap: 8px;
  }
  .footer .spacer { flex: 1; }
  .footer .hint { font-size: 12px; color: var(--text-dim); font-family: var(--mono); }
  .footer .hint kbd {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 3px;
    padding: 2px 6px; font-size: 11px; color: var(--text-muted); font-family: var(--mono);
  }
  .btn {
    padding: 7px 18px; border-radius: 4px; font-size: 13px; font-weight: 500;
    cursor: pointer; border: 1px solid var(--border); background: var(--surface2);
    color: var(--text-muted); transition: all 0.15s; font-family: var(--font);
    display: inline-flex; align-items: center; gap: 6px;
  }
  .btn:hover { background: var(--border); color: var(--text); }
  .btn-primary { background: transparent; color: var(--accent); border-color: var(--accent); font-weight: 600; }
  .btn-primary:hover { background: var(--accent-dim); color: var(--accent-hover); }
  .btn-success { background: transparent; color: var(--success); border-color: var(--success); font-weight: 600; }
  .btn-success:hover { background: var(--success-bg); }
  .btn-ghost { background: transparent; border-color: transparent; color: var(--text-dim); font-size: 12px; }
  .btn-ghost:hover { color: var(--text-muted); background: var(--surface2); }
  .btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <img class="header-logo" src="/logo.png" alt="Pi" onerror="this.style.display='none'">
  <span class="badge">Setup</span>
  <div class="title">${displayTitle}</div>
  <div class="header-meta" id="header-meta">Configure &amp; run</div>
</div>

<!-- Content -->
<div class="content">

  <!-- 1. Time Interval -->
  <div class="section">
    <div class="section-number">1 — Interval</div>
    <h2>Review Window</h2>
    <p>How far back should we look at app store reviews and Reddit threads?</p>
    <div class="interval-group">
      <button class="interval-btn" data-days="30" onclick="selectInterval(this)">
        <span class="interval-days">30</span>
        <span class="interval-label">days</span>
      </button>
      <button class="interval-btn selected" data-days="50" onclick="selectInterval(this)">
        <span class="interval-days">50</span>
        <span class="interval-label">days</span>
      </button>
      <button class="interval-btn" data-days="90" onclick="selectInterval(this)">
        <span class="interval-days">90</span>
        <span class="interval-label">days</span>
      </button>
    </div>
  </div>

  <!-- 2. Data Sources -->
  <div class="section">
    <div class="section-number">2 — Sources</div>
    <h2>Data Sources</h2>
    <p>Which platforms should be scraped for review data?</p>
    <div class="source-list">
      <label class="source-item active">
        <input type="checkbox" checked data-source="ios">
        <div class="source-icon-wrap">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/><path d="M15.5 8.5c-.7-.8-1.7-1-2.5-.8-.6.1-1.1.5-1.5.5s-1-.4-1.7-.4c-1.3 0-2.6.8-3.3 2.1-1.4 2.5-.4 6.2 1 8.2.7 1 1.5 2 2.5 2 1 0 1.4-.6 2.5-.6s1.5.6 2.5.6 1.7-1 2.4-2c.5-.7.9-1.4 1.1-2.1-1.3-.5-2.2-1.8-2.2-3.3 0-1.3.7-2.4 1.7-3"/><circle cx="12" cy="5" r="1.5"/></svg>
        </div>
        <div class="source-info">
          <div class="source-name">iOS App Store</div>
          <div class="source-desc">apps.apple.com/us/app/id640439547</div>
        </div>
      </label>
      <label class="source-item active">
        <input type="checkbox" checked data-source="android">
        <div class="source-icon-wrap">
          <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
        <div class="source-info">
          <div class="source-name">Google Play Store</div>
          <div class="source-desc">play.google.com/store/apps/details?id=com.prodege.swagbucksmobile</div>
        </div>
      </label>
      <label class="source-item active">
        <input type="checkbox" checked data-source="reddit">
        <div class="source-icon-wrap">
          <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5A8.48 8.48 0 0 1 21 11v.5z"/></svg>
        </div>
        <div class="source-info">
          <div class="source-name">Reddit r/SwagBucks</div>
          <div class="source-desc">via Yahoo Search indexing</div>
        </div>
      </label>
    </div>
  </div>

  <!-- 3. Complaint Categories -->
  <div class="section">
    <div class="section-number">3 — Categories</div>
    <h2>Complaint Categories</h2>
    <p>Which issue categories should the analysis focus on?</p>
    <div class="category-grid">
      <span class="category-chip selected" data-cat="surveys" onclick="toggleChip(this)">
        <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        Survey DQs
      </span>
      <span class="category-chip selected" data-cat="tracking" onclick="toggleChip(this)">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Game Tracking
      </span>
      <span class="category-chip selected" data-cat="receipts" onclick="toggleChip(this)">
        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Magic Receipts
      </span>
      <span class="category-chip selected" data-cat="bans" onclick="toggleChip(this)">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        Account Bans
      </span>
      <span class="category-chip selected" data-cat="support" onclick="toggleChip(this)">
        <svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        Customer Support
      </span>
      <span class="category-chip selected" data-cat="sentiment" onclick="toggleChip(this)">
        <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        General Sentiment
      </span>
    </div>
  </div>

  <!-- 4. Output Format -->
  <div class="section">
    <div class="section-number">4 — Output</div>
    <h2>Report Format</h2>
    <p>How should the validation report be delivered?</p>
    <div class="format-options">
      <div class="format-option selected" data-format="viewer" onclick="selectFormat(this)">
        <div class="format-icon-wrap">
          <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div class="format-name">Interactive Viewer</div>
        <div class="format-desc">Rich browser report</div>
      </div>
      <div class="format-option" data-format="email" onclick="selectFormat(this)">
        <div class="format-icon-wrap">
          <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
        </div>
        <div class="format-name">Email Report</div>
        <div class="format-desc">Send via AgentMail</div>
      </div>
      <div class="format-option" data-format="both" onclick="selectFormat(this)">
        <div class="format-icon-wrap">
          <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><polyline points="16 2 12 7 8 2"/></svg>
        </div>
        <div class="format-name">Both</div>
        <div class="format-desc">Viewer + email delivery</div>
      </div>
    </div>
  </div>

  <!-- 5. Deep Scrape -->
  <div class="section">
    <div class="section-number">5 — Deep Scrape</div>
    <h2>Agent-Browser Evidence Collection</h2>
    <p>Use headless browser automation to capture rich evidence from Reddit threads and app store reviews — screenshots, upvotes, comments, and full thread content.</p>
    <div class="deep-scrape-toggle active" onclick="toggleDeepScrape(this)">
      <input type="checkbox" checked id="deep-scrape-enabled">
      <div class="toggle-switch"></div>
      <div class="toggle-info">
        <div class="toggle-name">Enable Deep Scraping</div>
        <div class="toggle-desc">Navigate actual Reddit threads and app store pages for richer data and visual proof</div>
      </div>
      <span class="toggle-badge">+3-5 min</span>
    </div>
    <div id="deep-scrape-options">
      <div class="deep-scrape-sub">
        <label class="active" id="ds-reddit-label">
          <input type="checkbox" checked id="ds-reddit" onchange="toggleDeepScrapeOption(this, 'reddit')">
          <div class="sub-icon">
            <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5A8.48 8.48 0 0 1 21 11v.5z"/></svg>
          </div>
          <div class="sub-info">
            <div class="sub-name">Reddit Thread Screenshots</div>
            <div class="sub-desc">Capture critical complaint &amp; positive testimonial threads with upvotes, comments, and full content</div>
          </div>
        </label>
        <label class="active" id="ds-appstore-label">
          <input type="checkbox" checked id="ds-appstore" onchange="toggleDeepScrapeOption(this, 'appStore')">
          <div class="sub-icon">
            <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          </div>
          <div class="sub-info">
            <div class="sub-name">App Store Review Evidence</div>
            <div class="sub-desc">Expand and screenshot critical &amp; positive reviews from iOS App Store and Google Play</div>
          </div>
        </label>
      </div>
      <div class="deep-scrape-note">
        💡 Deep scraping opens actual pages via agent-browser for richer evidence. This adds ~3-5 minutes but provides thread screenshots, upvote counts, comment counts, and expanded review text that web_test alone can't capture.
      </div>
    </div>
  </div>

  <!-- Preview -->
  <div class="preview-box" id="preview">
    <div class="pv-label">Analysis Preview</div>
    <div class="pv-row"><span class="pv-key">Review window</span><span class="pv-val accent" id="pv-days">Last 50 days</span></div>
    <div class="pv-row"><span class="pv-key">Sources</span><span class="pv-val" id="pv-sources">iOS App Store, Google Play, Reddit</span></div>
    <div class="pv-row"><span class="pv-key">Categories</span><span class="pv-val" id="pv-cats">6 of 6 selected</span></div>
    <div class="pv-row"><span class="pv-key">Output</span><span class="pv-val" id="pv-format">Interactive Viewer</span></div>
    <div class="pv-row"><span class="pv-key">Deep scrape</span><span class="pv-val" id="pv-deep" style="color:var(--success)">Enabled (Reddit + App Store)</span></div>
    <div class="pv-row"><span class="pv-key">Est. runtime</span><span class="pv-val" id="pv-time">~5-8 minutes</span></div>
  </div>

</div>

<!-- Footer -->
<div class="footer-wrapper">
  <div class="footer">
    <span class="hint"><kbd>1</kbd>-<kbd>5</kbd> Jump to section &nbsp; <kbd>Ctrl+Enter</kbd> Run</span>
    <span class="spacer"></span>
    <button class="btn btn-ghost" onclick="resetDefaults()">Reset</button>
    <button class="btn" onclick="cancelSetup()">Cancel</button>
    <button class="btn btn-success" id="run-btn" onclick="runAnalysis()">
      <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Run Analysis
    </button>
  </div>
</div>

<script>
  var API = 'http://127.0.0.1:${port}';

  var state = {
    days: 50,
    sources: { ios: true, android: true, reddit: true },
    categories: { surveys: true, tracking: true, receipts: true, bans: true, support: true, sentiment: true },
    format: 'viewer',
    deepScrape: { enabled: true, reddit: true, appStore: true }
  };

  function selectInterval(btn) {
    document.querySelectorAll('.interval-btn').forEach(function(b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
    state.days = parseInt(btn.dataset.days);
    updatePreview();
  }

  document.querySelectorAll('.source-item input[type="checkbox"]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      var item = cb.closest('.source-item');
      item.classList.toggle('active', cb.checked);
      state.sources[cb.dataset.source] = cb.checked;
      updatePreview();
    });
  });

  function toggleChip(chip) {
    chip.classList.toggle('selected');
    state.categories[chip.dataset.cat] = chip.classList.contains('selected');
    updatePreview();
  }

  function selectFormat(opt) {
    document.querySelectorAll('.format-option').forEach(function(o) { o.classList.remove('selected'); });
    opt.classList.add('selected');
    state.format = opt.dataset.format;
    updatePreview();
  }

  function toggleDeepScrape(el) {
    state.deepScrape.enabled = !state.deepScrape.enabled;
    el.classList.toggle('active', state.deepScrape.enabled);
    document.getElementById('deep-scrape-enabled').checked = state.deepScrape.enabled;
    var opts = document.getElementById('deep-scrape-options');
    opts.style.display = state.deepScrape.enabled ? 'block' : 'none';
    if (!state.deepScrape.enabled) {
      state.deepScrape.reddit = false;
      state.deepScrape.appStore = false;
    } else {
      state.deepScrape.reddit = true;
      state.deepScrape.appStore = true;
      document.getElementById('ds-reddit').checked = true;
      document.getElementById('ds-appstore').checked = true;
      document.getElementById('ds-reddit-label').classList.add('active');
      document.getElementById('ds-appstore-label').classList.add('active');
    }
    updatePreview();
  }

  function toggleDeepScrapeOption(cb, key) {
    state.deepScrape[key] = cb.checked;
    cb.closest('label').classList.toggle('active', cb.checked);
    if (!state.deepScrape.reddit && !state.deepScrape.appStore) {
      state.deepScrape.enabled = false;
      document.querySelector('.deep-scrape-toggle').classList.remove('active');
      document.getElementById('deep-scrape-enabled').checked = false;
    }
    updatePreview();
  }

  function updatePreview() {
    document.getElementById('pv-days').textContent = 'Last ' + state.days + ' days';
    var names = [];
    if (state.sources.ios) names.push('iOS App Store');
    if (state.sources.android) names.push('Google Play');
    if (state.sources.reddit) names.push('Reddit');
    document.getElementById('pv-sources').textContent = names.join(', ') || 'None selected';
    var catCount = Object.values(state.categories).filter(Boolean).length;
    document.getElementById('pv-cats').textContent = catCount + ' of 6 selected';
    var fmtMap = { viewer: 'Interactive Viewer', email: 'Email via AgentMail', both: 'Viewer + Email delivery' };
    document.getElementById('pv-format').textContent = fmtMap[state.format];

    // Deep scrape preview
    var deepEl = document.getElementById('pv-deep');
    if (state.deepScrape.enabled) {
      var dNames = [];
      if (state.deepScrape.reddit) dNames.push('Reddit');
      if (state.deepScrape.appStore) dNames.push('App Store');
      deepEl.textContent = 'Enabled (' + (dNames.join(' + ') || 'None') + ')';
      deepEl.style.color = 'var(--success)';
    } else {
      deepEl.textContent = 'Disabled';
      deepEl.style.color = 'var(--text-dim)';
    }

    // Runtime estimate
    var srcCount = Object.values(state.sources).filter(Boolean).length;
    var baseMin = srcCount;
    var baseMax = srcCount + 1;
    if (state.deepScrape.enabled) {
      var deepExtra = 0;
      if (state.deepScrape.reddit) deepExtra += 3;
      if (state.deepScrape.appStore) deepExtra += 2;
      baseMin += deepExtra;
      baseMax += deepExtra;
    }
    document.getElementById('pv-time').textContent = '~' + baseMin + '-' + baseMax + ' minutes';
  }

  function resetDefaults() {
    state = { days: 50, sources: { ios: true, android: true, reddit: true }, categories: { surveys: true, tracking: true, receipts: true, bans: true, support: true, sentiment: true }, format: 'viewer', deepScrape: { enabled: true, reddit: true, appStore: true } };
    document.querySelectorAll('.interval-btn').forEach(function(b) { b.classList.toggle('selected', b.dataset.days === '50'); });
    document.querySelectorAll('.source-item input[type="checkbox"]').forEach(function(cb) { cb.checked = true; cb.closest('.source-item').classList.add('active'); });
    document.querySelectorAll('.category-chip').forEach(function(c) { c.classList.add('selected'); });
    document.querySelectorAll('.format-option').forEach(function(o) { o.classList.toggle('selected', o.dataset.format === 'viewer'); });
    // Reset deep scrape
    document.querySelector('.deep-scrape-toggle').classList.add('active');
    document.getElementById('deep-scrape-enabled').checked = true;
    document.getElementById('deep-scrape-options').style.display = 'block';
    document.getElementById('ds-reddit').checked = true;
    document.getElementById('ds-appstore').checked = true;
    document.getElementById('ds-reddit-label').classList.add('active');
    document.getElementById('ds-appstore-label').classList.add('active');
    updatePreview();
  }

  function cancelSetup() {
    fetch(API + '/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancelled' })
    }).then(function() { window.close(); }).catch(function() { window.close(); });
  }

  function runAnalysis() {
    var btn = document.getElementById('run-btn');
    btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Sending config...';
    btn.disabled = true;
    btn.style.opacity = '0.6';

    fetch(API + '/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run', config: state })
    }).then(function(res) {
      if (res.ok) {
        btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><polyline points="20 6 9 17 4 12"/></svg> Analysis started';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
        document.getElementById('header-meta').textContent = 'Running...';
        setTimeout(function() { window.close(); }, 1200);
      }
    }).catch(function() {
      btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Analysis';
      btn.disabled = false;
      btn.style.opacity = '1';
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') cancelSetup();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runAnalysis();
    var sections = document.querySelectorAll('.section');
    var num = parseInt(e.key);
    if (num >= 1 && num <= sections.length) sections[num - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  updatePreview();
</script>
</body>
</html>`;
}


/**
 * Generate the Swagbucks Report Viewer HTML.
 * This is the rich interactive report that displays after analysis is complete.
 */
export function generateSwagbucksReportHTML(opts: {
	report: SwagbucksReportData;
	port: number;
}): string {
	const { report, port } = opts;
	const escapedReport = JSON.stringify(report).replace(/<\//g, '<\\/');


	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${report.title} — Report Viewer</title>
<style>
  :root {
    --bg: #1a1d23;
    --surface: #1e2228;
    --surface2: #252a32;
    --border: #2e343e;
    --text: #e2e8f0;
    --text-muted: #8892a0;
    --text-dim: #555d6e;
    --accent: #2980b9;
    --accent-hover: #3a9ad5;
    --accent-dim: rgba(41, 128, 185, 0.12);
    --success: #48d889;
    --success-bg: rgba(72, 216, 137, 0.08);
    --success-dim: rgba(72, 216, 137, 0.15);
    --warning: #f0b429;
    --warning-bg: rgba(240, 180, 41, 0.08);
    --error: #e85858;
    --error-bg: rgba(232, 88, 88, 0.08);
    --error-dim: rgba(232, 88, 88, 0.15);
    --purple: #bc8cff;
    --purple-dim: rgba(188, 140, 255, 0.12);
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    --mono: "SF Mono", "Fira Code", "JetBrains Mono", Consolas, monospace;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { height: 100%; }
  body {
    background: var(--bg); color: var(--text);
    font-family: var(--font); font-size: 15px; line-height: 1.65;
    height: 100%; display: flex; flex-direction: column; overflow: hidden;
  }

  /* ── Header ──────────────────────────── */
  .header {
    background: var(--surface); border: 1px solid var(--border);
    border-left: 3px solid var(--accent); border-radius: 6px;
    margin: 12px 16px 0; padding: 14px 20px;
    display: flex; align-items: center; gap: 14px;
    flex-shrink: 0;
  }
  .header-logo { height: 20px; width: auto; image-rendering: pixelated; opacity: 0.6; flex-shrink: 0; }
  .header .badge {
    background: transparent; color: var(--success);
    font-size: 11px; font-weight: 700; padding: 3px 10px;
    border: 1px solid var(--success); border-radius: 4px;
    text-transform: uppercase; letter-spacing: 1px; font-family: var(--mono);
  }
  .header .title { font-size: 15px; font-weight: 600; color: var(--text); flex: 1; }
  .header .header-meta { font-size: 12px; font-family: var(--mono); color: var(--text-muted); }

  /* ── Nav Sidebar ─────────────────────── */
  .layout { display: flex; flex: 1; min-height: 0; overflow: hidden; }
  .sidebar {
    width: 220px; flex-shrink: 0;
    background: var(--surface); border-right: 1px solid var(--border);
    padding: 16px 0; overflow-y: auto;
  }
  .sidebar-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: var(--text-dim); padding: 8px 16px 4px;
    font-family: var(--mono);
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 16px; cursor: pointer;
    color: var(--text-muted); font-size: 13px; font-weight: 500;
    transition: all 0.15s; border-left: 2px solid transparent;
  }
  .nav-item:hover { background: var(--accent-dim); color: var(--text); }
  .nav-item.active { border-left-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
  .nav-item svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
  .nav-item .nav-badge {
    margin-left: auto; font-size: 10px; font-family: var(--mono);
    padding: 1px 6px; border-radius: 8px;
    background: var(--surface2); color: var(--text-dim);
  }

  /* ── Main Content ────────────────────── */
  .main { flex: 1; overflow-y: auto; padding: 20px 32px 100px; }

  /* ── Section blocks ──────────────────── */
  .report-section {
    background: var(--surface); border: 1px solid var(--border);
    border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0;
    padding: 24px 28px 20px; margin: 0 0 24px;
    position: relative; animation: fadeIn 0.3s ease backwards;
  }
  .report-section .section-label {
    position: absolute; top: -12px; left: 16px;
    background: var(--accent); color: var(--bg);
    font-size: 11px; font-weight: 700; font-family: var(--mono);
    padding: 3px 12px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: 0.8px;
  }
  .report-section h2 {
    font-size: 16px; color: var(--accent);
    text-transform: uppercase; letter-spacing: 0.8px;
    font-family: var(--mono); font-weight: 700;
    margin: 4px 0 16px;
  }

  /* ── Metrics Grid ────────────────────── */
  .metrics-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px; margin: 16px 0;
  }
  .metric-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    padding: 16px; text-align: center;
  }
  .metric-card .metric-value {
    font-size: 28px; font-weight: 700; color: var(--accent); line-height: 1;
    font-family: var(--mono);
  }
  .metric-card .metric-label {
    font-size: 11px; color: var(--text-dim); text-transform: uppercase;
    letter-spacing: 0.8px; margin-top: 6px; font-family: var(--mono);
  }
  .metric-card .metric-sub {
    font-size: 11px; color: var(--text-muted); margin-top: 2px;
  }
  .metric-card.positive .metric-value { color: var(--success); }
  .metric-card.warning .metric-value { color: var(--warning); }
  .metric-card.negative .metric-value { color: var(--error); }

  /* ── Sentiment Bar ───────────────────── */
  .sentiment-bar-wrap { margin: 16px 0; }
  .sentiment-bar {
    display: flex; height: 24px; border-radius: 6px; overflow: hidden;
    border: 1px solid var(--border);
  }
  .sentiment-bar .seg { display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; font-family: var(--mono); color: var(--bg); transition: width 0.5s ease; }
  .sentiment-bar .seg.neg { background: var(--error); }
  .sentiment-bar .seg.mix { background: var(--warning); }
  .sentiment-bar .seg.pos { background: var(--success); }
  .sentiment-legend { display: flex; gap: 16px; margin-top: 8px; }
  .sentiment-legend span { font-size: 12px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; }
  .sentiment-legend .dot { width: 8px; height: 8px; border-radius: 50%; }
  .sentiment-legend .dot.neg { background: var(--error); }
  .sentiment-legend .dot.mix { background: var(--warning); }
  .sentiment-legend .dot.pos { background: var(--success); }

  /* ── Review Cards ────────────────────── */
  .review-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    padding: 16px; margin: 8px 0; transition: border-color 0.15s;
  }
  .review-card:hover { border-color: var(--accent); }
  .review-card .review-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .review-card .review-source {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.8px; padding: 2px 8px; border-radius: 4px;
    font-family: var(--mono);
  }
  .review-card .review-source.ios { background: var(--accent-dim); color: var(--accent); }
  .review-card .review-source.android { background: var(--success-bg); color: var(--success); }
  .review-card .review-source.reddit { background: var(--purple-dim); color: var(--purple); }
  .review-card .review-stars { color: var(--warning); font-size: 13px; letter-spacing: 1px; }
  .review-card .review-author { font-size: 12px; color: var(--text-dim); margin-left: auto; font-family: var(--mono); }
  .review-card .review-text { font-size: 14px; color: var(--text-muted); line-height: 1.6; }
  .review-card .review-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .review-card .tag {
    font-size: 10px; padding: 2px 8px; border-radius: 10px;
    font-family: var(--mono); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .tag.t-survey { background: var(--purple-dim); color: var(--purple); }
  .tag.t-track { background: var(--error-bg); color: var(--error); }
  .tag.t-receipt { background: var(--warning-bg); color: var(--warning); }
  .tag.t-ban { background: var(--error-dim); color: var(--error); }
  .tag.t-support { background: var(--accent-dim); color: var(--accent); }
  .tag.t-general { background: rgba(142, 142, 142, 0.1); color: var(--text-muted); }
  .tag.t-neg { background: var(--error-bg); color: var(--error); }
  .tag.t-mix { background: var(--warning-bg); color: var(--warning); }
  .tag.t-pos { background: var(--success-bg); color: var(--success); }

  /* ── Claim Validation Table ──────────── */
  .claims-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  .claims-table th {
    background: var(--surface2); font-weight: 600; color: var(--accent);
    text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;
    font-family: var(--mono); padding: 10px 12px; text-align: left;
    border: 1px solid var(--border);
  }
  .claims-table td { padding: 10px 12px; border: 1px solid var(--border); color: var(--text-muted); vertical-align: top; }
  .status-badge {
    font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: 0.5px; font-family: var(--mono);
    display: inline-block;
  }
  .status-badge.confirmed { background: var(--success-bg); color: var(--success); border: 1px solid var(--success); }
  .status-badge.incorrect { background: var(--error-bg); color: var(--error); border: 1px solid var(--error); }
  .status-badge.partial { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning); }
  .status-badge.outdated { background: var(--accent-dim); color: var(--accent); border: 1px solid var(--accent); }

  /* ── Findings List ───────────────────── */
  .finding-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .finding-item:last-child { border-bottom: none; }
  .finding-icon {
    width: 24px; height: 24px; border-radius: 50%; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; font-weight: 700;
  }
  .finding-icon.ok { background: var(--success-bg); color: var(--success); }
  .finding-icon.err { background: var(--error-bg); color: var(--error); }
  .finding-icon.warn { background: var(--warning-bg); color: var(--warning); }
  .finding-icon.info { background: var(--accent-dim); color: var(--accent); }
  .finding-content .finding-title { font-size: 14px; font-weight: 600; color: var(--text); }
  .finding-content .finding-desc { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

  /* ── Screenshot Gallery ──────────────── */
  .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin: 12px 0; }
  .screenshot-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    overflow: hidden; cursor: pointer; transition: border-color 0.15s;
  }
  .screenshot-card:hover { border-color: var(--accent); }
  .screenshot-card img { width: 100%; display: block; }
  .screenshot-card .screenshot-label {
    padding: 8px 12px; font-size: 12px; color: var(--text-muted);
    font-family: var(--mono); border-top: 1px solid var(--border);
  }

  /* ── Evidence Gallery (Deep Scrape) ──── */
  .evidence-summary {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px; margin: 12px 0 20px;
  }
  .evidence-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 16px 0;
  }
  .evidence-column {}
  .evidence-column-title {
    font-size: 13px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.8px; font-family: var(--mono);
    padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;
    display: flex; align-items: center; gap: 8px;
  }
  .evidence-column-title.critical {
    color: var(--error); background: var(--error-bg); border: 1px solid rgba(232, 88, 88, 0.2);
  }
  .evidence-column-title.positive {
    color: var(--success); background: var(--success-bg); border: 1px solid rgba(72, 216, 137, 0.2);
  }
  .evidence-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    overflow: hidden; margin-bottom: 12px; transition: border-color 0.15s;
  }
  .evidence-card:hover { border-color: var(--accent); }
  .evidence-header {
    display: flex; align-items: center; gap: 8px; padding: 12px 14px;
    border-bottom: 1px solid var(--border);
  }
  .evidence-badge {
    font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: 0.5px; font-family: var(--mono);
  }
  .evidence-badge.critical { background: var(--error-bg); color: var(--error); border: 1px solid var(--error); }
  .evidence-badge.positive { background: var(--success-bg); color: var(--success); border: 1px solid var(--success); }
  .evidence-badge.neutral { background: var(--accent-dim); color: var(--accent); border: 1px solid var(--accent); }
  .evidence-source {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.8px; padding: 2px 8px; border-radius: 4px; font-family: var(--mono);
  }
  .evidence-source.reddit { background: var(--purple-dim); color: var(--purple); }
  .evidence-source.ios { background: var(--accent-dim); color: var(--accent); }
  .evidence-source.android { background: var(--success-bg); color: var(--success); }
  .evidence-metadata {
    padding: 8px 14px; font-size: 12px; color: var(--text-muted);
    font-family: var(--mono); background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  }
  .evidence-card img {
    width: 100%; display: block; cursor: pointer;
  }
  .evidence-caption {
    padding: 10px 14px; font-size: 13px; color: var(--text-muted);
    border-top: 1px solid var(--border); line-height: 1.5;
  }
  .thread-preview {
    padding: 10px 14px; border-top: 1px solid var(--border);
    background: var(--surface);
  }
  .thread-preview .thread-title {
    font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px;
  }
  .thread-preview .thread-comment {
    font-size: 12px; color: var(--text-dim); margin: 4px 0;
    padding-left: 12px; border-left: 2px solid var(--border);
  }

  @media (max-width: 768px) {
    .evidence-grid { grid-template-columns: 1fr; }
  }

  /* ── Fullscreen Overlay ──────────────── */
  .overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85); z-index: 9999;
    display: none; align-items: center; justify-content: center;
    cursor: pointer;
  }
  .overlay.active { display: flex; }
  .overlay img { max-width: 95%; max-height: 95%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.4); }

  /* ── Markdown rendering ──────────────── */
  .md-content h1, .md-content h2, .md-content h3 { color: var(--text); margin: 16px 0 8px; font-weight: 600; }
  .md-content h1 { font-size: 20px; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 8px; }
  .md-content h2 { font-size: 16px; color: var(--accent); text-transform: uppercase; letter-spacing: 0.8px; font-family: var(--mono); }
  .md-content h3 { font-size: 15px; }
  .md-content p { margin: 8px 0; color: var(--text-muted); font-size: 14px; }
  .md-content ul, .md-content ol { margin: 8px 0; padding-left: 24px; }
  .md-content li { margin: 4px 0; color: var(--text-muted); font-size: 14px; }
  .md-content code { background: var(--surface2); color: var(--accent); padding: 2px 6px; border-radius: 3px; font-family: var(--mono); font-size: 12px; }
  .md-content pre { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 16px; overflow-x: auto; margin: 12px 0; }
  .md-content pre code { background: none; padding: 0; color: var(--text-muted); }
  .md-content blockquote { border-left: 3px solid var(--accent); background: var(--accent-dim); padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 12px 0; }
  .md-content table { border-collapse: collapse; margin: 12px 0; width: 100%; font-size: 13px; }
  .md-content th, .md-content td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
  .md-content th { background: var(--surface); font-weight: 600; color: var(--accent); text-transform: uppercase; font-size: 11px; font-family: var(--mono); }
  .md-content td { color: var(--text-muted); }
  .md-content strong { color: var(--text); font-weight: 600; }
  .md-content a { color: var(--accent); text-decoration: none; }
  .md-content a:hover { text-decoration: underline; }

  /* ── Footer ──────────────────────────── */
  .footer {
    background: var(--surface); border-top: 1px solid var(--border);
    padding: 10px 20px; display: flex; align-items: center; gap: 8px;
    flex-shrink: 0;
  }
  .footer .spacer { flex: 1; }
  .footer .hint { font-size: 12px; color: var(--text-dim); font-family: var(--mono); }
  .btn {
    padding: 7px 18px; border-radius: 4px; font-size: 13px; font-weight: 500;
    cursor: pointer; border: 1px solid var(--border); background: var(--surface2);
    color: var(--text-muted); transition: all 0.15s; font-family: var(--font);
    display: inline-flex; align-items: center; gap: 6px;
  }
  .btn:hover { background: var(--border); color: var(--text); }
  .btn-primary { background: transparent; color: var(--accent); border-color: var(--accent); font-weight: 600; }
  .btn-primary:hover { background: var(--accent-dim); color: var(--accent-hover); }
  .btn-success { background: transparent; color: var(--success); border-color: var(--success); font-weight: 600; }
  .btn-success:hover { background: var(--success-bg); }
  .btn-ghost { background: transparent; border-color: transparent; color: var(--text-dim); font-size: 12px; }
  .btn-ghost:hover { color: var(--text-muted); background: var(--surface2); }
  .btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  /* ── Responsive ──────────────────────── */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .main { padding: 16px 16px 100px; }
    .metrics-grid { grid-template-columns: repeat(2, 1fr); }
    .screenshot-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <img class="header-logo" src="/logo.png" alt="Pi" onerror="this.style.display='none'">
  <span class="badge">Report</span>
  <div class="title" id="report-title">${report.title}</div>
  <div class="header-meta" id="header-meta"></div>
</div>

<!-- Layout -->
<div class="layout">
  <!-- Sidebar Nav -->
  <div class="sidebar" id="sidebar">
    <div class="sidebar-label">Sections</div>
  </div>

  <!-- Main Content -->
  <div class="main" id="main-content">
    <!-- Sections injected by JS -->
  </div>
</div>

<!-- Screenshot Overlay -->
<div class="overlay" id="ov" onclick="this.classList.remove('active')">
  <img id="ov-img" src="" alt="Full screenshot">
</div>

<!-- Footer -->
<div class="footer">
  <span class="hint" id="footer-hint"></span>
  <span class="spacer"></span>
  <button class="btn btn-ghost" onclick="copyReport()">
    <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    Copy
  </button>
  <button class="btn btn-ghost" onclick="saveDesktop()">
    <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    Save
  </button>
  <button class="btn btn-primary" onclick="exportStandalone()">
    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    Export
  </button>
  <button class="btn btn-success" onclick="closeViewer()">
    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
    Done
  </button>
</div>

<script>
  var API = 'http://127.0.0.1:${port}';
  var REPORT = JSON.parse(${JSON.stringify(escapedReport)});

  // ── Build Navigation ──────────────────
  function buildNav() {
    var sidebar = document.getElementById('sidebar');
    var sections = REPORT.sections || [];
    var iconMap = {
      summary: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      metrics: '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
      reviews: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      sentiment: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      claims: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
      findings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      recommendations: '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
      screenshots: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      evidence: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>',
      custom: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    sections.forEach(function(sec, i) {
      var item = document.createElement('div');
      item.className = 'nav-item' + (i === 0 ? ' active' : '');
      item.setAttribute('data-section', sec.id);
      item.innerHTML = (iconMap[sec.type] || iconMap.custom) + '<span>' + sec.title + '</span>';
      item.onclick = function() {
        document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
        item.classList.add('active');
        var target = document.getElementById('section-' + sec.id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      sidebar.appendChild(item);
    });
  }

  // ── Render Report Sections ────────────
  function renderReport() {
    var main = document.getElementById('main-content');
    var sections = REPORT.sections || [];

    document.getElementById('header-meta').textContent = REPORT.generatedAt || '';
    document.getElementById('footer-hint').textContent = sections.length + ' sections · ' + (REPORT.generatedAt || '');

    sections.forEach(function(sec, i) {
      var block = document.createElement('div');
      block.className = 'report-section';
      block.id = 'section-' + sec.id;
      block.style.animationDelay = (i * 0.05) + 's';

      var labelText = (i + 1) + ' — ' + sec.title;
      block.innerHTML = '<div class="section-label">' + labelText + '</div>' +
        '<h2>' + sec.title + '</h2>' +
        '<div class="md-content">' + sec.content + '</div>';

      main.appendChild(block);
    });

    // If no sections, show placeholder
    if (sections.length === 0) {
      main.innerHTML = '<div class="report-section"><h2>No report data</h2><p style="color:var(--text-muted)">The analysis has not generated any sections yet.</p></div>';
    }
  }

  // ── Screenshot Zoom ───────────────────
  function showFull(img) {
    var o = document.getElementById('ov');
    var i = document.getElementById('ov-img');
    i.src = img.src;
    o.classList.add('active');
  }

  // ── Scroll spy for nav highlighting ───
  function setupScrollSpy() {
    var main = document.getElementById('main-content');
    var sections = main.querySelectorAll('.report-section');
    main.addEventListener('scroll', function() {
      var scrollTop = main.scrollTop;
      var current = '';
      sections.forEach(function(sec) {
        if (sec.offsetTop - 80 <= scrollTop) current = sec.id.replace('section-', '');
      });
      if (current) {
        document.querySelectorAll('.nav-item').forEach(function(n) {
          n.classList.toggle('active', n.getAttribute('data-section') === current);
        });
      }
    });
  }

  // ── Actions ───────────────────────────
  function copyReport() {
    var text = document.getElementById('main-content').innerText;
    navigator.clipboard.writeText(text).then(function() {
      var btn = event.target.closest('.btn');
      var orig = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><polyline points="20 6 9 17 4 12"/></svg> Copied';
      setTimeout(function() { btn.innerHTML = orig; }, 1500);
    });
  }

  function saveDesktop() {
    fetch(API + '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: REPORT })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.ok) alert(data.message);
    });
  }

  function exportStandalone() {
    fetch(API + '/export-standalone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: REPORT })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.ok) alert(data.message);
    });
  }

  function closeViewer() {
    fetch(API + '/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'done' })
    }).then(function() { window.close(); }).catch(function() { window.close(); });
  }

  // ── Keyboard shortcuts ────────────────
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { var ov = document.getElementById('ov'); if (ov.classList.contains('active')) { ov.classList.remove('active'); } else { closeViewer(); } }
  });

  // ── Init ──────────────────────────────
  buildNav();
  renderReport();
  setupScrollSpy();
</script>
</body>
</html>`;
}
