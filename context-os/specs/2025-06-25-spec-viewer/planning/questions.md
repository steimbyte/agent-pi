# Spec Viewer — Requirements Questions

I've explored the existing plan viewer thoroughly (`plan-viewer.ts`, `plan-viewer-html.ts`, the render/editor libs). Here are my questions to clarify the spec viewer design:

---

1. I'm assuming the spec viewer should be a **new separate tool** (`show_spec`) rather than a new mode added to `show_plan`, since the multi-page tabbed layout is fundamentally different from the single-document plan viewer. Is that correct? _Default: Yes, new show_spec tool_

2. I'm assuming the viewer should display the **full spec folder** as a multi-tab/page layout — with the main `spec.md` as the primary tab, and supporting docs (requirements.md, initialization.md, questions.md) as secondary tabs the user can click between. Is that correct, or should it only show `spec.md`? _Default: Full folder with tabs_

3. For **comments/notes** — I'm assuming these should be **inline annotations** that the user can add by clicking on any section or paragraph, similar to Google Docs-style comment threads. These comments get saved to a `spec-comments.json` file in the spec folder and returned to the agent as feedback. Is that correct, or did you have something simpler in mind like a single notes textarea? _Default: Inline section-level comments_

4. I'm assuming the approval flow should work like the plan viewer — the user reviews across all tabs, adds comments/notes, then clicks **Approve** or **Request Changes**. If they request changes, their comments are returned to the agent as structured feedback. Is that correct? _Default: Approve or Request Changes with comment feedback_

5. Should the viewer support **visual assets** from `planning/visuals/`? For example, displaying images inline within the spec when referenced, or as a dedicated "Visuals" tab? _Default: Dedicated Visuals tab showing all images_

6. I'm assuming the spec viewer should reuse the same **dark theme and styling** as the plan viewer (same CSS variables, same font stack, same header/footer pattern), just extended with a tab bar and comment system. Is that correct? _Default: Yes, same design language_

7. For the tool interface — I'm assuming `show_spec` takes a **folder path** (the spec folder like `context-os/specs/2025-06-25-feature/`) rather than a single file path, and auto-discovers the documents inside. Is that correct? _Default: Folder path, auto-discover docs_

8. Do you have any **visual mockups or screenshots** of how you envision this looking? If so, please drop them in `planning/visuals/`. _Default: No visuals provided_
