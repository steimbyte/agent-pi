// ABOUTME: Tests for automatic compaction triggering from footer context-gate integration.
// ABOUTME: Verifies warnings, ctx.compact() calls, and auto-resume behavior around context thresholds.

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
	compact: ReturnType<typeof vi.fn>;
};

function createContext(overrides: { percent: number; ui?: ReturnType<typeof vi.fn> } = { percent: 75 }): TestContext {
	return {
		ui: {
			notify: overrides.ui ?? vi.fn(),
		},
		model: { name: "Claude Opus", provider: "anthropic", id: "claude" },
		cwd: "/Users/ricardo/Projects/pi-vs-claude-code",
		getContextUsage: () => ({ percent: overrides.percent }),
		compact: vi.fn((opts: any) => { if (opts.onComplete) opts.onComplete(); }),
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
		delete (globalThis as any).__piAutoCompacting;
	});

	it("blocks tool calls and triggers ctx.compact() at BLOCK threshold", async () => {
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

		// Should call ctx.compact() directly
		expect(ctx.compact).toHaveBeenCalledTimes(1);
		expect(ctx.compact).toHaveBeenCalledWith(
			expect.objectContaining({
				customInstructions: expect.any(String),
				onComplete: expect.any(Function),
				onError: expect.any(Function),
			}),
		);

		// Since mock auto-calls onComplete, resume messages should be sent:
		// 1. Short display card (no options)
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				customType: "auto-compact-resume",
				display: true,
			}),
		);
		// 2. Full context for agent (with triggerTurn)
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				customType: "auto-compact-resume",
				content: expect.stringContaining("Continue where you left off"),
				display: false,
			}),
			{ deliverAs: "followUp", triggerTurn: true },
		);

		expect(notify).toHaveBeenCalledWith(expect.stringContaining("compacting automatically"), "warning");
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

	it("sends resume message with restored context on compaction complete", async () => {
		const { handlers, pi, sendMessage } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		const ctx = createContext({ percent: 90, ui: notify });
		await handlers["tool_call"]("tool_call", ctx);

		// Mock auto-calls onComplete, so resume messages are sent immediately:
		// Display card (short, visible to user)
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				customType: "auto-compact-resume",
				display: true,
			}),
		);
		// Full context for agent
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				customType: "auto-compact-resume",
				content: expect.stringContaining("Auto-compaction complete"),
				display: false,
			}),
			{ deliverAs: "followUp", triggerTurn: true },
		);
	});

	it("sets and clears __piAutoCompacting flag during compact flow", async () => {
		const { handlers, pi } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const ctx = createContext({ percent: 90 });
		// Override compact to capture the flag state during execution
		let flagDuringCompact: boolean | undefined;
		ctx.compact = vi.fn((opts: any) => {
			flagDuringCompact = (globalThis as any).__piAutoCompacting;
			if (opts.onComplete) opts.onComplete();
		});

		await handlers["tool_call"]("tool_call", ctx);

		// Flag should have been true during compact
		expect(flagDuringCompact).toBe(true);
		// Flag should be cleared after complete
		expect((globalThis as any).__piAutoCompacting).toBe(false);
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

		// Should call ctx.compact() directly
		expect(ctx.compact).toHaveBeenCalledTimes(1);
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

	it("subagent auto-continues after compaction", async () => {
		process.env.PI_SUBAGENT = "1";
		const { handlers, pi, sendMessage } = createExtension();
		const extension = await import("../footer.ts");
		extension.default(pi);

		const notify = vi.fn();
		const ctx = createContext({ percent: 80, ui: notify });
		await handlers["tool_call"]("tool_call", ctx);

		// Since mock auto-calls onComplete, resume messages should already be sent
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				customType: "auto-compact-resume",
				display: true,
			}),
		);
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				customType: "auto-compact-resume",
				content: expect.stringContaining("Continue where you left off"),
				display: false,
			}),
			{ deliverAs: "followUp", triggerTurn: true },
		);
	});
});
