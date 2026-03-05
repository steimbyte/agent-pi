// ABOUTME: Footer widget displaying model name, context percentage, and working directory.
// ABOUTME: Shows context usage warnings; core pi framework handles actual auto-compaction.
/**
 * Footer — Dark status bar with model · context % · directory.
 *
 * Context compaction is handled by pi's core _runAutoCompaction which properly
 * emits auto_compaction_start/end events. The interactive-mode handles these
 * events by calling rebuildChatFromMessages() to clear and re-render the UI.
 *
 * Previously, this extension called ctx.compact() directly which bypassed
 * the auto_compaction events, leaving stale UI components that caused
 * doubled/artifact rendering after compaction.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import { basename, dirname } from "node:path";
import { applyExtensionDefaults } from "./lib/themeMap.ts";
import { shouldWarnForCompaction, COMPACT_THRESHOLD } from "./lib/context-gate.ts";

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

function setupFooter(ctx: any, onUnsub: (unsub: () => void) => void) {
	ctx.ui.setFooter((tui: any, theme: any, footerData: any) => {
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

	// No tool_call blocking — core auto-compaction handles compaction properly
	// via auto_compaction_start/end events which trigger UI rebuild.

	let warnedThisTurn = false;
	pi.on("before_agent_start", async (_event, ctx) => {
		const usage = ctx.getContextUsage();
		const result = shouldWarnForCompaction(usage?.percent);

		if (result.level === "warn") {
			if (!warnedThisTurn) {
				warnedThisTurn = true;
				ctx.ui.notify(
					`Context: ${Math.round(usage?.percent ?? 0)}% — auto-compaction will trigger soon`,
					"info",
				);
			}
		} else if (result.level === "ok") {
			warnedThisTurn = false;
		}
	});

	pi.on("session_shutdown", async () => {
		if (branchUnsub) {
			branchUnsub();
			branchUnsub = null;
		}
	});
}
