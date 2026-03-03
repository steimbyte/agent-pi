// ABOUTME: Pure function for context compaction gate — determines when to warn or block.
// ABOUTME: Prevents framework auto-compaction (which breaks tool_use pairing) by forcing manual /compact.

export const COMPACT_THRESHOLD = 80;
export const BLOCK_THRESHOLD = 90;

export interface CompactionGateResult {
	block: boolean;
	reason?: string;
	level: "ok" | "warn" | "block";
}

export function shouldBlockForCompaction(percent: number | undefined, blockThreshold: number = BLOCK_THRESHOLD): CompactionGateResult {
	if (percent == null) return { block: false, level: "ok" };
	if (percent >= blockThreshold) return {
		block: true,
		level: "block",
		reason: `Context at ${Math.round(percent)}% — approaching limit. Run /compact or /compact-min NOW to prevent context loss errors. Do NOT continue working until compaction is done.`,
	};
	if (percent >= COMPACT_THRESHOLD) return {
		block: false,
		level: "warn",
	};
	return { block: false, level: "ok" };
}
