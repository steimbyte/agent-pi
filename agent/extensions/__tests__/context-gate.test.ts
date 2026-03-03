// ABOUTME: Tests for context compaction gate — threshold logic for blocking tool calls.
// ABOUTME: Covers ok/warn/block levels and boundary conditions for shouldBlockForCompaction.

import { describe, it, expect } from "vitest";
import { shouldBlockForCompaction, COMPACT_THRESHOLD, BLOCK_THRESHOLD } from "../lib/context-gate.ts";

describe("shouldBlockForCompaction", () => {
	it("should return ok when percent is undefined", () => {
		const result = shouldBlockForCompaction(undefined);
		expect(result).toEqual({ block: false, level: "ok" });
	});

	it("should return ok below COMPACT_THRESHOLD", () => {
		expect(shouldBlockForCompaction(0).level).toBe("ok");
		expect(shouldBlockForCompaction(50).level).toBe("ok");
		expect(shouldBlockForCompaction(79).level).toBe("ok");
		expect(shouldBlockForCompaction(79).block).toBe(false);
	});

	it("should return warn at COMPACT_THRESHOLD (80%)", () => {
		const result = shouldBlockForCompaction(COMPACT_THRESHOLD);
		expect(result.level).toBe("warn");
		expect(result.block).toBe(false);
	});

	it("should return warn between 80-89%", () => {
		expect(shouldBlockForCompaction(85).level).toBe("warn");
		expect(shouldBlockForCompaction(85).block).toBe(false);
		expect(shouldBlockForCompaction(89).level).toBe("warn");
	});

	it("should return block at BLOCK_THRESHOLD (90%)", () => {
		const result = shouldBlockForCompaction(BLOCK_THRESHOLD);
		expect(result.block).toBe(true);
		expect(result.level).toBe("block");
		expect(result.reason).toContain("/compact");
	});

	it("should return block above 90%", () => {
		const result = shouldBlockForCompaction(95);
		expect(result.block).toBe(true);
		expect(result.level).toBe("block");
		expect(result.reason).toBeDefined();
	});

	it("should include rounded percent in block reason", () => {
		const result = shouldBlockForCompaction(92.7);
		expect(result.reason).toContain("93%");
	});
});

describe("custom blockThreshold parameter", () => {
	it("should block at custom threshold when provided", () => {
		const result = shouldBlockForCompaction(80, 80);
		expect(result.block).toBe(true);
		expect(result.level).toBe("block");
	});

	it("should not block below custom threshold", () => {
		const result = shouldBlockForCompaction(79, 80);
		expect(result.block).toBe(false);
	});

	it("should still warn between COMPACT_THRESHOLD and custom blockThreshold", () => {
		// With blockThreshold=85, 82% should warn (>= 80 COMPACT_THRESHOLD, < 85)
		const result = shouldBlockForCompaction(82, 85);
		expect(result.level).toBe("warn");
		expect(result.block).toBe(false);
	});

	it("should use default BLOCK_THRESHOLD when not provided", () => {
		// 85% with default threshold (90) should warn, not block
		const result = shouldBlockForCompaction(85);
		expect(result.level).toBe("warn");
		expect(result.block).toBe(false);
	});
});

describe("threshold constants", () => {
	it("COMPACT_THRESHOLD should be 80", () => {
		expect(COMPACT_THRESHOLD).toBe(80);
	});

	it("BLOCK_THRESHOLD should be 90", () => {
		expect(BLOCK_THRESHOLD).toBe(90);
	});
});
