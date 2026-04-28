# Ola workspace — dev machine setup

> **For coding agents (Claude Code / Cursor / Antigravity) bootstrapping
> wzh's or yili's machine**: read [§ TL;DR — wzh / yili (UI-only) one-shot
> quickstart](#tldr--wzh--yili-ui-only-one-shot-quickstart) first. That
> section is intentionally complete and ordered so an agent can execute
> it top-to-bottom without judgment calls.

This directory makes **Ask Ola** behave as a real tool-calling agent (not a
plain chat proxy). It contains:

- `nanobot-workspace/` — the 5 markdown files that define Ola's persona,
  behaviors, and tool-usage rules. Loaded by nanobot at startup.
- `nanobot.config.template.json` — nanobot's config, with secrets replaced
  by `${VAR}` placeholders. Rendered by `start-dev.sh` at first boot.

---

## Repo & path topology (read this first)

Ola's dev environment spans **2 sibling git repos** + **2 dotfile
locations** + **2 .env files**. The agent must understand all four to
bootstrap correctly:

```
~/dev/                              ← any directory; pick one and stick with it
├── crm/                            ← THIS REPO (SeekMi-Technologies/Ola)
│   ├── backend/                    ← Node 20 / Express, MCP server
│   │   ├── .env                    ← per-machine secrets, gitignored
│   │   └── .env.example            ← template, commit ok
│   ├── frontend/                   ← React 18 + Vite + Ant Design
│   ├── ola/
│   │   ├── SETUP.md                ← this file
│   │   ├── nanobot.config.template.json   ← rendered into ~/.nanobot/config.json
│   │   └── nanobot-workspace/      ← 5 .md files copied into ~/.nanobot/workspace/
│   ├── .env                        ← project-root, only used by docker-compose
│   ├── start-dev.sh                ← one-command launcher for the 4 services
│   └── stop-dev.sh
│
└── nanobot/  (or  Ola_bot/)        ← MUST be a sibling of crm/
    └── NOTE: Use SeekMi-Technologies/Ola_bot, NOT upstream HKUDS/nanobot.
        We carry Ola-specific patches on branch `ola-dev`.

~/.nanobot/                         ← provisioned by start-dev.sh on first boot
├── config.json                     ← rendered from ola/nanobot.config.template.json
│                                     (mode 600 — contains MCP_SERVICE_TOKEN +
│                                     GEMINI_API_KEY substituted in)
└── workspace/
    ├── SOUL.md   USER.md   AGENTS.md   TOOLS.md   HEARTBEAT.md
    │                                 (copied verbatim from ola/nanobot-workspace/)
    ├── memory/                     ← runtime agent memory, per-machine
    └── sessions/                   ← chat session logs, per-machine
```

**Hard rules** (will silently break if violated):
- The two repos **must be siblings** at the same parent dir. `start-dev.sh`
  resolves nanobot via `${CRM_DIR}/../nanobot/` or `${CRM_DIR}/../Ola_bot/`.
- `~/.nanobot/` is in the user's home dir (not inside either repo). It
  persists across `git pull`s — your local agent memory + chat history
  outlive code updates.
- `backend/.env` is **gitignored, never commit**. `.env` (project root) is
  also gitignored as of #144.

---

## Service ports + processes

`start-dev.sh` brings up **4 services** simultaneously. If any port is
already taken, the corresponding service fails — see Troubleshooting.

| Port | Service | Process | Source dir |
|---|---|---|---|
| `3000` | Frontend (Vite dev server) | `npx vite --port 3000` | `frontend/` |
| `8888` | Backend (Express + nodemon) | `npx nodemon src/server.js` | `backend/` |
| `8889` | MCP Server (Node + nodemon) | `npx nodemon --watch src/mcp src/mcp/server.js` | `backend/` |
| `8900` | NanoBot (Python — the AI agent) | `python -m nanobot serve` | `../nanobot/` (sibling) |

For the **production stack** (which the docker-compose deploys), the
topology shifts: `frontend` becomes an `nginx:alpine` container on port 80
that reverse-proxies `/api/*` to backend, plus 2 sibling boxes for nanobot
(Box2) and Gotenberg (Box3) over Tailscale. See `docker-compose.yml` and
`frontend/Dockerfile.prod` for details.

---

## TL;DR — wzh / yili (UI-only) one-shot quickstart

> Agent: execute these 8 steps in order. Stop at the first failure and
> return the verify-step error to the user before guessing.

```bash
# ───────────────── 1. Install runtime tools ─────────────────
# macOS (Homebrew). Skip any tool the user already has.
brew install node@20 git
# (Optional, only if Ask Ola interaction needed — wzh/yili usually skip)
brew install python@3.11 uv

# Verify:
node --version    # → v20.x.x
npm --version     # → 10.x.x
git --version     # any modern git

# ───────────────── 2. Clone both repos as siblings ─────────────────
mkdir -p ~/dev && cd ~/dev

# Main CRM repo (this one)
git clone git@github.com:SeekMi-Technologies/Ola.git crm

# NanoBot fork — REQUIRED for `start-dev.sh` to find at ../nanobot/.
# Use the SeekMi fork (NOT upstream HKUDS/nanobot) so Ola patches apply.
git clone git@github.com:SeekMi-Technologies/Ola_bot.git nanobot
# (`Ola_bot` is the GitHub repo name; cloning into a directory named
# `nanobot` matches the path that start-dev.sh probes first.)

# Verify:
ls ~/dev/      # → crm  nanobot
test -d ~/dev/crm/backend && test -d ~/dev/nanobot/nanobot && echo "siblings OK"

# ───────────────── 3. Get backend/.env from zyd ─────────────────
# Ask zyd for the dev shared values for these 4 keys (paste over the
# example file). Never commit this file — it's gitignored.
cd ~/dev/crm
cp backend/.env.example backend/.env
# Now open backend/.env and fill these 4 (zyd will hand them over Slack/1Password):
#   DATABASE=mongodb+srv://...        (shared Atlas cluster)
#   JWT_SECRET=...                    (any 64-hex string; `openssl rand -hex 32`)
#   MCP_SERVICE_TOKEN=...             (dev-shared value from zyd)
#   GEMINI_API_KEY=AIza...            (zyd's dev key, OR your own from aistudio.google.com)

# Verify:
grep -E '^(DATABASE|JWT_SECRET|MCP_SERVICE_TOKEN|GEMINI_API_KEY)=' backend/.env | wc -l
# → should print  4

# ───────────────── 4. Project-root .env (only needed for docker compose) ─────
# wzh/yili: SKIP this step. Required only for `docker compose up` (prod
# stack staging). For day-to-day UI work via start-dev.sh you do NOT
# need a project-root .env file at all.

# ───────────────── 5. Install Node deps ─────────────────
cd ~/dev/crm/backend  && npm install
cd ~/dev/crm/frontend && npm install

# Verify:
test -d ~/dev/crm/backend/node_modules && test -d ~/dev/crm/frontend/node_modules \
  && echo "node deps OK"

# ───────────────── 6. Install nanobot Python deps (skip if UI-only) ────────
# wzh/yili: This is OPTIONAL. Skip if you don't need to test Ask Ola
# locally — the rest of the UI works fine without it. Skipping means
# the Ask Ola tab will show "Cannot connect to Ola" but every other
# page (Quote, Invoice, Customer, Settings, Dashboard...) is unaffected.
#
# To enable Ask Ola locally:
cd ~/dev/nanobot
pip install -e .
# (or: uv pip install -e . if you use uv)

# Verify:
python -c "import nanobot; print('nanobot installed:', nanobot.__file__)"

# ───────────────── 7. Start the stack ─────────────────
cd ~/dev/crm
bash start-dev.sh
# ↑ This will:
#   - First boot only: render ~/.nanobot/config.json from ola/ template,
#     copy 5 .md files into ~/.nanobot/workspace/
#   - Start 4 services (3000 / 8888 / 8889 / 8900)
#   - Print a status table — all 4 should show "running"
# Logs at /tmp/ola-{backend,mcp,nanobot,frontend}.log

# Verify:
curl -s http://localhost:8888/health    # → {"status":"ok",...}
curl -s -I http://localhost:3000/       # → HTTP/1.1 200 OK

# ───────────────── 8. Open the app + verify login ─────────────────
# Open in browser: http://localhost:3000
# Login with the test admin (ask zyd for shared dev creds):
#   email: admin@admin.com
#   password: admin123
# If login redirects to the dashboard with no errors, you're done.
# Now click around; CSS/className edits in frontend/ hot-reload via Vite.

# When done for the day:
bash stop-dev.sh
```

**Common stop conditions for an agent:**
- Step 2 `git clone` fails with permission denied → user's GitHub SSH key
  isn't added to SeekMi-Technologies. Have user add it before continuing.
- Step 3 ends with anything other than `4` → backend/.env is incomplete;
  ask zyd which key is missing.
- Step 5 fails with `EACCES` or sudo prompt → npm permissions broken;
  reinstall Node via `brew install node@20` (don't use sudo).
- Step 7's status table shows `FAILED` for nanobot → pip install (step 6)
  was skipped or failed; UI still works without it (Ask Ola tab broken
  only) so this is non-blocking for wzh/yili.

---

## Full-stack setup (Yuandong / Ziyue)

Same as the wzh/yili 8-step quickstart above, plus:

- **Step 4 IS required** — `.env` (project root) needs `MCP_BIND_ADDR=127.0.0.1`
  for local docker compose / prod-stack staging. Other engineers don't need
  to copy this from anywhere; just create the file with that one line:
  ```bash
  echo 'MCP_BIND_ADDR=127.0.0.1' > .env
  ```
- **Step 6 IS required** — nanobot Python install is mandatory for backend
  + MCP development. Use `uv pip install -e .` for fast installs.
- Run `npx jest` from `backend/` and `npx vitest run` from `frontend/` to
  exercise the regression test suites before opening a PR.

---

## Project-root `.env` — only for docker compose

The project root `.env` (gitignored, separate from `backend/.env`) carries
**docker-compose orchestration variables**, not application secrets. Most
developers never create this file. Required values:

| Variable | When required | Value |
|---|---|---|
| `MCP_BIND_ADDR` | Whenever you run `docker compose up` | `127.0.0.1` for local; `<Box1 Tailscale IP>` for prod (e.g. `100.109.220.126`) |

If you're only running `start-dev.sh` (the host-mode dev launcher), you
don't need this file. `start-dev.sh` doesn't read it.

If you do create it for local docker testing:
```bash
echo 'MCP_BIND_ADDR=127.0.0.1' > .env
```

---

## First-boot flow (what `start-dev.sh` does for you)

When you run `bash start-dev.sh` on a fresh mac:

1. Verifies `backend/.env` exists (fails fast if missing).
2. If `~/.nanobot/config.json` does **not** exist → runs a short Node
   subprocess that loads `backend/.env` via `dotenv` (so the parent shell
   is **not** polluted), reads `MCP_SERVICE_TOKEN` and `GEMINI_API_KEY`,
   substitutes them into `ola/nanobot.config.template.json`, and writes the
   result to `~/.nanobot/config.json` (mode 600). Both secrets end up on
   disk in this one file — current pinned NanoBot (via `pip install -e .`
   in sibling `../Ola_bot/`) requires `providers.gemini.apiKey` to be
   present in config at startup (`_make_provider` raises `ValueError` on
   empty key; no env fallback).
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

Optional: `GOTENBERG_URL`, `RESEND_API`, `ALLOWED_ORIGINS`
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
| `backend/.env` | no (gitignored via #144) | per-machine app secrets — never stage |
| `.env` (project root) | no (gitignored) | docker-compose orchestration vars only — `MCP_BIND_ADDR=...` |
| `~/.nanobot/workspace/*.md` | no | provisioned copy (first-boot) — safe to edit locally |
| `~/.nanobot/workspace/memory/` | no | runtime agent memory — per machine |
| `~/.nanobot/workspace/sessions/` | no | chat session logs — per machine |
| `~/.nanobot/config.json` | no (mode 600) | rendered config with real `MCP_SERVICE_TOKEN` + `GEMINI_API_KEY` substituted in |
| `../nanobot/` (sibling) | (separate repo) | NanoBot Python AI backbone — `SeekMi-Technologies/Ola_bot` fork, branch `ola-dev` |
| `~/.nanobot/config.json` | no | rendered config with real `MCP_SERVICE_TOKEN` and `GEMINI_API_KEY` — mode 600 |
