# Vaultboard

A task dashboard for [Obsidian](https://obsidian.md) daily notes — kanban board and chronological list views. Open `dashboard.html` directly in your browser, or self-host as a Docker container for access from any device.

![Board and list views](https://img.shields.io/badge/views-board%20%7C%20list-D97757?style=flat-square) ![Self-hostable](https://img.shields.io/badge/self--host-Docker-blue?style=flat-square) ![Single file](https://img.shields.io/badge/local-single%20HTML-green?style=flat-square)

## Background

This dashboard started as a fork of the visual dashboard that ships with the [Productivity plugin](https://claude.com/product/cowork) for **Claude Cowork** (Anthropic's agentic desktop app). The plugin provides task management, workplace memory, and a `TASKS.md`-based workflow — Claude learns your people, projects, and terminology and acts more like a colleague than a chatbot.

The original plugin dashboard reads from a flat `TASKS.md` file. This version was rewritten to read directly from an **Obsidian vault's daily notes**, making it a better fit for people who already use Obsidian as their daily driver and want their tasks to live alongside journals, meeting notes, and everything else in the vault.

You can install the productivity plugin in Cowork or Claude Code with:

```
claude plugins add knowledge-work-plugins/productivity
```

The plugin gives you `/start` (initialize tasks, memory, and dashboard) and `/update` (triage stale items, sync with email/calendar/chat). This dashboard is designed to work hand-in-hand with that workflow.

## How It Works

The dashboard reads and writes markdown files in your vault's `daily/` folder. Every interaction (checking a task, dragging between columns, editing a title) writes the change back to the corresponding daily note. Your vault stays the source of truth.

It supports two I/O modes, chosen automatically:

- **Local mode** — When you open `dashboard.html` as a file, it uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) to access your vault directly from the browser. Chromium browsers only (Chrome, Edge, Arc, Brave).
- **Server mode** — When served from the Docker container, it talks to a thin REST API backed by the vault directory bind-mounted into the container. Works from any browser on any device (phone, tablet, etc.).

Two views are available:

- **Board view** — Kanban-style columns: Active, Waiting On, Someday, and Done
- **List view** — Tasks grouped chronologically by daily note date

## Quick Start (Local)

1. Clone this repo (or just grab `dashboard.html`)
2. Open `dashboard.html` in Chrome or Edge
3. Click **Select your Obsidian vault** and choose the root of your vault
4. Your tasks appear immediately

> **Browser support:** Local mode requires the File System Access API — Chromium-based browsers only. Server mode works everywhere.

## Quick Start (Docker)

```bash
git clone https://github.com/pdmurray/vaultboard.git
cd vaultboard
docker compose up -d
```

The dashboard is now at `http://localhost:3000`. By default, compose pulls the pre-built image from `ghcr.io`. Edit the `volumes` path in `docker-compose.yml` to point to your vault directory on the host.

To build locally instead of pulling:

```bash
docker compose build
docker compose up -d
```

### Keeping the vault in sync with Obsidian Sync

The dashboard container needs access to your vault files on disk. If you use [Obsidian Sync](https://obsidian.md/sync), the cleanest approach is to run Obsidian on a machine that's always on — a VM or a desktop that doesn't sleep — and have it write to a shared filesystem that the Docker container can mount.

For example, on a TrueNAS server with a Windows or Linux VM:

```
                    Obsidian Sync (cloud)
                  ↕            ↕            ↕
Mac (Obsidian)   VM (Obsidian)   iPhone/iPad (Obsidian)
                   ↓ writes to
                 SMB/NFS share (NAS dataset)
                   ↑ bind mount
                 Dashboard container (:3000)
                   ↑ browser
                 Any device
```

1. Create an SMB or NFS share on your NAS for the vault (e.g., `/mnt/pool/obsidian-vault`)
2. Install Obsidian in a VM that runs 24/7, with its vault pointed at the share
3. Enable Obsidian Sync in that VM — it stays current with all your other devices
4. Bind-mount the same share into the dashboard container (the default in `docker-compose.yml`)

Edits from the dashboard flow: server files → Obsidian detects change → Obsidian Sync → all your devices. Edits from any Obsidian device flow: Obsidian Sync → VM Obsidian → shared files → dashboard picks up on next poll (2 seconds).

### Using the pre-built image

If you've set up the GitHub Actions workflow (included), the image is published to GitHub Container Registry:

```bash
docker run -d \
  --name vaultboard \
  -p 3000:3000 \
  -v /path/to/your/vault:/vault \
  ghcr.io/pdmurray/vaultboard:latest
```

### Exposing via Cloudflare Tunnel

If you're already running Cloudflare tunnels, just add the dashboard as another service:

```yaml
# In your cloudflared config
ingress:
  - hostname: tasks.yourdomain.com
    service: http://vaultboard:3000
```

> **Security note:** The REST API has no authentication. If you expose it beyond your local network, add authentication at the tunnel/reverse proxy layer (Cloudflare Access, basic auth in Caddy/nginx, etc.).

## Daily Note Format

The dashboard expects daily notes in `daily/YYYY-MM-DD.md` with this structure:

```markdown
# Daily Notes

## Tasks
- Personal
	- [ ] Buy groceries
		- [ ] Milk
		- [ ] Eggs
	- [x] Pay electric bill
- Work
	- [ ] Review PR #482
	- [ ] Update deployment docs #someday

## Journal
Free-form text here...

## Observations
More free-form text...
```

Key conventions:

- **Categories** are unindented lines under `## Tasks` (e.g., `- Personal`, `- Work`)
- **Tasks** are single-tab indented with `- [ ]` or `- [x]` checkboxes
- **Subtasks** are double-tab indented under their parent task
- **Status tags** use inline Obsidian tags: `#waiting` for blocked/pending items, `#someday` for low-priority items. Untagged open tasks show as Active.
- **Journal** and **Observations** sections are preserved on write-back but not displayed in the dashboard

## Features

- **Bidirectional sync** — edits in the dashboard write back to vault files; external vault changes are detected and reloaded
- **Kanban drag-and-drop** — drag tasks between Active, Waiting On, Someday, and Done columns (automatically applies/removes `#waiting` and `#someday` tags)
- **Inline editing** — click any task title to rename it
- **Subtask management** — hover over a task to add subtasks; edit or remove existing ones
- **Add tasks** — create new tasks from the dashboard with category and date assignment
- **Persistent vault connection** — in local mode, the directory handle is stored in IndexedDB so you only grant access once
- **Auto-save** — changes are debounced and written after 1 second of inactivity
- **Dark mode** — respects `prefers-color-scheme` and includes a manual toggle
- **Memory tab** — separate tab for managing a `memory/` directory of markdown knowledge files (optional)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Server (TrueNAS / Linux)                               │
│                                                         │
│  ┌────────────────────────┐   ┌───────────────────────┐ │
│  │  dashboard container   │   │  VM (always-on)       │ │
│  │                        │   │                       │ │
│  │  Express (server.js)   │   │  Obsidian ◄──── Sync  │ │
│  │  ├─ dashboard.html     │   │       ↓               │ │
│  │  └─ REST API /api/*    │   │  writes to vault      │ │
│  │                        │   │                       │ │
│  │  /vault (bind mount) ──┼───┼── /vault (SMB/NFS) ──│ │
│  └────────────────────────┘   └───────────────────────┘ │
│               ▲                                         │
│          browser / phone                                │
└─────────────────────────────────────────────────────────┘
```

The dashboard has two independent I/O paths that both read/write the same markdown files:

1. **The dashboard itself** reads and writes `.md` files. In local mode, it uses the browser's File System Access API. In server mode, it talks to a thin Express REST API (`server.js`, ~140 lines) that does the same file I/O on the server side.

2. **Claude (via MCP)** also reads and writes the same vault files when you use the Obsidian MCP server during Cowork sessions. This is completely independent of the dashboard — they don't know about each other. They just both operate on the same markdown files, and the dashboard's external change detection picks up anything Claude writes.

The REST API endpoints are:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Vault connectivity check |
| `/api/daily` | GET | List all daily note dates |
| `/api/daily/:date` | GET | Read one daily note |
| `/api/daily/:date` | PUT | Write one daily note |
| `/api/memory/claude` | GET/PUT | Read/write CLAUDE.md |
| `/api/memory/files` | GET | List memory directory tree |
| `/api/memory/file/*` | GET/PUT | Read/write memory files |

### File structure

```
.
├── dashboard.html          # The entire frontend (~3,500 lines)
├── server.js               # Express backend for server mode (~140 lines)
├── package.json            # Single dependency: express
├── Dockerfile              # Node 20 Alpine image
├── docker-compose.yml      # Compose config with vault bind mount
├── .dockerignore
├── .gitignore
└── .github/
    └── workflows/
        └── docker.yml      # Build and push to GitHub Container Registry
```

## Companion: Obsidian MCP Server

The dashboard itself is fully standalone. But if you use an AI assistant (Claude, etc.) to help manage your tasks, you'll want an **Obsidian MCP server** so the assistant can read and write to your vault too.

This project was built alongside [mcp-obsidian](https://github.com/bitbonsai/mcp-obsidian) (`@mauricio.wolff/mcp-obsidian` on npm). Other compatible options:

| Server | Install | Notes |
|--------|---------|-------|
| [bitbonsai/mcp-obsidian](https://github.com/bitbonsai/mcp-obsidian) | `npx @mauricio.wolff/mcp-obsidian /path/to/vault` | Zero-dependency, no plugins needed |
| [StevenStavrakis/obsidian-mcp](https://github.com/StevenStavrakis/obsidian-mcp) | `npx obsidian-mcp /path/to/vault` | Similar feature set, actively maintained |
| [MarkusPfundstein/mcp-obsidian](https://github.com/MarkusPfundstein/mcp-obsidian) | `uvx mcp-obsidian` | Python-based, requires Local REST API plugin |

Any MCP server that can read/write markdown files in your vault's `daily/` directory will work. The key operations are: read note, write/patch note, list directory, and search.

### Claude Desktop / Claude Code Configuration

Add the MCP server to your `claude_desktop_config.json` or `.mcp.json`:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "@mauricio.wolff/mcp-obsidian", "/path/to/your/vault"]
    }
  }
}
```

## Privacy

In local mode, everything runs in your browser. No data leaves your machine — no server, no analytics, no network requests aside from the Google Fonts stylesheet.

In server mode, the Express backend runs on your infrastructure and reads/writes your vault files. Nothing is sent to any external service. The only network dependency is still the Google Fonts stylesheet loaded by the browser.

## License

MIT
