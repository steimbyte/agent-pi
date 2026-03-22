import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { McpClient } from "../../lib/mcp-client.ts";

export interface ChromeDevtoolsMcpOptions {
	serverPath?: string;
	env?: Record<string, string>;
	timeoutMs?: number;
}

export interface ChromeDevtoolsPageAccessResult {
	url: string;
	accessible: boolean;
	loginRequired: boolean;
	title?: string;
	reason?: string;
	evidence?: string[];
}

export function resolveChromeDevtoolsMcpServerPath(explicitPath?: string): string {
	const candidates = [
		explicitPath,
		process.env.CHROME_DEVTOOLS_MCP_SERVER_PATH,
		resolve(process.cwd(), "services/chrome-devtools-mcp/dist/server.js"),
		resolve(process.cwd(), "node_modules/chrome-devtools-mcp/dist/server.js"),
		resolve(process.cwd(), "node_modules/@chrome-devtools/mcp/dist/server.js"),
		join(process.cwd(), "chrome-devtools-mcp", "dist", "server.js"),
	].filter(Boolean) as string[];

	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}

	return candidates[0] || "chrome-devtools-mcp";
}

export class ChromeDevtoolsMcpClient {
	private client: McpClient;
	private connected = false;
	readonly serverPath: string;

	constructor(opts: ChromeDevtoolsMcpOptions = {}) {
		this.serverPath = resolveChromeDevtoolsMcpServerPath(opts.serverPath);
		this.client = new McpClient(this.serverPath, opts.env || {}, opts.timeoutMs || 90_000);
	}

	async connect(): Promise<void> {
		await this.client.connect();
		this.connected = true;
	}

	async disconnect(): Promise<void> {
		this.client.disconnect();
		this.connected = false;
	}

	isConnected(): boolean {
		return this.connected && this.client.isConnected();
	}

	async callTool(name: string, args: Record<string, unknown>, timeoutMs?: number): Promise<any> {
		return this.client.callTool(name, args, timeoutMs);
	}

	async safeCallTool(name: string, args: Record<string, unknown>, timeoutMs?: number): Promise<{ ok: true; result: any } | { ok: false; error: string }> {
		try {
			const result = await this.callTool(name, args, timeoutMs);
			return { ok: true, result };
		} catch (err: any) {
			return { ok: false, error: err?.message || String(err) };
		}
	}

	async verifyPageAccess(url: string): Promise<ChromeDevtoolsPageAccessResult> {
		const titleProbe = await this.safeCallTool("get_page_metadata", { url }, 30_000);
		if (!titleProbe.ok) {
			return {
				url,
				accessible: false,
				loginRequired: false,
				reason: titleProbe.error,
				evidence: ["metadata probe failed"],
			};
		}

		const metadata = titleProbe.result || {};
		const title = String(metadata.title || "");
		const text = `${metadata.title || ""} ${metadata.url || ""} ${metadata.text || ""}`.toLowerCase();
		const loginRequired = /(login|sign in|sign-in|authenticate|session expired|log in)/i.test(text);
		const accessible = !loginRequired && !metadata.blocked;

		return {
			url,
			accessible,
			loginRequired,
			title: title || undefined,
			reason: accessible ? undefined : (loginRequired ? "Authentication required" : (metadata.reason || "Page unavailable")),
			evidence: [title, String(metadata.url || "")].filter(Boolean),
		};
	}
}
