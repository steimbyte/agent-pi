import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface PrReviewUrlState {
	url: string;
	status: "pending" | "accessible" | "login_required" | "failed" | "reviewed";
	title?: string;
	reason?: string;
	reportId?: string;
}

export interface PrReviewSession {
	id: string;
	createdAt: string;
	updatedAt: string;
	urls: PrReviewUrlState[];
	profilePath: string;
	status: "draft" | "verifying" | "ready" | "reviewing" | "complete";
}

const SESSION_DIR = resolve(".context", "pr-review", "sessions");

function nowIso(): string {
	return new Date().toISOString();
}

function slug(): string {
	return nowIso().replace(/[:.]/g, "-");
}

export function normalizePrUrls(input: string[] | string): string[] {
	const values = Array.isArray(input) ? input : input.split(/\r?\n|,/) ;
	return [...new Set(values.map(v => v.trim()).filter(Boolean))];
}

export function createPrReviewSession(urls: string[], profilePath: string): PrReviewSession {
	const now = nowIso();
	return {
		id: `pr-review-${slug()}`,
		createdAt: now,
		updatedAt: now,
		urls: normalizePrUrls(urls).map((url) => ({ url, status: "pending" })),
		profilePath,
		status: "draft",
	};
}

export function savePrReviewSession(session: PrReviewSession): string {
	if (!existsSync(SESSION_DIR)) mkdirSync(SESSION_DIR, { recursive: true });
	session.updatedAt = nowIso();
	const path = join(SESSION_DIR, `${session.id}.json`);
	writeFileSync(path, JSON.stringify(session, null, 2), "utf-8");
	return path;
}

export function loadPrReviewSession(id: string): PrReviewSession | null {
	const path = join(SESSION_DIR, `${id}.json`);
	if (!existsSync(path)) return null;
	return JSON.parse(readFileSync(path, "utf-8")) as PrReviewSession;
}
