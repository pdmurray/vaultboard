const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.text({ type: '*/*', limit: '1mb' }));

const VAULT_PATH = process.env.VAULT_PATH || '/vault';
const PORT = process.env.PORT || 3000;

// Serve static files — public/ for Docker, repo root as fallback for dev
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Health check
app.get('/api/health', (req, res) => {
  const dailyDir = path.join(VAULT_PATH, 'daily');
  const vaultExists = fs.existsSync(VAULT_PATH);
  const dailyExists = fs.existsSync(dailyDir);
  res.json({ ok: vaultExists && dailyExists, vault: vaultExists, daily: dailyExists });
});

// ---- Daily Notes API ----

// List all daily note filenames
app.get('/api/daily', (req, res) => {
  const dailyDir = path.join(VAULT_PATH, 'daily');
  try {
    const files = fs.readdirSync(dailyDir)
      .filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .map(f => f.replace('.md', ''))
      .sort();
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: 'Could not read daily directory: ' + e.message });
  }
});

// Read one daily note
app.get('/api/daily/:date', (req, res) => {
  const date = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  const filePath = path.join(VAULT_PATH, 'daily', date + '.md');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const stat = fs.statSync(filePath);
    res.json({ content, lastModified: stat.mtimeMs });
  } catch (e) {
    if (e.code === 'ENOENT') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: e.message });
  }
});

// Write one daily note
app.put('/api/daily/:date', (req, res) => {
  const date = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  const filePath = path.join(VAULT_PATH, 'daily', date + '.md');
  const dailyDir = path.join(VAULT_PATH, 'daily');
  try {
    if (!fs.existsSync(dailyDir)) fs.mkdirSync(dailyDir, { recursive: true });
    fs.writeFileSync(filePath, req.body, 'utf-8');
    const stat = fs.statSync(filePath);
    res.json({ ok: true, lastModified: stat.mtimeMs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Memory API ----

// Read CLAUDE.md
app.get('/api/memory/claude', (req, res) => {
  const filePath = path.join(VAULT_PATH, 'CLAUDE.md');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  } catch (e) {
    if (e.code === 'ENOENT') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: e.message });
  }
});

// Write CLAUDE.md
app.put('/api/memory/claude', (req, res) => {
  const filePath = path.join(VAULT_PATH, 'CLAUDE.md');
  try {
    fs.writeFileSync(filePath, req.body, 'utf-8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List memory directory tree
app.get('/api/memory/files', (req, res) => {
  const memoryDir = path.join(VAULT_PATH, 'memory');
  const result = { files: [], dirs: {} };
  try {
    if (!fs.existsSync(memoryDir)) return res.json(result);
    const entries = fs.readdirSync(memoryDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        result.files.push(entry.name);
      } else if (entry.isDirectory()) {
        const subDir = path.join(memoryDir, entry.name);
        result.dirs[entry.name] = fs.readdirSync(subDir)
          .filter(f => f.endsWith('.md'))
          .sort();
      }
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Read a memory file: /api/memory/file/:path (path can include subdirectory)
app.get('/api/memory/file/*', (req, res) => {
  const relPath = req.params[0];
  if (relPath.includes('..')) return res.status(400).json({ error: 'Invalid path' });
  const filePath = path.join(VAULT_PATH, 'memory', relPath);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  } catch (e) {
    if (e.code === 'ENOENT') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: e.message });
  }
});

// Write a memory file
app.put('/api/memory/file/*', (req, res) => {
  const relPath = req.params[0];
  if (relPath.includes('..')) return res.status(400).json({ error: 'Invalid path' });
  const filePath = path.join(VAULT_PATH, 'memory', relPath);
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, req.body, 'utf-8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fallback: serve dashboard.html for root when no public/index.html exists (dev mode)
app.get('/', (req, res, next) => {
  const devFile = path.join(__dirname, 'dashboard.html');
  if (fs.existsSync(devFile)) return res.sendFile(devFile);
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard server listening on port ${PORT}`);
  console.log(`Vault path: ${VAULT_PATH}`);
  console.log(`Daily dir exists: ${fs.existsSync(path.join(VAULT_PATH, 'daily'))}`);
});
