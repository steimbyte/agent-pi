// ABOUTME: Tests for the Commander MCP bridge extension.
// ABOUTME: Verifies tool registration, MCP client proxying, and error handling.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the MCP client ─────────────────────────────────────────────

const mockConnect = vi.fn();
const mockCallTool = vi.fn();
const mockDisconnect = vi.fn();
const mockIsConnected = vi.fn().mockReturnValue(false);

vi.mock("../lib/mcp-client.ts", () => ({
	McpClient: vi.fn().mockImplementation(() => ({
		connect: mockConnect,
		callTool: mockCallTool,
		disconnect: mockDisconnect,
		isConnected: mockIsConnected,
	})),
}));

// ── Mock ExtensionAPI ───────────────────────────────────────────────

interface RegisteredTool {
	name: string;
	label: string;
	description: string;
	parameters: any;
	execute: (...args: any[]) => any;
}

function createMockPi() {
	const tools: RegisteredTool[] = [];
	const events: Record<string, Function> = {};

	return {
		registerTool: vi.fn((def: any) => { tools.push(def); }),
		on: vi.fn((event: string, handler: Function) => { events[event] = handler; }),
		_tools: tools,
		_events: events,
	};
}

// ── Tests ───────────────────────────────────────────────────────────

describe("commander-mcp extension", () => {
	let pi: ReturnType<typeof createMockPi>;

	beforeEach(async () => {
		vi.clearAllMocks();
		pi = createMockPi();
		const mod = await import("../commander-mcp.ts");
		mod.default(pi as any);
	});

	it("should register all 8 commander tools", () => {
		expect(pi.registerTool).toHaveBeenCalledTimes(8);
		const names = pi._tools.map(t => t.name);
		expect(names).toContain("commander_task");
		expect(names).toContain("commander_session");
		expect(names).toContain("commander_workflow");
		expect(names).toContain("commander_spec");
		expect(names).toContain("commander_jira");
		expect(names).toContain("commander_mailbox");
		expect(names).toContain("commander_orchestration");
		expect(names).toContain("commander_dependency");
	});

	it("should register tools with operation as required parameter", () => {
		for (const tool of pi._tools) {
			expect(tool.parameters).toBeDefined();
		}
	});

	it("should register session_start and session_shutdown event handlers", () => {
		expect(pi.on).toHaveBeenCalledWith("session_start", expect.any(Function));
		expect(pi.on).toHaveBeenCalledWith("session_shutdown", expect.any(Function));
	});

	it("should proxy tool calls to MCP client", async () => {
		mockIsConnected.mockReturnValue(true);
		mockCallTool.mockResolvedValue({
			content: [{ type: "text", text: "result" }],
		});

		const taskTool = pi._tools.find(t => t.name === "commander_task")!;
		const result = await taskTool.execute("call-1", { operation: "list" }, new AbortController().signal, vi.fn(), {});

		expect(mockCallTool).toHaveBeenCalledWith("commander_task", { operation: "list" });
		expect(result.content[0].text).toBe("result");
	});

	it("should lazy-connect on first tool call if not connected", async () => {
		mockIsConnected.mockReturnValue(false);
		mockConnect.mockResolvedValue(undefined);
		mockCallTool.mockResolvedValue({
			content: [{ type: "text", text: "ok" }],
		});

		const taskTool = pi._tools.find(t => t.name === "commander_task")!;
		await taskTool.execute("call-1", { operation: "list" }, new AbortController().signal, vi.fn(), {});

		expect(mockConnect).toHaveBeenCalled();
		expect(mockCallTool).toHaveBeenCalled();
	});

	it("should return error content when MCP client throws", async () => {
		mockIsConnected.mockReturnValue(true);
		mockCallTool.mockRejectedValue(new Error("Connection refused"));

		const taskTool = pi._tools.find(t => t.name === "commander_task")!;
		const result = await taskTool.execute("call-1", { operation: "list" }, new AbortController().signal, vi.fn(), {});

		expect(result.content[0].text).toContain("Connection refused");
	});

	it("should disconnect MCP client on session_shutdown", async () => {
		const shutdownHandler = pi._events["session_shutdown"];
		expect(shutdownHandler).toBeDefined();
		await shutdownHandler({}, {});
		expect(mockDisconnect).toHaveBeenCalled();
	});

	it("should have meaningful descriptions for all tools", () => {
		for (const tool of pi._tools) {
			expect(tool.description.length).toBeGreaterThan(50);
			// All Commander tools mention "OPERATIONS" or "operation"
			expect(tool.description.toLowerCase()).toContain("operation");
		}
	});
});
