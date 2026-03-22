import { describe, it, expect } from "vitest";
import { resolveChromeDevtoolsMcpServerPath, ChromeDevtoolsMcpClient } from "../../private/lib/chrome-devtools-mcp.ts";

describe("resolveChromeDevtoolsMcpServerPath", () => {
	it("prefers explicit path when provided", () => {
		expect(resolveChromeDevtoolsMcpServerPath("/tmp/custom-server.js")).toBe("/tmp/custom-server.js");
	});

	it("falls back to a deterministic default candidate", () => {
		const result = resolveChromeDevtoolsMcpServerPath();
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});
});

describe("ChromeDevtoolsMcpClient", () => {
	it("exposes connection state as false before connect", () => {
		const client = new ChromeDevtoolsMcpClient({ serverPath: "/tmp/mock-server.js" });
		expect(client.isConnected()).toBe(false);
	});

	it("safeCallTool normalizes call failures", async () => {
		const client = new ChromeDevtoolsMcpClient({ serverPath: "/tmp/mock-server.js" });
		const result = await client.safeCallTool("missing_tool", {});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(typeof result.error).toBe("string");
	});
});
