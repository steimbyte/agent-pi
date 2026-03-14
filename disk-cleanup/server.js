import express from "express";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { query } from "@anthropic-ai/claude-agent-sdk";

const app = express();
const PORT = 3456;
const DELETION_LOG = path.join(path.dirname(new URL(import.meta.url).pathname), "deletion-log.json");

app.use(express.json({ limit: "5mb" }));
app.use(express.static("public"));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PROTECTED_DIRS = new Set([
  "/System",
  "/Library",
  "/usr",
  "/bin",
  "/sbin",
  "/private/var/protected",
  "/private/etc",
  "/etc",
  "/cores",
]);

const MAX_DEPTH = 10;
const MAX_FILES = 10_000;

const CATEGORIES = {
  temp: {
    label: "Temporary Files",
    extensions: new Set([
      ".tmp", ".temp", ".swp", ".swo", ".bak", ".old", ".log",
    ]),
    names: new Set([".DS_Store", "Thumbs.db", "desktop.ini"]),
  },
  compiled: {
    label: "Compiled / Build Artifacts",
    extensions: new Set([
      ".o", ".obj", ".pyc", ".pyo", ".class", ".dSYM",
    ]),
    directories: new Set([
      "node_modules", "__pycache__", "dist", "build", ".next",
      "target", ".cache", ".parcel-cache", ".turbo",
    ]),
  },
  archives: {
    label: "Archives",
    extensions: new Set([
      ".zip", ".tar", ".tar.gz", ".tgz", ".rar", ".7z",
      ".bz2", ".xz", ".gz", ".dmg", ".iso",
    ]),
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + " " + units[i];
}

function isProtected(dirPath) {
  const resolved = path.resolve(dirPath);
  for (const p of PROTECTED_DIRS) {
    if (resolved === p || resolved.startsWith(p + "/")) return true;
  }
  return false;
}

function categorizeEntry(name, isDirectory) {
  if (isDirectory) {
    if (CATEGORIES.compiled.directories?.has(name)) return "compiled";
    return null;
  }
  const ext = path.extname(name).toLowerCase();
  const baseName = path.basename(name);
  // double extension check for .tar.gz etc
  const doubleExt = name.includes(".tar.") ? ".tar" + ext : ext;

  if (CATEGORIES.temp.names.has(baseName)) return "temp";
  if (CATEGORIES.temp.extensions.has(ext)) return "temp";
  if (CATEGORIES.compiled.extensions.has(ext)) return "compiled";
  if (CATEGORIES.archives.extensions.has(ext) || CATEGORIES.archives.extensions.has(doubleExt)) return "archives";
  return null;
}

// ---------------------------------------------------------------------------
// Recursive scanner
// ---------------------------------------------------------------------------

async function scanDirectory(rootDir, enabledCategories) {
  const results = { temp: [], compiled: [], archives: [] };
  let fileCount = 0;

  async function walk(dir, depth) {
    if (depth > MAX_DEPTH || fileCount >= MAX_FILES) return;
    if (isProtected(dir)) return;

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // permission denied, etc.
    }

    for (const entry of entries) {
      if (fileCount >= MAX_FILES) return;

      const fullPath = path.join(dir, entry.name);

      // Skip symlinks
      try {
        const stat = await fs.lstat(fullPath);
        if (stat.isSymbolicLink()) continue;
      } catch {
        continue;
      }

      const isDir = entry.isDirectory();
      const category = categorizeEntry(entry.name, isDir);

      if (category && enabledCategories.includes(category)) {
        try {
          let size = 0;
          let mtime;

          if (isDir) {
            size = await getDirSize(fullPath, 0);
            const stat = await fs.stat(fullPath);
            mtime = stat.mtime;
          } else {
            const stat = await fs.stat(fullPath);
            size = stat.size;
            mtime = stat.mtime;
          }

          results[category].push({
            path: fullPath,
            name: entry.name,
            size,
            sizeFormatted: formatSize(size),
            modified: mtime?.toISOString(),
            isDirectory: isDir,
          });
          fileCount++;
        } catch {
          // stat failed, skip
        }

        // Don't recurse into matched directories (we already sized them)
        if (isDir) continue;
      }

      if (isDir) {
        await walk(fullPath, depth + 1);
      }
    }
  }

  await walk(rootDir, 0);

  // Sort each category by size descending
  for (const cat of Object.keys(results)) {
    results[cat].sort((a, b) => b.size - a.size);
  }

  return results;
}

async function getDirSize(dir, depth) {
  if (depth > 5) return 0;
  let total = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      try {
        const stat = await fs.lstat(full);
        if (stat.isSymbolicLink()) continue;
        if (stat.isDirectory()) {
          total += await getDirSize(full, depth + 1);
        } else {
          total += stat.size;
        }
      } catch {
        continue;
      }
    }
  } catch {
    // permission denied
  }
  return total;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/api/default-dir", (_req, res) => {
  res.json({ directory: os.homedir() });
});

app.post("/api/scan", async (req, res) => {
  const { directory, categories } = req.body;
  const dir = directory || os.homedir();
  const cats = categories || ["temp", "compiled", "archives"];

  // Validate path
  try {
    const realDir = await fs.realpath(dir);
    if (isProtected(realDir)) {
      return res.status(400).json({ error: "Cannot scan protected system directory." });
    }
    const stat = await fs.stat(realDir);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: "Path is not a directory." });
    }
  } catch (err) {
    return res.status(400).json({ error: `Invalid path: ${err.message}` });
  }

  try {
    const start = Date.now();
    const results = await scanDirectory(dir, cats);
    const elapsed = Date.now() - start;

    const summary = {};
    let totalFiles = 0;
    let totalSize = 0;

    for (const [cat, files] of Object.entries(results)) {
      const catSize = files.reduce((s, f) => s + f.size, 0);
      summary[cat] = { count: files.length, size: catSize, sizeFormatted: formatSize(catSize) };
      totalFiles += files.length;
      totalSize += catSize;
    }

    res.json({
      results,
      summary,
      totalFiles,
      totalSize,
      totalSizeFormatted: formatSize(totalSize),
      scanTime: elapsed,
      directory: dir,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/delete", async (req, res) => {
  const { files } = req.body;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "No files specified." });
  }

  const results = [];
  for (const filePath of files) {
    try {
      // Security: resolve real path and check it's not protected
      const real = await fs.realpath(filePath);
      if (isProtected(real)) {
        results.push({ path: filePath, success: false, error: "Protected path" });
        continue;
      }

      const stat = await fs.stat(real);
      const size = stat.size;

      if (stat.isDirectory()) {
        await fs.rm(real, { recursive: true, force: true });
      } else {
        await fs.unlink(real);
      }

      results.push({ path: filePath, success: true, size });

      // Log deletion
      await appendDeletionLog({ path: filePath, size, timestamp: new Date().toISOString(), success: true });
    } catch (err) {
      results.push({ path: filePath, success: false, error: err.message });
    }
  }

  const deleted = results.filter((r) => r.success);
  const freedBytes = deleted.reduce((s, r) => s + (r.size || 0), 0);

  res.json({
    results,
    deletedCount: deleted.length,
    failedCount: results.length - deleted.length,
    freedBytes,
    freedFormatted: formatSize(freedBytes),
  });
});

// ---------------------------------------------------------------------------
// AI Analysis (Agent SDK with OAuth token)
// ---------------------------------------------------------------------------

app.post("/api/analyze", async (req, res) => {
  const { summary, sampleFiles } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const prompt = `You are a disk cleanup advisor. Analyze these scan results and provide concise, actionable recommendations.

SCAN RESULTS:
${JSON.stringify(summary, null, 2)}

SAMPLE FILES (largest per category):
${JSON.stringify(sampleFiles, null, 2)}

Respond with:
1. A brief safety assessment for each category
2. Which files/directories are safe to delete and why
3. Any files that might need caution (e.g., archives that might contain important data)
4. Estimated space savings
5. A clear recommendation

Keep it concise and practical. No emojis. Use plain text formatting with dashes for lists.`;

  try {
    const stream = query({
      prompt,
      options: {
        tools: [],
        maxTurns: 1,
        systemPrompt: "You are a concise disk cleanup advisor. Provide practical, safety-conscious recommendations for file deletion. Be direct and clear. No emojis. Use elegant, minimal formatting.",
      },
    });

    for await (const message of stream) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "text") {
            res.write(`data: ${JSON.stringify({ text: block.text })}\n\n`);
          }
        }
      } else if (message.type === "result") {
        res.write(`data: ${JSON.stringify({ done: true, result: message.result })}\n\n`);
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

// ---------------------------------------------------------------------------
// Deletion history
// ---------------------------------------------------------------------------

app.get("/api/history", async (_req, res) => {
  try {
    const data = await fs.readFile(DELETION_LOG, "utf-8");
    const entries = data.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    res.json(entries.reverse().slice(0, 100));
  } catch {
    res.json([]);
  }
});

async function appendDeletionLog(entry) {
  try {
    await fs.appendFile(DELETION_LOG, JSON.stringify(entry) + "\n");
  } catch {
    // non-critical
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Disk Cleanup running at http://localhost:${PORT}`);
});
