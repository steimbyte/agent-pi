// ABOUTME: Swagbucks Report Viewer — opens a browser GUI for configuring and viewing Swagbucks sentiment analysis.
// ABOUTME: Two-phase flow: setup page for config, then rich interactive report display. Matches plan/spec viewer design.

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { outputLine } from "./lib/output-box.ts";
import { applyExtensionDefaults } from "./lib/themeMap.ts";
import { generateSwagbucksSetupHTML, generateSwagbucksReportHTML, type SwagbucksReportData } from "./lib/swagbucks-viewer-html.ts";
import { upsertPersistedReport } from "./lib/report-index.ts";
import { registerActiveViewer, clearActiveViewer, notifyViewerOpen } from "./lib/viewer-session.ts";

// ── Types ────────────────────────────────────────────────────────────

type ViewerMode = "setup" | "report";

interface SetupConfig {
	days: number;
	sources: Record<string, boolean>;
	categories: Record<string, boolean>;
	format: string;
	deepScrape?: {
		enabled: boolean;
		reddit: boolean;
		appStore: boolean;
	};
}

interface SetupResult {
	action: "run" | "cancelled";
	config?: SetupConfig;
}

interface ReportResult {
	action: "done" | "closed";
}

// ── HTTP Server: Setup Mode ──────────────────────────────────────────

function startSetupServer(
	title: string,
): Promise<{ port: number; server: Server; waitForResult: () => Promise<SetupResult> }> {
	return new Promise((resolveSetup) => {
		let resolveResult: (result: SetupResult) => void;
		const resultPromise = new Promise<SetupResult>((res) => {
			resolveResult = res;
		});

		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			res.setHeader("Access-Control-Allow-Headers", "Content-Type");

			if (req.method === "OPTIONS") {
				res.writeHead(204);
				res.end();
				return;
			}

			const url = new URL(req.url || "/", `http://localhost`);

			// Serve the setup HTML page
			if (req.method === "GET" && url.pathname === "/") {
				const port = (server.address() as any)?.port || 0;
				const html = generateSwagbucksSetupHTML({ port, title });
				res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				res.end(html);
				return;
			}

			// Serve the logo image
			if (req.method === "GET" && url.pathname === "/logo.png") {
				try {
					const logoPath = join(dirname(fileURLToPath(import.meta.url)), "assets", "agent-logo.png");
					const logoData = readFileSync(logoPath);
					res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
					res.end(logoData);
				} catch {
					res.writeHead(404);
					res.end();
				}
				return;
			}

			// Handle result (run or cancel)
			if (req.method === "POST" && url.pathname === "/result") {
				let body = "";
				req.on("data", (chunk) => { body += chunk; });
				req.on("end", () => {
					try {
						const data = JSON.parse(body);
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ ok: true }));
						resolveResult!({
							action: data.action || "cancelled",
							config: data.config,
						});
					} catch {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "Invalid JSON" }));
					}
				});
				return;
			}

			res.writeHead(404);
			res.end("Not found");
		});

		server.listen(0, "127.0.0.1", () => {
			const addr = server.address() as any;
			resolveSetup({
				port: addr.port,
				server,
				waitForResult: () => resultPromise,
			});
		});
	});
}

// ── HTTP Server: Report Mode ─────────────────────────────────────────

function startReportServer(
	report: SwagbucksReportData,
): Promise<{ port: number; server: Server; waitForResult: () => Promise<ReportResult> }> {
	return new Promise((resolveSetup) => {
		let resolveResult: (result: ReportResult) => void;
		const resultPromise = new Promise<ReportResult>((res) => {
			resolveResult = res;
		});

		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			res.setHeader("Access-Control-Allow-Headers", "Content-Type");

			if (req.method === "OPTIONS") {
				res.writeHead(204);
				res.end();
				return;
			}

			const url = new URL(req.url || "/", `http://localhost`);

			// Serve the report HTML page
			if (req.method === "GET" && url.pathname === "/") {
				const port = (server.address() as any)?.port || 0;
				const html = generateSwagbucksReportHTML({ report, port });
				res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				res.end(html);
				return;
			}

			// Serve the logo
			if (req.method === "GET" && url.pathname === "/logo.png") {
				try {
					const logoPath = join(dirname(fileURLToPath(import.meta.url)), "assets", "agent-logo.png");
					const logoData = readFileSync(logoPath);
					res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
					res.end(logoData);
				} catch {
					res.writeHead(404);
					res.end();
				}
				return;
			}

			// Handle result (done)
			if (req.method === "POST" && url.pathname === "/result") {
				let body = "";
				req.on("data", (chunk) => { body += chunk; });
				req.on("end", () => {
					try {
						const data = JSON.parse(body);
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ ok: true }));
						resolveResult!({
							action: data.action || "closed",
						});
					} catch {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "Invalid JSON" }));
					}
				});
				return;
			}

			// Save to desktop
			if (req.method === "POST" && url.pathname === "/save") {
				let body = "";
				req.on("data", (chunk) => { body += chunk; });
				req.on("end", () => {
					try {
						const data = JSON.parse(body);
						const desktop = join(homedir(), "Desktop");
						if (!existsSync(desktop)) mkdirSync(desktop, { recursive: true });
						const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
						const fileName = `swagbucks-report-${ts}.json`;
						const filePath = join(desktop, fileName);
						writeFileSync(filePath, JSON.stringify(data.report, null, 2), "utf-8");
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ ok: true, message: `Saved to ~/Desktop/${fileName}` }));
					} catch (err: any) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: err.message }));
					}
				});
				return;
			}

			// Export standalone HTML
			if (req.method === "POST" && url.pathname === "/export-standalone") {
				let body = "";
				req.on("data", (chunk) => { body += chunk; });
				req.on("end", () => {
					try {
						const data = JSON.parse(body || "{}");
						const exportReport = data.report || report;
						const html = generateSwagbucksReportHTML({ report: exportReport, port: 0 });
						const desktop = join(homedir(), "Desktop");
						if (!existsSync(desktop)) mkdirSync(desktop, { recursive: true });
						const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
						const fileName = `swagbucks-report-${ts}.html`;
						const filePath = join(desktop, fileName);
						writeFileSync(filePath, html, "utf-8");
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ ok: true, message: `Standalone export saved to ~/Desktop/${fileName}` }));
					} catch (err: any) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: err.message }));
					}
				});
				return;
			}

			res.writeHead(404);
			res.end("Not found");
		});

		server.listen(0, "127.0.0.1", () => {
			const addr = server.address() as any;
			resolveSetup({
				port: addr.port,
				server,
				waitForResult: () => resultPromise,
			});
		});
	});
}

// ── Browser Helper ───────────────────────────────────────────────────

function openBrowser(url: string): void {
	try {
		execSync(`open "${url}"`, { stdio: "ignore" });
	} catch {
		try {
			execSync(`xdg-open "${url}"`, { stdio: "ignore" });
		} catch {
			try {
				execSync(`start "${url}"`, { stdio: "ignore" });
			} catch {}
		}
	}
}

// ── Tool Parameters ──────────────────────────────────────────────────

const ShowSwagbucksParams = Type.Object({
	mode: Type.Optional(Type.String({
		description: "Viewer mode: 'setup' (default) for configuration page, or 'report' for displaying analysis results",
	})),
	title: Type.Optional(Type.String({
		description: "Title to display in the viewer header",
	})),
	report_data: Type.Optional(Type.String({
		description: "JSON string of SwagbucksReportData for report mode. Required when mode is 'report'.",
	})),
});

// ── Extension ────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	let piRef = pi;
	let activeServer: Server | null = null;
	let activeSession: { kind: ViewerMode; title: string; url: string; server: Server; onClose: () => void } | null = null;

	function cleanupServer() {
		const server = activeServer;
		activeServer = null;
		if (server) {
			try { server.close(); } catch {}
		}
		if (activeSession) {
			clearActiveViewer(activeSession);
			activeSession = null;
		}
	}

	// ── Setup Viewer ─────────────────────────────────────────────────

	async function runSetupViewer(
		ctx: ExtensionContext,
		title: string,
		signal?: AbortSignal,
	): Promise<SetupResult> {
		cleanupServer();

		const { port, server, waitForResult } = await startSetupServer(title);
		activeServer = server;

		const url = `http://127.0.0.1:${port}`;
		activeSession = {
			kind: "setup",
			title: "Swagbucks Setup",
			url,
			server,
			onClose: () => { activeServer = null; activeSession = null; },
		};
		registerActiveViewer(activeSession);
		openBrowser(url);
		notifyViewerOpen(ctx, activeSession);

		try {
			const abortPromise = signal
				? new Promise<SetupResult>((_, reject) => {
					if (signal.aborted) reject(new Error("Aborted"));
					signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
				})
				: null;

			const result = await (abortPromise
				? Promise.race([waitForResult(), abortPromise])
				: waitForResult());

			try {
				upsertPersistedReport({
					category: "swagbucks",
					title,
					summary: result.action === "run"
						? `Analysis configured: ${result.config?.days} days, ${Object.values(result.config?.sources || {}).filter(Boolean).length} sources`
						: "Setup cancelled",
					sourcePath: "swagbucks-setup",
					viewerPath: "swagbucks-setup",
					viewerLabel: title,
					tags: ["swagbucks", "setup"],
					metadata: { action: result.action, config: result.config },
				});
			} catch {}

			return result;
		} finally {
			cleanupServer();
		}
	}

	// ── Report Viewer ────────────────────────────────────────────────

	async function runReportViewer(
		ctx: ExtensionContext,
		report: SwagbucksReportData,
		signal?: AbortSignal,
	): Promise<ReportResult> {
		cleanupServer();

		const { port, server, waitForResult } = await startReportServer(report);
		activeServer = server;

		const url = `http://127.0.0.1:${port}`;
		activeSession = {
			kind: "report",
			title: "Swagbucks Report",
			url,
			server,
			onClose: () => { activeServer = null; activeSession = null; },
		};
		registerActiveViewer(activeSession);
		openBrowser(url);
		notifyViewerOpen(ctx, activeSession);

		try {
			const abortPromise = signal
				? new Promise<ReportResult>((_, reject) => {
					if (signal.aborted) reject(new Error("Aborted"));
					signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
				})
				: null;

			const result = await (abortPromise
				? Promise.race([waitForResult(), abortPromise])
				: waitForResult());

			try {
				const sectionCount = report.sections?.length || 0;
				upsertPersistedReport({
					category: "swagbucks",
					title: report.title,
					summary: `${sectionCount} section(s), generated ${report.generatedAt}`,
					sourcePath: "swagbucks-report",
					viewerPath: "swagbucks-report",
					viewerLabel: report.title,
					tags: ["swagbucks", "report", "sentiment"],
					metadata: { action: result.action, sectionCount },
				});
			} catch {}

			return result;
		} finally {
			cleanupServer();
		}
	}

	// ── show_swagbucks tool ──────────────────────────────────────────

	pi.registerTool({
		name: "show_swagbucks",
		label: "Show Swagbucks",
		description:
			"Open the Swagbucks Analysis viewer in the browser. Two modes:\n\n" +
			"**Setup mode** (default): Opens a configuration page where the user can select " +
			"time interval, data sources, complaint categories, and output format. Returns " +
			"the user's config when they click 'Run Analysis'.\n\n" +
			"**Report mode**: Displays a rich interactive report with sidebar navigation, " +
			"metric cards, sentiment charts, review cards, claim validation tables, and " +
			"findings. Requires report_data as a JSON string.\n\n" +
			"The /swagbucks command always opens setup first, then report after analysis.",
		parameters: ShowSwagbucksParams,

		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const { mode: modeStr, title: titleParam, report_data } = params as {
				mode?: string;
				title?: string;
				report_data?: string;
			};

			const viewerMode: ViewerMode = modeStr === "report" ? "report" : "setup";
			const displayTitle = titleParam || "Swagbucks Analysis";

			// ── Report mode ──────────────────────────────────────────
			if (viewerMode === "report") {
				if (!report_data) {
					return {
						content: [{ type: "text" as const, text: "Error: report_data is required when mode is 'report'." }],
					};
				}

				let report: SwagbucksReportData;
				try {
					report = JSON.parse(report_data);
				} catch (err: any) {
					return {
						content: [{ type: "text" as const, text: `Error parsing report_data: ${err.message}` }],
					};
				}

				try {
					const result = await runReportViewer(ctx, report, signal);
					return {
						content: [{
							type: "text" as const,
							text: `Swagbucks report viewer closed. User reviewed ${report.sections?.length || 0} section(s).`,
						}],
						details: {
							action: result.action,
							mode: "report",
							title: report.title,
						},
					};
				} catch (err: any) {
					return {
						content: [{ type: "text" as const, text: `Report viewer error: ${err.message}` }],
					};
				}
			}

			// ── Setup mode (default) ────────────────────────────────
			try {
				const result = await runSetupViewer(ctx, displayTitle, signal);

				if (result.action === "run" && result.config) {
					// Send the config back as a message to trigger analysis
					piRef.sendMessage(
						{
							customType: "swagbucks-config",
							content: `User configured Swagbucks analysis. Run with these settings:\n\n\`\`\`json\n${JSON.stringify(result.config, null, 2)}\n\`\`\``,
							display: true,
						},
						{ deliverAs: "followUp" as any, triggerTurn: true },
					);

					return {
						content: [{
							type: "text" as const,
							text: `Swagbucks analysis configured by user. Settings:\n- Review window: ${result.config.days} days\n- Sources: ${Object.entries(result.config.sources).filter(([_, v]) => v).map(([k]) => k).join(", ")}\n- Categories: ${Object.entries(result.config.categories).filter(([_, v]) => v).map(([k]) => k).join(", ")}\n- Format: ${result.config.format}\n\nProceed with the analysis using these settings.`,
						}],
						details: {
							action: "run" as const,
							mode: "setup",
							config: result.config,
						},
					};
				}

				return {
					content: [{
						type: "text" as const,
						text: "User cancelled the Swagbucks setup without starting analysis.",
					}],
					details: {
						action: "cancelled" as const,
						mode: "setup",
					},
				};
			} catch (err: any) {
				return {
					content: [{ type: "text" as const, text: `Setup viewer error: ${err.message}` }],
				};
			}
		},

		renderCall(args, theme) {
			const modeArg = (args as any).mode || "setup";
			const titleArg = (args as any).title || "";
			const modeLabel = modeArg === "report" ? "report" : "setup";
			const text =
				theme.fg("toolTitle", theme.bold("show_swagbucks ")) +
				theme.fg("accent", `[${modeLabel}]`) +
				(titleArg ? theme.fg("dim", ` — ${titleArg}`) : "");
			return new Text(outputLine(theme, "accent", text), 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details as any;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.mode === "setup") {
				if (details.action === "run") {
					return new Text(
						outputLine(theme, "success", `Analysis configured (${details.config?.days}d, ${details.config?.format})`),
						0, 0,
					);
				}
				return new Text(
					outputLine(theme, "warning", "Setup cancelled"),
					0, 0,
				);
			}

			if (details.mode === "report") {
				return new Text(
					outputLine(theme, "success", "Report viewer closed"),
					0, 0,
				);
			}

			return new Text(
				outputLine(theme, "warning", "Swagbucks viewer closed"),
				0, 0,
			);
		},
	});

	// ── /swagbucks command ───────────────────────────────────────────

	pi.registerCommand("swagbucks", {
		description: "Open the Swagbucks sentiment analysis setup and report viewer",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("/swagbucks requires interactive mode", "error");
				return;
			}

			const displayTitle = args.trim() || "Swagbucks Analysis";

			// Always start with setup
			const setupResult = await runSetupViewer(ctx, displayTitle);

			if (setupResult.action === "run" && setupResult.config) {
				piRef.sendMessage(
					{
						customType: "swagbucks-config",
						content: `User configured Swagbucks analysis. Run with these settings:\n\n\`\`\`json\n${JSON.stringify(setupResult.config, null, 2)}\n\`\`\``,
						display: true,
					},
					{ deliverAs: "followUp" as any, triggerTurn: true },
				);
				ctx.ui.notify("Analysis configured — starting...", "info");
			} else {
				ctx.ui.notify("Setup cancelled.", "info");
			}
		},
	});

	// ── Session lifecycle ────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		applyExtensionDefaults(import.meta.url, ctx);
	});

	pi.on("session_shutdown", async () => {
		cleanupServer();
	});
}
