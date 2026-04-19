# Ola workspace — dev machine setup

This directory is what makes **Ask Ola** behave as a real tool-calling agent
(not a plain chat proxy) on any machine that clones this repo. It contains:

- `nanobot-workspace/` — the 5 markdown files that define Ola's persona,
  behaviors, and tool-usage rules. Loaded by nanobot at startup.
- `nanobot.config.template.json` — nanobot's config, with secrets replaced
  by `${VAR}` placeholders. Rendered by `start-dev.sh` at first boot.

## Prerequisites

- Node.js 20.x, npm 10.x
- Python 3.11+
- The Ola CRM and Ola_bot repos cloned as **siblings** —
  `start-dev.sh` expects `$CRM_DIR/../Ola_bot/` (or the legacy
  `../nanobot/`) to exist and launches `python -m nanobot serve` from
  there. Use the Ola fork, not upstream, so future Ola-specific patches
  land in the right place:

  ```bash
  mkdir -p ~/dev && cd ~/dev
  git clone git@github.com:SeekMi-Technologies/ola.git
  git clone git@github.com:SeekMi-Technologies/Ola_bot.git
  # upstream is git@github.com:HKUDS/nanobot.git — already set as
  # `upstream` remote on zyd's main mac; add if you want upstream merges.
  # Older clones may still be named `crm/` and `nanobot/` locally;
  # start-dev.sh handles either name.
  ```
- MongoDB connection string (Atlas shared cluster or your own)
- Gemini API key (from [aistudio.google.com](https://aistudio.google.com))

## First-boot flow (what `start-dev.sh` does for you)

When you run `bash start-dev.sh` on a fresh mac:

1. Verifies `backend/.env` exists (fails fast if missing).
2. If `~/.nanobot/config.json` does **not** exist → runs a short Node
   subprocess that loads `backend/.env` via `dotenv` (so the parent shell
   is **not** polluted), reads `MCP_SERVICE_TOKEN` and `GEMINI_API_KEY`,
   substitutes them into `ola/nanobot.config.template.json`, and writes the
   result to `~/.nanobot/config.json` (mode 600). Both secrets end up on
   disk in this one file — nanobot v0.1.4.post6 requires
   `providers.gemini.apiKey` to be present in config at startup
   (`_make_provider` raises `ValueError` on empty key; no env fallback).
   The file is gitignored home-dir, owner-only.
3. If `~/.nanobot/workspace/SOUL.md` does **not** exist → copies the 5 md
   files from `ola/nanobot-workspace/` into `~/.nanobot/workspace/`.
4. Starts backend (8888), MCP server (8889), nanobot (8900), frontend (3000).
   Each service reads `backend/.env` via its own `dotenv` call at startup.

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

## PDF 导出（可选 / 本地 Gotenberg）

PDF 导出（Quote / Invoice / PO / Offer / Payment）通过 [Gotenberg](https://gotenberg.dev)
微服务生成。本地跑起来：

```bash
docker run --rm -d -p 3030:3000 --name ola-gotenberg \
  gotenberg/gotenberg:8 gotenberg --api-port=3000
```

然后在 `backend/.env` 里添加 / 取消注释：

```
GOTENBERG_URL=http://localhost:3030
```

说明：host 端口用 **3030** 是因为 Vite dev server 占了 3000；容器内部仍
监听 3000。停止容器：`docker stop ola-gotenberg`（`--rm` 会自动清理）。

验证：`curl http://localhost:3030/health` 应返 `{"status":"up"}`。

## Troubleshooting

**"Ask Ola responds like a plain GPT — doesn't call any tools"**
→ `~/.nanobot/config.json` is missing the `ola_crm` MCP server entry.
Delete `~/.nanobot/config.json` and re-run `bash start-dev.sh` to re-render
from template.

**"Ask Ola says 'I'm nanobot' / behaves like a generic assistant"** (common
on a machine where nanobot was installed and used standalone before)
→ `~/.nanobot/` existed from prior use, so `start-dev.sh` skipped
provisioning by design (idempotent — won't clobber local edits). Move the
old directory aside and re-run:
```
mv ~/.nanobot ~/.nanobot.prior
bash start-dev.sh
```
The script will render a fresh Ola config + workspace; your old state is
preserved in `~/.nanobot.prior` if you want to restore sessions/memory later.

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
| `~/.nanobot/config.json` | no | rendered config with real `MCP_SERVICE_TOKEN` and `GEMINI_API_KEY` — mode 600 |
