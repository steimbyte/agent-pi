// ABOUTME: Pure render logic for subagent widget — title, summary, border count
// ABOUTME: Extracted from subagent-widget.ts for testability

export interface SubRenderState {
	id: number;
	status: "running" | "done" | "error";
	name: string;
	task: string;
	toolCount: number;
	elapsed: number;
	turnCount: number;
	summary?: string;
	summaryLines?: string[];
	model?: string;
}

export interface SubRenderTheme {
	fg: (color: string, text: string) => string;
	bold: (text: string) => string;
}

export interface SubRenderResult {
	lines: string[];
	borderCount: number;
}

const BRAILLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * Build the title label: "NAME - SA{id}"
 */
export function subagentTitle(state: SubRenderState): string {
	return state.name.toUpperCase() + " - SA" + state.id;
}

/**
 * Render the content lines for a subagent widget.
 * Designed for display on a full-width colored background box.
 * Text uses bold white for title and light colors for details.
 * borderCount is always 1 (top divider only).
 */
function truncate(text: string, max: number): string {
	return text.length > max ? text.slice(0, Math.max(0, max - 3)) + "..." : text;
}

function displayCliName(name: string): string {
	const lower = name.toLowerCase();
	return lower.endsWith("-agent") ? lower.slice(0, -6) : lower;
}

export function renderSubagentWidget(
	state: SubRenderState,
	width: number,
	theme: SubRenderTheme,
): SubRenderResult {
	const lines: string[] = [];
	const title = subagentTitle(state);
	const innerWidth = Math.max(24, width - 4);

	const spinner = state.status === "running"
		? BRAILLE_FRAMES[Math.floor(Date.now() / 80) % BRAILLE_FRAMES.length] + " "
		: state.status === "done" ? "✓ "
		: "✗ ";

	const cliName = displayCliName(state.name);
	const runnerLabel = theme.fg("dim", "agent runner");
	const separator = theme.fg("muted", " | ");
	const header = `${theme.bold(truncate(cliName, Math.max(8, Math.floor(innerWidth * 0.45))))}${separator}${runnerLabel}`;
	const rule = theme.fg("dim", "-".repeat(Math.max(8, Math.min(innerWidth, 60))));

	lines.push(header);
	lines.push(rule);

	const detailLines = (state.summaryLines && state.summaryLines.length > 0)
		? state.summaryLines.slice(0, 3)
		: [state.summary || state.task];
	const normalized = detailLines.map((line) => truncate(line || "-", innerWidth));
	while (normalized.length < 3) normalized.push("-");
	for (const line of normalized.slice(0, 3)) {
		lines.push(line);
	}

	lines.push(rule);

	return { lines, borderCount: 1 };
}

/**
 * Parse "/sub SCOUT review the deps" → { name: "SCOUT", task: "review the deps" }.
 * If the first word isn't ALL-CAPS, name defaults to "AGENT".
 */
export function parseSubName(input: string): { name: string; task: string } {
	const trimmed = input.trim();
	if (!trimmed) return { name: "AGENT", task: "" };

	const spaceIdx = trimmed.indexOf(" ");
	const firstWord = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
	const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();

	if (/^[A-Z]{2,}$/.test(firstWord)) {
		return { name: firstWord, task: rest };
	}
	return { name: "AGENT", task: trimmed };
}
