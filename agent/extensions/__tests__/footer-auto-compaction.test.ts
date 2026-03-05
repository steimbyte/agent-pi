// ABOUTME: Tests for footer behavior after proactive compaction moved to memory-cycle.
// ABOUTME: Verifies footer no longer has before_agent_start handler; no tool blocking.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@mariozechner/pi-tui", () => ({
	truncateToWidth: (s: string) => s,
}));

vi.mock("node:fs", () => ({
	existsSync: vi.fn(() => false),
	mkdirSync: vi.fn(),
	readFileSync: vi.fn(() => ""),
	writeFileSync: vi.fn(),
	appendFileSync: vi.fn(),
}));

function createExtension() {
	const handlers: Record<string, (event: unknown, ctx: any) => any> = {};
	const pi: any = {
		on: (event: string, handler: any) => {
			handlers[event] = handler;
		},
	};
	return { handlers, pi };
}

describe("footer (post-refactor)", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("does not register a before_agent_start handler (moved to memory-cycle)", async () => {
		const { handlers, pi } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		expect(handlers["before_agent_start"]).toBeUndefined();
	});

	it("does not register a tool_call handler (no blocking)", async () => {
		const { handlers, pi } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		expect(handlers["tool_call"]).toBeUndefined();
	});

	it("registers session_start and session_shutdown handlers", async () => {
		const { handlers, pi } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		expect(handlers["session_start"]).toBeDefined();
		expect(handlers["session_shutdown"]).toBeDefined();
	});
});
