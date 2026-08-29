# MedCore HMS

A full-stack Hospital Management System — multi-tenant, role-based (super admin, hospital admin, doctor, nurse, patient, pharmacist, receptionist, accountant, lab tech), covering appointments, EMR, prescriptions, pharmacy/inventory, billing/invoicing, and notifications.

**Stack:** NestJS + Prisma + PostgreSQL (backend), Next.js App Router (frontend), Redis + BullMQ (queues/notifications), pnpm monorepo.

---

---

## Live Deployment

- **App:** https://medcore-hms-frontend.vercel.app
- **API base URL:** https://medcore-backend-1796.onrender.com
- **API docs (Swagger):** https://medcore-backend-1796.onrender.com/api/docs
- **Demo credentials:** see [DEMO_CREDENTIALS.md](./DEMO_CREDENTIALS.md)
- **Video walkthrough:** *(link here once recorded)*

> **Note on deployment target:** production runs on Vercel (frontend), Render (backend, as a Docker container), Neon (managed PostgreSQL), and Upstash (managed Redis) rather than raw AWS EC2. This was a deliberate choice — see `docs/MedCore-HMS-Project-Report.docx` §3.2–3.3 for the full architecture and reasoning. The system architecture, multi-tenancy, and deployment topology are otherwise unchanged from the PRD's design.

---

## Architecture Overview

MedCore HMS is a multi-tenant hospital management platform: every hospital is a tenant, scoped via `hospitalId` on all tenant-owned tables and enforced at the service layer on every request. Nine roles (Super Admin down to Patient) share one codebase with role-based access control rather than separate apps per role. See `docs/architecture-current.svg` (local/docker-compose topology) and `docs/architecture-live.svg` (production topology) for diagrams, and `docs/erd.svg` for the full 19-model database schema.

---

## Quick start (Docker — recommended)

This runs the entire stack — Postgres, Redis, backend, frontend, and an Nginx reverse proxy — with one command. No local Node/pnpm/Postgres install needed.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
cp .env.example .env
# then edit .env — at minimum set POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
docker-compose up --build
```

Once all five services are up, the app is available at:

- **App (frontend + API, via Nginx):** http://localhost
- API is reachable under `/api/*` (e.g. http://localhost/api/auth/login)

Payment (Razorpay), email (Resend), and SMS (Twilio) features require their respective keys in `.env` — the app runs fine without them, those specific features just won't function.

To stop:

```bash
docker-compose down
```

To reset the local database (wipes all data):

```bash
docker-compose down -v
```

---

## Local development (without Docker)

**Prerequisites:** Node 20+, pnpm, a local or remote PostgreSQL instance, Redis.

```bash
pnpm install

# apps/backend/.env — real DATABASE_URL, REDIS_URL, JWT secrets, etc.
cd apps/backend
pnpm exec prisma generate
pnpm exec prisma migrate deploy
cd ../..

pnpm --filter backend run start:dev
pnpm --filter frontend run dev
```

Backend runs on `:3000`, frontend on `:3001` (or per `next dev` defaults) in this mode — they are **not** proxied through Nginx locally unless you use the Docker setup above.

---

## Running tests

E2E tests run against a real Postgres + Redis, via a separate local Docker setup (distinct from the docker-compose stack above, to keep test data isolated):

```bash
docker run --name medcore-test-db -e POSTGRES_PASSWORD=testpass123 -e POSTGRES_DB=medcore_test -p 5433:5432 -d postgres:16
docker run --name medcore-test-redis -p 6380:6379 -d redis:7

cd apps/backend
npx dotenv -e .env.test -- pnpm exec prisma migrate deploy
npx dotenv -e .env.test -- pnpm run test:e2e
```

`apps/backend/.env.test` (gitignored) holds test-only dummy credentials matching the ports above.

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`:
- **Backend job:** installs deps, builds `@medcore/shared-types` and the backend, runs Prisma migrations, runs the full e2e suite — against real Postgres/Redis service containers.
- **Frontend job:** builds the Next.js app to catch build-time regressions.

---

## Project structure

## Directory Details

| Path | Description |
|------|-------------|
| `apps/backend/` | NestJS API with Prisma (PostgreSQL), Redis/BullMQ for queues, JWT authentication, and Razorpay payment integration |
| `apps/frontend/` | Next.js frontend using the App Router |
| `packages/shared-types/` | Shared TypeScript types and enums, used by both backend and frontend |
| `nginx/nginx.conf` | Reverse proxy configuration for the Docker Compose setup |
| `.github/workflows/ci.yml` | GitHub Actions CI pipeline configuration |

---

## Security

- Helmet security headers
- Rate limiting (global + stricter auth-endpoint limits) via `@nestjs/throttler`
- Audit logging on all mutating requests (POST/PATCH/PUT/DELETE)
- Refresh token rotation with reuse detection