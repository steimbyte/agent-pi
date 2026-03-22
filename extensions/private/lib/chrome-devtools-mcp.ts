// ABOUTME: Shared utilities for Chrome DevTools MCP integration.
// ABOUTME: The actual MCP server runs natively via Claude CLI (~/.claude/mcp.json).
// ABOUTME: This module provides login-detection heuristics and access-verification helpers
// ABOUTME: that can be used by other extensions (e.g., PR review viewer).

// ── Types ───────────────────────────────────────────────────────────

export interface ChromeDevtoolsPageAccessResult {
	url: string;
	accessible: boolean;
	loginRequired: boolean;
	title?: string;
	reason?: string;
	evidence?: string[];
}

// ── Login detection ─────────────────────────────────────────────────

const LOGIN_INDICATORS = [
	"log in",
	"sign in",
	"sign-in",
	"authenticate",
	"session expired",
	"repository not found",
	"page not found",
	"choose an account",
	"403",
	"unauthorized",
];

const LOGIN_URL_PATTERNS = [
	"id.atlassian.com/login",
	"accounts.google.com",
	"github.com/login",
	"login.microsoftonline.com",
	"/signin",
	"/login",
];

/**
 * Analyze page content for login indicators.
 * Use this after fetching page content via native MCP tools or HTTP.
 */
export function analyzePageAccess(
	url: string,
	title: string,
	bodyText: string,
): ChromeDevtoolsPageAccessResult {
	const lowerTitle = title.toLowerCase();
	const lowerBody = bodyText.substring(0, 5000).toLowerCase();
	const lowerUrl = url.toLowerCase();

	const titleHasLogin = LOGIN_INDICATORS.some((i) => lowerTitle.includes(i));
	const bodyHasLogin = LOGIN_INDICATORS.some((i) => lowerBody.includes(i));
	const urlHasLogin = LOGIN_URL_PATTERNS.some((p) => lowerUrl.includes(p));

	const loginRequired = titleHasLogin || urlHasLogin || (bodyHasLogin && !lowerBody.includes("log out"));
	const accessible = !loginRequired;

	const evidence: string[] = [];
	if (titleHasLogin) evidence.push(`Title contains login indicator: "${title}"`);
	if (urlHasLogin) evidence.push(`URL matches login pattern: ${url}`);
	if (bodyHasLogin) evidence.push("Body contains login indicators");

	return {
		url,
		accessible,
		loginRequired,
		title: title || undefined,
		reason: accessible ? undefined : (loginRequired ? "Authentication required" : "Page unavailable"),
		evidence: evidence.length > 0 ? evidence : undefined,
	};
}

/**
 * Verify access to a URL via HTTP probe (fallback when MCP is unavailable).
 */
export async function verifyAccessViaHttp(url: string): Promise<ChromeDevtoolsPageAccessResult> {
	try {
		const resp = await fetch(url, {
			method: "GET",
			redirect: "follow",
			signal: AbortSignal.timeout(15_000),
			headers: { "User-Agent": "agent-pi-pr-review/1.0" },
		});

		const body = await resp.text();
		const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
		const title = titleMatch?.[1]?.trim() || "";

		if (resp.status === 401 || resp.status === 403) {
			return {
				url,
				accessible: false,
				loginRequired: true,
				title,
				reason: `HTTP ${resp.status}`,
				evidence: [`HTTP status: ${resp.status}`],
			};
		}

		return analyzePageAccess(url, title, body);
	} catch (err: any) {
		return {
			url,
			accessible: false,
			loginRequired: false,
			reason: err?.message || "Request failed",
		};
	}
}
