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
}

export interface SubRenderTheme {
	fg: (color: string, text: string) => string;
}

export interface SubRenderResult {
	lines: string[];
	borderCount: number;
}

/**
 * Build the title label: "NAME - SA{id}"
 */
export function subagentTitle(state: SubRenderState): string {
	return state.name.toUpperCase() + " - SA" + state.id;
}

/**
 * Render the content lines for a subagent widget.
 * statusBtn is the pre-rendered status button string.
 * borderCount is always 1 (top divider only).
 */
export function renderSubagentWidget(
	state: SubRenderState,
	width: number,
	theme: SubRenderTheme,
	statusBtn?: string,
): SubRenderResult {
	const lines: string[] = [];

	const btn = statusBtn ?? subagentTitle(state);

	const taskPreview = state.task.length > 40
		? state.task.slice(0, 37) + "..."
		: state.task;

	const turnLabel = state.turnCount > 1
		? theme.fg("dim", ` · Turn ${state.turnCount}`)
		: "";

	lines.push(
		btn +
		turnLabel +
		theme.fg("dim", `  ${taskPreview}`) +
		theme.fg("dim", `  (${Math.round(state.elapsed / 1000)}s)`) +
		theme.fg("dim", ` | Tools: ${state.toolCount}`)
	);

	if (state.summary) {
		lines.push(theme.fg("muted", `  ${state.summary}`));
	}

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
