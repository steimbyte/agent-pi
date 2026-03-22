// ABOUTME: Self-contained HTML template for the PR Review Report viewer.
// ABOUTME: Renders per-PR findings with severity badges, file paths, profile summary, and navigation for batch reviews.

export interface PrReviewFinding {
	severity: string;
	title: string;
	filePath?: string;
	lineRange?: string;
	detail: string;
	suggestion?: string;
	ruleApplied?: string;
}

export interface PrReviewReportData {
	title: string;
	url: string;
	summary: string;
	profileSummary: string[];
	findings: PrReviewFinding[];
	metadata?: {
		reviewedAt?: string;
		extractionMethod?: string;
		profileVersion?: number;
	};
}

export interface PrReviewBatchReport {
	reports: PrReviewReportData[];
	batchTitle: string;
}

export function generatePrReviewReportHTML(batch: PrReviewBatchReport, port: number): string {
	const state = JSON.stringify(batch).replace(/<\//g, "<\\/");

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${batch.batchTitle} — PR Review Report</title>
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
  .header .badge {
    color: var(--accent);
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border: 1px solid var(--accent);
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: var(--mono);
  }
  .header .title { font-size: 15px; font-weight: 600; flex: 1; }
  .header .stats { font-size: 12px; font-family: var(--mono); color: var(--text-muted); display: flex; gap: 12px; }
  .stat-ok { color: var(--success); }
  .stat-warn { color: var(--warning); }
  .stat-err { color: var(--error); }

  /* ── Content ─────────────────────────── */
  .content { flex: 1; overflow-y: auto; padding: 12px 16px 80px; }

  /* ── PR Tabs (batch nav) ─────────────── */
  .pr-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .pr-tab {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px 6px 0 0;
    padding: 8px 16px;
    font-size: 13px;
    font-family: var(--mono);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s;
  }
  .pr-tab:hover { color: var(--text); background: var(--surface2); }
  .pr-tab.active { color: var(--accent); border-bottom-color: var(--bg); background: var(--bg); font-weight: 600; }

  /* ── Overview Cards ──────────────────── */
  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
  }
  .stat-card .value { font-size: 24px; font-weight: 700; }
  .stat-card .label { font-size: 11px; color: var(--text-muted); font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.6px; margin-top: 4px; }

  /* ── Section ─────────────────────────── */
  .section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .section h2 {
    font-size: 13px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-family: var(--mono);
    font-weight: 700;
    margin-bottom: 12px;
  }
  .section p { color: var(--text-muted); font-size: 14px; margin-bottom: 8px; }
  .section a { color: var(--accent); text-decoration: none; }
  .section a:hover { text-decoration: underline; }

  /* ── Finding Card ────────────────────── */
  .finding {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 10px;
  }
  .finding-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .sev-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: var(--mono);
    white-space: nowrap;
  }
  .sev-badge.critical { color: var(--error); border: 1px solid var(--error); background: var(--error-bg); }
  .sev-badge.high { color: var(--warning); border: 1px solid var(--warning); background: var(--warning-bg); }
  .sev-badge.medium { color: var(--accent); border: 1px solid var(--accent); background: var(--accent-dim); }
  .sev-badge.low { color: var(--text-dim); border: 1px solid var(--text-dim); }
  .finding-title { font-size: 14px; font-weight: 600; }
  .finding-path { font-family: var(--mono); font-size: 12px; color: var(--accent); margin-bottom: 6px; }
  .finding-detail { font-size: 13px; color: var(--text-muted); line-height: 1.6; }
  .finding-suggestion {
    margin-top: 8px;
    padding: 10px 14px;
    background: var(--success-bg);
    border-left: 3px solid var(--success);
    border-radius: 0 6px 6px 0;
    font-size: 13px;
    color: var(--text-muted);
  }
  .finding-suggestion strong { color: var(--success); }

  /* ── Profile Summary ─────────────────── */
  .profile-rules { list-style: none; }
  .profile-rules li {
    padding: 4px 0;
    color: var(--text-muted);
    font-size: 13px;
  }
  .profile-rules li::before {
    content: "›";
    color: var(--accent);
    margin-right: 8px;
    font-weight: bold;
  }

  /* ── Footer ──────────────────────────── */
  .footer {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 12px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-shrink: 0;
  }
  .btn {
    padding: 8px 18px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    font-family: var(--font);
  }
  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-secondary { background: var(--surface2); color: var(--text-muted); border: 1px solid var(--border); }

  .no-findings {
    text-align: center;
    padding: 32px;
    color: var(--text-dim);
    font-size: 14px;
  }
  .no-findings .icon { font-size: 32px; margin-bottom: 8px; }
</style>
</head>
<body>
<div class="header">
  <span class="badge">PR Review</span>
  <span class="title" id="headerTitle"></span>
  <div class="stats" id="headerStats"></div>
</div>

<div class="content" id="content"></div>

<div class="footer">
  <button class="btn btn-secondary" id="copyBtn">Copy Report</button>
  <button class="btn btn-primary" id="doneBtn">Done</button>
</div>

<script>
const batch = ${state};
const PORT = ${port};
let activeTab = 0;

function escapeHtml(v) {
  return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderBatch() {
  document.getElementById('headerTitle').textContent = batch.batchTitle;

  const totalFindings = batch.reports.reduce((s, r) => s + r.findings.length, 0);
  const criticals = batch.reports.reduce((s, r) => s + r.findings.filter(f => f.severity === 'critical').length, 0);
  document.getElementById('headerStats').innerHTML =
    '<span>' + batch.reports.length + ' PR' + (batch.reports.length !== 1 ? 's' : '') + '</span>' +
    '<span class="stat-warn">' + totalFindings + ' findings</span>' +
    (criticals ? '<span class="stat-err">' + criticals + ' critical</span>' : '');

  const content = document.getElementById('content');
  let html = '';

  // Tabs for multiple PRs
  if (batch.reports.length > 1) {
    html += '<div class="pr-tabs">';
    batch.reports.forEach((r, i) => {
      const shortUrl = r.url.split('/').slice(-2).join('/');
      html += '<div class="pr-tab' + (i === activeTab ? ' active' : '') + '" data-tab="' + i + '">' + escapeHtml(shortUrl) + '</div>';
    });
    html += '</div>';
  }

  const report = batch.reports[activeTab];
  if (!report) { content.innerHTML = '<p>No reports available.</p>'; return; }

  // Overview cards
  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  report.findings.forEach(f => { sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1; });
  html += '<div class="overview-grid">';
  html += statCard(String(report.findings.length), 'Findings');
  html += statCard(String(sevCounts.critical), 'Critical', sevCounts.critical ? 'var(--error)' : undefined);
  html += statCard(String(sevCounts.high), 'High', sevCounts.high ? 'var(--warning)' : undefined);
  html += statCard(String(sevCounts.medium + sevCounts.low), 'Medium / Low');
  html += '</div>';

  // Summary
  html += '<div class="section"><h2>Summary</h2>';
  html += '<p><strong>PR:</strong> <a href="' + escapeHtml(report.url) + '" target="_blank">' + escapeHtml(report.title || report.url) + '</a></p>';
  html += '<p>' + escapeHtml(report.summary) + '</p>';
  if (report.metadata) {
    html += '<p style="font-size:12px;color:var(--text-dim);font-family:var(--mono);">Reviewed: ' + escapeHtml(report.metadata.reviewedAt || '') + ' · Method: ' + escapeHtml(report.metadata.extractionMethod || '') + '</p>';
  }
  html += '</div>';

  // Findings
  html += '<div class="section"><h2>Findings</h2>';
  if (report.findings.length === 0) {
    html += '<div class="no-findings"><div class="icon">✓</div>No issues found in this PR.</div>';
  } else {
    report.findings.forEach(f => {
      html += '<div class="finding">';
      html += '<div class="finding-header"><span class="sev-badge ' + escapeHtml(f.severity) + '">' + escapeHtml(f.severity) + '</span><span class="finding-title">' + escapeHtml(f.title) + '</span></div>';
      if (f.filePath) html += '<div class="finding-path">' + escapeHtml(f.filePath) + (f.lineRange ? ':' + escapeHtml(f.lineRange) : '') + '</div>';
      html += '<div class="finding-detail">' + escapeHtml(f.detail) + '</div>';
      if (f.suggestion) html += '<div class="finding-suggestion"><strong>Suggestion:</strong> ' + escapeHtml(f.suggestion) + '</div>';
      html += '</div>';
    });
  }
  html += '</div>';

  // Profile
  html += '<div class="section"><h2>Review Profile Applied</h2><ul class="profile-rules">';
  report.profileSummary.forEach(r => { html += '<li>' + escapeHtml(r) + '</li>'; });
  html += '</ul></div>';

  content.innerHTML = html;

  // Tab click handlers
  document.querySelectorAll('.pr-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = parseInt(tab.getAttribute('data-tab') || '0', 10);
      renderBatch();
    });
  });
}

function statCard(value, label, color) {
  const style = color ? 'color:' + color : '';
  return '<div class="stat-card"><div class="value" style="' + style + '">' + escapeHtml(value) + '</div><div class="label">' + escapeHtml(label) + '</div></div>';
}

// ── Actions ──────────────────────────────
document.getElementById('doneBtn').addEventListener('click', async () => {
  await fetch('http://127.0.0.1:' + PORT + '/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'done' }),
  });
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const report = batch.reports[activeTab];
  if (!report) return;
  let md = '# PR Review: ' + report.title + '\\n\\n';
  md += '**URL:** ' + report.url + '\\n\\n';
  md += '## Summary\\n' + report.summary + '\\n\\n';
  if (report.findings.length) {
    md += '## Findings\\n\\n';
    report.findings.forEach((f, i) => {
      md += (i + 1) + '. **[' + f.severity.toUpperCase() + '] ' + f.title + '**\\n';
      if (f.filePath) md += '   File: ' + f.filePath + '\\n';
      md += '   ' + f.detail + '\\n';
      if (f.suggestion) md += '   *Suggestion:* ' + f.suggestion + '\\n';
      md += '\\n';
    });
  }
  navigator.clipboard.writeText(md).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy Report'; }, 2000);
  });
});

renderBatch();
<\/script>
</body>
</html>`;
}
