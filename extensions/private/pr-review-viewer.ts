// ABOUTME: Private PR Review Request viewer extension — collects Bitbucket PR URLs via browser UI.
// ABOUTME: Supports access verification loop, login-required detection, re-check, and structured result handoff.

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { outputLine } from "../lib/output-box.ts";
import { applyExtensionDefaults } from "../lib/themeMap.ts";
import { registerActiveViewer, clearActiveViewer, notifyViewerOpen } from "../lib/viewer-session.ts";
import { generatePrReviewViewerHTML, type UrlStatusEntry } from "./lib/pr-review-viewer-html.ts";
import { verifyAccessViaHttp } from "./lib/chrome-devtools-mcp.ts";

// ── Types ────────────────────────────────────────────────────────────

interface ViewerResult {
	action: "start_review" | "cancelled";
	urls: string[];
	allStatuses: UrlStatusEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────────

function openBrowser(url: string): void {
	try { execSync(`open "${url}"`, { stdio: "ignore" }); } catch {
		try { execSync(`xdg-open "${url}"`, { stdio: "ignore" }); } catch {
			try { execSync(`start "${url}"`, { stdio: "ignore" }); } catch {}
		}
	}
}

/**
 * Verify access to a list of URLs using HTTP probe.
 * Note: For richer access detection with Chrome DevTools MCP, the LLM should
 * use the native MCP tools directly (navigate_page + take_snapshot).
 * This function is used by the viewer UI for quick URL validation.
 */
async function verifyUrls(urls: string[]): Promise<UrlStatusEntry[]> {
	const results: UrlStatusEntry[] = [];
	for (const url of urls) {
		const probe = await verifyAccessViaHttp(url);
		results.push({
			url,
			status: probe.accessible ? "accessible" : (probe.loginRequired ? "login_required" : "failed"),
			title: probe.title,
			reason: probe.reason,
		});
	}
	return results;
}

// ── Server ───────────────────────────────────────────────────────────

function startViewerServer(
	title: string,
	initialUrls: string[],
	urlStatuses: UrlStatusEntry[],
): Promise<{ port: number; server: Server; waitForResult: () => Promise<ViewerResult> }> {
	return new Promise((resolveSetup) => {
		let resolveResult: (result: ViewerResult) => void;
		const resultPromise = new Promise<ViewerResult>((res) => { resolveResult = res; });

		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			res.setHeader("Access-Control-Allow-Headers", "Content-Type");
			if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

			const url = new URL(req.url || "/", "http://localhost");

			// Serve main page
			if (req.method === "GET" && url.pathname === "/") {
				const port = (server.address() as any)?.port || 0;
				const html = generatePrReviewViewerHTML({ title, initialUrls, urlStatuses, port });
				res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				res.end(html);
				return;
			}

			// Serve logo
			if (req.method === "GET" && url.pathname === "/logo.png") {
				try {
					const logoPath = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "agent-logo.png");
					const logoData = readFileSync(logoPath);
					res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
					res.end(logoData);
				} catch {
					res.writeHead(404); res.end();
				}
				return;
			}

			// Verify access endpoint
			if (req.method === "POST" && url.pathname === "/verify") {
				let body = "";
				req.on("data", (chunk) => { body += chunk; });
				req.on("end", async () => {
					try {
						const data = JSON.parse(body);
						const urlsToCheck: string[] = Array.isArray(data.urls) ? data.urls : [];
						const results = await verifyUrls(urlsToCheck);
						// Update internal state
						for (const r of results) {
							const existing = urlStatuses.find(s => s.url === r.url);
							if (existing) Object.assign(existing, r);
							else urlStatuses.push(r);
						}
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ ok: true, results }));
					} catch (err: any) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ ok: false, error: err?.message || "Verification failed" }));
					}
				});
				return;
			}

			// Result submission
			if (req.method === "POST" && url.pathname === "/result") {
				let body = "";
				req.on("data", (chunk) => { body += chunk; });
				req.on("end", () => {
					try {
						const data = JSON.parse(body);
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ ok: true }));
						resolveResult!({
							action: data.action || "start_review",
							urls: Array.isArray(data.urls) ? data.urls : [],
							allStatuses: Array.isArray(data.allStatuses) ? data.allStatuses : urlStatuses,
						});
					} catch {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "Invalid JSON" }));
					}
				});
				return;
			}

			res.writeHead(404); res.end("Not found");
		});

		server.listen(0, "127.0.0.1", () => {
			const addr = server.address() as any;
			resolveSetup({ port: addr.port, server, waitForResult: () => resultPromise });
		});
	});
}

// ── Tool Parameters ──────────────────────────────────────────────────

const Params = Type.Object({
	initial_urls: Type.Optional(Type.Array(Type.String(), { description: "Pre-filled PR URLs" })),
	title: Type.Optional(Type.String({ description: "Viewer title" })),
});

// ── Extension ────────────────────────────────────────────────────────

export default function(pi: ExtensionAPI) {
	let activeServer: Server | null = null;
	let activeViewerSession: any = null;

	function cleanup() {
		if (activeServer) {
			try { activeServer.close(); } catch {}
			activeServer = null;
		}
		if (activeViewerSession) {
			clearActiveViewer(activeViewerSession);
			activeViewerSession = null;
		}
	}

	async function runViewer(ctx: ExtensionContext, title: string, initialUrls: string[]): Promise<ViewerResult> {
		cleanup();
		const urlStatuses: UrlStatusEntry[] = [];
		const { port, server, waitForResult } = await startViewerServer(title, initialUrls, urlStatuses);
		activeServer = server;

		const viewerUrl = `http://127.0.0.1:${port}`;
		activeViewerSession = {
			kind: "qa" as const,
			title: "PR Review Request",
			url: viewerUrl,
			server,
			onClose: () => { activeServer = null; activeViewerSession = null; },
		};
		registerActiveViewer(activeViewerSession);
		openBrowser(viewerUrl);
		notifyViewerOpen(ctx, activeViewerSession);

		try {
			return await waitForResult();
		} finally {
			cleanup();
		}
	}

	// ── Tool registration ────────────────────────────────────────────

	pi.registerTool({
		name: "show_pr_review_viewer",
		label: "PR Review Request",
		description:
			"Open the private PR review request viewer to collect one or more Bitbucket PR URLs.\n" +
			"The viewer validates URLs, checks page access, handles login-required states with retry,\n" +
			"and returns the confirmed list of accessible URLs for review execution.",
		parameters: Params,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const p = params as { initial_urls?: string[]; title?: string };
			const result = await runViewer(ctx, p.title || "PR Review Request", p.initial_urls || []);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
		},
		renderCall(args, theme) {
			const a = args as any;
			const count = Array.isArray(a.initial_urls) ? a.initial_urls.length : 0;
			const label = count ? `${count} URL${count > 1 ? "s" : ""}` : "interactive";
			const text = theme.fg("toolTitle", theme.bold("show_pr_review_viewer ")) + theme.fg("accent", label);
			return new Text(outputLine(theme, "accent", text), 0, 0);
		},
	});

	// ── Lifecycle ────────────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		applyExtensionDefaults(import.meta.url, ctx);
	});

	pi.on("session_shutdown", async () => {
		cleanup();
	});
}
