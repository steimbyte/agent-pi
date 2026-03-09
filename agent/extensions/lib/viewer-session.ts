// ABOUTME: Shared helpers for tracking and closing the currently active local browser viewer from the CLI.
// ABOUTME: Lets multiple viewer extensions expose a consistent CLI close path without duplicating server bookkeeping.

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { Server } from "node:http";

export type ActiveViewerKind = "file" | "plan" | "questions" | "spec" | "report";

export interface ActiveViewerSession {
	kind: ActiveViewerKind;
	title: string;
	url: string;
	server: Server;
	onClose: () => void;
}

let activeViewer: ActiveViewerSession | null = null;

export function clearActiveViewer(session?: ActiveViewerSession | null): void {
	if (!session) {
		activeViewer = null;
		return;
	}
	if (activeViewer === session) activeViewer = null;
}

export function registerActiveViewer(session: ActiveViewerSession): void {
	if (activeViewer && activeViewer !== session) {
		try { activeViewer.server.close(); } catch {}
		try { activeViewer.onClose(); } catch {}
	}
	activeViewer = session;
}

export function getActiveViewer(): ActiveViewerSession | null {
	return activeViewer;
}

export function closeActiveViewer(): { closed: boolean; kind?: ActiveViewerKind; title?: string } {
	const session = activeViewer;
	if (!session) return { closed: false };
	activeViewer = null;
	try { session.server.close(); } catch {}
	try { session.onClose(); } catch {}
	return { closed: true, kind: session.kind, title: session.title };
}

export function notifyViewerOpen(ctx: ExtensionContext, session: ActiveViewerSession): void {
	const hint = `Run /close-viewer to close this ${session.kind} viewer from the CLI if the browser gets stuck.`;
	if (ctx.hasUI) ctx.ui.notify(`${session.title} opened at ${session.url}`, "info");
	ctx.ui.addMessage("assistant", `${session.title} opened at ${session.url}\n${hint}`);
}
