// ABOUTME: Self-contained HTML template for a lightweight local file viewer/editor.
// ABOUTME: Supports read/edit/save flow, line-range display, metadata, and simple browser-side interactions.

export function generateFileViewerHTML(opts: {
	title: string;
	filePath: string;
	content: string;
	port: number;
	lineRange?: string;
	editable: boolean;
}): string {
	const escapedTitle = JSON.stringify(opts.title);
	const escapedFilePath = JSON.stringify(opts.filePath);
	const escapedContent = JSON.stringify(opts.content);
	const escapedLineRange = JSON.stringify(opts.lineRange || "");
	const escapedEditable = JSON.stringify(opts.editable);

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${opts.title} — File Viewer</title>
<style>
  :root {
    --bg: #1a1d23;
    --surface: #1e2228;
    --surface2: #252a32;
    --border: #2e343e;
    --text: #e2e8f0;
    --text-muted: #8892a0;
    --text-dim: #555d6e;
    --accent: #2980b9;
    --accent-hover: #3a9ad5;
    --accent-dim: rgba(41, 128, 185, 0.12);
    --success: #48d889;
    --warning: #f0b429;
    --error: #e85858;
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    --mono: "SF Mono", "Fira Code", "JetBrains Mono", Consolas, monospace;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .header {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 6px;
    margin: 12px 16px 0;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
  }
  .badge {
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    font-family: var(--mono);
  }
  .title-wrap { flex: 1; min-width: 0; }
  .title {
    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .subtitle {
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  button {
    background: var(--surface2);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 12px;
    font-family: var(--mono);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  button:hover { border-color: var(--accent); color: var(--accent); }
  button.primary { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
  button:disabled { opacity: 0.45; cursor: not-allowed; }

  .meta {
    margin: 8px 16px 0;
    padding: 10px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--mono);
    flex-shrink: 0;
  }

  .content {
    flex: 1;
    margin: 8px 16px 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    background: var(--surface);
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .notice {
    display: none;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    font-family: var(--mono);
  }
  .notice.visible { display: block; }
  .notice.success { color: var(--success); background: rgba(72, 216, 137, 0.08); }
  .notice.warning { color: var(--warning); background: rgba(240, 180, 41, 0.08); }
  .notice.error { color: var(--error); background: rgba(232, 88, 88, 0.08); }

  .viewer, .editor {
    flex: 1;
    min-height: 0;
    width: 100%;
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.6;
  }
  .viewer {
    overflow: auto;
    padding: 16px;
    white-space: pre;
    color: var(--text);
    tab-size: 2;
  }
  .editor {
    display: none;
    background: var(--bg);
    color: var(--text);
    border: 0;
    outline: none;
    resize: none;
    padding: 16px;
    tab-size: 2;
  }
  .editor.visible, .viewer.visible { display: block; }
</style>
</head>
<body>
  <div class="header">
    <div class="badge">File Viewer</div>
    <div class="title-wrap">
      <div class="title"></div>
      <div class="subtitle"></div>
    </div>
    <div class="toolbar">
      <button id="copyBtn">Copy</button>
      <button id="toggleBtn"></button>
      <button id="saveBtn" class="primary">Save</button>
      <button id="doneBtn">Done</button>
    </div>
  </div>

  <div class="meta">
    <span id="metaPath"></span>
    <span id="metaLines"></span>
    <span id="metaMode"></span>
  </div>

  <div class="content">
    <div id="notice" class="notice"></div>
    <pre id="viewer" class="viewer visible"></pre>
    <textarea id="editor" class="editor" spellcheck="false"></textarea>
  </div>

<script>
  const PORT = ${opts.port};
  const TITLE = ${escapedTitle};
  const FILE_PATH = ${escapedFilePath};
  const ORIGINAL = ${escapedContent};
  const LINE_RANGE = ${escapedLineRange};
  const EDITABLE = ${escapedEditable};

  let currentContent = ORIGINAL;
  let modified = false;
  let mode = 'view';

  const titleEl = document.querySelector('.title');
  const subtitleEl = document.querySelector('.subtitle');
  const metaPath = document.getElementById('metaPath');
  const metaLines = document.getElementById('metaLines');
  const metaMode = document.getElementById('metaMode');
  const notice = document.getElementById('notice');
  const viewer = document.getElementById('viewer');
  const editor = document.getElementById('editor');
  const copyBtn = document.getElementById('copyBtn');
  const toggleBtn = document.getElementById('toggleBtn');
  const saveBtn = document.getElementById('saveBtn');
  const doneBtn = document.getElementById('doneBtn');

  function setNotice(text, kind) {
    notice.textContent = text || '';
    notice.className = 'notice' + (text ? ' visible ' + kind : '');
  }

  function refreshMeta() {
    metaPath.textContent = 'Path: ' + FILE_PATH;
    metaLines.textContent = 'Lines: ' + currentContent.split('\\n').length + (LINE_RANGE ? ' (requested range ' + LINE_RANGE + ')' : '');
    metaMode.textContent = 'Mode: ' + (mode === 'view' ? 'Read' : 'Edit') + (EDITABLE ? '' : ' (read-only)');
  }

  function refreshUI() {
    titleEl.textContent = TITLE;
    subtitleEl.textContent = FILE_PATH;
    viewer.textContent = currentContent;
    if (editor.value !== currentContent) editor.value = currentContent;

    const isEdit = mode === 'edit' && EDITABLE;
    viewer.classList.toggle('visible', !isEdit);
    editor.classList.toggle('visible', isEdit);
    toggleBtn.textContent = isEdit ? 'Preview' : (EDITABLE ? 'Edit' : 'Read Only');
    toggleBtn.disabled = !EDITABLE;
    saveBtn.disabled = !EDITABLE || !modified;
    refreshMeta();
  }

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(mode === 'edit' ? editor.value : currentContent);
      setNotice('Copied file contents to clipboard.', 'success');
    } catch (err) {
      setNotice('Failed to copy to clipboard.', 'error');
    }
  });

  toggleBtn.addEventListener('click', () => {
    if (!EDITABLE) return;
    if (mode === 'view') {
      mode = 'edit';
      setNotice('Edit mode enabled.', 'warning');
      refreshUI();
      setTimeout(() => editor.focus(), 0);
    } else {
      currentContent = editor.value;
      modified = currentContent !== ORIGINAL;
      mode = 'view';
      setNotice(modified ? 'Previewing unsaved changes.' : '', modified ? 'warning' : '');
      refreshUI();
    }
  });

  editor.addEventListener('input', () => {
    currentContent = editor.value;
    modified = currentContent !== ORIGINAL;
    refreshUI();
  });

  saveBtn.addEventListener('click', async () => {
    if (!EDITABLE) return;
    currentContent = editor.value;
    try {
      const resp = await fetch('http://127.0.0.1:' + PORT + '/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentContent })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || 'Save failed');
      modified = false;
      setNotice('File saved successfully.', 'success');
      refreshUI();
    } catch (err) {
      setNotice(err && err.message ? err.message : 'Failed to save file.', 'error');
    }
  });

  doneBtn.addEventListener('click', async () => {
    if (mode === 'edit') {
      currentContent = editor.value;
      modified = currentContent !== ORIGINAL;
    }

    await fetch('http://127.0.0.1:' + PORT + '/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'done', modified, content: currentContent })
    });
  });

  refreshUI();
<\/script>
</body>
</html>`;
}
