// ABOUTME: Tests for automatic compaction triggering from footer context-gate integration.
// ABOUTME: Verifies warnings and command dispatch behavior around context thresholds.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@mariozechner/pi-tui", () => ({
	truncateToWidth: (s: string) => s,
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
		cwd: "/Users/ricardo/Projects/pi-vs-claude-code",
		getContextUsage: () => ({ percent: overrides.percent }),
	};
}

function createExtension() {
	const handlers: Record<string, (event: unknown, ctx: TestContext) => any> = {};
	const sendMessage = vi.fn(async () => undefined);
	const pi: any = {
		on: (event: string, handler: any) => {
			handlers[event] = handler;
		},
		sendMessage,
	};
	return { handlers, sendMessage, pi };
}

function tick() {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("footer auto-compaction behavior", () => {
	beforeEach(() => {
		vi.resetModules();
		delete process.env.PI_SUBAGENT;
	});

	it("auto-runs /compact-min and blocks tool calls at BLOCK threshold", async () => {
		const { handlers, pi, sendMessage } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		const ctx = createContext({ percent: 90, ui: notify });
		const result = await handlers["tool_call"]("tool_call", ctx);

		expect(result).toEqual({
			block: true,
			reason:
				"Context at 90% — approaching limit. Run /compact or /compact-min NOW to prevent context loss errors. Do NOT continue working until compaction is done.",
		});
		await tick();
		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(sendMessage).toHaveBeenCalledWith(
			{ content: "/compact-min", display: true },
			{ deliverAs: "user", triggerTurn: true },
		);
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("Auto-Compaction Started"), "warning");
	});

	it("warn-level context only warns and does not auto-trigger compaction", async () => {
		const { handlers, pi, sendMessage } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		await handlers["before_agent_start"]("before_agent_start", createContext({ percent: 80, ui: notify }));
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("consider running /compact soon"), "warning");
		await tick();
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("reports compact-complete and sends auto-continue message when context recovers", async () => {
		const { handlers, pi, sendMessage } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		await handlers["tool_call"]("tool_call", createContext({ percent: 90, ui: notify }));
		await tick();
		expect(sendMessage).toHaveBeenCalledTimes(1);

		await handlers["before_agent_start"]("before_agent_start", createContext({ percent: 79, ui: notify }));
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("Auto-Compaction Complete"), "success");

		// Should send auto-continue follow-up message
		expect(sendMessage).toHaveBeenCalledTimes(2);
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				customType: "auto-compact-resume",
				content: expect.stringContaining("Continue where you left off"),
			}),
			{ deliverAs: "followUp", triggerTurn: true },
		);
	});

	it("subagent blocks and auto-compacts at 80% threshold", async () => {
		process.env.PI_SUBAGENT = "1";
		const { handlers, pi, sendMessage } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		const ctx = createContext({ percent: 80, ui: notify });
		const result = await handlers["tool_call"]("tool_call", ctx);

		expect(result).toEqual({
			block: true,
			reason: expect.stringContaining("Context at 80%"),
		});
		await tick();
		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(sendMessage).toHaveBeenCalledWith(
			{ content: "/compact-min", display: true },
			{ deliverAs: "user", triggerTurn: true },
		);
	});

	it("subagent does not block below 80% threshold", async () => {
		process.env.PI_SUBAGENT = "1";
		const { handlers, pi, sendMessage } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		const ctx = createContext({ percent: 79, ui: notify });
		const result = await handlers["tool_call"]("tool_call", ctx);

		expect(result).toEqual({ block: false });
		await tick();
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("subagent auto-continues after compaction recovery", async () => {
		process.env.PI_SUBAGENT = "1";
		const { handlers, pi, sendMessage } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		// Trigger compaction at 80%
		await handlers["tool_call"]("tool_call", createContext({ percent: 80, ui: notify }));
		await tick();
		expect(sendMessage).toHaveBeenCalledTimes(1);

		// Context recovers
		await handlers["before_agent_start"]("before_agent_start", createContext({ percent: 50, ui: notify }));
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("Auto-Compaction Complete"), "success");
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				customType: "auto-compact-resume",
				content: expect.stringContaining("Continue where you left off"),
			}),
			{ deliverAs: "followUp", triggerTurn: true },
		);
	});
});
