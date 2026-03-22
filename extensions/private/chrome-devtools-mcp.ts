// ABOUTME: Thin convenience layer over the native Chrome DevTools MCP server.
// ABOUTME: Provides health-check (connect), access-verification, and setup guidance tools.
// ABOUTME: The actual 29 browser tools are exposed natively via ~/.claude/mcp.json — this extension
// ABOUTME: adds higher-level helpers that compose those native tools.

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { outputLine } from "../lib/output-box.ts";
import { applyExtensionDefaults } from "../lib/themeMap.ts";

// ── Login-detection heuristics ──────────────────────────────────────

const LOGIN_INDICATORS = [
	"log in",
	"sign in",
	"sign-in",
	"authenticate",
	"session expired",
	"repository not found",
	"page not found",
	"choose an account",
];

function detectLoginRequired(text: string): boolean {
	const lower = text.toLowerCase();
	return LOGIN_INDICATORS.some((indicator) => lower.includes(indicator));
}

// ── Tool parameters ─────────────────────────────────────────────────

const ConnectParams = Type.Object({
	timeout_ms: Type.Optional(Type.Number({ description: "Timeout for health check in milliseconds (default: 10000)" })),
});

const AccessParams = Type.Object({
	url: Type.String({ description: "URL whose access/auth state should be verified" }),
});

// ── Extension ───────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "chrome_devtools_mcp_connect",
		label: "Chrome DevTools MCP Status",
		description:
			"Check if the Chrome DevTools MCP server is connected and the browser is reachable.\n" +
			"Returns connection status, list of open pages, and setup guidance if not connected.\n" +
			"This does NOT start the MCP server — it's started automatically by Claude CLI via ~/.claude/mcp.json.",
		parameters: ConnectParams,
		async execute(_toolCallId, _params) {
			// The native MCP server is managed by Claude CLI. We can't directly call its tools
			// from extension code — those tools are available to the LLM as native MCP tools.
			// This tool serves as documentation/guidance for the LLM.
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(
							{
								status: "info",
								message:
									"Chrome DevTools MCP tools are available natively via the MCP server registered in ~/.claude/mcp.json. " +
									"To check if the browser is reachable, call the native MCP tool `list_pages` — if it returns a list of tabs, " +
									"the connection is healthy. If it fails, the user needs to: " +
									"(1) ensure Chrome is running, " +
									"(2) enable remote debugging at chrome://inspect/#remote-debugging, " +
									"(3) restart Claude CLI.",
								available_tools: [
									"navigate_page",
									"take_snapshot",
									"take_screenshot",
									"click",
									"fill",
									"fill_form",
									"type_text",
									"press_key",
									"hover",
									"drag",
									"upload_file",
									"handle_dialog",
									"new_page",
									"close_page",
									"list_pages",
									"select_page",
									"wait_for",
									"evaluate_script",
									"list_console_messages",
									"get_console_message",
									"list_network_requests",
									"get_network_request",
									"performance_start_trace",
									"performance_stop_trace",
									"performance_analyze_insight",
									"take_memory_snapshot",
									"lighthouse_audit",
									"emulate",
									"resize_page",
								],
								setup_guide: ".context/chrome-devtools-setup.md",
							},
							null,
							2,
						),
					},
				],
			};
		},
		renderCall(_args, theme) {
			const text =
				theme.fg("toolTitle", theme.bold("chrome_devtools_mcp_connect ")) + theme.fg("accent", "health check");
			return new Text(outputLine(theme, "accent", text), 0, 0);
		},
	});

	pi.registerTool({
		name: "chrome_devtools_mcp_verify_access",
		label: "Chrome DevTools Verify Access",
		description:
			"Verify whether a page is accessible or requires login.\n" +
			"This is a guidance tool — it tells the LLM how to verify access using the native MCP tools.\n" +
			"The LLM should: (1) navigate_page to the URL, (2) take_snapshot, (3) check for login indicators.",
		parameters: AccessParams,
		async execute(_toolCallId, params) {
			const p = params as { url: string };
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(
							{
								instruction:
									"To verify access, use the native Chrome DevTools MCP tools in sequence:\n" +
									`1. Call navigate_page with url: "${p.url}"\n` +
									"2. Call take_snapshot to get the page content\n" +
									"3. Check the snapshot for login indicators: " +
									LOGIN_INDICATORS.join(", ") +
									"\n" +
									"4. If login required, ask the user to log in manually in Chrome and retry\n" +
									"5. If accessible, proceed with content extraction",
								login_indicators: LOGIN_INDICATORS,
								url: p.url,
							},
							null,
							2,
						),
					},
				],
			};
		},
		renderCall(args, theme) {
			const text =
				theme.fg("toolTitle", theme.bold("chrome_devtools_mcp_verify_access ")) +
				theme.fg("accent", String((args as any).url || ""));
			return new Text(outputLine(theme, "accent", text), 0, 0);
		},
	});

	// ── Lifecycle ────────────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		try {
			applyExtensionDefaults(import.meta.url as any, ctx as any);
		} catch {}
	});
}
