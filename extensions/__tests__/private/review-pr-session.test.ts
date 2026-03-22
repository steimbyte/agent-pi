import { describe, it, expect } from "vitest";
import { defaultPrReviewProfile } from "../../private/lib/pr-review-profile.ts";
import { createPrReviewSession, normalizePrUrls } from "../../private/lib/pr-review-session.ts";

describe("PR review profile", () => {
	it("creates a default profile with reusable rules", () => {
		const profile = defaultPrReviewProfile();
		expect(profile.reviewRules.length).toBeGreaterThan(0);
		expect(profile.severityLabels).toContain("high");
	});
});

describe("PR review session", () => {
	it("normalizes and deduplicates URL input", () => {
		const urls = normalizePrUrls(["https://bitbucket.org/a/pull-requests/1 ", "https://bitbucket.org/a/pull-requests/1", "https://bitbucket.org/a/pull-requests/2"]);
		expect(urls).toEqual([
			"https://bitbucket.org/a/pull-requests/1",
			"https://bitbucket.org/a/pull-requests/2",
		]);
	});

	it("creates pending URL state for each review URL", () => {
		const session = createPrReviewSession(["https://bitbucket.org/a/pull-requests/1"], ".context/pr-review/profile.json");
		expect(session.urls).toHaveLength(1);
		expect(session.urls[0].status).toBe("pending");
	});
});
