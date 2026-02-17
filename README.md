# OlaCrm

**OlaCrm** (Ola ERP CRM) is an open-source CRM/ERP system built with Node.js and React. It provides customer relationship management, quotes, invoices, purchase orders, payments, and reporting—with a modern UI and RESTful API.

## Features

- **Customer management** — Clients and contacts
- **Sales** — Quotes, conversion to invoices, copy/duplicate
- **Invoicing** — Invoices with mail and PDF (Gotenberg)
- **Purchase orders** — Create and manage POs
- **Payments** — Payment tracking and modes
- **Products & factories** — Merchandise and factory data
- **Comparisons** — Quote/invoice comparisons
- **Settings** — Currencies, taxes, and system config
- **User & auth** — JWT-based auth and admin setup
- **Export** — Excel and other export routes
- **Responsive UI** — Ant Design, works on desktop and mobile

## Tech stack

| Layer   | Stack |
|--------|--------|
| **Backend** | Node.js 20, Express, MongoDB (Mongoose), JWT, Gotenberg (PDF) |
| **Frontend** | React 18, Ant Design, Redux Toolkit, Vite, Axios |
| **Deploy** | Docker Compose (optional: Kubernetes) |

## Project structure

```
crm/
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── routes/          # API routes (core + app entities)
│   │   ├── controllers/
│   │   ├── models/
│   │   └── server.js
│   ├── .env.example
│   ├── .env.production.example
│   ├── Dockerfile
│   └── package.json
├── frontend/                # React SPA
│   ├── src/
│   ├── public/
│   ├── Dockerfile.prod
│   └── package.json
├── kubernetes/              # K8s manifests (optional)
├── docker-compose.yml       # Backend + frontend + Gotenberg
├── deploy.sh                # Production deploy script (rsync + docker compose)
└── README.md
```

## Quick start

### Prerequisites

- Node.js 20.x
- npm 10.x
- MongoDB (local or Atlas)

### Local development

1. **Clone the repo**

   ```bash
   git clone https://github.com/your-org/crm.git
   cd crm
   ```

2. **Backend**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env: set DATABASE, JWT_SECRET, PORT=8888
   npm install
   npm run dev
   ```

3. **Frontend** (in another terminal)

   ```bash
   cd frontend
   npm install
   # Optional: create .env with VITE_APP_API_URL, VITE_BACKEND_SERVER, VITE_FILE_BASE_URL
   npm run dev
   ```

4. Open the app at the URL Vite prints (e.g. `http://localhost:5173`). API base: `http://localhost:8888`.

### Environment variables

**Backend** (see `backend/.env.example` and `backend/.env.production.example`):

| Variable | Description |
|----------|-------------|
| `DATABASE` | MongoDB connection string (required) |
| `JWT_SECRET` | Secret for JWT signing (required) |
| `PORT` | Server port (default `8888`) |
| `NODE_ENV` | `development` or `production` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (e.g. `https://erp.olajob.cn`) |
| `PUBLIC_SERVER_FILE` | Base URL for file links (e.g. `https://erp.olajob.cn/`) |
| `GOTENBERG_URL` | Gotenberg service URL (e.g. `http://gotenberg:3000`) |
| `RESEND_API` | Optional: Resend API key for email |
| `OPENAI_API_KEY` | Optional: OpenAI API key |

**Frontend** (build-time for production):

- `VITE_BACKEND_SERVER` — Backend base URL
- `VITE_APP_API_URL` — API base URL (e.g. `https://erp.olajob.cn/api/`)

## Production deployment

### Docker Compose

1. On the server, clone or copy the repo and go to project root.
2. Configure backend env:
   ```bash
   cp backend/.env.production.example backend/.env
   # Edit backend/.env: DATABASE, JWT_SECRET, ALLOWED_ORIGINS, PUBLIC_SERVER_FILE
   ```
3. Build and start:
   ```bash
   docker compose up -d --build
   ```
4. Frontend is on port **3000**, backend on **8888**. Use a reverse proxy (e.g. Nginx) to expose them (e.g. `https://erp.olajob.cn` → 3000/8888).

### Deploy script (`deploy.sh`)

The script syncs code to a remote server and runs Docker Compose there.

- **Requires:** `backend/.env.production` or `backend/.env` (used to generate `.env` on the server).
- **Config:** `DEPLOY_SERVER_IP`, `DEPLOY_REMOTE_DIR` (defaults: `43.99.57.106`, `/app/crm`).

```bash
./deploy.sh
# Prompts for confirmation, then: preflight → rsync → ssh "docker compose up -d --build" → health checks
```

After deploy, the script runs basic health checks (containers up, frontend 3000, backend `GET /health`). Production URL used in comments: **https://erp.olajob.cn**.

### Kubernetes

See **`kubernetes/README.md`** for K8s deployment (ArgoCD, secrets, backend/frontend deployments, ingress).

## Backend API overview

- **Auth:** `/api` — login, token refresh (see `coreAuth`, `adminAuth`).
- **Core:** `/api` — settings, users, etc. (see `coreApi`).
- **App entities:** `/api/<entity>/create|read|update|delete|search|list|listAll|filter|summary` for clients, quotes, invoices, purchase orders, payments, etc.
- **Special:** quote convert/copy, invoice/quote/purchaseorder copy, invoice/quote/payment mail.
- **Health:** `GET /health` (used by deploy script).
- **Export:** routes under `exportRoutes`.

## Scripts

**Backend**

- `npm run dev` — development with nodemon
- `npm run start` — production start
- `npm run setup` — setup
- `npm run add-admin` — add admin user
- `npm run upgrade` — run upgrade script
- `npm run reset` — reset script

**Frontend**

- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build

## License

See [LICENSE](LICENSE) in the repository.

## Acknowledgments

- [Ant Design](https://ant.design/)
- [React](https://reactjs.org/)
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Gotenberg](https://gotenberg.dev/) (PDF)
