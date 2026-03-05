// ABOUTME: Tests for footer context warning behavior.
// ABOUTME: Verifies warnings are shown at threshold; no tool blocking or ctx.compact() calls.

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

type TestContext = {
	ui: { notify: ReturnType<typeof vi.fn> };
	model: { name: string; provider?: string; id?: string };
	cwd: string;
	getContextUsage: () => { percent: number };
};

function createContext(overrides: { percent: number; ui?: ReturnType<typeof vi.fn> } = { percent: 75 }): TestContext {
	return {
		ui: {
			notify: overrides.ui ?? vi.fn(),
		},
		model: { name: "Claude Opus", provider: "anthropic", id: "claude" },
		cwd: "/Users/ricardo/Projects/test",
		getContextUsage: () => ({ percent: overrides.percent }),
	};
}

function createExtension() {
	const handlers: Record<string, (event: unknown, ctx: TestContext) => any> = {};
	const pi: any = {
		on: (event: string, handler: any) => {
			handlers[event] = handler;
		},
	};
	return { handlers, pi };
}

describe("footer context warnings", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("shows warning at 80% context usage", async () => {
		const { handlers, pi } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		await handlers["before_agent_start"]("before_agent_start", createContext({ percent: 80, ui: notify }));
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("auto-compaction will trigger soon"), "info");
	});

	it("shows warning at 90% context usage (no blocking)", async () => {
		const { handlers, pi } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		await handlers["before_agent_start"]("before_agent_start", createContext({ percent: 90, ui: notify }));
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("auto-compaction will trigger soon"), "info");
	});

	it("does not show warning below threshold", async () => {
		const { handlers, pi } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		await handlers["before_agent_start"]("before_agent_start", createContext({ percent: 79, ui: notify }));
		expect(notify).not.toHaveBeenCalled();
	});

	it("warns only once per turn", async () => {
		const { handlers, pi } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		const ctx = createContext({ percent: 85, ui: notify });
		await handlers["before_agent_start"]("before_agent_start", ctx);
		await handlers["before_agent_start"]("before_agent_start", ctx);
		await handlers["before_agent_start"]("before_agent_start", ctx);
		expect(notify).toHaveBeenCalledTimes(1);
	});

	it("resets warning flag when context drops below threshold", async () => {
		const { handlers, pi } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		// First: warn
		await handlers["before_agent_start"]("before_agent_start", createContext({ percent: 85, ui: notify }));
		expect(notify).toHaveBeenCalledTimes(1);

		// Drop below threshold
		await handlers["before_agent_start"]("before_agent_start", createContext({ percent: 50, ui: notify }));

		// Should warn again
		await handlers["before_agent_start"]("before_agent_start", createContext({ percent: 85, ui: notify }));
		expect(notify).toHaveBeenCalledTimes(2);
	});

	it("does not register a tool_call handler (no blocking)", async () => {
		const { handlers, pi } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		expect(handlers["tool_call"]).toBeUndefined();
	});
});
