// ABOUTME: Tests for the private PR review viewer HTML generation and URL status rendering.

import { describe, it, expect } from "vitest";
import { generatePrReviewViewerHTML, type UrlStatusEntry } from "../../private/lib/pr-review-viewer-html.ts";

describe("generatePrReviewViewerHTML", () => {
	it("renders the viewer with pre-filled URLs", () => {
		const html = generatePrReviewViewerHTML({
			title: "PR Review Test",
			initialUrls: ["https://bitbucket.org/ws/repo/pull-requests/1"],
			port: 9999,
		});
		expect(html).toContain("PR Review Test");
		expect(html).toContain("https://bitbucket.org/ws/repo/pull-requests/1");
		expect(html).toContain("Verify Access");
	});

	it("renders URL status entries when provided", () => {
		const statuses: UrlStatusEntry[] = [
			{ url: "https://bitbucket.org/ws/repo/pull-requests/1", status: "accessible", title: "Fix auth" },
			{ url: "https://bitbucket.org/ws/repo/pull-requests/2", status: "login_required", reason: "Auth needed" },
		];
		const html = generatePrReviewViewerHTML({
			title: "PR Review",
			initialUrls: statuses.map(s => s.url),
			urlStatuses: statuses,
			port: 9999,
		});
		expect(html).toContain("accessible");
		expect(html).toContain("login_required");
	});

	it("renders empty state with no URLs", () => {
		const html = generatePrReviewViewerHTML({
			title: "PR Review",
			initialUrls: [],
			port: 9999,
		});
		expect(html).toContain("PR Review");
		expect(html).toContain("Verify Access");
	});
});
