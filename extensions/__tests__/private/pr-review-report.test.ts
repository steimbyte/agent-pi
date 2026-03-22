// ABOUTME: Tests for the private PR review report HTML generation — batch rendering, findings, and severity badges.

import { describe, it, expect } from "vitest";
import { generatePrReviewReportHTML, type PrReviewBatchReport } from "../../private/lib/pr-review-report-html.ts";

describe("generatePrReviewReportHTML", () => {
	it("renders a single-PR report with findings", () => {
		const batch: PrReviewBatchReport = {
			batchTitle: "PR Review — Test",
			reports: [{
				title: "Fix auth flow",
				url: "https://bitbucket.org/ws/repo/pull-requests/1",
				summary: "1 critical issue found.",
				profileSummary: ["Flag security issues"],
				findings: [
					{
						severity: "critical",
						title: "Hardcoded API key",
						filePath: "src/config.ts",
						detail: "API key is committed in plaintext.",
						suggestion: "Use environment variables.",
					},
				],
				metadata: { reviewedAt: "2025-01-01T00:00:00Z", extractionMethod: "http-fallback" },
			}],
		};
		const html = generatePrReviewReportHTML(batch, 9999);
		expect(html).toContain("PR Review — Test");
		expect(html).toContain("Fix auth flow");
		expect(html).toContain("Hardcoded API key");
		expect(html).toContain("critical");
		expect(html).toContain("src/config.ts");
	});

	it("renders batch tabs for multiple PRs", () => {
		const batch: PrReviewBatchReport = {
			batchTitle: "Batch Review",
			reports: [
				{
					title: "PR 1",
					url: "https://bitbucket.org/ws/repo/pull-requests/1",
					summary: "No issues.",
					profileSummary: [],
					findings: [],
				},
				{
					title: "PR 2",
					url: "https://bitbucket.org/ws/repo/pull-requests/2",
					summary: "1 finding.",
					profileSummary: [],
					findings: [{ severity: "low", title: "Minor style issue", detail: "Inconsistent spacing." }],
				},
			],
		};
		const html = generatePrReviewReportHTML(batch, 9999);
		expect(html).toContain("Batch Review");
		expect(html).toContain("pr-tab");
		// Batch data is embedded as JSON in the script — check it contains both reports
		expect(html).toContain("pull-requests/1");
		expect(html).toContain("pull-requests/2");
	});

	it("handles zero-findings state", () => {
		const batch: PrReviewBatchReport = {
			batchTitle: "Clean PR",
			reports: [{
				title: "Clean PR",
				url: "https://bitbucket.org/ws/repo/pull-requests/99",
				summary: "No issues found.",
				profileSummary: ["Flag issues"],
				findings: [],
			}],
		};
		const html = generatePrReviewReportHTML(batch, 9999);
		expect(html).toContain("No issues found");
	});
});
