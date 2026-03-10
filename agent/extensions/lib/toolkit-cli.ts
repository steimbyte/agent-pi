// ABOUTME: Shared toolkit CLI metadata and worker-model resolution.
// ABOUTME: Toolkit agents represent installed CLI software; they all run through a lightweight worker model.

export const TOOLKIT_CLI_AGENTS = new Set([
	"cursor-agent",
	"codex-agent",
	"gemini-agent",
	"qwen-agent",
	"opencode-agent",
	"groq-agent",
	"droid-agent",
	"crush-agent",
]);

export const TOOLKIT_WORKER_MODEL = "anthropic/claude-haiku-4-5-20251001";

export function isToolkitCliAgent(name: string | undefined | null): boolean {
	if (!name) return false;
	return TOOLKIT_CLI_AGENTS.has(name.toLowerCase());
}

export function resolveToolkitWorkerModel(agentName: string, fallbackModel: string): string {
	return isToolkitCliAgent(agentName) ? TOOLKIT_WORKER_MODEL : fallbackModel;
}
