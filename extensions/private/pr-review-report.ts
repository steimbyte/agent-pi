// ABOUTME: Private PR Review Report viewer extension — renders per-PR findings in a polished browser UI.
// ABOUTME: Supports batch navigation for multi-PR reviews, persists reports to the shared report index.

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
import { upsertPersistedReport } from "../lib/report-index.ts";
import { registerActiveViewer, clearActiveViewer, notifyViewerOpen } from "../lib/viewer-session.ts";
import { generatePrReviewReportHTML, type PrReviewReportData, type PrReviewBatchReport } from "./lib/pr-review-report-html.ts";

// ── Helpers ──────────────────────────────────────────────────────────

function openBrowser(url: string): void {
	try { execSync(`open "${url}"`, { stdio: "ignore" }); } catch {
		try { execSync(`xdg-open "${url}"`, { stdio: "ignore" }); } catch {
			try { execSync(`start "${url}"`, { stdio: "ignore" }); } catch {}
		}
	}
}

// ── Server ───────────────────────────────────────────────────────────

function startReportServer(
	batch: PrReviewBatchReport,
): Promise<{ port: number; server: Server; waitForResult: () => Promise<void> }> {
	return new Promise((resolveSetup) => {
		let resolveResult: () => void;
		const resultPromise = new Promise<void>((res) => { resolveResult = res; });

		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			res.setHeader("Access-Control-Allow-Headers", "Content-Type");
			if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

			const url = new URL(req.url || "/", "http://localhost");

			if (req.method === "GET" && url.pathname === "/") {
				const port = (server.address() as any)?.port || 0;
				const html = generatePrReviewReportHTML(batch, port);
				res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				res.end(html);
				return;
			}

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

			if (req.method === "POST" && url.pathname === "/result") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: true }));
				resolveResult!();
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

const FindingSchema = Type.Object({
	severity: Type.String(),
	title: Type.String(),
	filePath: Type.Optional(Type.String()),
	lineRange: Type.Optional(Type.String()),
	detail: Type.String(),
	suggestion: Type.Optional(Type.String()),
	ruleApplied: Type.Optional(Type.String()),
});

const ReportSchema = Type.Object({
	title: Type.String(),
	url: Type.String(),
	summary: Type.String(),
	profile_summary: Type.Array(Type.String()),
	findings: Type.Array(FindingSchema),
	metadata: Type.Optional(Type.Object({
		reviewedAt: Type.Optional(Type.String()),
		extractionMethod: Type.Optional(Type.String()),
		profileVersion: Type.Optional(Type.Number()),
	})),
});

const Params = Type.Object({
	batch_title: Type.Optional(Type.String({ description: "Title for the batch report" })),
	reports: Type.Array(ReportSchema, { description: "Array of per-PR review reports" }),
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

	pi.registerTool({
		name: "show_pr_review_report",
		label: "PR Review Report",
		description:
			"Open the private PR review report viewer showing per-PR findings.\n" +
			"Supports batch navigation when multiple PRs are reviewed. Reports are persisted to the shared report index.",
		parameters: Params,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			cleanup();
			const p = params as {
				batch_title?: string;
				reports: Array<{
					title: string;
					url: string;
					summary: string;
					profile_summary: string[];
					findings: any[];
					metadata?: any;
				}>;
			};

			const batch: PrReviewBatchReport = {
				batchTitle: p.batch_title || "PR Review Report",
				reports: p.reports.map(r => ({
					title: r.title,
					url: r.url,
					summary: r.summary,
					profileSummary: r.profile_summary,
					findings: r.findings,
					metadata: r.metadata,
				})),
			};

			const { port, server, waitForResult } = await startReportServer(batch);
			activeServer = server;

			const viewerUrl = `http://127.0.0.1:${port}`;
			activeViewerSession = {
				kind: "report" as const,
				title: "PR Review Report",
				url: viewerUrl,
				server,
				onClose: () => { activeServer = null; activeViewerSession = null; },
			};
			registerActiveViewer(activeViewerSession);
			openBrowser(viewerUrl);
			notifyViewerOpen(ctx, activeViewerSession);

			try {
				await waitForResult();
			} finally {
				cleanup();
			}

			// Persist each report
			for (const report of batch.reports) {
				try {
					upsertPersistedReport({
						category: "completion" as any,
						title: `PR Review: ${report.title}`,
						summary: report.summary,
						searchText: [report.title, report.url, report.summary, ...report.findings.map(f => f.title)].join(" "),
						metadata: {
							kind: "pr-review",
							url: report.url,
							findingsCount: report.findings.length,
							criticalCount: report.findings.filter(f => f.severity === "critical").length,
						},
						tags: ["pr-review", "private"],
					});
				} catch {}
			}

			return {
				content: [{
					type: "text" as const,
					text: `PR review report closed. ${batch.reports.length} report(s) persisted.`,
				}],
			};
		},
		renderCall(args, theme) {
			const a = args as any;
			const count = Array.isArray(a.reports) ? a.reports.length : 0;
			const text = theme.fg("toolTitle", theme.bold("show_pr_review_report ")) +
				theme.fg("accent", `${count} PR${count !== 1 ? "s" : ""}`);
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
