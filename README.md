# Obsidian Vault Task Dashboard

A single-file HTML dashboard that reads tasks directly from your [Obsidian](https://obsidian.md) daily notes. No server, no build step, no dependencies — just open `dashboard.html` in your browser.

![Board and list views](https://img.shields.io/badge/views-board%20%7C%20list-D97757?style=flat-square) ![Zero dependencies](https://img.shields.io/badge/dependencies-zero-green?style=flat-square) ![Single file](https://img.shields.io/badge/file-single%20HTML-blue?style=flat-square)

## Background

This dashboard started as a fork of the visual dashboard that ships with the [Productivity plugin](https://claude.com/product/cowork) for **Claude Cowork** (Anthropic's agentic desktop app). The plugin provides task management, workplace memory, and a `TASKS.md`-based workflow — Claude learns your people, projects, and terminology and acts more like a colleague than a chatbot.

The original plugin dashboard reads from a flat `TASKS.md` file. This version was rewritten to read directly from an **Obsidian vault's daily notes**, making it a better fit for people who already use Obsidian as their daily driver and want their tasks to live alongside journals, meeting notes, and everything else in the vault.

You can install the productivity plugin in Cowork or Claude Code with:

```
claude plugins add knowledge-work-plugins/productivity
```

The plugin gives you `/start` (initialize tasks, memory, and dashboard) and `/update` (triage stale items, sync with email/calendar/chat). This dashboard is designed to work hand-in-hand with that workflow.

## How It Works

The dashboard uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) to read and write directly to your Obsidian vault's `daily/` folder. When you grant access to your vault directory, the dashboard scans all daily notes for task checkboxes and renders them in two views:

- **Board view** — Kanban-style columns: Active, Waiting On, Someday, and Done
- **List view** — Tasks grouped chronologically by daily note date

All edits (checking off tasks, renaming, adding subtasks, dragging between columns) are written back to the corresponding daily note files in real time. Your vault stays the source of truth.

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
- **Persistent vault connection** — vault directory handle is stored in IndexedDB, so you only need to grant access once per browser
- **Auto-save** — changes are debounced and written after 1 second of inactivity
- **Dark mode** — respects `prefers-color-scheme` and includes a manual toggle
- **Memory tab** — separate tab for managing a `memory/` directory of markdown knowledge files (optional)

## Getting Started

1. Clone this repo (or just grab `dashboard.html`)
2. Open `dashboard.html` in Chrome or Edge (File System Access API required)
3. Click **Select your Obsidian vault** and choose the root of your vault
4. Your tasks appear immediately

> **Browser support:** The File System Access API is currently supported in Chromium-based browsers (Chrome, Edge, Arc, Brave). Firefox and Safari do not support it yet.

## Privacy

Everything runs locally in your browser. No data leaves your machine — there's no server, no analytics, no network requests (aside from loading the Inter font from Google Fonts). Your vault files are accessed through the browser's permission system and never uploaded anywhere.

## Companion: Obsidian MCP Server

The dashboard itself is fully standalone — it reads your vault directly through the browser. But if you use an AI assistant (Claude, etc.) to help manage your tasks, you'll want an **Obsidian MCP server** so the assistant can read and write to your vault too.

This project was built alongside [mcp-obsidian](https://github.com/bitbonsai/mcp-obsidian) (`@mauricio.wolff/mcp-obsidian` on npm), a lightweight MCP server that gives AI tools direct vault access with no Obsidian plugins required. Other compatible options include:

| Server | Install | Notes |
|--------|---------|-------|
| [bitbonsai/mcp-obsidian](https://github.com/bitbonsai/mcp-obsidian) | `npx @mauricio.wolff/mcp-obsidian /path/to/vault` | Zero-dependency, 11 tools, no plugins needed |
| [StevenStavrakis/obsidian-mcp](https://github.com/StevenStavrakis/obsidian-mcp) | `npx obsidian-mcp /path/to/vault` | Similar feature set, actively maintained |
| [MarkusPfundstein/mcp-obsidian](https://github.com/MarkusPfundstein/mcp-obsidian) | `uvx mcp-obsidian` | Python-based, requires the Obsidian Local REST API plugin |

Any MCP server that can read/write markdown files in your vault's `daily/` directory will work. The key operations the AI assistant needs are: read note, write/patch note, list directory, and search.

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

The AI assistant can then create daily notes, check off tasks, add `#waiting`/`#someday` tags, and manage subtasks — all of which the dashboard will pick up on its next load or file-change detection.

## Architecture

The entire application is a single `dashboard.html` file (~3,200 lines). It contains:

- **CSS** — custom properties for theming, responsive layout, card and kanban styles
- **Task engine** — vault directory scanning, daily note parser, bidirectional write-back, kanban state management
- **Memory engine** — optional markdown file browser for a `memory/` subdirectory
- **IndexedDB layer** — persists file handles across sessions so you don't re-grant access every time

There are no external JS dependencies. The only network request is the Google Fonts stylesheet for Inter.

## License

MIT
