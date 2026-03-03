// ABOUTME: Footer widget displaying model name, context percentage, and working directory.
// ABOUTME: Auto-compaction trigger — blocks tools at high context usage and fires native compaction.
/**
 * Footer — Dark status bar with model · context % · directory.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import { basename, dirname } from "node:path";
import { applyExtensionDefaults } from "./lib/themeMap.ts";
import { shouldBlockForCompaction, COMPACT_THRESHOLD } from "./lib/context-gate.ts";
import { readSessionState, readRecentLogs, buildRestorationContent } from "./lib/memory-cycle-helpers.ts";

/** Subagents compact earlier since no human can intervene if they hit the wall. */
const SUBAGENT_BLOCK_THRESHOLD = COMPACT_THRESHOLD; // 80%

/** Turn a model name like "Claude 4 Opus" into "opus 4" */
function shortModelName(name: string | undefined): string {
	if (!name) return "no model";
	const cleaned = name.replace(/^claude\s*/i, "").trim();
	const tokens = cleaned.split(/\s+/);
	const versions: string[] = [];
	const words: string[] = [];
	for (const token of tokens) {
		if (/^[\d.]+$/.test(token)) versions.push(token);
		else words.push(token.toLowerCase());
	}
	const parts = [...words, ...versions];
	return parts.join(" ") || name.toLowerCase();
}

/** Last two path components: "Github-Work/pi-vs-claude-code" */
function shortDir(cwd: string): string {
	const child = basename(cwd);
	const parent = basename(dirname(cwd));
	return parent ? `${parent}/${child}` : child;
}

interface CompactState {
	status: "idle" | "requested" | "done" | "failed";
	startPercent: number;
	startTime: number;
	lastNoticeAt: number;
}

let compactState: CompactState = {
	status: "idle",
	startPercent: 0,
	startTime: 0,
	lastNoticeAt: 0,
};

const AUTO_COMPACT_COOLDOWN_MS = 10_000;
const REQUEST_TTL_MS = 90_000;

function requestAutoCompact(ctx: ExtensionContext, pi: ExtensionAPI): void {
	if (compactState.status === "requested") return;
	const usage = ctx.getContextUsage();
	if (!usage?.percent) return;
	const now = Date.now();
	if (now - compactState.lastNoticeAt < AUTO_COMPACT_COOLDOWN_MS) return;

	compactState = {
		status: "requested",
		startPercent: Math.round(usage.percent),
		startTime: now,
		lastNoticeAt: now,
	};

	// Signal to memory-cycle.ts that auto-compaction is handling the resume
	(globalThis as any).__piAutoCompacting = true;

	ctx.ui.notify(
		`Context: ${Math.round(usage.percent)}% — Cycling Memory now`,
		"info",
	);

	// Use pi's native ctx.compact() instead of sending /compact as user message.
	// This triggers the actual compaction pipeline (summarize → reclaim tokens)
	// and our session_before_compact hook in memory-cycle.ts saves artifacts.
	ctx.compact({
		customInstructions: "Preserve all goals, decisions, progress, file changes, and context needed to continue work seamlessly.",
		onComplete: () => {
			const postUsage = ctx.getContextUsage();
			const postPercent = postUsage?.percent ? Math.round(postUsage.percent) : 0;
			compactState.status = "done";
			compactState.lastNoticeAt = Date.now();

			// The visual card is rendered by memory-cycle.ts registerMessageRenderer
			// via the auto-compact-resume message below. No separate notify needed.

			// Build rich resume message with restored session state
			const sessionState = readSessionState(ctx.cwd);
			const parts = buildRestorationContent(sessionState);
			const recentLogs = readRecentLogs();
			if (recentLogs) parts.push("", recentLogs);

			const resumeContent = [
				"Auto-compaction complete — context recovered.",
				"",
				...parts,
				"",
				"Continue where you left off. Resume the task you were working on before compaction. Do NOT ask the user what to do — just keep working.",
			].join("\n");

			// Clear auto-compaction flag
			(globalThis as any).__piAutoCompacting = false;

			// Notify user visually
			ctx.ui.notify(
				`Context compacted -- now at ${postPercent}%`,
				"info",
			);

			// Short card visible to user (renderCompactionCard in memory-cycle.ts)
			pi.sendMessage(
				{
					customType: "auto-compact-resume",
					content: `Context compacted -- now at ${postPercent}%.`,
					display: true,
					details: {
						source: "auto" as const,
						postPercent,
						task: sessionState?.currentTask,
						recentFiles: sessionState?.filesEdited,
					},
				},
			);

			// Full context for the agent (not displayed)
			pi.sendMessage(
				{
					customType: "auto-compact-resume",
					content: resumeContent,
					display: false,
				},
				{ deliverAs: "followUp", triggerTurn: true },
			);
		},
		onError: (err) => {
			(globalThis as any).__piAutoCompacting = false;
			compactState.status = "failed";
			compactState.lastNoticeAt = Date.now();
			ctx.ui.notify(`Compaction failed: ${err.message}. Try /compact manually.`, "error");
		},
	});
}

function finalizeCompactStatus(ctx: ExtensionContext, _pi: ExtensionAPI): void {
	if (compactState.status !== "requested") return;

	// Check for stale requests that never completed (safety valve)
	const now = Date.now();
	if (now - compactState.startTime >= REQUEST_TTL_MS) {
		const usage = ctx.getContextUsage();
		const percent = usage?.percent ? Math.round(usage.percent) : 0;
		compactState.status = "failed";
		compactState.lastNoticeAt = now;
		ctx.ui.notify("Compaction timed out. Try /compact manually.", "error");
	}
}

function setupFooter(ctx: ExtensionContext, onUnsub: (unsub: () => void) => void) {
	ctx.ui.setFooter((tui, theme, footerData) => {
		const unsub = footerData.onBranchChange(() => tui.requestRender());
		onUnsub(unsub);
		return {
			dispose: unsub,
			invalidate() {},
			render(width: number): string[] {
				const model = shortModelName(ctx.model?.name);
				const usage = ctx.getContextUsage();
				const pct = usage?.percent != null ? `${Math.round(usage.percent)}%` : "–";
				const dir = shortDir(ctx.cwd);
				const sep = theme.fg("dim", " | ");
				const modelStr = theme.fg("accent", theme.bold(model));
				const content = ` ` + modelStr + sep + theme.fg("dim", pct) + sep + theme.fg("dim", dir);
				return [truncateToWidth(content, width, "")];
			},
		};
	});
}

export default function (pi: ExtensionAPI) {
	let branchUnsub: (() => void) | null = null;

	pi.on("session_start", async (_event, ctx) => {
		applyExtensionDefaults(import.meta.url, ctx);
		setupFooter(ctx, (unsub) => {
			branchUnsub = unsub;
		});
	});

	pi.on("tool_call", async (_event, ctx) => {
		const isSubagent = process.env.PI_SUBAGENT === "1";
		const usage = ctx.getContextUsage();
		const threshold = isSubagent ? SUBAGENT_BLOCK_THRESHOLD : undefined;
		const result = shouldBlockForCompaction(usage?.percent, threshold);

		if (result.block) {
			requestAutoCompact(ctx, pi);
			return { block: true, reason: result.reason };
		}

		return { block: false };
	});

	let warnedThisTurn = false;
	pi.on("before_agent_start", async (_event, ctx) => {
		const isSubagent = process.env.PI_SUBAGENT === "1";
		const usage = ctx.getContextUsage();
		const threshold = isSubagent ? SUBAGENT_BLOCK_THRESHOLD : undefined;
		const result = shouldBlockForCompaction(usage?.percent, threshold);

		if (result.level === "warn") {
			if (!warnedThisTurn) {
				warnedThisTurn = true;
				ctx.ui.notify(
					`Context: ${Math.round(usage?.percent ?? 0)}% — Agent will Cycle-Memory soon`,
					"info",
				);
			}
		} else if (result.level === "ok") {
			warnedThisTurn = false;
		} else if (result.block) {
			requestAutoCompact(ctx, pi);
		}

		finalizeCompactStatus(ctx, pi);
	});

	pi.on("session_shutdown", async () => {
		if (branchUnsub) {
			branchUnsub();
			branchUnsub = null;
		}
	});
}
