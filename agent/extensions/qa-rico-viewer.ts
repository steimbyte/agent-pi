// ABOUTME: QA Rico Viewer — opens a browser GUI for configuring QA test runs and viewing results with screenshot galleries.
// ABOUTME: Two-phase flow: setup page for test config, then rich QA report with pass/fail results and screenshot lightbox.

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { outputLine } from "./lib/output-box.ts";
import { applyExtensionDefaults } from "./lib/themeMap.ts";
import { generateQARicoSetupHTML, generateQARicoReportHTML, type QAReportData } from "./lib/qa-rico-html.ts";
import { upsertPersistedReport } from "./lib/report-index.ts";
import { registerActiveViewer, clearActiveViewer, notifyViewerOpen } from "./lib/viewer-session.ts";

// ── Types ────────────────────────────────────────────────────────────

type ViewerMode = "setup" | "report";

interface SetupConfig {
	runUnit: boolean;
	runE2E: boolean;
	e2eSuites: string[];
	platform: "ios" | "android" | "both";
	captureScreenshots: boolean;
	generateCoverage: boolean;
}

interface SetupResult {
	action: "run" | "cancelled";
	config?: SetupConfig;
}

interface ReportResult {
	action: "done" | "closed";
}

// ── Screenshot Resolver ──────────────────────────────────────────────

/**
 * Find all screenshot directories from recent test runs.
 */
function findScreenshotDirs(): string[] {
	const dirs: string[] = [];
	try {
		const tmpEntries = readdirSync("/tmp").filter(e => e.startsWith("reco-test-"));
		for (const entry of tmpEntries) {
			const fullPath = join("/tmp", entry);
			try {
				const stat = statSync(fullPath);
				if (stat.isDirectory()) dirs.push(fullPath);
			} catch {}
		}
	} catch {}
	return dirs;
}

/**
 * Try to resolve a screenshot filename to its absolute path.
 * Searches in known screenshot directories.
 */
function resolveScreenshotPath(filename: string, screenshotDirs: string[]): string | null {
	// Direct absolute path
	if (filename.startsWith("/") && existsSync(filename)) return filename;

	// Search in known directories
	for (const dir of screenshotDirs) {
		const candidate = join(dir, filename);
		if (existsSync(candidate)) return candidate;
	}

	// Search recursively in /tmp/reco-test-*
	for (const dir of screenshotDirs) {
		try {
			const entries = readdirSync(dir, { recursive: true }) as string[];
			for (const entry of entries) {
				if (basename(entry as string) === filename) {
					const candidate = join(dir, entry as string);
					if (existsSync(candidate)) return candidate;
				}
			}
		} catch {}
	}

	return null;
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
				const html = generateQARicoSetupHTML({ port, title });
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
	report: QAReportData,
): Promise<{ port: number; server: Server; waitForResult: () => Promise<ReportResult> }> {
	return new Promise((resolveSetup) => {
		let resolveResult: (result: ReportResult) => void;
		let settled = false;
		const settle = (result: ReportResult) => {
			if (settled) return;
			settled = true;
			resolveResult!(result);
		};
		const resultPromise = new Promise<ReportResult>((res) => {
			resolveResult = res;
		});

		// Gather all screenshot directories for resolving
		const screenshotDirs = findScreenshotDirs();
		// Also add any suite-specific screenshot dirs
		for (const suite of report.suites) {
			if (suite.screenshotDir && !screenshotDirs.includes(suite.screenshotDir)) {
				screenshotDirs.push(suite.screenshotDir);
			}
		}

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
				const html = generateQARicoReportHTML({ report, port });
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

			// ── Screenshot serving ──────────────────────────────────
			if (req.method === "GET" && url.pathname.startsWith("/screenshots/")) {
				const filename = decodeURIComponent(url.pathname.slice("/screenshots/".length));
				const resolvedPath = resolveScreenshotPath(filename, screenshotDirs);

				if (resolvedPath) {
					try {
						const imgData = readFileSync(resolvedPath);
						const ext = resolvedPath.toLowerCase().split(".").pop();
						const mimeTypes: Record<string, string> = {
							png: "image/png",
							jpg: "image/jpeg",
							jpeg: "image/jpeg",
							gif: "image/gif",
							webp: "image/webp",
						};
						const mime = mimeTypes[ext || "png"] || "image/png";
						res.writeHead(200, {
							"Content-Type": mime,
							"Cache-Control": "public, max-age=60",
						});
						res.end(imgData);
						return;
					} catch {
						res.writeHead(404);
						res.end("Screenshot not found");
						return;
					}
				}

				res.writeHead(404);
				res.end("Screenshot not found");
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
						settle({
							action: data.action || "closed",
						});
					} catch {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "Invalid JSON" }));
					}
				});
				return;
			}

			// Save to desktop (JSON)
			if (req.method === "POST" && url.pathname === "/save") {
				let body = "";
				req.on("data", (chunk) => { body += chunk; });
				req.on("end", () => {
					try {
						const data = JSON.parse(body);
						const desktop = join(homedir(), "Desktop");
						if (!existsSync(desktop)) mkdirSync(desktop, { recursive: true });
						const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
						const fileName = `qa-report-${ts}.json`;
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
						const html = generateQARicoReportHTML({ report: exportReport, port: 0 });
						const desktop = join(homedir(), "Desktop");
						if (!existsSync(desktop)) mkdirSync(desktop, { recursive: true });
						const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
						const fileName = `qa-report-${ts}.html`;
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

		server.on("close", () => {
			settle({ action: "closed" });
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

const ShowQARicoParams = Type.Object({
	mode: Type.Optional(Type.String({
		description: "Viewer mode: 'setup' (default) for test configuration page, or 'report' for displaying QA results with screenshots",
	})),
	title: Type.Optional(Type.String({
		description: "Title to display in the viewer header",
	})),
	report_data: Type.Optional(Type.String({
		description: "JSON string of QAReportData for report mode. Required when mode is 'report'.",
	})),
});

// ── Extension ────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	let piRef = pi;
	let activeServer: Server | null = null;
	let activeSession: { kind: "setup" | "qa"; title: string; url: string; server: Server; onClose: () => void } | null = null;

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
			kind: "setup" as const,
			title: "QA Rico Setup",
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
					category: "qa",
					title,
					summary: result.action === "run"
						? `QA configured: ${result.config?.runUnit ? "Unit" : ""}${result.config?.runUnit && result.config?.runE2E ? " + " : ""}${result.config?.runE2E ? "E2E (" + (result.config?.e2eSuites?.length || 0) + " suites)" : ""}`
						: "QA setup cancelled",
					sourcePath: "qa-rico-setup",
					viewerPath: "qa-rico-setup",
					viewerLabel: title,
					tags: ["qa", "setup", "reco"],
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
		report: QAReportData,
		signal?: AbortSignal,
	): Promise<ReportResult> {
		cleanupServer();

		const { port, server, waitForResult } = await startReportServer(report);
		activeServer = server;

		const url = `http://127.0.0.1:${port}`;
		activeSession = {
			kind: "qa" as const,
			title: "QA Rico Report",
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
				const suiteCount = report.suites?.length || 0;
				const screenshotCount = report.screenshots?.length || 0;
				upsertPersistedReport({
					category: "qa",
					title: report.title,
					summary: `${report.totalPassed} passed, ${report.totalFailed} failed — ${suiteCount} suite(s), ${screenshotCount} screenshot(s)`,
					sourcePath: "qa-rico-report",
					viewerPath: "qa-rico-report",
					viewerLabel: report.title,
					tags: ["qa", "report", "reco", "screenshots"],
					metadata: {
						action: result.action,
						suiteCount,
						screenshotCount,
						totalPassed: report.totalPassed,
						totalFailed: report.totalFailed,
					},
				});
			} catch {}

			return result;
		} finally {
			cleanupServer();
		}
	}

	// ── show_qa_rico tool ────────────────────────────────────────────

	pi.registerTool({
		name: "show_qa_rico",
		label: "Show QA Rico",
		description:
			"Open the QA Rico viewer in the browser. Two modes:\n\n" +
			"**Setup mode** (default): Opens a configuration page where the user can select " +
			"test types (Unit/E2E), E2E suites, platform, and options like screenshot capture. " +
			"Returns the user's config when they click 'Run QA'.\n\n" +
			"**Report mode**: Displays a QA results report with pass/fail summary cards, " +
			"per-suite test results, screenshot galleries with lightbox viewer, and export controls. " +
			"Requires report_data as a JSON string.\n\n" +
			"The /qa-rico command always opens setup first, then report after test execution.",
		parameters: ShowQARicoParams,

		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const { mode: modeStr, title: titleParam, report_data } = params as {
				mode?: string;
				title?: string;
				report_data?: string;
			};

			const viewerMode: ViewerMode = modeStr === "report" ? "report" : "setup";
			const displayTitle = titleParam || "QA Rico";

			// ── Report mode ──────────────────────────────────────────
			if (viewerMode === "report") {
				if (!report_data) {
					return {
						content: [{ type: "text" as const, text: "Error: report_data is required when mode is 'report'." }],
					};
				}

				let report: QAReportData;
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
							text: `QA report viewer closed. ${report.totalPassed} passed, ${report.totalFailed} failed across ${report.suites?.length || 0} suite(s). ${report.screenshots?.length || 0} screenshot(s) captured.`,
						}],
						details: {
							action: result.action,
							mode: "report",
							title: report.title,
							totalPassed: report.totalPassed,
							totalFailed: report.totalFailed,
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
					// Build a descriptive message for pi to act on
					const testTypes: string[] = [];
					if (result.config.runUnit) testTypes.push("Unit Tests (Jest)");
					if (result.config.runE2E) testTypes.push(`E2E Flows (${result.config.e2eSuites.join(", ")})`);
					const platformLabel = result.config.runE2E ? result.config.platform : "N/A";

					piRef.sendMessage(
						{
							customType: "qa-rico-config",
							content: `User configured QA Rico test run. Execute the following tests and then call \`show_qa_rico\` in report mode with the results:\n\n\`\`\`json\n${JSON.stringify(result.config, null, 2)}\n\`\`\`\n\n**Instructions:**\n1. ${result.config.runUnit ? `Run Jest unit tests: \`yarn test${result.config.generateCoverage ? " --coverage" : ""} --json --outputFile=/tmp/qa-rico-jest-results.json\`` : "Skip unit tests"}\n2. ${result.config.runE2E ? `Run E2E flows on ${platformLabel}: \`bash .pi/skills/reco-test-flows/run-all.sh ${result.config.e2eSuites.length === 8 ? "" : result.config.e2eSuites[0]}\`` : "Skip E2E flows"}\n3. Collect results and screenshots from /tmp/reco-test-*/\n4. Call \`show_qa_rico\` with mode='report' and the assembled QAReportData JSON`,
							display: true,
						},
						{ deliverAs: "followUp" as any, triggerTurn: true },
					);

					return {
						content: [{
							type: "text" as const,
							text: `QA Rico configured by user. Settings:\n- Test Types: ${testTypes.join(" + ")}\n- Platform: ${platformLabel}\n- Screenshots: ${result.config.captureScreenshots ? "Yes" : "No"}\n- Coverage: ${result.config.generateCoverage ? "Yes" : "No"}\n\nProceed with running the configured tests.`,
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
						text: "User cancelled the QA Rico setup without running tests.",
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
				theme.fg("toolTitle", theme.bold("show_qa_rico ")) +
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
						outputLine(theme, "success", "QA configured — running tests..."),
						0, 0,
					);
				}
				return new Text(
					outputLine(theme, "warning", "QA setup cancelled"),
					0, 0,
				);
			}

			if (details.mode === "report") {
				const passed = details.totalPassed ?? 0;
				const failed = details.totalFailed ?? 0;
				const statusColor = failed === 0 ? "success" : "error";
				return new Text(
					outputLine(theme, statusColor, `QA report closed — ${passed} passed, ${failed} failed`),
					0, 0,
				);
			}

			return new Text(
				outputLine(theme, "warning", "QA Rico viewer closed"),
				0, 0,
			);
		},
	});

	// ── /qa-rico command ─────────────────────────────────────────────

	pi.registerCommand("qa-rico", {
		description: "Open the QA Rico test runner — configure and run QA tests with screenshot capture",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("/qa-rico requires interactive mode", "error");
				return;
			}

			const displayTitle = args.trim() || "QA Rico";

			// Always start with setup
			const setupResult = await runSetupViewer(ctx, displayTitle);

			if (setupResult.action === "run" && setupResult.config) {
				const testTypes: string[] = [];
				if (setupResult.config.runUnit) testTypes.push("Unit Tests");
				if (setupResult.config.runE2E) testTypes.push(`E2E (${setupResult.config.e2eSuites.length} suites)`);
				const platformLabel = setupResult.config.runE2E ? setupResult.config.platform : "N/A";

				piRef.sendMessage(
					{
						customType: "qa-rico-config",
						content: `User configured QA Rico test run. Execute the following tests and then call \`show_qa_rico\` in report mode with the results:\n\n\`\`\`json\n${JSON.stringify(setupResult.config, null, 2)}\n\`\`\`\n\n**Instructions:**\n1. ${setupResult.config.runUnit ? `Run Jest unit tests: \`yarn test${setupResult.config.generateCoverage ? " --coverage" : ""} --json --outputFile=/tmp/qa-rico-jest-results.json\`` : "Skip unit tests"}\n2. ${setupResult.config.runE2E ? `Run E2E flows on ${platformLabel}: \`bash .pi/skills/reco-test-flows/run-all.sh ${setupResult.config.e2eSuites.length === 8 ? "" : setupResult.config.e2eSuites[0]}\`` : "Skip E2E flows"}\n3. Collect results and screenshots from /tmp/reco-test-*/\n4. Call \`show_qa_rico\` with mode='report' and the assembled QAReportData JSON`,
						display: true,
					},
					{ deliverAs: "followUp" as any, triggerTurn: true },
				);
				ctx.ui.notify(`QA configured — ${testTypes.join(" + ")} on ${platformLabel}`, "info");
			} else {
				ctx.ui.notify("QA setup cancelled.", "info");
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
