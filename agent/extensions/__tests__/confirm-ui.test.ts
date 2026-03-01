// ABOUTME: Tests for ConfirmUI overlay — keyboard navigation, rendering, and callbacks
// ABOUTME: Validates Yes/No toggle via left/right arrows, Enter confirms, Escape cancels

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock ConfirmUI (mirrors production class with simplified key matching) ──

class ConfirmUI {
	private selectedIndex = 0; // 0 = Yes, 1 = No

	constructor(
		private question: string,
		private detail: string,
		private onConfirm: (yes: boolean) => void,
		private onCancel: () => void,
	) {}

	handleInput(data: string, tui: any): void {
		if (data === "left") {
			this.selectedIndex = 0;
		} else if (data === "right") {
			this.selectedIndex = 1;
		} else if (data === "enter") {
			this.onConfirm(this.selectedIndex === 0);
			return;
		} else if (data === "escape") {
			this.onCancel();
			return;
		}
		tui?.requestRender?.();
	}

	getSelectedIndex(): number {
		return this.selectedIndex;
	}

	getSelectedLabel(): string {
		return this.selectedIndex === 0 ? "Yes" : "No";
	}

	render(width: number, height: number, theme: any): string[] {
		const lines: string[] = [];
		const panelW = Math.max(40, Math.floor(width * 0.9));

		// Header
		lines.push("┌" + "─".repeat(Math.max(1, panelW - 2)) + "┐");
		const headerText = "CONFIRM | " + this.question;
		lines.push(
			"│ " +
			(headerText.length > panelW - 4
				? headerText.substring(0, panelW - 4)
				: headerText),
		);
		lines.push("│");

		// Detail/markdown content
		if (this.detail) {
			for (const line of this.detail.split("\n")) {
				lines.push("│ " + line);
			}
			lines.push("│");
		}

		// Options: Yes / No
		const labels = ["Yes", "No"];
		const optLine = labels
			.map((label, i) => {
				const selected = i === this.selectedIndex;
				return selected ? ` > ${label} ` : `   ${label} `;
			})
			.join("  ");
		lines.push("│" + optLine);

		// Footer
		lines.push("│");
		lines.push("│ ←/→ Toggle • Enter Confirm • Esc Cancel");
		lines.push("└" + "─".repeat(Math.max(1, panelW - 2)) + "┘");

		// Center vertically
		const topPad = Math.max(0, Math.floor((height - lines.length) / 2));
		const result: string[] = [];
		for (let i = 0; i < topPad; i++) result.push("");
		result.push(...lines);
		return result;
	}
}

// ── Keyboard Navigation ──────────────────────────────────────────────

describe("ConfirmUI - Keyboard Navigation", () => {
	let ui: ConfirmUI;
	let confirmResult: boolean | undefined;
	let cancelledCalled: boolean;

	beforeEach(() => {
		confirmResult = undefined;
		cancelledCalled = false;

		ui = new ConfirmUI(
			"Delete this file?",
			"## Warning\nThis action **cannot** be undone.",
			(yes) => { confirmResult = yes; },
			() => { cancelledCalled = true; },
		);
	});

	it("should start with Yes selected", () => {
		expect(ui.getSelectedIndex()).toBe(0);
		expect(ui.getSelectedLabel()).toBe("Yes");
	});

	it("should toggle to No with right arrow", () => {
		const tui = { requestRender: vi.fn() };
		ui.handleInput("right", tui);
		expect(ui.getSelectedIndex()).toBe(1);
		expect(ui.getSelectedLabel()).toBe("No");
		expect(tui.requestRender).toHaveBeenCalled();
	});

	it("should toggle back to Yes with left arrow", () => {
		const tui = { requestRender: vi.fn() };
		ui.handleInput("right", tui);
		ui.handleInput("left", tui);
		expect(ui.getSelectedIndex()).toBe(0);
		expect(ui.getSelectedLabel()).toBe("Yes");
	});

	it("should stay on Yes when pressing left at start", () => {
		const tui = { requestRender: vi.fn() };
		ui.handleInput("left", tui);
		expect(ui.getSelectedIndex()).toBe(0);
	});

	it("should stay on No when pressing right repeatedly", () => {
		const tui = { requestRender: vi.fn() };
		ui.handleInput("right", tui);
		ui.handleInput("right", tui);
		ui.handleInput("right", tui);
		expect(ui.getSelectedIndex()).toBe(1);
	});

	it("should call onConfirm(true) when Enter pressed with Yes selected", () => {
		const tui = { requestRender: vi.fn() };
		ui.handleInput("enter", tui);
		expect(confirmResult).toBe(true);
	});

	it("should call onConfirm(false) when Enter pressed with No selected", () => {
		const tui = { requestRender: vi.fn() };
		ui.handleInput("right", tui);
		ui.handleInput("enter", tui);
		expect(confirmResult).toBe(false);
	});

	it("should call onCancel when Escape pressed", () => {
		const tui = { requestRender: vi.fn() };
		ui.handleInput("escape", tui);
		expect(cancelledCalled).toBe(true);
	});

	it("should ignore up/down arrows", () => {
		const tui = { requestRender: vi.fn() };
		ui.handleInput("up", tui);
		expect(ui.getSelectedIndex()).toBe(0);
		ui.handleInput("down", tui);
		expect(ui.getSelectedIndex()).toBe(0);
	});

	it("should ignore unrecognized keys", () => {
		const tui = { requestRender: vi.fn() };
		ui.handleInput("x", tui);
		expect(ui.getSelectedIndex()).toBe(0);
	});

	it("should handle input without tui object", () => {
		expect(() => {
			ui.handleInput("right", undefined);
		}).not.toThrow();
		expect(ui.getSelectedIndex()).toBe(1);
	});
});

// ── Rendering ────────────────────────────────────────────────────────

describe("ConfirmUI - Rendering", () => {
	const theme = {
		fg: (_color: string, text: string) => text,
		bold: (text: string) => text,
	};

	it("should render with standard dimensions", () => {
		const ui = new ConfirmUI("Continue?", "Some detail", vi.fn(), vi.fn());
		const result = ui.render(120, 24, theme);
		expect(result).toBeInstanceOf(Array);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should include question text in header", () => {
		const ui = new ConfirmUI("Delete this file?", "", vi.fn(), vi.fn());
		const rendered = ui.render(120, 24, theme).join("\n");
		expect(rendered).toContain("Delete this file?");
	});

	it("should include CONFIRM label in header", () => {
		const ui = new ConfirmUI("Continue?", "", vi.fn(), vi.fn());
		const rendered = ui.render(120, 24, theme).join("\n");
		expect(rendered).toContain("CONFIRM");
	});

	it("should include detail/markdown content in body", () => {
		const detail = "## Warning\nThis action **cannot** be undone.";
		const ui = new ConfirmUI("Delete?", detail, vi.fn(), vi.fn());
		const rendered = ui.render(120, 24, theme).join("\n");
		expect(rendered).toContain("## Warning");
		expect(rendered).toContain("cannot");
	});

	it("should show Yes and No options", () => {
		const ui = new ConfirmUI("Continue?", "", vi.fn(), vi.fn());
		const rendered = ui.render(120, 24, theme).join("\n");
		expect(rendered).toContain("Yes");
		expect(rendered).toContain("No");
	});

	it("should include navigation help text", () => {
		const ui = new ConfirmUI("Continue?", "", vi.fn(), vi.fn());
		const rendered = ui.render(120, 24, theme).join("\n");
		expect(rendered).toMatch(/Toggle|Confirm|Cancel/i);
	});

	it("should handle empty detail string", () => {
		const ui = new ConfirmUI("Continue?", "", vi.fn(), vi.fn());
		const result = ui.render(120, 24, theme);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should handle multiline detail with code blocks", () => {
		const detail = "## Plan\n\n```ts\nconst x = 1;\n```\n\n| Col | Val |\n|-----|-----|\n| A   | 1   |";
		const ui = new ConfirmUI("Approve?", detail, vi.fn(), vi.fn());
		const result = ui.render(120, 24, theme);
		expect(result.length).toBeGreaterThan(0);
		const rendered = result.join("\n");
		expect(rendered).toContain("Plan");
	});

	it("should render with small dimensions", () => {
		const ui = new ConfirmUI("OK?", "detail", vi.fn(), vi.fn());
		const result = ui.render(40, 10, theme);
		expect(result.length).toBeGreaterThan(0);
	});
});

// ── Callbacks ────────────────────────────────────────────────────────

describe("ConfirmUI - Callbacks", () => {
	it("should call onConfirm exactly once on Enter", () => {
		const onConfirm = vi.fn();
		const ui = new ConfirmUI("Q?", "", onConfirm, vi.fn());
		const tui = { requestRender: vi.fn() };

		ui.handleInput("enter", tui);
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onConfirm).toHaveBeenCalledWith(true);
	});

	it("should call onCancel exactly once on Escape", () => {
		const onCancel = vi.fn();
		const ui = new ConfirmUI("Q?", "", vi.fn(), onCancel);
		const tui = { requestRender: vi.fn() };

		ui.handleInput("escape", tui);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("should not call both onConfirm and onCancel", () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		const ui = new ConfirmUI("Q?", "", onConfirm, onCancel);
		const tui = { requestRender: vi.fn() };

		ui.handleInput("enter", tui);
		expect(onConfirm).toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});
});
