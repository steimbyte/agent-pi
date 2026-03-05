// ABOUTME: Tests for context compaction gate — threshold logic for warning about high context usage.
// ABOUTME: Covers ok/warn levels and boundary conditions for shouldWarnForCompaction.

import { describe, it, expect } from "vitest";
import { shouldWarnForCompaction, COMPACT_THRESHOLD } from "../lib/context-gate.ts";

describe("shouldWarnForCompaction", () => {
	it("should return ok when percent is undefined", () => {
		const result = shouldWarnForCompaction(undefined);
		expect(result).toEqual({ block: false, level: "ok" });
	});

	it("should return ok below COMPACT_THRESHOLD", () => {
		expect(shouldWarnForCompaction(0).level).toBe("ok");
		expect(shouldWarnForCompaction(50).level).toBe("ok");
		expect(shouldWarnForCompaction(79).level).toBe("ok");
		expect(shouldWarnForCompaction(79).block).toBe(false);
	});

	it("should return warn at COMPACT_THRESHOLD (80%)", () => {
		const result = shouldWarnForCompaction(COMPACT_THRESHOLD);
		expect(result.level).toBe("warn");
		expect(result.block).toBe(false);
	});

	it("should return warn above 80%", () => {
		expect(shouldWarnForCompaction(85).level).toBe("warn");
		expect(shouldWarnForCompaction(85).block).toBe(false);
		expect(shouldWarnForCompaction(89).level).toBe("warn");
		expect(shouldWarnForCompaction(95).level).toBe("warn");
	});

	it("should never block — core handles compaction", () => {
		expect(shouldWarnForCompaction(90).block).toBe(false);
		expect(shouldWarnForCompaction(95).block).toBe(false);
		expect(shouldWarnForCompaction(99).block).toBe(false);
	});
});

describe("threshold constants", () => {
	it("COMPACT_THRESHOLD should be 80", () => {
		expect(COMPACT_THRESHOLD).toBe(80);
	});
});
