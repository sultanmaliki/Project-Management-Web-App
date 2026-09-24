# ProjectFlow

[![CI](https://github.com/sultanmaliki/Project-Management-Web-App/actions/workflows/ci.yml/badge.svg)](https://github.com/sultanmaliki/Project-Management-Web-App/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A full-stack project management app: projects, a drag-and-drop Kanban board, task assignment, role-based
access control and an optional AI helper that drafts user stories from a project description.

- **Backend:** FastAPI · SQLAlchemy 2 · PostgreSQL (SQLite for local dev) · Alembic · JWT auth
- **Frontend:** React 18 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui · React Router

## Features

- **Authentication** – email + password sign-in with signed, expiring JWT access tokens. Passwords are hashed with
  bcrypt. Sessions survive a page refresh and end automatically when a token expires or the account is deactivated.
- **Roles & permissions** – `admin`, `manager` and `developer`, enforced **on the API** (the UI only mirrors it).
- **Projects & Kanban board** – create/edit/delete projects; tasks flow across *To Do → In Progress → Done* by drag and
  drop (or from the task dialog). Progress and team are derived from the tasks.
- **Tasks** – title, description, status, priority, deadline and assignee. Overdue tasks are highlighted.
- **Dashboard** – live task counts (total / in progress / overdue). Managers see recent projects; developers see their
  own active tasks.
- **User management** – admins create, edit, deactivate, reset passwords for and delete users. The last active admin
  can't be removed or demoted.
- **AI user stories** – managers can generate user stories from a description (Groq) and add the ones they like as tasks.
  Optional: it is disabled until `GROQ_API_KEY` is set.
- **Responsive** – sidebar on desktop, compact top bar on phones.

### Who can do what

| | Admin | Manager | Developer |
|---|:---:|:---:|:---:|
| See projects | all | all | only those with a task assigned to them |
| Create / edit projects | ✅ | ✅ | – |
| Delete a project | ✅ any | ✅ own | – |
| Create / edit / delete / assign tasks | ✅ | ✅ | – |
| Change a task's status | ✅ | ✅ | ✅ only tasks assigned to them |
| Generate AI user stories | ✅ | ✅ | – |
| List users (to assign work) | ✅ | ✅ | – |
| Create / edit / delete users | ✅ | – | – |

Self-service sign-up always creates a **developer**. Only an admin can grant a higher role.

## Quick start (local development)

Requirements: Python 3.11+ and Node.js 20.19+ (22 recommended). No database server is needed — development defaults to
a local SQLite file.

**1. Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                 # optional: the defaults work for development
python -m app.seed                   # optional: demo users + a sample project
uvicorn app.main:app --reload        # http://127.0.0.1:8000  (API docs at /docs)
```

The seed script prints the demo accounts (all use the password `demo-password-1`). It refuses to run when
`ENVIRONMENT=production`. Without it, set `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` in `backend/.env` and
an admin is created on startup.

**2. Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev                          # http://localhost:5173 (proxies /api to the backend)
```

## Run with Docker (PostgreSQL + app)

```bash
cp .env.example .env                 # set POSTGRES_PASSWORD, SECRET_KEY and the bootstrap admin
docker compose up --build
```

Open <http://localhost:8000>. The image builds the frontend and serves it from the API, so everything is one
origin (no CORS setup). Migrations run automatically on start. Put a TLS-terminating reverse proxy in front for any
real deployment.

## Configuration

Settings are read from environment variables (or `backend/.env`). See [`backend/.env.example`](backend/.env.example).

| Variable | Default | Notes |
|---|---|---|
| `ENVIRONMENT` | `development` | `production` requires `SECRET_KEY`, disables `/docs`, enables HSTS. |
| `DATABASE_URL` | `sqlite:///./projectflow.db` | Use PostgreSQL in production: `postgresql://user:pass@host/db`. |
| `SECRET_KEY` | *(random per start in dev)* | ≥ 32 chars in production. Changing it signs everyone out. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token lifetime. |
| `ALLOW_SIGNUP` | `true` | `false` hides sign-up; admins can still add users. |
| `BOOTSTRAP_ADMIN_EMAIL` / `_PASSWORD` | – | Creates the first admin on startup if none exists. |
| `CORS_ORIGINS` | localhost dev origins | JSON list. Only needed if the frontend is on another origin. |
| `GROQ_API_KEY` / `GROQ_MODEL` | – / `llama-3.1-8b-instant` | Enables the AI user-story generator. |
| `STATIC_DIR` | – | Directory of the built frontend to serve (set in the Docker image). |

Database schema changes are managed with Alembic (`cd backend && alembic upgrade head`). In development the tables are
created automatically; in production use the migration.

## Testing

```bash
cd backend  && pytest --cov=app        # 191 tests, ~99% line coverage
cd frontend && npm test                # 76 tests
cd frontend && npm run lint && npm run typecheck && npm run build
```

The backend tests run on in-memory SQLite by default; set `TEST_DATABASE_URL` to run them on PostgreSQL. CI
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, type-checks, both test suites (including the backend
on a real PostgreSQL), verifies the Alembic migration, and boots the production Docker stack end to end.

The tests deliberately cover the security rules: role checks, developer-only-own-tasks, last-admin protection, expired
and forged tokens, SQL-injection and XSS payloads, rate limits and input bounds.

## API overview

Interactive docs are at `/docs` in development. Everything except sign-in/up and `/health` needs
`Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/signup`, `GET /api/auth/me`, `POST /api/auth/change-password`, `GET /api/auth/config` |
| Projects | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/{id}`, `POST /api/projects/{id}/tasks` |
| Tasks | `GET /api/tasks/mine`, `GET/PATCH/DELETE /api/tasks/{id}` |
| Users | `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/{id}` |
| Dashboard | `GET /api/dashboard` |
| AI | `POST /api/ai/user-stories` |
| Health | `GET /health` |

## Security notes

Built in: bcrypt password hashing with a constant-work login path, signed expiring JWTs re-checked against the database
on every request (so deactivation and role changes apply immediately), server-side authorization on every route,
input validation and length limits, bounded IDs, parameterised queries, rate limiting on login/sign-up/AI, strict
CORS, security headers (CSP, `X-Frame-Options`, `nosniff`, HSTS in production), generic error messages that never leak
internals, no secrets in the repository, and a non-root container.

Known limitations to be aware of before exposing it publicly:

- **Rate limiting is in-memory and per process.** Behind several workers/replicas the effective limit is higher; use a
  shared store or your proxy's limiter. If you're behind a reverse proxy, set uvicorn's `FORWARDED_ALLOW_IPS` so client
  IPs are read correctly.
- **The access token is kept in `localStorage`** so sessions survive a refresh. That's the usual SPA trade-off: an XSS bug
  could read it. The UI renders no untrusted HTML and ships a strict CSP to reduce that risk. There are no refresh tokens
  or server-side token revocation; tokens simply expire (default 60 min).
- **No email-based password reset.** Admins reset passwords from the Users page; users can change their own password.
- Migrations run on container start, which is fine for one instance; with several replicas run `alembic upgrade head`
  as a separate step.

To report a vulnerability see [SECURITY.md](SECURITY.md).

## Project structure

```
backend/
  app/            FastAPI app: config, models, schemas, security, deps, routers/, seed
  alembic/        database migrations
  tests/          pytest suite
frontend/
  src/lib/        typed API client, date helpers, data-loading hook
  src/context/    authentication context
  src/components/ pages, dialogs and shadcn/ui primitives (components/ui)
Dockerfile, docker-compose.yml, .github/workflows/ci.yml
```

## License

MIT — see [LICENSE](LICENSE). UI primitives are from [shadcn/ui](https://ui.shadcn.com/) (MIT).
