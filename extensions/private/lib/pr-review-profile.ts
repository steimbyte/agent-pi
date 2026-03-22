import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface PrReviewProfile {
	version: number;
	createdAt: string;
	updatedAt: string;
	reviewRules: string[];
	severityLabels: string[];
	reportStyle: "concise" | "standard" | "deep";
	requireFilePaths: boolean;
	requireSuggestedFixes: boolean;
}

const PROFILE_DIR = resolve(".context", "pr-review");
const PROFILE_PATH = join(PROFILE_DIR, "profile.json");

function nowIso(): string {
	return new Date().toISOString();
}

export function defaultPrReviewProfile(): PrReviewProfile {
	const now = nowIso();
	return {
		version: 1,
		createdAt: now,
		updatedAt: now,
		reviewRules: [
			"Flag correctness, reliability, maintainability, and security issues.",
			"Prefer actionable findings over stylistic commentary.",
			"Include file/path context whenever available.",
		],
		severityLabels: ["critical", "high", "medium", "low"],
		reportStyle: "standard",
		requireFilePaths: true,
		requireSuggestedFixes: true,
	};
}

export function ensurePrReviewProfile(): PrReviewProfile {
	if (!existsSync(PROFILE_DIR)) mkdirSync(PROFILE_DIR, { recursive: true });
	if (!existsSync(PROFILE_PATH)) {
		const profile = defaultPrReviewProfile();
		writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2), "utf-8");
		return profile;
	}
	return loadPrReviewProfile();
}

export function loadPrReviewProfile(): PrReviewProfile {
	const raw = readFileSync(PROFILE_PATH, "utf-8");
	const parsed = JSON.parse(raw) as Partial<PrReviewProfile>;
	const fallback = defaultPrReviewProfile();
	return {
		...fallback,
		...parsed,
		updatedAt: parsed.updatedAt || fallback.updatedAt,
		createdAt: parsed.createdAt || fallback.createdAt,
		reviewRules: Array.isArray(parsed.reviewRules) && parsed.reviewRules.length ? parsed.reviewRules : fallback.reviewRules,
		severityLabels: Array.isArray(parsed.severityLabels) && parsed.severityLabels.length ? parsed.severityLabels : fallback.severityLabels,
	};
}

export function savePrReviewProfile(profile: PrReviewProfile): void {
	if (!existsSync(PROFILE_DIR)) mkdirSync(PROFILE_DIR, { recursive: true });
	const next: PrReviewProfile = { ...profile, updatedAt: nowIso() };
	writeFileSync(PROFILE_PATH, JSON.stringify(next, null, 2), "utf-8");
}

export function prReviewProfilePath(): string {
	return PROFILE_PATH;
}
