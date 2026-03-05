// ABOUTME: Pure function for context compaction gate — determines when to show warnings.
// ABOUTME: Core pi framework handles actual auto-compaction through _runAutoCompaction (proper UI rebuild).

export const COMPACT_THRESHOLD = 80;

export interface CompactionGateResult {
	block: boolean;
	reason?: string;
	level: "ok" | "warn";
}

/**
 * Check context usage and return warning status.
 * Never blocks — the core auto-compaction handles compaction properly
 * with auto_compaction_start/end events that trigger UI rebuild.
 */
export function shouldWarnForCompaction(percent: number | undefined): CompactionGateResult {
	if (percent == null) return { block: false, level: "ok" };
	if (percent >= COMPACT_THRESHOLD) return {
		block: false,
		level: "warn",
	};
	return { block: false, level: "ok" };
}
