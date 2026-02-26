/**
 * Agent Team — Dispatcher-only orchestrator with grid dashboard
 *
 * The primary Pi agent has NO codebase tools. It can ONLY delegate work
 * to specialist agents via the `dispatch_agent` tool. Each specialist
 * maintains its own Pi session for cross-invocation memory.
 *
 * Loads agent definitions from agents/*.md, .claude/agents/*.md, .pi/agents/*.md.
 * Teams are defined in .pi/agents/teams.yaml — on boot a select dialog lets
 * you pick which team to work with. Only team members are available for dispatch.
 *
 * Commands:
 *   /agents-team          — switch active team
 *   /agents-list          — list loaded agents
 *   /agents-grid N        — set column count (default 2)
 *   Ctrl+G                — toggle compact/expanded widget view
 *
 * Usage: pi -e extensions/agent-team.ts -e extensions/footer.ts
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Text, type AutocompleteItem, visibleWidth, truncateToWidth, Container, Spacer, Box, Markdown, matchesKey, Key } from "@mariozechner/pi-tui";
import { DynamicBorder, getMarkdownTheme as getPiMdTheme } from "@mariozechner/pi-coding-agent";
import { spawn } from "child_process";
import { readdirSync, readFileSync, existsSync, mkdirSync, unlinkSync, appendFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { applyExtensionDefaults } from "./lib/themeMap.ts";
import { statusButton } from "./lib/pipeline-render.ts";

// ── Types ────────────────────────────────────────

interface AgentDef {
	name: string;
	description: string;
	tools: string;
	model: string; // full provider/model ID, empty = inherit parent
	systemPrompt: string;
	file: string;
}

interface AgentState {
	def: AgentDef;
	status: "idle" | "running" | "done" | "error";
	task: string;
	toolCount: number;
	elapsed: number;
	lastWork: string;
	contextPct: number;
	sessionFile: string | null;
	runCount: number;
	timer?: ReturnType<typeof setInterval>;
}

// ── Display Name Helper ──────────────────────────

function displayName(name: string): string {
	return name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── Teams YAML Parser ────────────────────────────

function parseTeamsYaml(raw: string): Record<string, string[]> {
	const teams: Record<string, string[]> = {};
	let current: string | null = null;
	for (const line of raw.split("\n")) {
		const teamMatch = line.match(/^(\S[^:]*):$/);
		if (teamMatch) {
			current = teamMatch[1].trim();
			teams[current] = [];
			continue;
		}
		const itemMatch = line.match(/^\s+-\s+(.+)$/);
		if (itemMatch && current) {
			teams[current].push(itemMatch[1].trim());
		}
	}
	return teams;
}

// ── Frontmatter Parser ───────────────────────────

function parseAgentFile(filePath: string): AgentDef | null {
	try {
		const raw = readFileSync(filePath, "utf-8");
		const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) return null;

		const frontmatter: Record<string, string> = {};
		for (const line of match[1].split("\n")) {
			const idx = line.indexOf(":");
			if (idx > 0) {
				frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
			}
		}

		if (!frontmatter.name) return null;

		return {
			name: frontmatter.name,
			description: frontmatter.description || "",
			tools: frontmatter.tools || "read,grep,find,ls",
			model: frontmatter.model || "",
			systemPrompt: match[2].trim(),
			file: filePath,
		};
	} catch {
		return null;
	}
}

function scanAgentDirs(cwd: string, extProjectDir?: string): AgentDef[] {
	const dirs = [
		join(cwd, "agents"),
		join(cwd, ".claude", "agents"),
		join(cwd, ".pi", "agents"),
		...(extProjectDir ? [join(extProjectDir, ".pi", "agents")] : []),
	];

	const agents: AgentDef[] = [];
	const seen = new Set<string>();

	for (const dir of dirs) {
		if (!existsSync(dir)) continue;
		try {
			const scan = (d: string) => {
				for (const file of readdirSync(d, { withFileTypes: true })) {
					const fullPath = resolve(d, file.name);
					if (file.isDirectory()) {
						scan(fullPath);
					} else if (file.name.endsWith(".md")) {
						const def = parseAgentFile(fullPath);
						if (def && !seen.has(def.name.toLowerCase())) {
							seen.add(def.name.toLowerCase());
							agents.push(def);
						}
					}
				}
			};
			scan(dir);
		} catch {}
	}

	return agents;
}

// ── Extension ────────────────────────────────────

export default function (pi: ExtensionAPI) {
	const agentStates: Map<string, AgentState> = new Map();
	let allAgentDefs: AgentDef[] = [];
	let teams: Record<string, string[]> = {};
	let activeTeamName = "";
	let gridCols = 2;
	let widgetCtx: any;
	let sessionDir = "";
	let contextWindow = 0;
	let widgetCompact = true;
	let selectedAgentIndex = -1; // -1 = no selection

	function loadAgents(cwd: string) {
		const extDir = dirname(fileURLToPath(import.meta.url));
		const extProjectDir = resolve(extDir, "..");

		// Create session storage dir
		sessionDir = join(cwd, ".pi", "agent-sessions");
		if (!existsSync(sessionDir)) {
			mkdirSync(sessionDir, { recursive: true });
		}

		// Load all agent definitions
		allAgentDefs = scanAgentDirs(cwd, extProjectDir);

		// Load teams from .pi/agents/teams.yaml (fallback to extension project dir)
		let teamsPath = join(cwd, ".pi", "agents", "teams.yaml");
		if (!existsSync(teamsPath)) {
			teamsPath = join(extProjectDir, ".pi", "agents", "teams.yaml");
		}
		if (existsSync(teamsPath)) {
			try {
				teams = parseTeamsYaml(readFileSync(teamsPath, "utf-8"));
			} catch {
				teams = {};
			}
		} else {
			teams = {};
		}

		// If no teams defined, create a default "all" team
		if (Object.keys(teams).length === 0) {
			teams = { all: allAgentDefs.map(d => d.name) };
		}
	}

	function activateTeam(teamName: string) {
		activeTeamName = teamName;
		const members = teams[teamName] || [];
		const defsByName = new Map(allAgentDefs.map(d => [d.name.toLowerCase(), d]));

		agentStates.clear();
		selectedAgentIndex = -1; // Reset selection when team changes
		for (const member of members) {
			const def = defsByName.get(member.toLowerCase());
			if (!def) continue;
			const key = def.name.toLowerCase().replace(/\s+/g, "-");
			const sessionFile = join(sessionDir, `${key}.json`);
			agentStates.set(def.name.toLowerCase(), {
				def,
				status: "idle",
				task: "",
				toolCount: 0,
				elapsed: 0,
				lastWork: "",
				contextPct: 0,
				sessionFile: existsSync(sessionFile) ? sessionFile : null,
				runCount: 0,
			});
		}

		// Auto-size grid columns based on team size
		const size = agentStates.size;
		gridCols = size <= 3 ? size : size === 4 ? 2 : 3;
	}

	// ── Grid Rendering ───────────────────────────

	// No longer needed - we're using pills only

	function updateWidget() {
		if (!widgetCtx) return;

		widgetCtx.ui.setWidget("agent-team", (_tui: any, theme: any) => {
			const text = new Text("", 0, 0);

			return {
				render(width: number): string[] {
					if (agentStates.size === 0) {
						text.setText(theme.fg("dim", "No agents found. Add .md files to agents/"));
						return text.render(width);
					}

					// Filter out completed/idle agents - only show active ones
					const active = Array.from(agentStates.values()).filter(
						(a) => a.status !== "idle" && a.status !== "done",
					);

					if (widgetCompact) {
						// Compact mode: show active agents as pills in status bar
						if (active.length === 0) {
							text.setText("");
							return [];
						}
						const abbreviateName = (name: string) => displayName(name);
						const parts = active.map((a) => {
							const name = abbreviateName(a.def.name);
							return statusButton(a.status, name, theme);
						});
						const sep = theme.fg("dim", "  ");
						const right = parts.join(sep);
						const rightVis = visibleWidth(right);

						const curTask = (globalThis as any).__piCurrentTask as { id: number; text: string } | null;
						let left = "";
						let leftVis = 0;
						if (curTask) {
							const taskLabel =
								theme.fg("accent", "● ") +
								theme.fg("dim", "TASK ") +
								theme.fg("accent", `#${curTask.id}`) +
								theme.fg("dim", " ") +
								theme.fg("success", curTask.text);
							left = truncateToWidth(taskLabel, Math.max(10, width - rightVis - 2), "…");
							leftVis = visibleWidth(left);
						}

						const gap = Math.max(1, width - leftVis - rightVis);
						text.setText(left + " ".repeat(gap) + right);
						return text.render(width);
					}

					// Expanded mode: show selectable pills in a row
					if (active.length === 0) {
						// Reset selection if no active agents
						if (selectedAgentIndex >= 0) {
							selectedAgentIndex = -1;
						}
						text.setText(theme.fg("dim", "No active agents. Press F1/F2 to navigate when agents are running."));
						return text.render(width);
					}

					// Reset selection if it's out of bounds (agent completed)
					if (selectedAgentIndex >= active.length) {
						selectedAgentIndex = -1;
					}

					// Map selectedAgentIndex to filtered active agents
					const selectedActiveIndex = selectedAgentIndex >= 0 && selectedAgentIndex < active.length 
						? selectedAgentIndex 
						: -1;

					const abbreviateName = (name: string) => displayName(name);
					const pills = active.map((a, idx) => {
						const name = abbreviateName(a.def.name);
						const pill = statusButton(a.status, name, theme);
						
						// Add selection indicator (border around selected pill)
						if (idx === selectedActiveIndex) {
							const pillVis = visibleWidth(pill);
							// Wrap with selection border: [pill]
							return theme.fg("accent", "[") + pill + theme.fg("accent", "]");
						}
						return pill;
					});

					const sep = theme.fg("dim", "  ");
					const pillsLine = pills.join(sep);
					const pillsVis = visibleWidth(pillsLine);

					// Add hint text if selection is active
					let hint = "";
					if (selectedActiveIndex >= 0) {
						hint = theme.fg("dim", "  (F3: details, F4: exit)");
					}

					const output = pillsLine + hint;
					text.setText(output);
					return text.render(width);
				},
				invalidate() {
					text.invalidate();
				},
			};
		}, { placement: "aboveEditor" });
	}

	// ── Dispatch Agent (returns Promise) ─────────

	function dispatchAgent(
		agentName: string,
		task: string,
		ctx: any,
	): Promise<{ output: string; exitCode: number; elapsed: number }> {
		const key = agentName.toLowerCase();
		const state = agentStates.get(key);
		if (!state) {
			return Promise.resolve({
				output: `Agent "${agentName}" not found. Available: ${Array.from(agentStates.values()).map(s => displayName(s.def.name)).join(", ")}`,
				exitCode: 1,
				elapsed: 0,
			});
		}

		if (state.status === "running") {
			return Promise.resolve({
				output: `Agent "${displayName(state.def.name)}" is already running. Wait for it to finish.`,
				exitCode: 1,
				elapsed: 0,
			});
		}

		state.status = "running";
		state.task = task;
		state.toolCount = 0;
		state.elapsed = 0;
		state.lastWork = "";
		state.runCount++;
		updateWidget();

		const startTime = Date.now();
		state.timer = setInterval(() => {
			state.elapsed = Date.now() - startTime;
			updateWidget();
		}, 1000);

		const model = state.def.model
			|| (ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "openrouter/google/gemini-3-flash-preview");

		// #region agent log
		try {
			const logDir = "/Users/ricardo/.pi/.cursor";
			if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
			const ctxModelStr = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : null;
			appendFileSync(
				join(logDir, "debug-a6f367.log"),
				JSON.stringify({
					sessionId: "a6f367",
					location: "agent-team.ts:dispatchAgent",
					message: "dispatch model resolution",
					data: { agent: agentName, defModel: state.def.model, resolvedModel: model, ctxModel: ctxModelStr },
					timestamp: Date.now(),
				}) + "\n"
			);
		} catch {}
		// #endregion

		// Session file for this agent
		const agentKey = state.def.name.toLowerCase().replace(/\s+/g, "-");
		const agentSessionFile = join(sessionDir, `${agentKey}.json`);

		// Build args — first run creates session, subsequent runs resume
		const args = [
			"--mode", "json",
			"-p",
			"--no-extensions",
			"--model", model,
			"--tools", state.def.tools,
			"--thinking", "off",
			"--append-system-prompt", state.def.systemPrompt,
			"--session", agentSessionFile,
		];

		// Continue existing session if we have one
		if (state.sessionFile) {
			args.push("-c");
		}

		args.push(task);

		const textChunks: string[] = [];

		return new Promise((resolve) => {
			const proc = spawn("pi", args, {
				stdio: ["ignore", "pipe", "pipe"],
				env: { ...process.env },
			});

			let buffer = "";
			let stderrBuf = "";

			proc.stdout!.setEncoding("utf-8");
			proc.stdout!.on("data", (chunk: string) => {
				buffer += chunk;
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";
				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const event = JSON.parse(line);
						if (event.type === "message_update") {
							const delta = event.assistantMessageEvent;
							if (delta?.type === "text_delta") {
								textChunks.push(delta.delta || "");
								const full = textChunks.join("");
								const last = full.split("\n").filter((l: string) => l.trim()).pop() || "";
								state.lastWork = last;
								updateWidget();
							}
						} else if (event.type === "tool_execution_start") {
							state.toolCount++;
							updateWidget();
						} else if (event.type === "message_end") {
							const msg = event.message;
							if (msg?.usage && contextWindow > 0) {
								state.contextPct = ((msg.usage.input || 0) / contextWindow) * 100;
								updateWidget();
							}
						} else if (event.type === "agent_end") {
							const msgs = event.messages || [];
							const last = [...msgs].reverse().find((m: any) => m.role === "assistant");
							if (last?.usage && contextWindow > 0) {
								state.contextPct = ((last.usage.input || 0) / contextWindow) * 100;
								updateWidget();
							}
						}
					} catch {}
				}
			});

			proc.stderr!.setEncoding("utf-8");
			proc.stderr!.on("data", (chunk: string) => { stderrBuf += chunk; });

			proc.on("close", (code) => {
				// #region agent log
				try {
					const logDir = "/Users/ricardo/.pi/.cursor";
					if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
					appendFileSync(
						join(logDir, "debug-a6f367.log"),
						JSON.stringify({
							sessionId: "a6f367",
							location: "agent-team.ts:dispatchAgent:close",
							message: "dispatch subprocess closed",
							data: { agent: agentName, model, exitCode: code, stderr: stderrBuf?.slice(0, 500) || null },
							timestamp: Date.now(),
						}) + "\n"
					);
				} catch {}
				// #endregion
				if (buffer.trim()) {
					try {
						const event = JSON.parse(buffer);
						if (event.type === "message_update") {
							const delta = event.assistantMessageEvent;
							if (delta?.type === "text_delta") textChunks.push(delta.delta || "");
						}
					} catch {}
				}

				clearInterval(state.timer);
				state.elapsed = Date.now() - startTime;
				state.status = code === 0 ? "done" : "error";

				// Mark session file as available for resume
				if (code === 0) {
					state.sessionFile = agentSessionFile;
				}

				const full = textChunks.join("");
				state.lastWork = full.split("\n").filter((l: string) => l.trim()).pop() || "";
				updateWidget();

				ctx.ui.notify(
					`${displayName(state.def.name)} ${state.status} in ${Math.round(state.elapsed / 1000)}s`,
					state.status === "done" ? "success" : "error"
				);

				resolve({
					output: full,
					exitCode: code ?? 1,
					elapsed: state.elapsed,
				});
			});

			proc.on("error", (err) => {
				clearInterval(state.timer);
				state.status = "error";
				state.lastWork = `Error: ${err.message}`;
				updateWidget();
				resolve({
					output: `Error spawning agent: ${err.message}`,
					exitCode: 1,
					elapsed: Date.now() - startTime,
				});
			});
		});
	}

	// ── dispatch_agent Tool (registered at top level) ──

	pi.registerTool({
		name: "dispatch_agent",
		label: "Dispatch Agent",
		description: "Dispatch a task to a specialist agent. The agent will execute the task and return the result. Use the system prompt to see available agent names.",
		parameters: Type.Object({
			agent: Type.String({ description: "Agent name (case-insensitive)" }),
			task: Type.String({ description: "Task description for the agent to execute" }),
		}),

		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			const { agent, task } = params as { agent: string; task: string };

			// #region agent log
			try {
				const logDir = "/Users/ricardo/.pi/.cursor";
				if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
				appendFileSync(
					join(logDir, "debug-a6f367.log"),
					JSON.stringify({
						sessionId: "a6f367",
						location: "agent-team.ts:execute",
						message: "dispatch_agent tool invoked",
						data: { agent, task },
						timestamp: Date.now(),
					}) + "\n"
				);
			} catch {}
			// #endregion

			try {
				if (onUpdate) {
					onUpdate({
						content: [{ type: "text", text: `Dispatching to ${agent}...` }],
						details: { agent, task, status: "dispatching" },
					});
				}

				const result = await dispatchAgent(agent, task, ctx);

				const truncated = result.output.length > 8000
					? result.output.slice(0, 8000) + "\n\n... [truncated]"
					: result.output;

				const status = result.exitCode === 0 ? "done" : "error";
				const summary = `[${agent}] ${status} in ${Math.round(result.elapsed / 1000)}s`;

				return {
					content: [{ type: "text", text: `${summary}\n\n${truncated}` }],
					details: {
						agent,
						task,
						status,
						elapsed: result.elapsed,
						exitCode: result.exitCode,
						fullOutput: result.output,
					},
				};
			} catch (err: any) {
				return {
					content: [{ type: "text", text: `Error dispatching to ${agent}: ${err?.message || err}` }],
					details: { agent, task, status: "error", elapsed: 0, exitCode: 1, fullOutput: "" },
				};
			}
		},

		renderCall(args, theme) {
			const agentName = (args as any).agent || "?";
			const task = (args as any).task || "";
			const preview = task.length > 60 ? task.slice(0, 57) + "..." : task;
			return new Text(
				theme.fg("toolTitle", theme.bold("dispatch_agent ")) +
				theme.fg("accent", agentName) +
				theme.fg("dim", " — ") +
				theme.fg("muted", preview),
				0, 0,
			);
		},

		renderResult(result, options, theme) {
			const details = result.details as any;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			// Streaming/partial result while agent is still running
			if (options.isPartial || details.status === "dispatching") {
				const runningBtn = statusButton("running", details.agent || "?", theme, false);
				return new Text(
					runningBtn,
					0, 0,
				);
			}

			const status = details.status === "done" ? "done" : "error";
			const agentLabel = details.agent ?? "?";
			const statusBtn = statusButton(status, agentLabel, theme, false);
			const elapsed = typeof details.elapsed === "number" ? Math.round(details.elapsed / 1000) : 0;
			const header = statusBtn +
				theme.fg("dim", ` ${elapsed}s`);

			if (options.expanded && details.fullOutput) {
				const output = details.fullOutput.length > 4000
					? details.fullOutput.slice(0, 4000) + "\n... [truncated]"
					: details.fullOutput;
				return new Text(header + "\n" + theme.fg("muted", output), 0, 0);
			}

			return new Text(header, 0, 0);
		},
	});

	// ── Commands ─────────────────────────────────

	pi.registerCommand("agents-team", {
		description: "Select a team to work with",
		handler: async (_args, ctx) => {
			widgetCtx = ctx;
			const teamNames = Object.keys(teams);
			if (teamNames.length === 0) {
				ctx.ui.notify("No teams defined in .pi/agents/teams.yaml", "warning");
				return;
			}

			const options = teamNames.map(name => {
				const members = teams[name].map(m => displayName(m));
				return `${name} — ${members.join(", ")}`;
			});

			const choice = await ctx.ui.select("Select Team", options);
			if (choice === undefined) return;

			const idx = options.indexOf(choice);
			const name = teamNames[idx];
			activateTeam(name);
			updateWidget();
			ctx.ui.setStatus("agent-team", `Team: ${name} (${agentStates.size})`);
			ctx.ui.notify(`Team: ${name} — ${Array.from(agentStates.values()).map(s => displayName(s.def.name)).join(", ")}`, "info");
		},
	});

	pi.registerCommand("agents-list", {
		description: "List all loaded agents",
		handler: async (_args, _ctx) => {
			widgetCtx = _ctx;
			const names = Array.from(agentStates.values())
				.map(s => {
					const session = s.sessionFile ? "resumed" : "new";
					return `${displayName(s.def.name)} (${s.status}, ${session}, runs: ${s.runCount}): ${s.def.description}`;
				})
				.join("\n");
			_ctx.ui.notify(names || "No agents loaded", "info");
		},
	});

	pi.registerCommand("agents-grid", {
		description: "Set grid columns: /agents-grid <1-6>",
		getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
			const items = ["1", "2", "3", "4", "5", "6"].map(n => ({
				value: n,
				label: `${n} columns`,
			}));
			const filtered = items.filter(i => i.value.startsWith(prefix));
			return filtered.length > 0 ? filtered : items;
		},
		handler: async (args, _ctx) => {
			widgetCtx = _ctx;
			const n = parseInt(args?.trim() || "", 10);
			if (n >= 1 && n <= 6) {
				gridCols = n;
				_ctx.ui.notify(`Grid set to ${gridCols} columns`, "info");
				updateWidget();
			} else {
				_ctx.ui.notify("Usage: /agents-grid <1-6>", "error");
			}
		},
	});

	// ── Agent Detail Overlay ──────────────────────

	class AgentDetailOverlay {
		private scrollOffset = 0;

		constructor(
			private agent: AgentState,
			private onDone: () => void,
		) {}

		handleInput(data: string, tui: any): void {
			if (matchesKey(data, Key.up)) {
				this.scrollOffset = Math.max(0, this.scrollOffset - 1);
			} else if (matchesKey(data, Key.down)) {
				this.scrollOffset = Math.max(0, this.scrollOffset + 1);
			} else if (matchesKey(data, Key.escape)) {
				this.onDone();
				return;
			}
			tui.requestRender();
		}

		render(width: number, height: number, theme: any): string[] {
			const container = new Container();
			const mdTheme = getPiMdTheme();

			// Panel is 90% of terminal width, centered
			const panelW = Math.max(60, Math.floor(width * 0.9));

			// Header with agent name pill and status
			container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
			const name = displayName(this.agent.def.name);
			const statusBtn = statusButton(this.agent.status, name, theme, false);
			const timeStr = this.agent.status !== "idle" ? ` ${Math.round(this.agent.elapsed / 1000)}s` : "";
			container.addChild(new Text(
				`${statusBtn}${timeStr}`,
				1, 0,
			));
			container.addChild(new Spacer(1));

			// Split panel: metadata left, system prompt right
			const innerWidth = panelW - 2;
			const leftW = Math.max(25, Math.floor(innerWidth * 0.35));
			const rightW = innerWidth - leftW - 3; // 3 for " │ "

			// Left panel: metadata
			const leftLines: string[] = [];
			const formatRow = (label: string, value: string) => {
				const labelStr = theme.fg("accent", theme.bold(padRight(label + ":", 12)));
				const valueStr = theme.fg("muted", value);
				return labelStr + " " + valueStr;
			};

			leftLines.push(formatRow("STATUS", this.agent.status));
			leftLines.push(formatRow("MODEL", this.agent.def.model || "(inherit)"));
			leftLines.push(formatRow("TOOLS", this.agent.def.tools));
			leftLines.push(formatRow("CONTEXT", `${Math.ceil(this.agent.contextPct)}%`));
			leftLines.push(formatRow("RUNS", this.agent.runCount.toString()));
			leftLines.push(formatRow("TOOLS USED", this.agent.toolCount.toString()));
			leftLines.push(formatRow("FILE", this.agent.def.file));
			if (this.agent.sessionFile) {
				leftLines.push(formatRow("SESSION", this.agent.sessionFile));
			}

			// Right panel: system prompt (markdown)
			const rightContainer = new Container();
			rightContainer.addChild(new Text(theme.fg("accent", theme.bold(" SYSTEM PROMPT")), 0, 0));
			rightContainer.addChild(new Spacer(1));
			rightContainer.addChild(new Markdown(this.agent.def.systemPrompt, 0, 0, mdTheme));
			const rightLines = rightContainer.render(rightW);

			// Combine side by side
			const divider = theme.fg("dim", " │ ");
			const combined = sideBySide(leftLines, rightLines, leftW, rightW, divider);
			for (const line of combined) {
				container.addChild(new Text(line, 1, 0));
			}

			// Task and last work sections
			container.addChild(new Spacer(1));
			if (this.agent.task) {
				container.addChild(new Text(theme.fg("accent", theme.bold(" ─── TASK ───")), 1, 0));
				const taskLines = wordWrap(this.agent.task, innerWidth);
				for (const line of taskLines) {
					container.addChild(new Text(theme.fg("muted", line), 1, 0));
				}
				container.addChild(new Spacer(1));
			}

			if (this.agent.lastWork) {
				container.addChild(new Text(theme.fg("accent", theme.bold(" ─── LAST WORK ───")), 1, 0));
				const workLines = wordWrap(this.agent.lastWork, innerWidth);
				for (const line of workLines) {
					container.addChild(new Text(theme.fg("muted", line), 1, 0));
				}
				container.addChild(new Spacer(1));
			}

			// Footer
			container.addChild(new Text(
				theme.fg("dim", " ↑/↓ Scroll • Esc Close"),
				1, 0,
			));
			container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

			const panelLines = container.render(panelW);

			// Dark backdrop: center the panel vertically and horizontally
			const dimBg = "\x1b[48;2;10;10;15m";
			const reset = "\x1b[0m";
			const darkRow = dimBg + " ".repeat(width) + reset;
			const padLeft = Math.max(0, Math.floor((width - panelW) / 2));
			const padLeftStr = dimBg + " ".repeat(padLeft);
			const padRightCount = Math.max(0, width - panelW - padLeft);
			const padRightStr = " ".repeat(padRightCount) + reset;

			const topPad = Math.max(1, Math.floor((height - panelLines.length) / 2));
			const result: string[] = [];

			for (let i = 0; i < topPad; i++) result.push(darkRow);
			for (const line of panelLines) {
				result.push(padLeftStr + line + padRightStr);
			}
			const bottomPad = Math.max(0, height - topPad - panelLines.length);
			for (let i = 0; i < bottomPad; i++) result.push(darkRow);

			return result;
		}
	}

	function padRight(s: string, width: number): string {
		const vis = visibleWidth(s);
		if (vis >= width) return truncateToWidth(s, width, "");
		return s + " ".repeat(width - vis);
	}

	function wordWrap(text: string, width: number): string[] {
		if (visibleWidth(text) <= width) return [text];
		const words = text.split(/(\s+)/);
		const lines: string[] = [];
		let cur = "";
		for (const w of words) {
			if (visibleWidth(cur + w) > width && cur.length > 0) {
				lines.push(cur);
				cur = w.trimStart();
			} else {
				cur += w;
			}
		}
		if (cur.length > 0) lines.push(cur);
		return lines;
	}

	function sideBySide(
		left: string[], right: string[],
		leftW: number, rightW: number,
		divider: string,
	): string[] {
		const max = Math.max(left.length, right.length);
		const result: string[] = [];
		for (let i = 0; i < max; i++) {
			const l = i < left.length ? padRight(left[i], leftW) : " ".repeat(leftW);
			const r = i < right.length ? truncateToWidth(right[i], rightW, "") : "";
			result.push(l + divider + r);
		}
		return result;
	}

	async function showAgentDetail(ctx: any, agent: AgentState) {
		await ctx.ui.custom((tui, theme, _kb, done) => {
			const overlay = new AgentDetailOverlay(agent, () => done(undefined));
			return {
				render: (w) => overlay.render(w, process.stdout.rows || 24, theme),
				handleInput: (data) => overlay.handleInput(data, tui),
				invalidate: () => {},
			};
		}, {
			overlay: true,
			overlayOptions: { width: "90%", anchor: "center" },
		});
	}

	pi.registerShortcut("ctrl+g", {
		description: "Toggle agent team compact/expanded view",
		handler: async (ctx) => {
			widgetCtx = ctx;
			widgetCompact = !widgetCompact;
			updateWidget();
		},
	});

	const selectNext = async (ctx: any) => {
		if (!ctx.hasUI) return;
		widgetCtx = ctx;
		// Filter to active agents only
		const active = Array.from(agentStates.values()).filter(
			(a) => a.status !== "idle" && a.status !== "done",
		);
		const count = active.length;
		if (count === 0) {
			selectedAgentIndex = -1;
			return;
		}
		// Auto-expand to expanded view if in compact mode so selection is visible
		if (widgetCompact) {
			widgetCompact = false;
		}
		if (selectedAgentIndex < 0) selectedAgentIndex = 0;
		selectedAgentIndex = (selectedAgentIndex + 1) % count;
		updateWidget();
	};

	const selectPrev = async (ctx: any) => {
		if (!ctx.hasUI) return;
		widgetCtx = ctx;
		// Filter to active agents only
		const active = Array.from(agentStates.values()).filter(
			(a) => a.status !== "idle" && a.status !== "done",
		);
		const count = active.length;
		if (count === 0) {
			selectedAgentIndex = -1;
			return;
		}
		// Auto-expand to expanded view if in compact mode so selection is visible
		if (widgetCompact) {
			widgetCompact = false;
		}
		if (selectedAgentIndex < 0) selectedAgentIndex = count - 1;
		selectedAgentIndex = (selectedAgentIndex - 1 + count) % count;
		updateWidget();
	};

	const exitSelection = async (ctx: any) => {
		if (!ctx.hasUI) return;
		widgetCtx = ctx;
		selectedAgentIndex = -1;
		updateWidget();
	};

	// Use function keys - universally compatible and reliable
	pi.registerShortcut("f1", {
		description: "Select previous agent",
		handler: selectPrev,
	});

	pi.registerShortcut("f2", {
		description: "Select next agent",
		handler: selectNext,
	});

	pi.registerShortcut("f3", {
		description: "Open agent detail view",
		handler: async (ctx) => {
			if (!ctx.hasUI) return;
			// Filter to active agents only
			const active = Array.from(agentStates.values()).filter(
				(a) => a.status !== "idle" && a.status !== "done",
			);
			const count = active.length;
			if (count === 0 || selectedAgentIndex < 0 || selectedAgentIndex >= count) return;
			const agent = active[selectedAgentIndex];
			if (!agent) return;
			await showAgentDetail(ctx, agent);
		},
	});

	pi.registerShortcut("f4", {
		description: "Exit agent selection",
		handler: exitSelection,
	});

	// ── System Prompt Override ───────────────────

	pi.on("before_agent_start", async (_event, _ctx) => {
		// Build dynamic agent catalog from active team only
		const agentCatalog = Array.from(agentStates.values())
			.map(s => `### ${displayName(s.def.name)}\n**Dispatch as:** \`${s.def.name}\`\n${s.def.description}\n**Tools:** ${s.def.tools}` + (s.def.model ? `\n**Model:** ${s.def.model}` : ""))
			.join("\n\n");

		const teamMembers = Array.from(agentStates.values()).map(s => displayName(s.def.name)).join(", ");

		return {
			systemPrompt: `You are a dispatcher agent. You coordinate specialist agents to accomplish tasks.
You do NOT have direct access to the codebase. You MUST delegate all work through
agents using the dispatch_agent tool.

## Active Team: ${activeTeamName}
Members: ${teamMembers}
You can ONLY dispatch to agents listed below. Do not attempt to dispatch to agents outside this team.

## How to Work
- Analyze the user's request and break it into clear sub-tasks
- Choose the right agent(s) for each sub-task
- Dispatch tasks using the dispatch_agent tool
- Review results and dispatch follow-up agents if needed
- If a task fails, try a different agent or adjust the task description
- Summarize the outcome for the user

## Rules
- NEVER try to read, write, or execute code directly — you have no such tools
- ALWAYS use dispatch_agent to get work done
- You can chain agents: use scout to explore, then builder to implement
- You can dispatch the same agent multiple times with different tasks
- Keep tasks focused — one clear objective per dispatch

## Agents

${agentCatalog}`,
		};
	});

	// ── Reset agent boxes on new message ───────────────────────────────

	pi.on("input", () => {
		// When user sends a new message, reset completed/error agents to idle
		// so the boxes display cleanly for the new task
		for (const state of agentStates.values()) {
			if (state.status === "done" || state.status === "error") {
				state.status = "idle";
				state.task = "";
				state.toolCount = 0;
				state.elapsed = 0;
				state.lastWork = "";
				state.contextPct = 0;
			}
		}
		updateWidget();
	});

	// ── Session Start ────────────────────────────

	pi.on("session_start", async (_event, _ctx) => {
		applyExtensionDefaults(import.meta.url, _ctx);
		// Clear widgets from previous session
		if (widgetCtx) {
			widgetCtx.ui.setWidget("agent-team", undefined);
		}
		widgetCtx = _ctx;
		contextWindow = _ctx.model?.contextWindow || 0;

		// Wipe old agent session files so subagents start fresh
		const sessDir = join(_ctx.cwd, ".pi", "agent-sessions");
		if (existsSync(sessDir)) {
			for (const f of readdirSync(sessDir)) {
				if (f.endsWith(".json")) {
					try { unlinkSync(join(sessDir, f)); } catch {}
				}
			}
		}

		loadAgents(_ctx.cwd);

		// Default to first team — use /agents-team to switch
		const teamNames = Object.keys(teams);
		if (teamNames.length > 0) {
			activateTeam(teamNames[0]);
		}

		// Lock down to dispatcher-only (tool already registered at top level)
		pi.setActiveTools(["dispatch_agent"]);

		_ctx.ui.setStatus("agent-team", `Team: ${activeTeamName} (${agentStates.size})`);
		updateWidget();

		// Use footer.ts for footer — do not overwrite; widget uses placement: belowEditor
	});
}
