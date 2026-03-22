// ABOUTME: Bitbucket PR review execution engine — applies profile rules to PR page content and produces structured findings.
// ABOUTME: Uses Chrome DevTools MCP (when available) or HTTP fallback to extract PR page content.

import type { PrReviewProfile } from "./pr-review-profile.ts";
import { ChromeDevtoolsMcpClient } from "./chrome-devtools-mcp.ts";

// ── Types ────────────────────────────────────────────────────────────

export interface PrReviewFinding {
	severity: string;
	title: string;
	filePath?: string;
	lineRange?: string;
	detail: string;
	suggestion?: string;
	ruleApplied?: string;
}

export interface PrReviewResult {
	url: string;
	title: string;
	summary: string;
	status: "reviewed" | "partial" | "failed";
	findings: PrReviewFinding[];
	metadata: {
		reviewedAt: string;
		profileVersion: number;
		rulesApplied: string[];
		extractionMethod: string;
	};
}

export interface PrPageContent {
	title: string;
	description: string;
	diffText: string;
	fileList: string[];
	comments: string[];
	rawHtml?: string;
}

// ── Page Content Extraction ──────────────────────────────────────────

async function extractWithCdp(url: string, client: ChromeDevtoolsMcpClient): Promise<PrPageContent> {
	// Navigate to PR page
	await client.callTool("navigate", { url }, 30_000);

	// Extract page title
	const titleResult = await client.safeCallTool("evaluate", {
		expression: "document.title",
	});
	const title = titleResult.ok ? String(titleResult.result?.result || "") : "";

	// Extract PR description
	const descResult = await client.safeCallTool("evaluate", {
		expression: `
			(() => {
				const desc = document.querySelector('[data-testid="pr-description"], .pr-description, .description-content, #pull-request-description');
				return desc ? desc.innerText : '';
			})()
		`,
	});
	const description = descResult.ok ? String(descResult.result?.result || "") : "";

	// Extract diff content
	const diffResult = await client.safeCallTool("evaluate", {
		expression: `
			(() => {
				const diffs = document.querySelectorAll('.diff-container, .udiff-line, .code-diff, [data-testid="diff-line"], .refract-content-container');
				if (!diffs.length) return '';
				return Array.from(diffs).map(d => d.innerText).join('\\n').slice(0, 50000);
			})()
		`,
	});
	const diffText = diffResult.ok ? String(diffResult.result?.result || "") : "";

	// Extract file list
	const filesResult = await client.safeCallTool("evaluate", {
		expression: `
			(() => {
				const files = document.querySelectorAll('.file-header, [data-testid="file-header"], .filename, .diff-filename');
				return Array.from(files).map(f => f.innerText.trim()).filter(Boolean);
			})()
		`,
	});
	const fileList = filesResult.ok && Array.isArray(filesResult.result?.result)
		? filesResult.result.result.map(String)
		: [];

	// Extract existing comments
	const commentsResult = await client.safeCallTool("evaluate", {
		expression: `
			(() => {
				const comments = document.querySelectorAll('.comment-content, [data-testid="comment-content"], .comment-body');
				return Array.from(comments).map(c => c.innerText.trim()).filter(Boolean);
			})()
		`,
	});
	const comments = commentsResult.ok && Array.isArray(commentsResult.result?.result)
		? commentsResult.result.result.map(String)
		: [];

	return { title, description, diffText, fileList, comments };
}

async function extractWithHttp(url: string): Promise<PrPageContent> {
	try {
		const resp = await fetch(url, {
			method: "GET",
			redirect: "follow",
			signal: AbortSignal.timeout(20_000),
			headers: { "User-Agent": "agent-pi-pr-review/1.0" },
		});
		const html = await resp.text();

		// Extract title
		const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
		const title = titleMatch?.[1]?.trim() || url;

		// Best-effort text extraction
		const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
		const bodyText = (bodyMatch?.[1] || "")
			.replace(/<script[\s\S]*?<\/script>/gi, "")
			.replace(/<style[\s\S]*?<\/style>/gi, "")
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim();

		return {
			title,
			description: bodyText.slice(0, 5000),
			diffText: "",
			fileList: [],
			comments: [],
			rawHtml: html.slice(0, 100_000),
		};
	} catch (err: any) {
		return {
			title: url,
			description: `Failed to fetch PR page: ${err?.message || "unknown error"}`,
			diffText: "",
			fileList: [],
			comments: [],
		};
	}
}

// ── Review Logic ─────────────────────────────────────────────────────

export function applyReviewRules(content: PrPageContent, profile: PrReviewProfile): PrReviewFinding[] {
	const findings: PrReviewFinding[] = [];
	const fullText = [content.description, content.diffText].join("\n");

	// Rule: Flag TODO/FIXME/HACK in diffs
	const todoMatches = fullText.match(/(TODO|FIXME|HACK|XXX|TEMP|WORKAROUND)[\s:].{0,120}/gi);
	if (todoMatches) {
		for (const match of todoMatches.slice(0, 10)) {
			findings.push({
				severity: "low",
				title: "TODO/FIXME marker in code",
				detail: match.trim(),
				ruleApplied: "Flag correctness, reliability, maintainability, and security issues.",
			});
		}
	}

	// Rule: Flag console.log / debug statements
	const debugMatches = fullText.match(/(console\.(log|debug|warn|error|info)|debugger|print\(|System\.out\.print)/g);
	if (debugMatches && debugMatches.length > 0) {
		findings.push({
			severity: "medium",
			title: `Debug/logging statements found (${debugMatches.length})`,
			detail: `Found ${debugMatches.length} debug/logging statement(s) in the diff. Review whether these should be removed before merge.`,
			suggestion: "Remove or gate debug statements behind a feature flag or log level.",
			ruleApplied: "Prefer actionable findings over stylistic commentary.",
		});
	}

	// Rule: Flag hardcoded secrets patterns
	const secretPatterns = [
		/(?:api[_-]?key|apikey|secret|token|password|passwd)\s*[:=]\s*["'][^"']{8,}/gi,
		/(?:AKIA|sk-|sk_live_|pk_live_|ghp_|gho_|xoxb-|xoxp-)[A-Za-z0-9]{10,}/g,
		/-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
	];
	for (const pattern of secretPatterns) {
		const secretMatches = fullText.match(pattern);
		if (secretMatches) {
			findings.push({
				severity: "critical",
				title: "Possible hardcoded secret or credential",
				detail: `Found ${secretMatches.length} pattern(s) matching potential secrets/credentials in the diff.`,
				suggestion: "Move secrets to environment variables or a secret manager. Never commit credentials.",
				ruleApplied: "Flag correctness, reliability, maintainability, and security issues.",
			});
			break;
		}
	}

	// Rule: Large file changes
	if (content.fileList.length > 20) {
		findings.push({
			severity: "medium",
			title: `Large PR — ${content.fileList.length} files changed`,
			detail: `This PR touches ${content.fileList.length} files. Consider breaking it into smaller, focused PRs for easier review.`,
			suggestion: "Split into smaller PRs by feature area or concern.",
			ruleApplied: "Prefer actionable findings over stylistic commentary.",
		});
	}

	// Rule: Missing description
	if (!content.description || content.description.trim().length < 20) {
		findings.push({
			severity: "low",
			title: "PR description is missing or very short",
			detail: "A good PR description helps reviewers understand the intent and scope of changes.",
			suggestion: "Add a description explaining what changed and why.",
			ruleApplied: "Prefer actionable findings over stylistic commentary.",
		});
	}

	return findings;
}

// ── Main Review Function ─────────────────────────────────────────────

export async function reviewPr(url: string, profile: PrReviewProfile): Promise<PrReviewResult> {
	const cdpClient = (globalThis as any).__piChromeDevtoolsMcpClient as ChromeDevtoolsMcpClient | undefined;
	const extractionMethod = cdpClient?.isConnected() ? "chrome-devtools-mcp" : "http-fallback";

	let content: PrPageContent;
	try {
		if (cdpClient?.isConnected()) {
			content = await extractWithCdp(url, cdpClient);
		} else {
			content = await extractWithHttp(url);
		}
	} catch (err: any) {
		return {
			url,
			title: url,
			summary: `Failed to extract PR content: ${err?.message || "unknown error"}`,
			status: "failed",
			findings: [],
			metadata: {
				reviewedAt: new Date().toISOString(),
				profileVersion: profile.version,
				rulesApplied: [],
				extractionMethod,
			},
		};
	}

	const findings = applyReviewRules(content, profile);

	const criticalCount = findings.filter(f => f.severity === "critical").length;
	const highCount = findings.filter(f => f.severity === "high").length;

	let verdict = "No issues found.";
	if (criticalCount > 0) {
		verdict = `⛔ ${criticalCount} critical issue(s) found — changes required before merge.`;
	} else if (highCount > 0) {
		verdict = `⚠ ${highCount} high-severity issue(s) found — review recommended.`;
	} else if (findings.length > 0) {
		verdict = `${findings.length} finding(s) — mostly advisory.`;
	}

	return {
		url,
		title: content.title || url,
		summary: verdict,
		status: findings.some(f => f.severity === "critical") ? "partial" : "reviewed",
		findings,
		metadata: {
			reviewedAt: new Date().toISOString(),
			profileVersion: profile.version,
			rulesApplied: profile.reviewRules,
			extractionMethod,
		},
	};
}
