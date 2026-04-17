# Ola workspace — dev machine setup

This directory is what makes **Ask Ola** behave as a real tool-calling agent
(not a plain chat proxy) on any machine that clones this repo. It contains:

- `nanobot-workspace/` — the 5 markdown files that define Ola's persona,
  behaviors, and tool-usage rules. Loaded by nanobot at startup.
- `nanobot.config.template.json` — nanobot's config, with secrets replaced
  by `${VAR}` placeholders. Rendered by `start-dev.sh` at first boot.

## Prerequisites

- Node.js 20.x, npm 10.x
- Python 3.11+ with `nanobot` installed (same host as the CRM backend)
- MongoDB connection string (Atlas shared cluster or your own)
- Gemini API key (from [aistudio.google.com](https://aistudio.google.com))

## First-boot flow (what `start-dev.sh` does for you)

When you run `bash start-dev.sh` on a fresh mac:

1. Sources `backend/.env` into the shell environment.
2. If `~/.nanobot/config.json` does **not** exist → renders
   `ola/nanobot.config.template.json` by substituting `${MCP_SERVICE_TOKEN}`
   from env, and writes the result to `~/.nanobot/config.json` (mode 600).
3. If `~/.nanobot/workspace/SOUL.md` does **not** exist → copies the 5 md
   files from `ola/nanobot-workspace/` into `~/.nanobot/workspace/`.
4. Starts backend (8888), MCP server (8889), nanobot (8900), frontend (3000).
   `GEMINI_API_KEY` is passed to the nanobot process via env — **never
   written to any config file on disk**.

On subsequent boots, steps 2 and 3 are **no-ops** if the files already
exist — your local agent memory and session history under
`~/.nanobot/workspace/memory/` and `~/.nanobot/workspace/sessions/` are
preserved across restarts.

## backend/.env — required variables

Copy `backend/.env.example` to `backend/.env` and fill these four:

| Variable | Where to get it |
|---|---|
| `DATABASE` | MongoDB connection string (ask zyd for the shared Atlas URI) |
| `JWT_SECRET` | Any strong random string — e.g. `openssl rand -hex 32` |
| `MCP_SERVICE_TOKEN` | Loopback-only service token. Dev machines share the same value (ask zyd). Prod generates its own via `openssl rand -hex 32`. |
| `GEMINI_API_KEY` | Personal key from [aistudio.google.com](https://aistudio.google.com) — do **not** share or commit. |

Optional: `GOTENBERG_URL`, `RESEND_API`, `OPENAI_API_KEY`, `ALLOWED_ORIGINS`
(see `backend/.env.example`).

## Troubleshooting

**"Ask Ola responds like a plain GPT — doesn't call any tools"**
→ `~/.nanobot/config.json` is missing the `ola_crm` MCP server entry.
Delete `~/.nanobot/config.json` and re-run `bash start-dev.sh` to re-render
from template.

**"MCP server connected, 0 tools registered" in nanobot log**
→ Auth failure. `MCP_SERVICE_TOKEN` in `backend/.env` doesn't match what got
rendered into `~/.nanobot/config.json`. Easiest fix: delete
`~/.nanobot/config.json` and re-run `start-dev.sh`.

**"GEMINI_API_KEY not set" or 401 from Google**
→ Export it in `backend/.env`. Verify with `grep GEMINI backend/.env`.

**Local persona customizations (edited SOUL.md in `~/.nanobot/workspace/`)
got wiped**
→ They shouldn't have — step 3 only copies if `SOUL.md` is missing. If you
want persona changes to ship to everyone, edit
`ola/nanobot-workspace/SOUL.md` in the repo instead, commit, and re-
provision with `rm ~/.nanobot/workspace/SOUL.md && bash start-dev.sh`.

## Regenerating secrets

- **MCP_SERVICE_TOKEN**: `openssl rand -hex 32`. Update `backend/.env` and
  delete `~/.nanobot/config.json` so it re-renders. Production uses a
  different value from dev.
- **GEMINI_API_KEY**: rotate at [aistudio.google.com](https://aistudio.google.com),
  update `backend/.env`, restart. No other files to touch.

## What lives where (mental model)

| Path | In git? | Purpose |
|---|---|---|
| `ola/nanobot-workspace/*.md` | yes | persona template (source of truth) |
| `ola/nanobot.config.template.json` | yes | nanobot config skeleton with placeholders |
| `ola/SETUP.md` | yes | this file |
| `backend/.env` | no (gitignored) | per-machine secrets |
| `~/.nanobot/workspace/*.md` | no | provisioned copy (first-boot) — safe to edit locally |
| `~/.nanobot/workspace/memory/` | no | runtime agent memory — per machine |
| `~/.nanobot/workspace/sessions/` | no | chat session logs — per machine |
| `~/.nanobot/config.json` | no | rendered config with real token — mode 600 |
