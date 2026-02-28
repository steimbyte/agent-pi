// ABOUTME: Cycles operational modes (NORMAL/PLAN/SPEC/PIPELINE/TEAM/CHAIN) via Shift+Tab.
// ABOUTME: Gates which extension's before_agent_start fires and injects PLAN/SPEC prompts.

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { applyExtensionDefaults } from "./lib/themeMap.ts";
import { MODES, nextMode, modeLabel, modeTextAnsi, type Mode } from "./lib/mode-cycler-logic.ts";
import { PLAN_PROMPT, SPEC_PROMPT } from "./lib/mode-prompts.ts";
import { writeFileSync } from "fs";

const MODE_FILE = "/tmp/pi-current-mode.txt";

// ANSI escape codes for mode block background colors
const ANSI_BG: Record<Mode, string> = {
	NORMAL: "",
	PLAN: "\x1b[44m",       // blue bg
	SPEC: "\x1b[46m",       // cyan bg
	PIPELINE: "\x1b[42m",   // green bg
	TEAM: "\x1b[43m",       // yellow bg
	CHAIN: "\x1b[41m",      // red bg
};
const RESET = "\x1b[0m";

export default function (pi: ExtensionAPI) {
	let currentMode: Mode = "NORMAL";

	function updateWidgets(mode: Mode, ctx: ExtensionContext) {
		if (!ctx.hasUI) return;

		if (mode === "NORMAL") {
			ctx.ui.setWidget("mode-block", undefined);
			return;
		}

		const bg = ANSI_BG[mode];
		const fg = modeTextAnsi(mode);

		// Mode block — full-width colored banner with mode name
		ctx.ui.setWidget(
			"mode-block",
			(_tui, _theme) => ({
				invalidate() {},
				render(width: number): string[] {
					const label = ` ${mode} `;
					const pad = " ".repeat(Math.max(0, width - label.length));
					return [`${bg}${fg}${label}${pad}${RESET}`];
				},
			}),
			{ placement: "aboveEditor" },
		);
	}

	function setMode(mode: Mode, ctx: ExtensionContext) {
		currentMode = mode;
		(globalThis as any).__piCurrentMode = mode;

		// Write to temp file for statusline
		try { writeFileSync(MODE_FILE, mode, "utf-8"); } catch {}

		if (ctx.hasUI) {
			ctx.ui.setStatus("mode", modeLabel(mode));
		}

		updateWidgets(mode, ctx);
	}

	// ── Shift+Tab: cycle forward ──────────────────

	pi.registerShortcut("shift+tab", {
		description: "Cycle operational mode",
		handler: async (ctx) => {
			setMode(nextMode(currentMode), ctx);
		},
	});

	// ── /mode command ─────────────────────────────

	pi.registerCommand("mode", {
		description: "Set mode: /mode or /mode <MODE>",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) return;

			const arg = args.trim().toUpperCase();
			if (arg && MODES.includes(arg as Mode)) {
				setMode(arg as Mode, ctx);
				return;
			}

			if (arg) {
				ctx.ui.notify(`Unknown mode: ${arg}. Valid: ${MODES.join(", ")}`, "error");
				return;
			}

			// Picker
			const items = MODES.map(m => {
				const active = m === currentMode ? " (active)" : "";
				return `${m}${active}`;
			});
			const selected = await ctx.ui.select("Select Mode", items);
			if (!selected) return;

			const name = selected.split(/\s/)[0] as Mode;
			setMode(name, ctx);
		},
	});

	// ── System prompt injection for PLAN/SPEC ─────

	pi.on("before_agent_start", async (_event, _ctx) => {
		if (currentMode === "PLAN") return { systemPrompt: PLAN_PROMPT };
		if (currentMode === "SPEC") return { systemPrompt: SPEC_PROMPT };
		return {};
	});

	// ── Session init ──────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		applyExtensionDefaults(import.meta.url, ctx);
		currentMode = "NORMAL";
		(globalThis as any).__piCurrentMode = "NORMAL";
		try { writeFileSync(MODE_FILE, "NORMAL", "utf-8"); } catch {}
		if (ctx.hasUI) {
			ctx.ui.setStatus("mode", "");
		}
		updateWidgets("NORMAL", ctx);
	});
}
