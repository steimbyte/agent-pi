import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { outputLine } from "../lib/output-box.ts";
import { applyExtensionDefaults } from "../lib/themeMap.ts";
import { ChromeDevtoolsMcpClient } from "./lib/chrome-devtools-mcp.ts";

const ConnectParams = Type.Object({
	server_path: Type.Optional(Type.String({ description: "Optional explicit path to the Chrome DevTools MCP server entrypoint" })),
	timeout_ms: Type.Optional(Type.Number({ description: "Optional timeout override in milliseconds" })),
});

const NavigateParams = Type.Object({
	url: Type.String({ description: "URL to open or inspect" }),
});

const AccessParams = Type.Object({
	url: Type.String({ description: "URL whose access/auth state should be verified" }),
});

export default function(pi: ExtensionAPI) {
	let client: ChromeDevtoolsMcpClient | null = null;

	async function ensureClient(params?: { server_path?: string; timeout_ms?: number }) {
		if (client?.isConnected()) return client;
		client = new ChromeDevtoolsMcpClient({ serverPath: params?.server_path, timeoutMs: params?.timeout_ms });
		await client.connect();
		(globalThis as any).__piChromeDevtoolsMcpClient = client;
		return client;
	}

	pi.registerTool({
		name: "chrome_devtools_mcp_connect",
		label: "Chrome DevTools MCP Connect",
		description: "Connect to the private Chrome DevTools MCP bridge for browser-driven workflows.",
		parameters: ConnectParams,
		async execute(_toolCallId, params) {
			const p = params as { server_path?: string; timeout_ms?: number };
			const instance = await ensureClient(p);
			return { content: [{ type: "text" as const, text: `Connected to Chrome DevTools MCP at ${instance.serverPath}` }] };
		},
		renderCall(args, theme) {
			const text = theme.fg("toolTitle", theme.bold("chrome_devtools_mcp_connect ")) + theme.fg("accent", String((args as any).server_path || "auto"));
			return new Text(outputLine(theme, "accent", text), 0, 0);
		},
	});

	pi.registerTool({
		name: "chrome_devtools_mcp_call",
		label: "Chrome DevTools MCP Call",
		description: "Call a raw tool on the private Chrome DevTools MCP server.",
		parameters: Type.Object({
			tool_name: Type.String({ description: "Raw MCP tool name" }),
			arguments: Type.Optional(Type.Record(Type.String(), Type.Any())),
			timeout_ms: Type.Optional(Type.Number()),
		}),
		async execute(_toolCallId, params) {
			const p = params as { tool_name: string; arguments?: Record<string, unknown>; timeout_ms?: number };
			const instance = await ensureClient();
			const result = await instance.callTool(p.tool_name, p.arguments || {}, p.timeout_ms);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
		},
		renderCall(args, theme) {
			const text = theme.fg("toolTitle", theme.bold("chrome_devtools_mcp_call ")) + theme.fg("accent", String((args as any).tool_name || ""));
			return new Text(outputLine(theme, "accent", text), 0, 0);
		},
	});

	pi.registerTool({
		name: "chrome_devtools_mcp_verify_access",
		label: "Chrome DevTools Verify Access",
		description: "Verify whether a PR page is accessible or requires login.",
		parameters: AccessParams,
		async execute(_toolCallId, params) {
			const p = params as { url: string };
			const instance = await ensureClient();
			const result = await instance.verifyPageAccess(p.url);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
		},
		renderCall(args, theme) {
			const text = theme.fg("toolTitle", theme.bold("chrome_devtools_mcp_verify_access ")) + theme.fg("accent", String((args as any).url || ""));
			return new Text(outputLine(theme, "accent", text), 0, 0);
		},
	});

	pi.registerTool({
		name: "chrome_devtools_mcp_open_page",
		label: "Chrome DevTools Open Page",
		description: "Open or inspect a page through Chrome DevTools MCP.",
		parameters: NavigateParams,
		async execute(_toolCallId, params) {
			const p = params as { url: string };
			const instance = await ensureClient();
			const result = await instance.safeCallTool("open_page", { url: p.url }, 30_000);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
		},
		renderCall(args, theme) {
			const text = theme.fg("toolTitle", theme.bold("chrome_devtools_mcp_open_page ")) + theme.fg("accent", String((args as any).url || ""));
			return new Text(outputLine(theme, "accent", text), 0, 0);
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		try { applyExtensionDefaults(import.meta.url as any, ctx as any); } catch {}
	});

	pi.on("session_shutdown", async () => {
		if (client) {
			await client.disconnect();
			client = null;
		}
	});
}
