// ---------------------------------------------------------------------------
// Disk Cleanup — Frontend
// ---------------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let scanData = null;
let selectedFiles = new Set();

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("/api/default-dir");
  const data = await res.json();
  $("#dir-input").value = data.directory;

  $("#btn-scan").addEventListener("click", scan);
  $("#btn-clear").addEventListener("click", clearResults);
  $("#btn-analyze").addEventListener("click", analyzeWithAI);
  $("#btn-close-ai").addEventListener("click", () => {
    $("#ai-panel").style.display = "none";
  });
  $("#btn-delete").addEventListener("click", showDeleteModal);
  $("#btn-cancel").addEventListener("click", hideModal);
  $("#btn-confirm").addEventListener("click", confirmDelete);
  $("#btn-toggle-history").addEventListener("click", toggleHistory);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideModal();
  });
});

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

async function scan() {
  const directory = $("#dir-input").value.trim();
  if (!directory) return;

  const categories = [];
  if ($("#cat-temp").checked) categories.push("temp");
  if ($("#cat-compiled").checked) categories.push("compiled");
  if ($("#cat-archives").checked) categories.push("archives");

  if (categories.length === 0) return;

  showStatus("Scanning directory...", true);
  hideResults();

  try {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ directory, categories }),
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus(data.error || "Scan failed.");
      return;
    }

    if (data.totalFiles === 0) {
      showStatus("No matching files found.");
      return;
    }

    scanData = data;
    selectedFiles.clear();
    renderResults(data);
    hideStatus();
    showScanStats(data);
  } catch (err) {
    showStatus("Network error: " + err.message);
  }
}

// ---------------------------------------------------------------------------
// Render results
// ---------------------------------------------------------------------------

function renderResults(data) {
  const container = $("#category-groups");
  container.innerHTML = "";

  const categoryOrder = ["temp", "compiled", "archives"];
  const categoryLabels = {
    temp: "Temporary Files",
    compiled: "Compiled / Build Artifacts",
    archives: "Archives",
  };

  for (const cat of categoryOrder) {
    const files = data.results[cat];
    if (!files || files.length === 0) continue;

    const group = document.createElement("div");
    group.className = "category-group";
    group.dataset.category = cat;

    const catSummary = data.summary[cat];

    group.innerHTML = `
      <div class="category-header" data-cat="${cat}">
        <div class="category-header-left">
          <span class="category-dot category-dot-${cat}"></span>
          <span class="category-name">${categoryLabels[cat]}</span>
        </div>
        <div class="category-meta">
          <span>${catSummary.count} items</span>
          <span>${catSummary.sizeFormatted}</span>
          <span class="category-chevron">&#9654;</span>
        </div>
      </div>
      <div class="category-body">
        <div class="category-actions">
          <button class="btn btn-ghost btn-select-all" data-cat="${cat}">Select all</button>
          <button class="btn btn-ghost btn-deselect-all" data-cat="${cat}">Deselect all</button>
        </div>
        <div class="file-list" data-cat="${cat}"></div>
      </div>
    `;

    const fileList = group.querySelector(".file-list");

    for (const file of files) {
      const row = document.createElement("div");
      row.className = "file-row";
      row.innerHTML = `
        <input type="checkbox" data-path="${escapeAttr(file.path)}">
        <span class="file-name">${escapeHtml(file.name)}</span>
        <span class="file-path" title="${escapeAttr(file.path)}">${escapeHtml(file.path)}</span>
        ${file.isDirectory ? '<span class="file-dir-badge">dir</span>' : ""}
        <span class="file-size">${file.sizeFormatted}</span>
        <span class="file-date">${formatDate(file.modified)}</span>
      `;
      fileList.appendChild(row);
    }

    container.appendChild(group);
  }

  // Event listeners
  for (const header of $$(".category-header")) {
    header.addEventListener("click", () => {
      header.parentElement.classList.toggle("expanded");
    });
  }

  for (const btn of $$(".btn-select-all")) {
    btn.addEventListener("click", () => selectCategory(btn.dataset.cat, true));
  }

  for (const btn of $$(".btn-deselect-all")) {
    btn.addEventListener("click", () => selectCategory(btn.dataset.cat, false));
  }

  for (const cb of $$("#category-groups input[type='checkbox']")) {
    cb.addEventListener("change", () => {
      if (cb.checked) {
        selectedFiles.add(cb.dataset.path);
      } else {
        selectedFiles.delete(cb.dataset.path);
      }
      updateActionBar();
    });
  }

  // Show UI elements
  $("#results").style.display = "block";
  $("#results-summary").innerHTML = `Found <strong>${data.totalFiles}</strong> items totaling <strong>${data.totalSizeFormatted}</strong>`;
  $("#btn-analyze").style.display = "inline-flex";
  $("#btn-clear").style.display = "inline-flex";
  $("#action-bar").style.display = "flex";
  updateActionBar();
}

function selectCategory(cat, selected) {
  const checkboxes = $$(`.file-list[data-cat="${cat}"] input[type="checkbox"]`);
  for (const cb of checkboxes) {
    cb.checked = selected;
    if (selected) {
      selectedFiles.add(cb.dataset.path);
    } else {
      selectedFiles.delete(cb.dataset.path);
    }
  }
  updateActionBar();
}

function updateActionBar() {
  const count = selectedFiles.size;
  let totalSize = 0;

  if (scanData) {
    for (const cat of Object.values(scanData.results)) {
      for (const file of cat) {
        if (selectedFiles.has(file.path)) {
          totalSize += file.size;
        }
      }
    }
  }

  $("#selected-count").textContent = `${count} selected`;
  $("#selected-size").textContent = formatSizeJS(totalSize);
  $("#btn-delete").disabled = count === 0;
}

// ---------------------------------------------------------------------------
// AI Analysis
// ---------------------------------------------------------------------------

async function analyzeWithAI() {
  if (!scanData) return;

  const panel = $("#ai-panel");
  const body = $("#ai-body");
  panel.style.display = "block";
  body.innerHTML = '<span class="ai-cursor"></span>';

  // Prepare summary + sample files for AI
  const sampleFiles = {};
  for (const [cat, files] of Object.entries(scanData.results)) {
    sampleFiles[cat] = files.slice(0, 10).map((f) => ({
      name: f.name,
      path: f.path,
      size: f.sizeFormatted,
      isDirectory: f.isDirectory,
    }));
  }

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: scanData.summary, sampleFiles }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") break;

        try {
          const msg = JSON.parse(payload);
          if (msg.text) {
            fullText += msg.text;
            body.innerHTML = escapeHtml(fullText) + '<span class="ai-cursor"></span>';
            body.scrollTop = body.scrollHeight;
          } else if (msg.done && msg.result) {
            fullText = msg.result;
            body.innerHTML = escapeHtml(fullText);
          } else if (msg.error) {
            body.innerHTML = `<span style="color: var(--danger)">Error: ${escapeHtml(msg.error)}</span>`;
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    // Remove cursor when done
    const cursor = body.querySelector(".ai-cursor");
    if (cursor) cursor.remove();

  } catch (err) {
    body.innerHTML = `<span style="color: var(--danger)">Failed to connect to AI: ${escapeHtml(err.message)}</span>`;
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

function showDeleteModal() {
  if (selectedFiles.size === 0) return;

  const list = $("#modal-file-list");
  list.innerHTML = "";

  let totalSize = 0;
  const filesToDelete = [];

  for (const cat of Object.values(scanData.results)) {
    for (const file of cat) {
      if (selectedFiles.has(file.path)) {
        filesToDelete.push(file);
        totalSize += file.size;
      }
    }
  }

  for (const file of filesToDelete) {
    const item = document.createElement("div");
    item.className = "modal-file-item";
    item.innerHTML = `
      <span>${escapeHtml(file.path)}</span>
      <span>${file.sizeFormatted}</span>
    `;
    list.appendChild(item);
  }

  $("#modal-summary").innerHTML = `<strong>${filesToDelete.length}</strong> items, <strong>${formatSizeJS(totalSize)}</strong> will be freed.`;
  $("#modal-overlay").style.display = "flex";
}

function hideModal() {
  $("#modal-overlay").style.display = "none";
}

async function confirmDelete() {
  hideModal();
  showStatus("Deleting files...", true);

  const files = Array.from(selectedFiles);

  try {
    const res = await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });

    const data = await res.json();

    if (data.deletedCount > 0) {
      showStatus(`Deleted ${data.deletedCount} items, freed ${data.freedFormatted}.${data.failedCount > 0 ? ` ${data.failedCount} failed.` : ""}`);

      // Remove deleted items from results and re-render
      for (const result of data.results) {
        if (result.success) {
          selectedFiles.delete(result.path);
          for (const cat of Object.values(scanData.results)) {
            const idx = cat.findIndex((f) => f.path === result.path);
            if (idx !== -1) cat.splice(idx, 1);
          }
        }
      }

      // Recalculate totals
      let totalFiles = 0;
      let totalSize = 0;
      for (const [cat, files] of Object.entries(scanData.results)) {
        const catSize = files.reduce((s, f) => s + f.size, 0);
        scanData.summary[cat] = {
          count: files.length,
          size: catSize,
          sizeFormatted: formatSizeJS(catSize),
        };
        totalFiles += files.length;
        totalSize += catSize;
      }
      scanData.totalFiles = totalFiles;
      scanData.totalSize = totalSize;
      scanData.totalSizeFormatted = formatSizeJS(totalSize);

      renderResults(scanData);
      loadHistory();
    } else {
      showStatus("No files were deleted. " + (data.results[0]?.error || ""));
    }
  } catch (err) {
    showStatus("Delete failed: " + err.message);
  }
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

async function toggleHistory() {
  const list = $("#history-list");
  if (list.style.display === "none") {
    await loadHistory();
    list.style.display = "block";
    $("#history-section").style.display = "block";
  } else {
    list.style.display = "none";
  }
}

async function loadHistory() {
  try {
    const res = await fetch("/api/history");
    const entries = await res.json();
    const list = $("#history-list");

    if (entries.length === 0) {
      list.innerHTML = '<div class="history-item"><span class="history-item-path">No deletions recorded yet.</span></div>';
      return;
    }

    list.innerHTML = entries
      .map(
        (e) => `
      <div class="history-item">
        <span class="history-item-path">${escapeHtml(e.path)}</span>
        <span class="history-item-meta">
          <span>${formatSizeJS(e.size)}</span>
          <span>${formatDate(e.timestamp)}</span>
        </span>
      </div>
    `
      )
      .join("");
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// UI Helpers
// ---------------------------------------------------------------------------

function showStatus(msg, loading = false) {
  const el = $("#status");
  el.style.display = "block";
  el.innerHTML = (loading ? '<span class="spinner"></span>' : "") + escapeHtml(msg);
}

function hideStatus() {
  $("#status").style.display = "none";
}

function hideResults() {
  $("#results").style.display = "none";
  $("#action-bar").style.display = "none";
  $("#ai-panel").style.display = "none";
  $("#scan-stats").style.display = "none";
}

function clearResults() {
  scanData = null;
  selectedFiles.clear();
  hideResults();
  hideStatus();
  $("#btn-clear").style.display = "none";
  $("#category-groups").innerHTML = "";
}

function showScanStats(data) {
  const el = $("#scan-stats");
  el.style.display = "block";
  el.textContent = `Scanned in ${data.scanTime}ms`;
}

// ---------------------------------------------------------------------------
// Format Helpers
// ---------------------------------------------------------------------------

function formatSizeJS(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + " " + units[i];
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}
